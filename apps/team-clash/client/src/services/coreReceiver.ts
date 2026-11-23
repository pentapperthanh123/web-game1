import { io, type Socket } from 'socket.io-client';
import { CLASH_PORTS } from '../../../shared/constants/clashConfig';
import type { NormalizedLiveEvent, NormalizedViewer } from '../../../shared/types/events';
import { useClashStore } from '../store/clashStore';
import { audioService } from './audioService';

export class CoreReceiver {
  private socket: Socket | null = null;
  private readonly serverUrl: string;
  private onSparkCallback: ((team: 'LEFT' | 'RIGHT', count: number) => void) | null = null;

  constructor(serverUrl = `http://localhost:${CLASH_PORTS.CORE_GATEWAY}`) {
    this.serverUrl = serverUrl;
  }

  public setSparkHandler(cb: (team: 'LEFT' | 'RIGHT', count: number) => void): void {
    this.onSparkCallback = cb;
  }

  public connect(): void {
    if (this.socket) return;

    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('live:event', (event: NormalizedLiveEvent) => {
      this.dispatchEvent(event);
    });

    // Fallback channels from game server directly
    this.socket.on('game:chat', (data: { userName: string; text: string; avatarUrl?: string }) => {
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
      });
    });

    this.socket.on(
      'game:gift',
      (data: { donorName: string; donorAvatarUrl?: string; giftName: string; coins: number }) => {
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
          coinValue: data.coins,
          repeatCount: 1,
        });
      }
    );

    this.socket.on('game:like', (data: { userName: string; count: number }) => {
      this.dispatchEvent({
        type: 'LIKE',
        timestamp: Date.now(),
        user: {
          id: data.userName,
          username: data.userName,
          nickname: data.userName,
        },
        count: data.count || 1,
      });
    });
  }

  public dispatchEvent(event: NormalizedLiveEvent): void {
    const store = useClashStore.getState();
    const user: NormalizedViewer = event.user ?? {
      id: 'viewer_' + Math.floor(Math.random() * 10000),
      username: 'Viewer',
      nickname: 'Viewer',
    };

    switch (event.type) {
      case 'CHAT': {
        const text = String(event.text ?? event.cleanText ?? '');
        store.handleChat(user, text);
        const assignedTeam = store.userTeamMap.get(user.id);
        if (assignedTeam) {
          this.onSparkCallback?.(assignedTeam, 4);
          audioService.playPushSound('SMALL', assignedTeam);
        }
        break;
      }
      case 'LIKE': {
        const count = Number(event.count) || 1;
        store.handleLike(user, count);
        const assignedTeam = store.userTeamMap.get(user.id);
        if (assignedTeam) {
          this.onSparkCallback?.(assignedTeam, 2);
          audioService.playPushSound('SMALL', assignedTeam);
        }
        break;
      }
      case 'GIFT': {
        const giftName = String(event.giftName || 'Rose');
        const coinValue = Number(event.coinValue) || 1;
        const repeatCount = Number(event.repeatCount) || 1;
        store.handleGift(user, giftName, coinValue, repeatCount);
        const assignedTeam = store.userTeamMap.get(user.id) ?? 'LEFT';

        const totalCoins = coinValue * repeatCount;
        if (totalCoins >= 30) {
          audioService.playPushSound('LARGE', assignedTeam);
          this.onSparkCallback?.(assignedTeam, 35);
        } else if (totalCoins >= 5) {
          audioService.playPushSound('MEDIUM', assignedTeam);
          this.onSparkCallback?.(assignedTeam, 18);
        } else {
          audioService.playPushSound('SMALL', assignedTeam);
          this.onSparkCallback?.(assignedTeam, 8);
        }
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

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const coreReceiver = new CoreReceiver();
