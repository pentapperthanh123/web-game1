import { GAMEPLAY_LIMITS } from '@shared/config';
import {
  formatTtsDonateMessage,
  formatTtsLikeCheerMessage,
  formatTtsOrderMessage,
  formatTtsReadyMessage,
  formatTtsSwitchFlavorMessage,
  getMessages,
} from '@shared/i18n';
import { getRecipeLabel } from '@shared/recipes';
import { sharedTtsPlayer, selectPreferredSpeechVoice } from '@shared/ttsPlayer';
import type { DanceStyle, DrinkBarSyncMessage, Language, RecipeId } from '@shared/types';
import { drinkBarAudio } from './audioManager';

export type TtsPriority = 1 | 2 | 3;

interface TtsQueueItem {
  id: number;
  priority: TtsPriority;
  text: string;
  language: Language;
}

const PRIORITY_DONATE: TtsPriority = 1;
const PRIORITY_ORDER_DELIVER: TtsPriority = 2;
const PRIORITY_IDLE: TtsPriority = 3;

function randomBetween(minMs: number, maxMs: number): number {
  return Math.round(minMs + Math.random() * (maxMs - minMs));
}

export const selectPreferredTtsVoice = selectPreferredSpeechVoice;

class DrinkBarTtsEngine {
  private enabled = true;
  private language: Language = 'VI';
  private volume = 0.85;
  private queue: TtsQueueItem[] = [];
  private nextItemId = 1;
  private isSpeaking = false;
  private activeUtteranceSeq = 0;
  private currentPriority: TtsPriority | null = null;
  private relayWatchdog: ReturnType<typeof setTimeout> | null = null;
  private isIdleState = false;
  private nextIdleSpeakAt = 0;
  private lastIdlePhraseIdx = -1;
  private lastLikeCheerAt = 0;
  private didRelayActiveSpeech = false;

  constructor() {
    drinkBarAudio.subscribeUnlocked((unlocked) => {
      if (unlocked && this.isIdleState && !this.isSpeaking) {
        this.nextIdleSpeakAt = Date.now() + 350;
      }
    });
  }

  public triggerIdlePromptSoon(delayMs = 900): void {
    if (!this.isIdleState) return;
    this.nextIdleSpeakAt = Date.now() + Math.max(200, delayMs);
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    } else if (this.isIdleState) {
      this.nextIdleSpeakAt =
        Date.now() +
        randomBetween(
          GAMEPLAY_LIMITS.TTS_IDLE_INITIAL_MIN_MS,
          GAMEPLAY_LIMITS.TTS_IDLE_INITIAL_MAX_MS
        );
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setLanguage(language: Language): void {
    this.language = language;
  }

  public setMasterVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public stopAll(): void {
    this.queue = [];
    this.cancelCurrentUtterance();
    this.setDucking(false);
  }

  public interruptIdle(): void {
    this.queue = this.queue.filter((item) => item.priority !== PRIORITY_IDLE);
    if (this.isSpeaking && this.currentPriority === PRIORITY_IDLE) {
      this.cancelCurrentUtterance();
      this.pumpNext();
    }
  }

  public enqueueDonate(
    nickname: string,
    danceStyle: DanceStyle,
    language: Language = this.language,
    isManual = false
  ): void {
    if (!this.enabled) return;
    const text = formatTtsDonateMessage(nickname, danceStyle, language, isManual);
    this.enqueue(PRIORITY_DONATE, text, language);
  }

  public enqueueOrder(
    nickname: string,
    recipeId: RecipeId,
    language: Language = this.language
  ): void {
    if (!this.enabled) return;
    const drinkLabel = getRecipeLabel(recipeId, language, true);
    const text = formatTtsOrderMessage(nickname, drinkLabel, language);
    this.enqueue(PRIORITY_ORDER_DELIVER, text, language);
  }

  public enqueueReady(
    nickname: string,
    recipeId: RecipeId,
    language: Language = this.language
  ): void {
    if (!this.enabled) return;
    const drinkLabel = getRecipeLabel(recipeId, language, true);
    const text = formatTtsReadyMessage(nickname, drinkLabel, language);
    this.enqueue(PRIORITY_ORDER_DELIVER, text, language);
  }

  public enqueueLikeCheer(language: Language = this.language): void {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this.lastLikeCheerAt < GAMEPLAY_LIMITS.TTS_LIKE_COOLDOWN_MS) {
      return;
    }
    this.lastLikeCheerAt = now;
    const text = formatTtsLikeCheerMessage(language);
    this.enqueue(PRIORITY_ORDER_DELIVER, text, language);
  }

  public enqueueFlavorSwitch(
    nickname: string,
    recipeId: RecipeId,
    language: Language = this.language
  ): void {
    if (!this.enabled) return;
    const drinkLabel = getRecipeLabel(recipeId, language, true);
    const text = formatTtsSwitchFlavorMessage(nickname, drinkLabel, language);
    this.enqueue(PRIORITY_ORDER_DELIVER, text, language);
  }

  public updateShopIdleState(isShopIdle: boolean, language: Language = this.language): void {
    this.language = language;
    const now = Date.now();

    if (!isShopIdle) {
      this.isIdleState = false;
      this.nextIdleSpeakAt = 0;
      this.interruptIdle();
      return;
    }

    if (!this.isIdleState) {
      this.isIdleState = true;
      this.nextIdleSpeakAt =
        now +
        randomBetween(
          GAMEPLAY_LIMITS.TTS_IDLE_INITIAL_MIN_MS,
          GAMEPLAY_LIMITS.TTS_IDLE_INITIAL_MAX_MS
        );
      return;
    }

    if (!this.enabled) return;
    if (this.isSpeaking || this.queue.length > 0) {
      this.nextIdleSpeakAt = Math.max(this.nextIdleSpeakAt, now + 2500);
      return;
    }

    if (this.nextIdleSpeakAt > 0 && now >= this.nextIdleSpeakAt) {
      const phrases = getMessages(language).ttsIdlePhrases;
      if (!phrases.length) return;
      let idx = Math.floor(Math.random() * phrases.length);
      if (phrases.length > 1 && idx === this.lastIdlePhraseIdx) {
        idx = (idx + 1) % phrases.length;
      }
      this.lastIdlePhraseIdx = idx;
      this.nextIdleSpeakAt =
        now +
        randomBetween(
          GAMEPLAY_LIMITS.TTS_IDLE_REPEAT_MIN_MS,
          GAMEPLAY_LIMITS.TTS_IDLE_REPEAT_MAX_MS
        );
      this.enqueue(PRIORITY_IDLE, phrases[idx], language);
    }
  }

  private enqueue(priority: TtsPriority, text: string, language: Language): void {
    if (!this.enabled || !text.trim()) return;

    if (priority < PRIORITY_IDLE) {
      this.interruptIdle();
    }

    const item: TtsQueueItem = {
      id: this.nextItemId++,
      priority,
      text: text.trim(),
      language,
    };

    if (priority === PRIORITY_DONATE) {
      const firstLowerIdx = this.queue.findIndex((q) => q.priority > PRIORITY_DONATE);
      if (firstLowerIdx === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(firstLowerIdx, 0, item);
      }
    } else {
      this.queue.push(item);
    }

    if (this.queue.length > GAMEPLAY_LIMITS.TTS_MAX_QUEUE_ITEMS) {
      const oldestNonDonateIdx = this.queue.findIndex((q) => q.priority > PRIORITY_DONATE);
      if (oldestNonDonateIdx !== -1) {
        this.queue.splice(oldestNonDonateIdx, 1);
      } else {
        this.queue.shift();
      }
    }

    if (!this.isSpeaking) {
      this.pumpNext();
    }
  }

  private pumpNext(): void {
    if (!this.enabled) {
      this.setDucking(false);
      return;
    }

    const next = this.queue.shift();
    if (!next) {
      this.isSpeaking = false;
      this.currentPriority = null;
      this.setDucking(false);
      if (this.isIdleState) {
        this.nextIdleSpeakAt = Math.max(
          this.nextIdleSpeakAt,
          Date.now() +
            randomBetween(
              GAMEPLAY_LIMITS.TTS_IDLE_REPEAT_MIN_MS,
              GAMEPLAY_LIMITS.TTS_IDLE_REPEAT_MAX_MS
            )
        );
      }
      return;
    }

    this.speakItem(next);
  }

  private speakItem(item: TtsQueueItem): void {
    const seq = ++this.activeUtteranceSeq;
    this.isSpeaking = true;
    this.currentPriority = item.priority;
    this.didRelayActiveSpeech = false;

    const finishOnce = () => {
      if (seq !== this.activeUtteranceSeq) return;
      this.clearRelayWatchdog();
      this.isSpeaking = false;
      this.currentPriority = null;
      this.pumpNext();
    };

    const inIframe =
      typeof window !== 'undefined' && window.parent && window.parent !== window;

    // When running inside Live Preview (?mirror=1) without iframe gesture unlock, relay directly to Admin
    if (inIframe && !drinkBarAudio.isUnlocked() && this.relaySpeakToParent(item)) {
      this.didRelayActiveSpeech = true;
      const estimatedMs = Math.min(7200, Math.max(1600, item.text.length * 64));
      this.armRelayWatchdog(estimatedMs, finishOnce);
      return;
    }

    void sharedTtsPlayer.speak({
      text: item.text,
      language: item.language,
      rate: GAMEPLAY_LIMITS.TTS_RATE,
      pitch: GAMEPLAY_LIMITS.TTS_PITCH,
      volume: this.volume,
      allowIframeRelay: inIframe,
      onFinish: finishOnce,
      onBlockedRelay: () => {
        if (seq !== this.activeUtteranceSeq) return false;
        if (!this.relaySpeakToParent(item)) return false;
        this.didRelayActiveSpeech = true;
        const estimatedMs = Math.min(7200, Math.max(1600, item.text.length * 64));
        this.armRelayWatchdog(estimatedMs, finishOnce);
        return true;
      },
    });
  }

  private cancelCurrentUtterance(): void {
    this.activeUtteranceSeq += 1;
    this.clearRelayWatchdog();
    this.isSpeaking = false;
    this.currentPriority = null;
    if (this.didRelayActiveSpeech) {
      this.didRelayActiveSpeech = false;
      this.relayCancelToParent();
    }
    sharedTtsPlayer.stopAll();
  }

  private armRelayWatchdog(ms: number, onTimeout: () => void): void {
    this.clearRelayWatchdog();
    this.relayWatchdog = setTimeout(onTimeout, ms);
  }

  private clearRelayWatchdog(): void {
    if (this.relayWatchdog) {
      clearTimeout(this.relayWatchdog);
      this.relayWatchdog = null;
    }
  }

  private setDucking(ducking: boolean): void {
    drinkBarAudio.setTtsDucking(ducking);
  }

  private relaySpeakToParent(item: TtsQueueItem): boolean {
    if (typeof window === 'undefined' || !window.parent || window.parent === window) {
      return false;
    }
    const msg: DrinkBarSyncMessage = {
      type: 'RELAY_TTS',
      action: 'SPEAK',
      text: item.text,
      language: item.language,
      volume: Math.max(0.15, Math.min(1, this.volume)),
      rate: GAMEPLAY_LIMITS.TTS_RATE,
      pitch: GAMEPLAY_LIMITS.TTS_PITCH,
      timestamp: Date.now(),
    };
    try {
      window.parent.postMessage(msg, '*');
      return true;
    } catch {
      return false;
    }
  }

  private relayCancelToParent(): void {
    if (typeof window === 'undefined' || !window.parent || window.parent === window) {
      return;
    }
    const msg: DrinkBarSyncMessage = {
      type: 'RELAY_TTS',
      action: 'CANCEL',
      timestamp: Date.now(),
    };
    try {
      window.parent.postMessage(msg, '*');
    } catch {
      // Ignore cross-frame error
    }
  }
}

export const drinkBarTts = new DrinkBarTtsEngine();
