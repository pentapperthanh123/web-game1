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
  private timer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private pace: AutoBotPace = 'NORMAL';

  public start(pace: AutoBotPace): void {
    this.stop();
    this.isRunning = true;
    this.pace = pace;
    const preset = AUTOBOT_PACE_PRESETS[pace];
    this.step();
    this.timer = setInterval(() => this.step(), preset.intervalMs);
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public setPace(pace: AutoBotPace): void {
    this.pace = pace;
    if (this.isRunning) {
      this.start(pace);
    }
  }

  private step(): void {
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
