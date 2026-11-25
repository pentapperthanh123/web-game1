import {
  DEMO_AUDIENCE_COMMENTS_VI,
  DEMO_VIEWER_NAMES,
} from '@shared/constants/presets';
import { AUTOBOT_PACE_PRESETS } from '@shared/constants/salonConfig';
import type { AutoBotPace } from '@shared/types/salon';
import {
  salonAdminEmitter,
  simulateLargeRoyalGift,
  simulateLikeBurst,
  simulateMediumTrollGift,
  simulateQueueCustomer,
  simulateSmallGiftVip,
} from './adminEmitter';

const STYLE_CHATS = ['hong', 'vang', 'xanh', 'tim', 'xoan', 'ngau', 'dai', 'ngan'];

export class SalonAutoBotService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private enabled = false;
  private pace: AutoBotPace = 'NORMAL';

  public start(pace: AutoBotPace): void {
    this.stop();
    this.enabled = true;
    this.pace = pace;
    const preset = AUTOBOT_PACE_PRESETS[pace];
    this.timer = setInterval(() => this.step(), preset.intervalMs);
  }

  public stop(): void {
    this.enabled = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public isRunning(): boolean {
    return this.enabled;
  }

  public setPace(pace: AutoBotPace): void {
    this.pace = pace;
    if (this.enabled) {
      this.start(pace);
    }
  }

  private step(): void {
    const preset = AUTOBOT_PACE_PRESETS[this.pace];
    const roll = Math.random();
    let acc = preset.queueChance;

    if (roll < acc) {
      simulateQueueCustomer('AUTOBOT');
      return;
    }

    acc += preset.styleChatChance;
    if (roll < acc) {
      const name = DEMO_VIEWER_NAMES[Math.floor(Math.random() * DEMO_VIEWER_NAMES.length)];
      const isStyleWord = Math.random() < 0.45;
      const text = isStyleWord
        ? STYLE_CHATS[Math.floor(Math.random() * STYLE_CHATS.length)]
        : DEMO_AUDIENCE_COMMENTS_VI[Math.floor(Math.random() * DEMO_AUDIENCE_COMMENTS_VI.length)];
      salonAdminEmitter.emitLiveEvent({
        type: 'CHAT',
        source: 'AUTOBOT',
        timestamp: Date.now(),
        user: {
          id: `bot_${name.toLowerCase().replace(/\s+/g, '_')}_${Math.floor(Math.random() * 9)}`,
          nickname: name,
        },
        text,
        cleanText: text,
      });
      return;
    }

    acc += preset.likeChance;
    if (roll < acc) {
      simulateLikeBurst(Math.floor(4 + Math.random() * 10), 'AUTOBOT');
      return;
    }

    acc += preset.smallGiftChance;
    if (roll < acc) {
      simulateSmallGiftVip('AUTOBOT');
      return;
    }

    acc += preset.mediumTrollChance;
    if (roll < acc) {
      simulateMediumTrollGift('AUTOBOT');
      return;
    }

    acc += preset.largeRoyalChance;
    if (roll < acc) {
      simulateLargeRoyalGift('AUTOBOT');
      return;
    }

    salonAdminEmitter.emitLiveEvent({
      type: 'JOIN',
      source: 'AUTOBOT',
      timestamp: Date.now(),
    });
  }
}

export const salonAutoBot = new SalonAutoBotService();
