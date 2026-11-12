import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { OverlayVisibility } from '../types/game';
import { TeamConfigState } from '../types/team';
import { OVERLAY_SECTION, GameThemeType } from '../constants/game';
import { sanitizeTeamConfigState } from '../constants/teams';

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

class GameSocketClient {
  private socket: Socket | null = null;
  public isConnected = false;

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
      });

      let lastSentLeft = -1;
      let lastSentRight = -1;
      let lastScoreSyncAt = 0;

      const syncScoreBalanceToServer = () => {
        if (!this.socket || !this.isConnected) return;
        const { teamScoreBLG, teamScoreGENG } = useGameStore.getState();
        const now = Date.now();
        if (teamScoreBLG === lastSentLeft && teamScoreGENG === lastSentRight) return;
        if (now - lastScoreSyncAt < 1500 && teamScoreBLG !== 0 && teamScoreGENG !== 0) return;
        lastSentLeft = teamScoreBLG;
        lastSentRight = teamScoreGENG;
        lastScoreSyncAt = now;
        this.socket.emit('admin:sync-score-hint', {
          leftScore: teamScoreBLG,
          rightScore: teamScoreGENG,
        });
      };

      useGameStore.subscribe((state, prevState) => {
        if (
          state.teamScoreBLG !== prevState.teamScoreBLG ||
          state.teamScoreGENG !== prevState.teamScoreGENG
        ) {
          syncScoreBalanceToServer();
        }
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        lastScoreSyncAt = 0;
        syncScoreBalanceToServer();
        console.log('[Game Socket] Connected to Backend Server on port 4000');
        useGameStore.getState().addLog('SYSTEM', 'Đã kết nối Socket.io tới Server trung gian');
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
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
        useGameStore
          .getState()
          .summonMinion(
            payload.summonerName,
            payload.championName,
            payload.team,
            payload.isGiftBypass
          );
      });

      this.socket.on('game:gift', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore
          .getState()
          .triggerGiftExplosion(
            payload.giftName,
            payload.team,
            payload.donorName,
            payload.coins,
            payload.streakCount,
            payload.totalCoins,
            payload.isComboFinal
          );
      });

      this.socket.on('game:follow', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (payload?.userName && payload?.team && payload?.championName) {
          useGameStore
            .getState()
            .triggerFollowReward(payload.userName, payload.team, payload.championName, payload.furyGain);
        }
      });

      this.socket.on('game:share', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        if (payload?.userName && payload?.team) {
          useGameStore
            .getState()
            .triggerShareReward(payload.userName, payload.team, payload.damageAmount, payload.healAmount);
        }
      });

      this.socket.on('game:like', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().addLikes(payload.count, payload.team, payload.userName);
      });

      this.socket.on('game:chat', (payload) => {
        if (payload?.senderId === CLIENT_INSTANCE_ID) return;
        useGameStore.getState().addChatMessage(payload.userName, payload.text, payload.team, payload.championName);
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
        if (payload.action === 'nextRound') store.startNextRound();
        if (payload.action === 'setScore') store.setBO5Score(payload.blg, payload.geng, payload.currentRound);
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

  public sendHealTeam(team: 'BLG' | 'GENG' | 'ALL', amount: number): void {
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
}

export const gameSocket = new GameSocketClient();

