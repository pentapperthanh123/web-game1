import { io, Socket } from 'socket.io-client';
import { OverlayVisibility } from '../types/overlay';
import { BossSkillConfig } from '../types/bossSkill';
import {
  loadStoredOverlayVisibility,
  pickOverlayVisibilityPatch,
} from '../utils/overlayVisibility';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:4000');
const CHANNEL_NAME = 'tiktok_live_game_bus';

class AdminSocketService {
  private socket: Socket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private lastOverlayPatch: Partial<OverlayVisibility> | null = null;
  private overlayListeners: ((visibility: Partial<OverlayVisibility>) => void)[] = [];
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
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[Admin Socket] Connected to Backend Server on port 4000');
        // Push Admin's locally saved overlay visibility to server so server stays synchronized
        const stored = loadStoredOverlayVisibility();
        this.emit('admin:overlay-visibility', stored);
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('[Admin Socket] Disconnected from Backend Server');
      });

      this.socket.on('game:overlay-visibility', (payload: unknown) => {
        const cleanPatch = pickOverlayVisibilityPatch(payload);
        if (Object.keys(cleanPatch).length > 0) {
          this.lastOverlayPatch = { ...this.lastOverlayPatch, ...cleanPatch };
          this.notifyOverlayListeners(cleanPatch);
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  public setGameTheme(theme: 'BARON' | 'ELDER_DRAGON'): void {
    this.emit('admin:set-theme', { theme });
  }

  public onGameTheme(callback: (data: { theme: 'BARON' | 'ELDER_DRAGON' }) => void): () => void {
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

  public healTeam(team: 'BLG' | 'GEN' | 'ALL', amount: number): void {
    this.emit('admin:heal-team', { team, amount });
  }

  public onBossSkillConfig(callback: (config: BossSkillConfig) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('game:boss-skill-config', callback);
    return () => {
      this.socket?.off('game:boss-skill-config', callback);
    };
  }

  public onTiktokStatus(callback: (status: any) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('tiktok:status', callback);
    return () => {
      this.socket?.off('tiktok:status', callback);
    };
  }

  public async connectTiktokRoom(username: string): Promise<any> {
    const res = await fetch(`${SERVER_URL}/api/tiktok/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return res.json();
  }

  public async disconnectTiktokRoom(): Promise<any> {
    const res = await fetch(`${SERVER_URL}/api/tiktok/disconnect`, {
      method: 'POST',
    });
    return res.json();
  }
}

export const adminSocket = new AdminSocketService();

