import { io, Socket } from 'socket.io-client';
import { OverlayVisibility } from '../types/overlay';
import { BossSkillConfig } from '../types/bossSkill';
import { SUMMON_QUEUE_UI } from '../constants/summonQueue';
import {
  TeamConfigState,
  createDefaultTeamConfig,
  sanitizeTeamConfigState,
} from '../constants/teams';
import {
  DEFAULT_SERIES_CONFIG,
  SeriesFormat,
  SeriesFormatConfig,
  SilverScrapesDuelState,
  DuelLaneKey,
} from '../constants/series';
import { pickOverlayVisibilityPatch } from '../utils/overlayVisibility';
import { SERVER_AUTH_ERROR_EVENT } from '../constants/adminAuth';
import { buildAdminHeaders, readAdminToken, writeAdminToken } from './adminToken';

const HTTP_METHOD_POST = 'POST';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export interface TiktokStatusPayload {
  status: string;
  username?: string;
  roomId?: string;
  error?: string;
  /** Present when status is RECONNECTING. */
  attempt?: number;
  /** Epoch ms of the next reconnect attempt (RECONNECTING only). */
  nextRetryAt?: number;
}

export interface AuthErrorPayload {
  event?: string;
}

export type GameThemeType =
  | 'BARON'
  | 'ELDER_DRAGON'
  | 'XU_GIA'
  | 'RONG_NUI'
  | 'RONG_GIA'
  | 'VOID_TITAN';

export interface ParticipationRuleConfig {
  allowTeamOnlySummon: boolean;
  autoMatchSignatureTeam: boolean;
  lockTeamAfterJoin: boolean;
  allowChampionEvolution: boolean;
  /** Champions entering the arena per turn (arena floor is unlimited). */
  maxDeployPerTurn?: number;
  summonTurnDelayMs?: number;
}

export interface TikTokPipelineStats {
  trackedAffinityCount: number;
  leftAffinityCount: number;
  rightAffinityCount: number;
  activeStreakCount: number;
  followCount: number;
  shareCount: number;
  blockedAntiSpamCount: number;
}

export interface SimulateTikTokRequest {
  action: 'chat' | 'like' | 'gift' | 'follow' | 'share' | 'resetStats';
  uniqueId?: string;
  nickname?: string;
  comment?: string;
  likeCount?: number;
  giftId?: string | number;
  giftName?: string;
  diamondCount?: number;
  giftType?: number;
  repeatCount?: number;
  repeatEnd?: boolean;
  explicitTeam?: 'BLG' | 'GENG';
}

export interface SimulateTikTokResult {
  accepted: boolean;
  action: string;
  team?: 'BLG' | 'GENG';
  source?: 'explicit' | 'affinity' | 'balanced_fallback';
  championName?: string;
  deltaCoins?: number;
  streakCount?: number;
  reason?: string;
  stats: TikTokPipelineStats;
}

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : 'http://localhost:4000');
const CHANNEL_NAME = 'tiktok_live_game_bus';

class AdminSocketService {
  private socket: Socket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private lastOverlayPatch: Partial<OverlayVisibility> | null = null;
  private overlayListeners: ((visibility: Partial<OverlayVisibility>) => void)[] = [];
  private latestTeamConfig: TeamConfigState = createDefaultTeamConfig();
  private teamConfigListeners: ((config: TeamConfigState) => void)[] = [];
  private latestSeriesConfig: SeriesFormatConfig = DEFAULT_SERIES_CONFIG;
  private seriesConfigListeners: ((config: SeriesFormatConfig) => void)[] = [];
  private latestPipelineStats: TikTokPipelineStats = {
    trackedAffinityCount: 0,
    leftAffinityCount: 0,
    rightAffinityCount: 0,
    activeStreakCount: 0,
    followCount: 0,
    shareCount: 0,
    blockedAntiSpamCount: 0,
  };
  private pipelineStatsListeners: ((stats: TikTokPipelineStats) => void)[] = [];
  private authErrorListeners: ((payload: AuthErrorPayload) => void)[] = [];
  public isConnected = false;

  constructor() {
    // 1. Initialize BroadcastChannel for local offline sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    }

    // 2. Initialize Socket.io client to backend server
    try {
      this.socket = io(SERVER_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 5000,
        auth: (callback) => callback({ adminToken: readAdminToken() }),
      });

      this.socket.on(SERVER_AUTH_ERROR_EVENT, (payload: AuthErrorPayload) => {
        console.warn('[Admin Socket] Server rejected admin event:', payload?.event);
        this.authErrorListeners.forEach((cb) => cb(payload ?? {}));
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[Admin Socket] Connected to Backend Server on port 4000');
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('[Admin Socket] Disconnected from Backend Server');
      });

      this.socket.on('game:team-config', (payload: unknown) => {
        const cleanConfig = sanitizeTeamConfigState(payload);
        if (cleanConfig) {
          this.latestTeamConfig = cleanConfig;
          this.notifyTeamConfigListeners(cleanConfig);
        }
      });

      this.socket.on('game:overlay-visibility', (payload: unknown) => {
        const cleanPatch = pickOverlayVisibilityPatch(payload);
        if (Object.keys(cleanPatch).length > 0) {
          this.lastOverlayPatch = { ...this.lastOverlayPatch, ...cleanPatch };
          this.notifyOverlayListeners(cleanPatch);
        }
      });

      this.socket.on('tiktok:pipeline-stats', (payload: TikTokPipelineStats) => {
        if (payload && typeof payload.trackedAffinityCount === 'number') {
          this.latestPipelineStats = payload;
          this.pipelineStatsListeners.forEach((cb) => cb(payload));
        }
      });

      this.socket.on('game:series-format', (payload: SeriesFormatConfig) => {
        if (payload && typeof payload.format === 'string') {
          this.latestSeriesConfig = payload;
          this.notifySeriesConfigListeners(payload);
        }
      });
    } catch (err) {
      console.warn('[Admin Socket] Could not connect to backend server, falling back to BroadcastChannel', err);
    }

    // 3. Fallback initial HTTP fetch to ensure immediate state hydration
    if (typeof window !== 'undefined') {
      fetch(`${SERVER_URL}/api/overlay-visibility`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            const cleanPatch = pickOverlayVisibilityPatch(data);
            if (Object.keys(cleanPatch).length > 0) {
              this.lastOverlayPatch = { ...this.lastOverlayPatch, ...cleanPatch };
              this.notifyOverlayListeners(cleanPatch);
            }
          }
        })
        .catch(() => {});

      fetch(`${SERVER_URL}/api/tiktok/pipeline-stats`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: TikTokPipelineStats | null) => {
          if (data && typeof data.trackedAffinityCount === 'number') {
            this.latestPipelineStats = data;
            this.pipelineStatsListeners.forEach((cb) => cb(data));
          }
        })
        .catch(() => {});

      fetch(`${SERVER_URL}/api/teams`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          const cleanConfig = sanitizeTeamConfigState(data);
          if (cleanConfig) {
            this.latestTeamConfig = cleanConfig;
            this.notifyTeamConfigListeners(cleanConfig);
          }
        })
        .catch(() => {});

      fetch(`${SERVER_URL}/api/series-format`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: SeriesFormatConfig | null) => {
          if (data && typeof data.format === 'string') {
            this.latestSeriesConfig = data;
            this.notifySeriesConfigListeners(data);
          }
        })
        .catch(() => {});
    }
  }

  // Generic emitter that sends to both Socket.io and BroadcastChannel
  public emit(event: string, payload: any): void {
    if (this.socket) {
      this.socket.emit(event, payload);
    }

    // HTTP REST fallback for overlay visibility
    if (event === 'admin:overlay-visibility' && typeof window !== 'undefined') {
      fetch(`${SERVER_URL}/api/overlay-visibility`, {
        method: HTTP_METHOD_POST,
        headers: buildAdminHeaders(HTTP_METHOD_POST, JSON_HEADERS),
        body: JSON.stringify(payload),
      }).catch(() => {
        // ignore offline fetch error
      });
    }

    // Also dispatch to BroadcastChannel for direct client tab sync
    if (this.broadcastChannel) {
      let mappedType = '';
      switch (event) {
        case 'admin:summon':
          mappedType = 'SUMMON_MINION';
          break;
        case 'admin:gift':
          mappedType = 'TRIGGER_GIFT';
          break;
        case 'admin:like':
          mappedType = 'ADD_LIKE';
          break;
        case 'admin:overlay-visibility':
          mappedType = 'SET_OVERLAY_VISIBILITY';
          break;
        case 'admin:set-theme':
          mappedType = 'SET_GAME_THEME';
          break;
        case 'admin:auto-pro-battle':
          mappedType = 'SET_AUTO_PRO_BATTLE';
          break;
        case 'admin:set-team-config':
          mappedType = 'SET_TEAM_CONFIG';
          break;
        case 'admin:chat':
          mappedType = 'SEND_CHAT';
          break;
        case 'admin:boss-control':
          if (payload.action === 'reset') mappedType = 'RESET_BOSS';
          if (payload.action === 'setHp') {
            this.broadcastChannel.postMessage({ type: 'SET_BOSS_HP', payload: { hp: payload.hp } });
            return;
          }
          if (payload.action === 'setEnraged') {
            this.broadcastChannel.postMessage({ type: 'SET_ENRAGED', payload: { isEnraged: payload.isEnraged } });
            return;
          }
          break;
        case 'admin:bo5-control':
          if (payload.action === 'reset') mappedType = 'RESET_BO5';
          if (payload.action === 'nextRound') mappedType = 'START_NEXT_ROUND';
          if (payload.action === 'setScore') {
            this.broadcastChannel.postMessage({
              type: 'SET_BO5_SCORE',
              payload: { blg: payload.blg, geng: payload.geng, currentRound: payload.currentRound },
            });
            return;
          }
          break;
        default:
          break;
      }

      if (mappedType) {
        this.broadcastChannel.postMessage({ type: mappedType, payload });
      }
    }
  }

  public setGameTheme(theme: GameThemeType): void {
    this.emit('admin:set-theme', { theme });
  }

  public onGameTheme(callback: (data: { theme: GameThemeType }) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('game:theme', callback);
    return () => {
      this.socket?.off('game:theme', callback);
    };
  }

  public setOverlayVisibility(payload: Partial<OverlayVisibility>): void {
    this.emit('admin:overlay-visibility', payload);
  }

  public onOverlayVisibility(callback: (visibility: Partial<OverlayVisibility>) => void): () => void {
    if (this.lastOverlayPatch) {
      callback(this.lastOverlayPatch);
    }
    this.overlayListeners.push(callback);
    return () => {
      this.overlayListeners = this.overlayListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyOverlayListeners(patch: Partial<OverlayVisibility>): void {
    for (const listener of this.overlayListeners) {
      try {
        listener(patch);
      } catch (err) {
        console.error('[Admin Socket] Error in overlay listener:', err);
      }
    }
  }

  public setTeamConfig(config: TeamConfigState, resetMatch = false): void {
    this.latestTeamConfig = config;
    this.notifyTeamConfigListeners(config);
    const payload = { ...config, resetMatch };
    this.emit('admin:set-team-config', payload);
    if (typeof window !== 'undefined') {
      fetch(`${SERVER_URL}/api/teams`, {
        method: HTTP_METHOD_POST,
        headers: buildAdminHeaders(HTTP_METHOD_POST, JSON_HEADERS),
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
  }

  public onTeamConfig(callback: (config: TeamConfigState) => void): () => void {
    callback(this.latestTeamConfig);
    this.teamConfigListeners.push(callback);
    return () => {
      this.teamConfigListeners = this.teamConfigListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyTeamConfigListeners(config: TeamConfigState): void {
    for (const listener of this.teamConfigListeners) {
      try {
        listener(config);
      } catch (err) {
        console.error('[Admin Socket] Error in team config listener:', err);
      }
    }
  }

  public setBossSkillConfig(payload: Partial<BossSkillConfig>): void {
    this.emit('admin:boss-skill-config', payload);
  }

  public setAutoProBattleConfig(payload: {
    enabled?: boolean;
    onlyWhenIdle?: boolean;
    intervalMs?: number;
  }): void {
    this.emit('admin:auto-pro-battle', payload);
  }

  public onAutoProBattleConfig(
    callback: (config: { enabled: boolean; onlyWhenIdle: boolean; intervalMs: number }) => void
  ): () => void {
    if (!this.socket) return () => {};
    this.socket.on('game:auto-pro-battle', callback);
    return () => {
      this.socket?.off('game:auto-pro-battle', callback);
    };
  }

  public castBossSkill(skillIndex?: number): void {
    this.emit('admin:boss-cast-skill', { skillIndex });
  }

  public healTeam(team: 'BLG' | 'GEN' | 'GENG' | 'ALL', amount: number): void {
    this.emit('admin:heal-team', { team, amount });
  }

  public onBossSkillConfig(callback: (config: BossSkillConfig) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('game:boss-skill-config', callback);
    return () => {
      this.socket?.off('game:boss-skill-config', callback);
    };
  }

  public onTiktokStatus(callback: (status: TiktokStatusPayload) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('tiktok:status', callback);
    return () => {
      this.socket?.off('tiktok:status', callback);
    };
  }

  public onAuthError(callback: (payload: AuthErrorPayload) => void): () => void {
    this.authErrorListeners.push(callback);
    return () => {
      this.authErrorListeners = this.authErrorListeners.filter((cb) => cb !== callback);
    };
  }

  /** Persists a new admin token (empty = clear) and reconnects so the handshake uses it. */
  public updateAdminToken(token: string): void {
    writeAdminToken(token.trim());
    if (!this.socket) return;
    this.socket.disconnect();
    this.socket.connect();
  }

  public onSeriesFormat(callback: (config: SeriesFormatConfig) => void): () => void {
    callback(this.latestSeriesConfig);
    this.seriesConfigListeners.push(callback);
    return () => {
      this.seriesConfigListeners = this.seriesConfigListeners.filter((cb) => cb !== callback);
    };
  }

  private notifySeriesConfigListeners(config: SeriesFormatConfig): void {
    for (const listener of this.seriesConfigListeners) {
      try {
        listener(config);
      } catch (err) {
        console.error('[Admin Socket] Error in series format listener:', err);
      }
    }
  }

  public setSeriesFormat(format: SeriesFormat, resetScore = false): void {
    this.emit('admin:set-series-format', { format, resetScore });
    if (typeof window !== 'undefined') {
      fetch(`${SERVER_URL}/api/series-format`, {
        method: HTTP_METHOD_POST,
        headers: buildAdminHeaders(HTTP_METHOD_POST, JSON_HEADERS),
        body: JSON.stringify({ format, resetScore }),
      }).catch(() => {});
    }
  }

  public onSilverScrapesState(callback: (state: SilverScrapesDuelState) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('game:silver-scrapes-state', callback);
    return () => {
      this.socket?.off('game:silver-scrapes-state', callback);
    };
  }

  public setSilverScrapesControl(
    action: 'start' | 'stop' | 'extend' | 'setLane',
    lane?: DuelLaneKey,
    duration?: number
  ): void {
    this.emit('admin:silver-scrapes-duel', { action, lane, duration });
  }

  public emitChampionDamageConfig(multiplier: number): void {
    this.emit('admin:champion-damage-config', { multiplier });
  }

  public onChampionDamageConfig(callback: (multiplier: number) => void): () => void {
    const handler = (payload: { multiplier?: number }) => {
      if (typeof payload?.multiplier === 'number') {
        callback(payload.multiplier);
      }
    };
    this.socket?.on('game:champion-damage-config', handler);
    return () => {
      this.socket?.off('game:champion-damage-config', handler);
    };
  }

  public emitUserAvatarConfig(enabled: boolean): void {
    this.emit('admin:user-avatar-config', { enabled });
  }

  public onUserAvatarConfig(callback: (enabled: boolean) => void): () => void {
    const handler = (payload: { enabled?: boolean }) => {
      if (typeof payload?.enabled === 'boolean') {
        callback(payload.enabled);
      }
    };
    this.socket?.on('game:user-avatar-config', handler);
    return () => {
      this.socket?.off('game:user-avatar-config', handler);
    };
  }

  public emitParticipationRules(patch: Partial<ParticipationRuleConfig>): void {
    this.emit('admin:participation-rules', patch);
  }

  public onParticipationRules(callback: (rules: ParticipationRuleConfig) => void): () => void {
    const handler = (payload: Partial<ParticipationRuleConfig>) => {
      if (payload && typeof payload.allowTeamOnlySummon === 'boolean') {
        callback({
          allowTeamOnlySummon: payload.allowTeamOnlySummon,
          autoMatchSignatureTeam: Boolean(payload.autoMatchSignatureTeam),
          lockTeamAfterJoin: Boolean(payload.lockTeamAfterJoin),
          allowChampionEvolution: Boolean(payload.allowChampionEvolution),
          maxDeployPerTurn:
            typeof payload.maxDeployPerTurn === 'number'
              ? payload.maxDeployPerTurn
              : SUMMON_QUEUE_UI.DEFAULT_DEPLOY_PER_TURN,
          summonTurnDelayMs:
            typeof payload.summonTurnDelayMs === 'number'
              ? payload.summonTurnDelayMs
              : SUMMON_QUEUE_UI.DEFAULT_TURN_DELAY_MS,
        });
      }
    };
    this.socket?.on('game:participation-rules', handler);
    return () => {
      this.socket?.off('game:participation-rules', handler);
    };
  }

  public async connectTiktokRoom(username: string): Promise<any> {
    const res = await fetch(`${SERVER_URL}/api/tiktok/connect`, {
      method: HTTP_METHOD_POST,
      headers: buildAdminHeaders(HTTP_METHOD_POST, JSON_HEADERS),
      body: JSON.stringify({ username }),
    });
    return res.json();
  }

  public async disconnectTiktokRoom(): Promise<any> {
    const res = await fetch(`${SERVER_URL}/api/tiktok/disconnect`, {
      method: HTTP_METHOD_POST,
      headers: buildAdminHeaders(HTTP_METHOD_POST),
    });
    return res.json();
  }

  public onPipelineStats(callback: (stats: TikTokPipelineStats) => void): () => void {
    callback(this.latestPipelineStats);
    this.pipelineStatsListeners.push(callback);
    return () => {
      this.pipelineStatsListeners = this.pipelineStatsListeners.filter((cb) => cb !== callback);
    };
  }

  public async simulateTikTokEvent(payload: SimulateTikTokRequest): Promise<SimulateTikTokResult | null> {
    try {
      const res = await fetch(`${SERVER_URL}/api/tiktok/simulate`, {
        method: HTTP_METHOD_POST,
        headers: buildAdminHeaders(HTTP_METHOD_POST, JSON_HEADERS),
        body: JSON.stringify(payload),
      });
      if (!res.ok) return null;
      const result = (await res.json()) as SimulateTikTokResult;
      if (result.stats) {
        this.latestPipelineStats = result.stats;
        this.pipelineStatsListeners.forEach((cb) => cb(result.stats));
      }
      return result;
    } catch {
      return null;
    }
  }
}

export const adminSocket = new AdminSocketService();

