import { io, Socket } from 'socket.io-client';
import { TikTokLivePipeline } from './tiktokLivePipeline.js';
import { ServerContext } from '../types/serverState.js';

export interface GatewayAdapterOptions {
  gatewayUrl: string;
  apiKey?: string;
}

export interface GatewayUser {
  id: string;
  username: string;
  nickname: string;
  avatarUrl?: string;
  fansLevel?: number;
}

export interface GatewayEvent {
  type: 'CHAT' | 'GIFT' | 'LIKE' | 'JOIN' | 'FOLLOW' | 'SHARE' | 'ROOM_STATS' | 'SESSION_STATUS';
  platform: string;
  timestamp: number;
  user?: GatewayUser;
  [key: string]: unknown;
}

/**
 * Adapter allows the Boss Arena Game server to seamlessly consume normalized events
 * from live-connect-gateway via Socket.IO, mapping them cleanly to TikTokLivePipeline.
 */
export class GatewayAdapter {
  private socket: Socket | null = null;

  constructor(
    private readonly ctx: ServerContext,
    private readonly pipeline: TikTokLivePipeline,
    private readonly options: GatewayAdapterOptions
  ) {}

  public start(): void {
    if (this.socket) return;

    console.log(`[GatewayAdapter] Connecting to Live Connect Gateway at ${this.options.gatewayUrl}...`);

    this.socket = io(this.options.gatewayUrl, {
      auth: {
        apiKey: this.options.apiKey,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log(`[GatewayAdapter] Connected to Live Connect Gateway!`);
      this.ctx.state.connectionStatus = 'CONNECTED';
      this.ctx.io.emit('tiktok:status', {
        status: 'CONNECTED',
        username: 'live-gateway',
        attempt: 0,
        nextRetryAt: null,
      });
    });

    this.socket.on('disconnect', () => {
      console.warn(`[GatewayAdapter] Disconnected from Live Connect Gateway.`);
      this.ctx.state.connectionStatus = 'DISCONNECTED';
      this.ctx.io.emit('tiktok:status', {
        status: 'DISCONNECTED',
        username: 'live-gateway',
      });
    });

    this.socket.on('live:status', (status: { state: string; targetId: string; message?: string }) => {
      console.log(`[GatewayAdapter] Gateway status changed: ${status.state} (@${status.targetId})`);
      if (status.state === 'connected') {
        this.ctx.state.tiktokUsername = status.targetId;
      }
    });

    this.socket.on('live:event', (event: GatewayEvent) => {
      this.handleGatewayEvent(event);
    });
  }

  public stop(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private handleGatewayEvent(event: GatewayEvent): void {
    try {
      const user = event.user || { id: 'anonymous', username: 'anonymous', nickname: 'Viewer' };

      switch (event.type) {
        case 'CHAT': {
          const text = String(event.text || event.cleanText || '');
          this.pipeline.handleChat({
            uniqueId: user.username || user.id,
            nickname: user.nickname,
            userAvatarUrl: user.avatarUrl,
            comment: text,
            fansLevel: user.fansLevel,
          });
          this.ctx.io.emit('tiktok:pipeline-stats', this.pipeline.getStats());
          break;
        }

        case 'GIFT': {
          const giftId = event.giftId as string | number;
          const giftName = String(event.giftName || 'Gift');
          const unitCoins = Number(event.coinValue) || 1;
          const repeatCount = Number(event.repeatCount) || 1;
          const repeatEnd = Boolean(event.isStreakEnd);

          this.pipeline.handleGift({
            uniqueId: user.username || user.id,
            nickname: user.nickname,
            userAvatarUrl: user.avatarUrl,
            giftId,
            giftName,
            diamondCount: unitCoins,
            repeatCount,
            repeatEnd,
            fansLevel: user.fansLevel,
          });
          this.ctx.io.emit('tiktok:pipeline-stats', this.pipeline.getStats());
          break;
        }

        case 'LIKE': {
          const count = Number(event.count) || 1;
          this.pipeline.handleLike({
            uniqueId: user.username || user.id,
            nickname: user.nickname,
            likeCount: count,
          });
          break;
        }

        case 'FOLLOW': {
          this.pipeline.handleFollow({
            uniqueId: user.username || user.id,
            nickname: user.nickname,
          });
          this.ctx.io.emit('tiktok:pipeline-stats', this.pipeline.getStats());
          break;
        }

        case 'SHARE': {
          this.pipeline.handleShare({
            uniqueId: user.username || user.id,
            nickname: user.nickname,
          });
          this.ctx.io.emit('tiktok:pipeline-stats', this.pipeline.getStats());
          break;
        }
      }
    } catch (err) {
      console.error('[GatewayAdapter] Error processing gateway event:', err);
    }
  }
}

