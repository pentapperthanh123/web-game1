import { startBackgroundTicker, type BackgroundTickerHandle } from '@shared/backgroundTicker';
import { AUTOBOT_PACE_PRESETS } from '@shared/config';
import type { AutoBotPace } from '@shared/types';
import {
  triggerFlavorChatSimulation,
  triggerGiftLargeSimulation,
  triggerGiftMediumSimulation,
  triggerGiftSmallSimulation,
  triggerLikeSimulation,
  triggerOrderSimulation,
} from './adminBridge';

class AutoBotBarEngine {
  private ticker: BackgroundTickerHandle | null = null;
  private isRunning = false;
  private pace: AutoBotPace = 'NORMAL';

  public start(pace: AutoBotPace): void {
    this.stop();
    this.isRunning = true;
    this.pace = pace;
    const preset = AUTOBOT_PACE_PRESETS[pace];
    this.step();
    this.ticker = startBackgroundTicker(preset.intervalMs, () => this.step());
  }

  public stop(): void {
    this.isRunning = false;
    if (this.ticker) {
      this.ticker.stop();
      this.ticker = null;
    }
  }

  public setPace(pace: AutoBotPace): void {
    this.pace = pace;
    if (this.isRunning) {
      this.start(pace);
    }
  }

  private step(): void {
    if (!this.isRunning) return;
    const preset = AUTOBOT_PACE_PRESETS[this.pace];
    const roll = Math.random();
    let acc = preset.orderChance;

    if (roll < acc) {
      triggerOrderSimulation('AUTOBOT');
      return;
    }

    acc += preset.flavorChatChance;
    if (roll < acc) {
      triggerFlavorChatSimulation('AUTOBOT');
      return;
    }

    acc += preset.likeChance;
    if (roll < acc) {
      const hearts = 4 + Math.floor(Math.random() * 8);
      triggerLikeSimulation(hearts, 'AUTOBOT');
      return;
    }

    acc += preset.smallGiftChance;
    if (roll < acc) {
      triggerGiftSmallSimulation('AUTOBOT');
      return;
    }

    acc += preset.mediumGiftChance;
    if (roll < acc) {
      triggerGiftMediumSimulation('AUTOBOT');
      return;
    }

    triggerGiftLargeSimulation('AUTOBOT');
  }
}

export const autoBotBar = new AutoBotBarEngine();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    autoBotBar.stop();
  });
}
