import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { OverlayVisibility, ParticipationRuleConfig } from '../types/game';
import { TeamConfigState } from '../types/team';
import { OVERLAY_SECTION, GameThemeType, TeamType, GAME_CONSTANTS, GIFT_TIER, GIFT_TIER_CONFIG, TEAM_KEY } from '../constants/game';
import { applyCasterConfig } from '../store/casterStore';
import { hasSpeechNameField, registerSpeechName } from './caster/speechNameRegistry';
import { announceFollow, announceShare } from './caster/casterDirector';
import { setCasterWarmSender } from './caster/casterWarmChannel';
import { startChampionshipTallyReporter } from './championshipTallyReporter';
import { SERIES_PROGRESS_SOCKET_EVENT, startSeriesProgressReporter } from './seriesProgressReporter';
import { CHAMPIONSHIP_TALLY_SOCKET_EVENT } from '../constants/championshipTally';
import { SESSION_LEADERBOARD_SOCKET_EVENT } from '../constants/sessionLeaderboard';
import { resetSessionLeaderboard } from '../store/sessionLeaderboardStore';
import { GIFT_CONFIG_SOCKET_EVENT, GiftRulePayload, parseGiftRulePayload } from '../constants/giftConfig';
import { applyGiftConfigPayload } from '../store/giftConfigStore';
import { sanitizeTeamConfigState } from '../constants/teams';
import { buildAdminHeaders, resolveAdminToken } from './adminTokenStorage';
import {
  PlayerLeaderboardSnapshot,
  sanitizePlayerLeaderboard,
  usePlayerLeaderboardStore,
} from '../store/playerLeaderboardStore';
import { requestRoundStart } from './roundIntroActions';
import { recordRoseGift } from '../store/roseGratitudeStore';

export const LIVE_OPS_SOCKET_EVENT = {
  AUTH_ERROR: 'server:auth-error',
  ROUND_RESULT: 'game:round-result',
  PLAYER_LEADERBOARD: 'game:player-leaderboard',
} as const;

const UNKNOWN_AUTH_EVENT = 'unknown';
const PLAYER_LEADERBOARD_PATH = '/api/player-leaderboard';
const HTTP_METHOD_POST = 'POST';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export interface RoundResultPlayer {
  userName: string;
  team: TeamType;
  damage: number;
}

export interface RoundResultPayload {
  roundId: string;
  winnerTeam: TeamType;
  seriesFormat: string;
  isSeriesEnd: boolean;
  players: RoundResultPlayer[];
}

export interface QueuedGiftPayload {
  giftName: string;
  team: TeamType;
  donorName: string;
  coins: number;
  streakCount: number;
  totalCoins?: number;
  isComboFinal: boolean;
  donorAvatarUrl?: string;
  speechName?: string;
  /** Admin gift rule attached by the server (damage multiplier, special effect). */
  giftRule?: GiftRulePayload;
}

const OVERLAY_KEYS = Object.values(OVERLAY_SECTION) as (keyof OverlayVisibility)[];

function pickOverlayVisibilityPatch(rawPayload: unknown): Partial<OverlayVisibility> {
  if (!rawPayload || typeof rawPayload !== 'object') {
    return {};
  }
  const source = rawPayload as Record<string, unknown>;
  const patch: Partial<OverlayVisibility> = {};
  for (const key of OVERLAY_KEYS) {
    if (typeof source[key] === 'boolean') {
      patch[key] = source[key];
    }
  }
  return patch;
}

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000');

const CLIENT_INSTANCE_ID = `client-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

/**
 * Server says the series is now on `targetRound`. Skip it when this overlay is already fighting that
 * round (it moved on by itself first); otherwise start it, never adding +1 on top of the server.
 */
const applyServerNextRound = (targetRound: unknown): void => {
  const state = useGameStore.getState();
  const target = typeof targetRound === 'number' ? targetRound : undefined;
  const isAlreadyPlayingTarget =
    target !== undefined && target <= state.currentRound && !state.isRoundIntermission && state.roundWinner === null;
  if (isAlreadyPlayingTarget) return;
  state.startNextRound(target);
};

class GameSocketClient {
  private socket: Socket | null = null;
  public isConnected = false;

  // Chat batching: queue messages and flush every CHAT_BATCH_FLUSH_MS ms
  // Prevents setState spam when many viewers send chat simultaneously
  private readonly CHAT_BATCH_FLUSH_MS = 100;
  private chatBatchQueue: Array<{ userName: string; text: string; team?: TeamType; championName?: string }> = [];
  private chatBatchTimer: ReturnType<typeof setInterval> | null = null;

  // Gift batching: queue rapid gift bursts and flush every GIFT_BATCH_FLUSH_MS ms
  // Consolidates rapid ticks (e.g. 50 roses/sec) to avoid state & micro-render storms
  private readonly GIFT_BATCH_FLUSH_MS = 60;
  private giftBatchQueue: QueuedGiftPayload[] = [];
  private giftBatchTimer: ReturnType<typeof setInterval> | null = null;
  /** Reports the matchup's series titles to the admin portal while connected. */
  private stopTallyReporter: (() => void) | null = null;
  /** Reports round results so the server's series state follows the game. */
  private stopSeriesReporter: (() => void) | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    try {
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 5000,
        auth: { adminToken: resolveAdminToken() },
      });

      let lastSentLeft = -1;
      let lastSentRight = -1;
      let lastScoreSyncAt = 0;

      const syncScoreBalanceToServer = () => {
        if (!this.socket || !this.isConnected) return;
        const state = useGameStore.getState();
        const leftScore = state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG;
        const rightScore = state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG;
        const now = Date.now();
        if (leftScore === lastSentLeft && rightScore === lastSentRight) return;
        if (now - lastScoreSyncAt < 1500 && leftScore !== 0 && rightScore !== 0) return;
        lastSentLeft = leftScore;
        lastSentRight = rightScore;
        lastScoreSyncAt = now;
        this.socket.emit('admin:sync-score-hint', {
          leftScore,
          rightScore,
        });
      };

      useGameStore.subscribe((state, prevState) => {
        const leftScore = state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG;
        const prevLeftScore = prevState.teamScores?.[TEAM_KEY.BLG] ?? prevState.teamScoreBLG;
        const rightScore = state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG;
        const prevRightScore = prevState.teamScores?.[TEAM_KEY.GENG] ?? prevState.teamScoreGENG;

        if (leftScore !== prevLeftScore || rightScore !== prevRightScore) {
          syncScoreBalanceToServer();
        }
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        setCasterWarmSender((eventName, payload) => this.socket?.emit(eventName, payload));
        this.stopTallyReporter?.();
        this.stopTallyReporter = startChampionshipTallyReporter((report) =>
          this.socket?.emit(CHAMPIONSHIP_TALLY_SOCKET_EVENT.REPORT, report)
        );
        this.stopSeriesReporter?.();
        this.stopSeriesReporter = startSeriesProgressReporter((report) =>
          this.socket?.emit(SERIES_PROGRESS_SOCKET_EVENT.ROUND_RESULT, report)
        );
        lastScoreSyncAt = 0;
        syncScoreBalanceToServer();
        console.log('[Game Socket] Connected to Backend Server on port 4000');
        useGameStore.getState().addLog('SYSTEM', 'Đã kết nối Socket.io tới Server trung gian');
        this.startChatBatchFlush();
        this.startGiftBatchFlush();
        this.fetchPlayerLeaderboard();
      });

      this.socket.on(LIVE_OPS_SOCKET_EVENT.AUTH_ERROR, (payload: { event?: string } | undefined) => {
        this.warnAuthErrorOnce(payload?.event);
      });

      this.socket.on(LIVE_OPS_SOCKET_EVENT.PLAYER_LEADERBOARD, (payload: unknown) => {
        this.applyPlayerLeaderboard(payload);
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        // Restarted on reconnect, which re-sends the current titles immediately
        this.stopTallyReporter?.();
        this.stopTallyReporter = null;
        this.stopSeriesReporter?.();
        this.stopSeriesReporter = null;
        this.stopChatBatchFlush();
        this.stopGiftBatchFlush();
        console.log('[Game Socket] Disconnected from Backend Server');
      });

      // Hydrate latest overlay visibility from server REST API immediately on init
      if (typeof window !== 'undefined') {
        fetch(`${SERVER_URL}/api/overlay-visibility`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data) {
              const cleanPatch = pickOverlayVisibilityPatch(data);
              if (Object.keys(cleanPatch).length > 0) {
                useGameStore.getState().setOverlayVisibility(cleanPatch);
              }
            }
          })
          .catch(() => {});

        fetch(`${SERVER_URL}/api/teams`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            const cleanConfig = sanitizeTeamConfigState(data);
            if (cleanConfig) {
              useGameStore.getState().applyTeamConfigSnapshot(cleanConfig, false);
            }
          })
          .catch(() => {});

        fetch(`${SERVER_URL}/api/series-format`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && typeof data.format === 'string') {
              useGameStore.getState().applySeriesFormatSnapshot(data);
            }
          })
          .catch(() => {});
      }

      // Listen for game events dispatched by Server or Admin Portal
      this.socket.on('game:summon', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (hasSpeechNameField(payload)) registerSpeechName(payload.summonerName, payload.speechName);
        useGameStore
          .getState()
          .summonMinion(
            payload.summonerName,
            payload.championName,
            payload.team,
            payload.isGiftBypass,
            payload.userAvatarUrl,
            payload.isExplicitChampion
          );
      });

      this.socket.on('game:summon-batch', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (Array.isArray(payload?.items) && payload.items.length > 0) {
          useGameStore.getState().summonMinionsBatch(payload.items);
        }
      });

      this.socket.on('game:gift', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (hasSpeechNameField(payload)) registerSpeechName(payload.donorName, payload.speechName);
        this.giftBatchQueue.push({
          giftName: payload.giftName,
          team: payload.team,
          donorName: payload.donorName,
          coins: payload.coins ?? 100,
          streakCount: payload.streakCount ?? 1,
          totalCoins: payload.totalCoins,
          isComboFinal: Boolean(payload.isComboFinal),
          donorAvatarUrl: typeof payload.donorAvatarUrl === 'string' ? payload.donorAvatarUrl : undefined,
          speechName: payload.speechName,
          giftRule: parseGiftRulePayload(payload.giftRule),
        });
      });

      this.socket.on('game:follow', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (payload?.userName && payload?.team && payload?.championName) {
          if (hasSpeechNameField(payload)) registerSpeechName(payload.userName, payload.speechName);
          useGameStore
            .getState()
            .triggerFollowReward(payload.userName, payload.team, payload.championName, payload.furyGain);
          announceFollow(payload.userName, payload.team, payload.championName);
        }
      });

      this.socket.on('game:share', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (payload?.userName && payload?.team) {
          if (hasSpeechNameField(payload)) registerSpeechName(payload.userName, payload.speechName);
          useGameStore
            .getState()
            .triggerShareReward(payload.userName, payload.team, payload.damageAmount, payload.healAmount);
          announceShare(
            payload.userName,
            payload.team,
            payload.damageAmount ?? GAME_CONSTANTS.TIKTOK_ENGAGEMENT.SHARE_BURST_DAMAGE
          );
        }
      });

      this.socket.on('game:caster-config', (payload) => {
        applyCasterConfig(payload);
      });

      this.socket.on('game:like', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().addLikes(payload.count, payload.team, payload.userName);
      });

      this.socket.on('game:chat', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        // Push to batch queue — flushed every CHAT_BATCH_FLUSH_MS ms
        this.chatBatchQueue.push({
          userName: payload.userName,
          text: payload.text,
          team: payload.team as TeamType | undefined,
          championName: payload.championName,
        });
      });

      this.socket.on('game:team-config', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        const cleanConfig = sanitizeTeamConfigState(payload);
        if (cleanConfig) {
          useGameStore
            .getState()
            .applyTeamConfigSnapshot(cleanConfig, Boolean(payload?.resetMatch));
        }
      });

      this.socket.on('game:overlay-visibility', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        const cleanPatch = pickOverlayVisibilityPatch(payload);
        if (Object.keys(cleanPatch).length > 0) {
          useGameStore.getState().setOverlayVisibility(cleanPatch);
        }
      });

      this.socket.on('game:theme', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (payload?.theme) useGameStore.getState().setGameTheme(payload.theme);
      });

      this.socket.on('game:boss-control', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        const store = useGameStore.getState();
        if (payload.action === 'reset') store.resetBoss();
        if (payload.action === 'setHp') store.setBossHp(payload.hp);
        if (payload.action === 'setEnraged') store.setBossStatus(payload.isEnraged ? 'ENRAGED' : 'IDLE');
      });

      this.socket.on('game:bo5-control', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        const store = useGameStore.getState();
        if (payload.action === 'reset') store.resetBO5Match();
        if (payload.action === 'nextRound') applyServerNextRound(payload.currentRound);
        if (payload.action === 'setScore') store.setBO5Score(payload.blg, payload.geng, payload.currentRound);
        if (payload.action === 'startRound') requestRoundStart();
      });

      this.socket.on('game:boss-skill-config', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().setBossSkillConfig(payload);
      });

      this.socket.on('game:boss-cast-skill', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().castBossSkill(payload?.skillIndex);
      });

      this.socket.on('game:heal-team', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().healTeamChampions(payload?.team, payload?.amount);
      });

      this.socket.on('game:auto-pro-battle', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().setAutoProBattleConfig(payload);
      });

      this.socket.on(GIFT_CONFIG_SOCKET_EVENT.CONFIG, (payload: unknown) => applyGiftConfigPayload(payload));

      // Admin portal reset: clear the titles of the matchup on screen (stored in this overlay's localStorage)
      this.socket.on(CHAMPIONSHIP_TALLY_SOCKET_EVENT.RESET, () => {
        useGameStore.getState().resetMatchupChampionships();
      });

      this.socket.on(SESSION_LEADERBOARD_SOCKET_EVENT.RESET, () => {
        resetSessionLeaderboard();
      });

      this.socket.on('game:champion-damage-config', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (typeof payload?.multiplier === 'number') {
          useGameStore.getState().setChampionDamageMultiplier(payload.multiplier);
        }
      });

      this.socket.on('game:user-avatar-config', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (typeof payload?.enabled === 'boolean') {
          useGameStore.getState().setUseUserAvatar(payload.enabled);
        }
      });

      this.socket.on('game:participation-rules', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (payload && typeof payload === 'object') {
          useGameStore.getState().setParticipationRuleConfig(payload);
        }
      });

      this.socket.on('game:series-format', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (payload && typeof payload.format === 'string') {
          useGameStore.getState().applySeriesFormatSnapshot(payload);
        }
      });

      this.socket.on('game:silver-scrapes-state', (payload) => {
        if (payload) {
          useGameStore.getState().setSilverScrapesState(payload);
        }
      });
    } catch (err) {
      console.warn('[Game Socket] Could not connect to Server, using local EventBus fallback', err);
    }
  }

  /** Adds an extra listener (e.g. sound effects) without touching game logic. Returns an unsubscribe fn. */
  public onEvent(eventName: string, handler: (payload: unknown) => void): () => void {
    const socket = this.socket;
    if (!socket) return () => undefined;
    socket.on(eventName, handler);
    return () => {
      socket.off(eventName, handler);
    };
  }

  public sendLike(count: number, team: string, userName: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:like', { count, team, userName, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendSummon(summonerName: string, championName: string, team: string, isGiftBypass = false): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:summon', {
        summonerName,
        championName,
        team,
        isGiftBypass,
        senderId: CLIENT_INSTANCE_ID,
      });
    }
  }

  public sendSummonBatch(
    items: Array<{
      summonerName: string;
      championName: string;
      team: string;
      isGiftBypass?: boolean;
    }>
  ): void {
    if (this.socket && this.isConnected && items.length > 0) {
      this.socket.emit('admin:summon-batch', {
        items,
        senderId: CLIENT_INSTANCE_ID,
      });
    }
  }

  public sendGift(giftName: string, team: string, donorName: string, coins: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:gift', {
        giftName,
        team,
        donorName,
        coins,
        senderId: CLIENT_INSTANCE_ID,
      });
    }
  }

  public sendChat(userName: string, text: string, team: string, championName?: string): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:chat', {
        userName,
        text,
        team,
        championName,
        senderId: CLIENT_INSTANCE_ID,
      });
    }
  }

  public sendBossControl(action: 'reset' | 'setHp', hp?: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:boss-control', { action, hp, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendBO5Control(
    action: 'reset' | 'nextRound' | 'setScore',
    blg?: number,
    geng?: number,
    currentRound?: number
  ): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:bo5-control', { action, blg, geng, currentRound, senderId: CLIENT_INSTANCE_ID });
    }
  }

  /**
   * Asks the server to move on from `fromRound`. Every overlay's victory countdown and the admin can
   * ask for the same transition; the server only applies the first one (see isStaleNextRoundRequest).
   */
  public requestNextRound(fromRound: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:bo5-control', { action: 'nextRound', fromRound, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendTheme(theme: GameThemeType): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:set-theme', { theme, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendCastBossSkill(skillIndex?: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:boss-cast-skill', { skillIndex, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendChampionDamageConfig(multiplier: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:champion-damage-config', {
        multiplier,
        senderId: CLIENT_INSTANCE_ID,
      });
    }
  }

  public sendUserAvatarConfig(enabled: boolean): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:user-avatar-config', {
        enabled,
        senderId: CLIENT_INSTANCE_ID,
      });
    }
  }

  public sendParticipationRuleConfig(patch: Partial<ParticipationRuleConfig>): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:participation-rules', {
        ...patch,
        senderId: CLIENT_INSTANCE_ID,
      });
    }
  }

  public sendHealTeam(team: TeamType | 'ALL', amount: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:heal-team', { team, amount, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendAutoProBattle(config: { enabled?: boolean; onlyWhenIdle?: boolean; intervalMs?: number }): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:auto-pro-battle', { ...config, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendOverlayVisibility(visibility: Partial<OverlayVisibility>): void {
    if (this.socket) {
      this.socket.emit('admin:overlay-visibility', {
        ...visibility,
        senderId: CLIENT_INSTANCE_ID,
      });
    }
    if (typeof window !== 'undefined') {
      fetch(`${SERVER_URL}/api/overlay-visibility`, {
        method: HTTP_METHOD_POST,
        headers: buildAdminHeaders(HTTP_METHOD_POST, JSON_HEADERS),
        body: JSON.stringify({ ...visibility, senderId: CLIENT_INSTANCE_ID }),
      }).catch(() => {});
    }
  }

  public sendTeamConfig(config: TeamConfigState, resetMatch = false): void {
    const payload = {
      ...config,
      resetMatch,
      senderId: CLIENT_INSTANCE_ID,
    };
    if (this.socket) {
      this.socket.emit('admin:set-team-config', payload);
    }
    if (typeof window !== 'undefined') {
      fetch(`${SERVER_URL}/api/teams`, {
        method: HTTP_METHOD_POST,
        headers: buildAdminHeaders(HTTP_METHOD_POST, JSON_HEADERS),
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }

  public sendSeriesFormat(format: 'BO1' | 'BO3' | 'BO5', resetScore = false): void {
    if (this.socket) {
      this.socket.emit('admin:set-series-format', { format, resetScore, senderId: CLIENT_INSTANCE_ID });
    }
    if (typeof window !== 'undefined') {
      fetch(`${SERVER_URL}/api/series-format`, {
        method: HTTP_METHOD_POST,
        headers: buildAdminHeaders(HTTP_METHOD_POST, JSON_HEADERS),
        body: JSON.stringify({ format, resetScore }),
      }).catch(() => {});
    }
  }

  public sendSilverScrapesControl(
    action: 'start' | 'stop' | 'extend' | 'setLane',
    lane?: string,
    duration?: number
  ): void {
    if (this.socket) {
      this.socket.emit('admin:silver-scrapes-duel', { action, lane, duration, senderId: CLIENT_INSTANCE_ID });
    }
  }

  public sendBotControl(isActive: boolean, speedMs?: number): void {
    if (this.socket && this.isConnected) {
      this.socket.emit('admin:toggle-bot', { isActive, speedMs, senderId: CLIENT_INSTANCE_ID });
    }
  }

  /** Sends the result of a finished round to the server (player profiles / leaderboard). */
  public sendRoundResult(payload: RoundResultPayload): void {
    if (!this.socket || !this.isConnected) {
      console.warn('[Game Socket] Round result not sent: socket offline', payload.roundId);
      return;
    }
    this.socket.emit(LIVE_OPS_SOCKET_EVENT.ROUND_RESULT, payload);
  }

  private warnedAuthErrorEvents = new Set<string>();

  private warnAuthErrorOnce(eventName: string | undefined): void {
    const key = eventName ?? UNKNOWN_AUTH_EVENT;
    if (this.warnedAuthErrorEvents.has(key)) return;
    this.warnedAuthErrorEvents.add(key);
    console.warn(`[Game Socket] Server rejected "${key}" (no/invalid admin token). Overlay stays read-only.`);
  }

  private applyPlayerLeaderboard(payload: unknown): void {
    const snapshot: PlayerLeaderboardSnapshot | null = sanitizePlayerLeaderboard(payload);
    if (!snapshot) return;
    usePlayerLeaderboardStore.getState().setLeaderboard(snapshot);
  }

  private async fetchPlayerLeaderboard(): Promise<void> {
    try {
      const response = await fetch(`${SERVER_URL}${PLAYER_LEADERBOARD_PATH}`);
      if (!response.ok) {
        console.info('[Game Socket] Player leaderboard unavailable, status', response.status);
        return;
      }
      this.applyPlayerLeaderboard(await response.json());
    } catch (error) {
      console.warn('[Game Socket] Failed to fetch player leaderboard', error);
    }
  }

  // ─── Chat Batch Flush ───────────────────────────────────────────────────────
  // Groups incoming chat messages and flushes them to the store in one
  // setState call every CHAT_BATCH_FLUSH_MS ms, preventing render storms.

  private startChatBatchFlush(): void {
    if (this.chatBatchTimer !== null) return;
    this.chatBatchTimer = setInterval(() => this.flushChatBatch(), this.CHAT_BATCH_FLUSH_MS);
  }

  private stopChatBatchFlush(): void {
    if (this.chatBatchTimer === null) return;
    clearInterval(this.chatBatchTimer);
    this.chatBatchTimer = null;
    this.flushChatBatch(); // drain remaining messages on disconnect
  }

  private flushChatBatch(): void {
    if (this.chatBatchQueue.length === 0) return;
    const batch = this.chatBatchQueue.splice(0);
    const store = useGameStore.getState();
    batch.forEach((msg) =>
      store.addChatMessage(msg.userName, msg.text, msg.team, msg.championName)
    );
  }

  // ─── Gift Batch Flush ───────────────────────────────────────────────────────
  // Coalesces rapid gift ticks into single store mutations per flush tick
  // to avoid blocking OBS rendering thread with state & VFX micro-storms.

  private startGiftBatchFlush(): void {
    if (this.giftBatchTimer !== null) return;
    this.giftBatchTimer = setInterval(() => this.flushGiftBatch(), this.GIFT_BATCH_FLUSH_MS);
  }

  private stopGiftBatchFlush(): void {
    if (this.giftBatchTimer === null) return;
    clearInterval(this.giftBatchTimer);
    this.giftBatchTimer = null;
    this.flushGiftBatch();
  }

  private flushGiftBatch(): void {
    if (this.giftBatchQueue.length === 0) return;
    const batch = this.giftBatchQueue.splice(0);
    const store = useGameStore.getState();

    // Consolidate rapid same-donor gifts in the batch to reduce redundant state updates
    const consolidatedGifts = new Map<string, QueuedGiftPayload>();

    for (const gift of batch) {
      const key = `${gift.donorName}_${gift.giftName}_${gift.team}`;
      const existing = consolidatedGifts.get(key);
      if (existing) {
        existing.coins += gift.coins;
        existing.totalCoins = (existing.totalCoins ?? 0) + (gift.totalCoins ?? gift.coins);
        existing.streakCount = Math.max(existing.streakCount, gift.streakCount);
        existing.isComboFinal = existing.isComboFinal || gift.isComboFinal;
        if (gift.donorAvatarUrl) existing.donorAvatarUrl = gift.donorAvatarUrl;
      } else {
        consolidatedGifts.set(key, { ...gift });
      }
    }

    consolidatedGifts.forEach((gift) => {
      store.triggerGiftExplosion(
        gift.giftName,
        gift.team,
        gift.donorName,
        gift.coins,
        gift.streakCount,
        gift.totalCoins,
        gift.isComboFinal,
        gift.donorAvatarUrl,
        gift.giftRule
      );

      const isSmallGift = (gift.coins ?? 0) < GIFT_TIER_CONFIG[GIFT_TIER.MEDIUM].minCoins;
      if (isSmallGift && gift.team) {
        recordRoseGift(gift.donorName, gift.team, gift.streakCount ?? 1, gift.donorAvatarUrl);
      }
    });
  }
}

export const gameSocket = new GameSocketClient();

