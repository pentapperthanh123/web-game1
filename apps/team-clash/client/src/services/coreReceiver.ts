import { io, type Socket } from 'socket.io-client';
import { CLASH_PORTS } from '../../../shared/constants/clashConfig';
import type { PushResult, PushTier, TeamId } from '../../../shared/types/clash';
import type { ClashSyncMessage, NormalizedLiveEvent, NormalizedViewer } from '../../../shared/types/events';
import { useClashStore } from '../store/clashStore';
import { useGiftTallyStore } from '../store/giftTallyStore';
import { usePushFeedStore } from '../store/pushFeedStore';
import { resolveGiftIcon, resolveGiftTier } from '../utils/giftCatalog';
import { audioService } from './audioService';

export type PushFxHandler = (push: PushResult) => void;

/** Starts a gift flight; returns false if it cannot (the gift is then applied immediately). */
export type GiftStrikeHandler = (
  team: TeamId,
  tier: PushTier,
  icon: string,
  onImpact: () => void
) => boolean;

export function mapTeamToId(rawTeam?: string | null): TeamId | undefined {
  if (!rawTeam) return undefined;
  const upper = String(rawTeam).trim().toUpperCase();
  if (upper === 'LEFT' || upper === 'BLG' || upper === 'T1' || upper === 'GIRL') return 'LEFT';
  if (upper === 'RIGHT' || upper === 'GENG' || upper === 'T2' || upper === 'BOY') return 'RIGHT';
  return undefined;
}

/** Server tags viewers it can't place with this source and alternates BLG/GENG per event. */
const SERVER_BALANCED_FALLBACK_SOURCE = 'balanced_fallback';

/**
 * The server doesn't know this game's join keywords ("g"/"b"…), so for viewers it hasn't placed it
 * guesses a team round-robin. Once the viewer picked a side here, our choice wins; the server's
 * guess is only used for viewers this game hasn't placed yet.
 */
function resolveServerTeam(
  userId: string,
  rawTeam: string | undefined,
  affinitySource: string | undefined
): TeamId | undefined {
  const isGuess = affinitySource === SERVER_BALANCED_FALLBACK_SOURCE;
  if (isGuess && useClashStore.getState().userTeamMap.has(userId)) return undefined;
  return mapTeamToId(rawTeam);
}

/**
 * Same origin by default: the Vite dev/preview server proxies /socket.io to the game server, so the
 * stage works on localhost, a LAN IP and behind an ngrok tunnel alike. VITE_SERVER_URL overrides it
 * (e.g. a static build served without the proxy).
 */
const DEFAULT_SERVER_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVER_URL) ||
  (typeof window !== 'undefined' && window.location.hostname
    ? `${window.location.protocol}//${window.location.hostname}:${CLASH_PORTS.GAME_SERVER}`
    : `http://localhost:${CLASH_PORTS.GAME_SERVER}`);

export class CoreReceiver {
  private socket: Socket | null = null;
  private readonly serverUrl: string;
  private onPushFxCallback: PushFxHandler | null = null;
  private onGiftStrikeCallback: GiftStrikeHandler | null = null;

  constructor(serverUrl = DEFAULT_SERVER_URL) {
    this.serverUrl = serverUrl;
  }

  /** Arena reaction (lunge, orb kick, sparks) for every push that was actually applied. */
  public setPushFxHandler(cb: PushFxHandler | null): void {
    this.onPushFxCallback = cb;
  }

  /** Gift flight from the gift panel into the clash orb (push lands on impact). */
  public setGiftStrikeHandler(cb: GiftStrikeHandler | null): void {
    this.onGiftStrikeCallback = cb;
  }

  private presentPush(push: PushResult | null): void {
    if (!push) return;
    this.onPushFxCallback?.(push);
    audioService.playPushSound(push.tier, push.team);
    usePushFeedStore.getState().addPush(push, performance.now());
  }

  public connect(): void {
    if (this.socket) return;

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 5000,
    });

    this.socket.on('connect', () => {
      console.log(`[CoreReceiver] Connected to Game Server on ${this.serverUrl}`);
    });

    this.socket.on('disconnect', () => {
      console.log('[CoreReceiver] Disconnected from Game Server');
    });

    // Realtime Host Admin actions across ports & OBS via Socket.IO
    this.socket.on('clash:action', (msg: ClashSyncMessage) => {
      this.handleClashAction(msg);
    });

    this.socket.on('live:event', (event: NormalizedLiveEvent) => {
      this.dispatchEvent(event);
    });

    // Fallback channels from game server directly (matching web-game1)
    this.socket.on(
      'game:chat',
      (data: { userName: string; text: string; avatarUrl?: string; team?: string }) => {
        const team = mapTeamToId(data.team);
        this.dispatchEvent({
          type: 'CHAT',
          timestamp: Date.now(),
          user: {
            id: data.userName,
            username: data.userName,
            nickname: data.userName,
            avatarUrl: data.avatarUrl,
          },
          text: data.text,
          team,
        });
      }
    );

    this.socket.on(
      'game:gift',
      (data: {
        donorName: string;
        donorAvatarUrl?: string;
        giftName: string;
        coins?: number;
        deltaCoins?: number;
        team?: string;
        streakCount?: number;
        totalCoins?: number;
        isComboFinal?: boolean;
        affinitySource?: string;
      }) => {
        // Server sends `coins` = coins NEW in this event (combo delta) and `streakCount` = combo
        // running total. Multiplying them would re-count earlier combo hits (1+2+3… for a x3 Rose),
        // so derive unit price from totalCoins and push only the new gifts.
        const deltaCoins = Number(data.coins ?? data.deltaCoins ?? 1) || 1;
        const streakCount = Math.max(1, Number(data.streakCount ?? 1));
        const coinValue = data.totalCoins
          ? Math.max(1, Math.round(data.totalCoins / streakCount))
          : deltaCoins;
        const repeatCount = Math.max(1, Math.round(deltaCoins / coinValue));
        const team = resolveServerTeam(data.donorName, data.team, data.affinitySource);

        this.dispatchEvent({
          type: 'GIFT',
          timestamp: Date.now(),
          user: {
            id: data.donorName,
            username: data.donorName,
            nickname: data.donorName,
            avatarUrl: data.donorAvatarUrl,
          },
          giftName: data.giftName,
          coinValue,
          repeatCount,
          team,
        });
      }
    );

    this.socket.on(
      'game:like',
      (data: {
        userName: string;
        count: number;
        team?: string;
        avatarUrl?: string;
        affinitySource?: string;
      }) => {
        const team = resolveServerTeam(data.userName, data.team, data.affinitySource);
        this.dispatchEvent({
          type: 'LIKE',
          timestamp: Date.now(),
          user: {
            id: data.userName,
            username: data.userName,
            nickname: data.userName,
            avatarUrl: data.avatarUrl,
          },
          count: data.count || 1,
          team,
        });
      }
    );
  }

  public dispatchEvent(event: NormalizedLiveEvent): void {
    const store = useClashStore.getState();
    const user: NormalizedViewer = event.user ?? {
      id: 'viewer_' + Math.floor(Math.random() * 10000),
      username: 'Viewer',
      nickname: 'Viewer',
    };
    const explicitTeam = mapTeamToId(event.team);

    switch (event.type) {
      case 'CHAT': {
        const text = String(event.text ?? event.cleanText ?? '');
        this.presentPush(store.handleChat(user, text, explicitTeam));
        break;
      }
      case 'LIKE': {
        const count = Number(event.count) || 1;
        this.presentPush(store.handleLike(user, count, explicitTeam));
        break;
      }
      case 'GIFT': {
        const giftName = String(event.giftName || 'Rose');
        const coinValue = Number(event.coinValue) || 1;
        const repeatCount = Number(event.repeatCount) || 1;
        this.dispatchGift(user, giftName, coinValue, repeatCount, explicitTeam);
        break;
      }
      case 'JOIN': {
        store.handleJoin(user);
        break;
      }
      default:
        break;
    }
  }

  /**
   * Gift goes into the tally panel right away, then flies into the orb; the push itself is
   * applied on impact so the orb moves exactly when the hit lands.
   */
  private dispatchGift(
    user: NormalizedViewer,
    giftName: string,
    coinValue: number,
    repeatCount: number,
    explicitTeam?: TeamId
  ): void {
    const store = useClashStore.getState();
    const applyGift = () => {
      this.presentPush(
        useClashStore.getState().handleGift(user, giftName, coinValue, repeatCount, explicitTeam)
      );
    };

    if (store.roundStatus !== 'PLAYING') {
      applyGift();
      return;
    }

    // Same team rule as handleGift: explicit team first, then user's assigned team, fallback to LEFT.
    const team: TeamId = explicitTeam ?? store.userTeamMap.get(user.id) ?? 'LEFT';
    const safeRepeat = Math.max(1, repeatCount);
    const totalCoins = Math.max(1, coinValue) * safeRepeat;
    const tier = resolveGiftTier(totalCoins);
    const icon = resolveGiftIcon(giftName, tier);

    useGiftTallyStore
      .getState()
      .addGift({ giftName, icon, count: safeRepeat, coins: totalCoins, team, tier }, performance.now());

    const isLaunched = this.onGiftStrikeCallback?.(team, tier, icon, applyGift) ?? false;
    if (!isLaunched) applyGift();
  }

  public emitClashMessage(msg: ClashSyncMessage): void {
    try {
      this.socket?.emit(msg.type === 'STATE_SYNC' ? 'clash:state' : 'clash:action', msg);
    } catch {
      // Socket tolerance
    }
  }

  public handleClashAction(msg: ClashSyncMessage): void {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'LIVE_EVENT' && msg.event) {
      this.dispatchEvent(msg.event);
      return;
    }
    if (msg.type === 'ADMIN_ACTION') {
      const store = useClashStore.getState();
      switch (msg.action) {
        case 'START_ROUND':
          store.startRound();
          break;
        case 'PAUSE_ROUND':
          store.pauseRound();
          break;
        case 'RESET_ROUND':
          store.resetRound();
          break;
        case 'RESET_MATCH':
          store.resetMatch();
          break;
        case 'REBALANCE_50_50':
          store.rebalance5050();
          break;
        case 'DRAMA_BOOST':
          store.dramaBoost();
          break;
        case 'SET_PRESET':
          if (msg.payload?.presetId) {
            store.setPreset(msg.payload.presetId);
          }
          break;
        case 'SET_CUSTOM_PRESET':
          if (msg.payload?.customPreset) {
            store.setCustomPreset(msg.payload.customPreset);
          }
          break;
        case 'SET_LANGUAGE':
          if (msg.payload?.language) {
            store.setLanguage(msg.payload.language);
          }
          break;
        case 'SET_ROUND_DURATION':
          if (msg.payload?.durationSeconds) {
            store.setRoundDuration(msg.payload.durationSeconds);
          }
          break;
        case 'SET_PUSH_MULTIPLIERS':
          if (msg.payload?.multipliers) {
            store.setPushMultipliers(msg.payload.multipliers);
          }
          break;
        case 'SET_SOUND_CONFIG':
          if (msg.payload?.soundConfig) {
            audioService.setConfig(msg.payload.soundConfig);
          }
          break;
        case 'TEST_SOUND':
          if (msg.payload?.soundType) {
            audioService.unlockAudio();
            audioService.playPushSound(msg.payload.soundType, msg.payload.soundTeam);
          }
          break;
        case 'SIMULATE_EVENT':
          if (msg.payload?.simulatedEvent) {
            this.dispatchEvent(msg.payload.simulatedEvent);
          }
          break;
        default:
          break;
      }
    }
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const coreReceiver = new CoreReceiver();
