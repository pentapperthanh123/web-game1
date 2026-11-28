import { GAMEPLAY_LIMITS } from '@shared/config';
import {
  formatMultiDrinkLabel,
  formatTtsDonateMessage,
  formatTtsGenericOrderFallback,
  formatTtsGroupedOrderMessage,
  formatTtsLikeCheerMessage,
  formatTtsMultiDrinkOrderMessage,
  formatTtsReadyMessage,
  formatTtsStartBrewMessage,
  formatTtsSwitchFlavorMessage,
  formatTtsWakeUpMessage,
  getMessages,
  type GroupedOrderTtsEntry,
} from '@shared/i18n';
import { getRecipeLabel, MENU_RECIPE_LIST } from '@shared/recipes';
import { sharedTtsPlayer, selectPreferredSpeechVoice } from '@shared/ttsPlayer';
import type { DanceStyle, DrinkBarSyncMessage, Language, RecipeId } from '@shared/types';
import { drinkBarAudio } from './audioManager';

export type TtsPriority = 1 | 2 | 3 | 4 | 5;
export type TtsSlotKind = 'donate' | 'order' | 'start_brew' | 'ready' | 'switch' | 'idle' | 'wake';

interface TtsQueueItem {
  id: number;
  priority: TtsPriority;
  slotKind: TtsSlotKind;
  text: string;
  fallbackTexts?: readonly string[];
  language: Language;
  createdAt: number;
  donors?: string[];
  orderEntries?: GroupedOrderTtsEntry[];
  danceStyle?: DanceStyle;
  isManual?: boolean;
  onDone?: () => void;
}

const PRIORITY_DONATE: TtsPriority = 1;
const PRIORITY_READY: TtsPriority = 2;
const PRIORITY_START_BREW: TtsPriority = 3;
const PRIORITY_ORDER_DELIVER: TtsPriority = 4;
const PRIORITY_IDLE: TtsPriority = 5;
const MAX_COALESCED_DONOR_NAMES = 3;
const MAX_COALESCED_ORDER_ENTRIES = 3;
const TTS_SAME_USER_COOLDOWN_MS = 2500;
const MAX_TRACKED_TTS_USERS = 200;
const COALESCED_PREWARM_DEBOUNCE_MS = 220;

function isQueueItemFresh(item: TtsQueueItem, now: number): boolean {
  if (item.priority === PRIORITY_DONATE) return true;
  if (item.slotKind === 'ready') {
    return now - item.createdAt < GAMEPLAY_LIMITS.TTS_READY_STALE_MS;
  }
  return now - item.createdAt < GAMEPLAY_LIMITS.TTS_STALE_ITEM_MS;
}

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
  private activeRelayUtteranceId: number | null = null;
  private activeRelayFinish: (() => void) | null = null;
  private isBaristaDozing = false;
  private lastWakeUpTtsAt = 0;
  private coalescedPrewarmTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly lastOrderTtsAtByUser = new Map<string, number>();

  constructor() {
    this.prewarmCommonPhrases('VI');
    drinkBarAudio.subscribeUnlocked((unlocked) => {
      if (unlocked && this.isIdleState && !this.isSpeaking) {
        this.nextIdleSpeakAt = Date.now() + 180;
      }
    });
  }

  private prewarmCommonPhrases(language: Language): void {
    const msg = getMessages(language);
    const warmupList: string[] = [
      ...msg.ttsIdlePhrases.slice(0, 2),
      formatTtsDonateMessage('', 'heart_sway', language, true),
      formatTtsDonateMessage('', 'groove_wave', language, true),
      formatTtsDonateMessage('', 'party_hype', language, true),
    ];
    for (const recipe of MENU_RECIPE_LIST) {
      const label = getRecipeLabel(recipe.id, language, true);
      warmupList.push(this.buildGenericOrderFallback(label, language));
      warmupList.push(this.buildGenericReadyFallback(label, language));
    }
    sharedTtsPlayer.prewarmPhrases(warmupList, language);
  }

  private buildGenericOrderFallback(drinkLabel: string, language: Language): string {
    return language === 'EN'
      ? `Got a fresh ${drinkLabel} order right away!`
      : `Chốt đơn một ly ${drinkLabel} liền tay nè!`;
  }

  private buildGenericReadyFallback(drinkLabel: string, language: Language): string {
    return language === 'EN'
      ? `Ding ding! Your fresh ${drinkLabel} is ready!`
      : `Ting ting! Ly ${drinkLabel} xong rồi nè!`;
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
    this.prewarmCommonPhrases(language);
  }

  public setMasterVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  private clearCoalescedPrewarmTimer(): void {
    if (this.coalescedPrewarmTimer) {
      clearTimeout(this.coalescedPrewarmTimer);
      this.coalescedPrewarmTimer = null;
    }
  }

  private scheduleCoalescedOrderPrewarm(texts: readonly string[], language: Language): void {
    this.clearCoalescedPrewarmTimer();
    const list = [...texts];
    this.coalescedPrewarmTimer = setTimeout(() => {
      this.coalescedPrewarmTimer = null;
      sharedTtsPlayer.prewarmPhrases(list, language);
    }, COALESCED_PREWARM_DEBOUNCE_MS);
  }

  public stopAll(): void {
    this.clearCoalescedPrewarmTimer();
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

  public setBaristaDozing(dozing: boolean): void {
    this.isBaristaDozing = dozing;
  }

  public notifyRelayedSpeechDone(utteranceId?: number): void {
    if (!this.didRelayActiveSpeech || !this.activeRelayFinish) return;
    if (
      utteranceId !== undefined &&
      this.activeRelayUtteranceId !== null &&
      utteranceId !== this.activeRelayUtteranceId
    ) {
      return;
    }
    const finish = this.activeRelayFinish;
    this.activeRelayFinish = null;
    this.activeRelayUtteranceId = null;
    finish();
  }

  public onDanceEnded(): void {
    this.queue = this.queue.filter((q) => q.slotKind !== 'donate');
    if (this.isSpeaking && this.currentPriority === PRIORITY_DONATE) {
      this.cancelCurrentUtterance();
      this.pumpNext();
    }
  }

  public enqueueDonate(
    nickname: string,
    danceStyle: DanceStyle,
    language: Language = this.language,
    isManual = false,
    onSpeechDone?: () => void
  ): void {
    if (!this.enabled) {
      onSpeechDone?.();
      return;
    }
    this.isBaristaDozing = false;
    const cleanName = nickname.trim();
    const genericDonateFallback = [formatTtsDonateMessage('', danceStyle, language, true)];

    // If a pending donate is already waiting in queue, coalesce donors into 1 clear announcement
    const existingPendingDonate = this.queue.find((q) => q.slotKind === 'donate');
    if (existingPendingDonate && cleanName) {
      const donorList = existingPendingDonate.donors ?? [];
      if (!donorList.includes(cleanName) && donorList.length < MAX_COALESCED_DONOR_NAMES) {
        donorList.push(cleanName);
      }
      const coalescedText = formatTtsDonateMessage(
        donorList.join(', '),
        danceStyle,
        language,
        isManual && donorList.length === 0,
        true
      );
      existingPendingDonate.donors = donorList;
      existingPendingDonate.danceStyle = danceStyle;
      existingPendingDonate.text = coalescedText;
      existingPendingDonate.fallbackTexts = genericDonateFallback;
      existingPendingDonate.createdAt = Date.now();
      sharedTtsPlayer.prewarmPhrases([coalescedText, ...genericDonateFallback], language);
      const prevOnDone = existingPendingDonate.onDone;
      existingPendingDonate.onDone = () => {
        prevOnDone?.();
        onSpeechDone?.();
      };
      return;
    }

    // Never cut off an active Donate speech mid-word; queue at most one concise follow-up behind it
    const isFollowUpWhileDonateSpeaking =
      this.isSpeaking && this.currentPriority === PRIORITY_DONATE;
    const text = formatTtsDonateMessage(
      cleanName,
      danceStyle,
      language,
      isManual,
      isFollowUpWhileDonateSpeaking
    );
    const shouldPreempt = !isFollowUpWhileDonateSpeaking;
    this.enqueue({
      priority: PRIORITY_DONATE,
      slotKind: 'donate',
      text,
      fallbackTexts: genericDonateFallback,
      language,
      donors: cleanName ? [cleanName] : [],
      danceStyle,
      isManual,
      onDone: onSpeechDone,
      preemptCurrent: shouldPreempt,
    });
  }

  public enqueueOrder(
    nickname: string,
    recipeId: RecipeId,
    language: Language = this.language,
    recipeIds?: readonly RecipeId[]
  ): void {
    if (!this.enabled) return;
    const now = Date.now();
    const userKey = nickname.trim().toLowerCase();
    if (userKey) {
      const prevAt = this.lastOrderTtsAtByUser.get(userKey) ?? 0;
      if (now - prevAt < TTS_SAME_USER_COOLDOWN_MS) {
        return;
      }
      if (this.lastOrderTtsAtByUser.size >= MAX_TRACKED_TTS_USERS) {
        const oldestKey = this.lastOrderTtsAtByUser.keys().next().value;
        if (oldestKey !== undefined) {
          this.lastOrderTtsAtByUser.delete(oldestKey);
        }
      }
      this.lastOrderTtsAtByUser.set(userKey, now);
    }

    this.isBaristaDozing = false;
    const orderedIds = recipeIds && recipeIds.length > 0 ? recipeIds : [recipeId];
    const drinkLabels = orderedIds.map((id) => getRecipeLabel(id, language, true));
    const summaryLabel = formatMultiDrinkLabel(drinkLabels, language);
    const singleFallback = this.buildGenericOrderFallback(drinkLabels[0], language);
    const multiFallback = formatTtsGenericOrderFallback(drinkLabels, language);
    const fallbackTexts =
      drinkLabels.length > 1 ? [multiFallback, singleFallback] : [singleFallback];

    // If another order intro is already queued while speaking, combine them cleanly with matching multi-drink fallback
    const existingPendingOrder = this.queue.find((q) => q.slotKind === 'order');
    if (existingPendingOrder && this.isSpeaking) {
      const merged = [
        ...(existingPendingOrder.orderEntries ?? []),
        { nickname, drinkLabel: summaryLabel },
      ].slice(-MAX_COALESCED_ORDER_ENTRIES);
      const mergedText = formatTtsGroupedOrderMessage(merged, language);
      const mergedFallback = formatTtsGenericOrderFallback(
        merged.map((entry) => entry.drinkLabel),
        language
      );
      existingPendingOrder.orderEntries = merged;
      existingPendingOrder.language = language;
      existingPendingOrder.text = mergedText;
      existingPendingOrder.fallbackTexts = [mergedFallback, singleFallback];
      existingPendingOrder.createdAt = now;
      this.scheduleCoalescedOrderPrewarm([mergedText, mergedFallback, singleFallback], language);
      return;
    }

    const text = formatTtsMultiDrinkOrderMessage(nickname, drinkLabels, language);
    // Never interrupt an active order, ready, or donate speech mid-sentence!
    const shouldPreempt = this.isSpeaking && this.currentPriority === PRIORITY_IDLE;
    this.enqueue({
      priority: PRIORITY_ORDER_DELIVER,
      slotKind: 'order',
      text,
      fallbackTexts,
      language,
      orderEntries: [{ nickname, drinkLabel: summaryLabel }],
      preemptCurrent: shouldPreempt,
    });
  }

  public enqueueStartBrew(
    nickname: string,
    recipeId: RecipeId,
    language: Language = this.language
  ): void {
    if (!this.enabled) return;
    this.isBaristaDozing = false;
    const drinkLabel = getRecipeLabel(recipeId, language, true);
    const text = formatTtsStartBrewMessage(nickname, drinkLabel, language);
    const fallbackTexts = [this.buildGenericOrderFallback(drinkLabel, language)];
    const shouldPreempt = this.isSpeaking && this.currentPriority === PRIORITY_IDLE;
    this.enqueue({
      priority: PRIORITY_START_BREW,
      slotKind: 'start_brew',
      text,
      fallbackTexts,
      language,
      preemptCurrent: shouldPreempt,
    });
  }

  public enqueueReady(
    nickname: string,
    recipeId: RecipeId,
    language: Language = this.language
  ): void {
    if (!this.enabled) return;
    const drinkLabel = getRecipeLabel(recipeId, language, true);
    const text = formatTtsReadyMessage(nickname, drinkLabel, language);
    const fallbackTexts = [this.buildGenericReadyFallback(drinkLabel, language)];
    // Never let start_brew or chat order chatter block/expire a cup's ready announcement
    const shouldPreempt = this.isSpeaking && this.currentPriority >= PRIORITY_START_BREW;
    this.enqueue({
      priority: PRIORITY_READY,
      slotKind: 'ready',
      text,
      fallbackTexts,
      language,
      preemptCurrent: shouldPreempt,
    });
  }

  public enqueueLikeCheer(language: Language = this.language): void {
    if (!this.enabled) return;
    const now = Date.now();
    if (now - this.lastLikeCheerAt < GAMEPLAY_LIMITS.TTS_LIKE_COOLDOWN_MS) {
      return;
    }
    this.lastLikeCheerAt = now;
    this.isBaristaDozing = false;
    const text = formatTtsLikeCheerMessage(language);
    this.enqueue({
      priority: PRIORITY_ORDER_DELIVER,
      slotKind: 'idle',
      text,
      language,
    });
  }

  public enqueueFlavorSwitch(
    nickname: string,
    recipeId: RecipeId,
    language: Language = this.language
  ): void {
    if (!this.enabled) return;
    const drinkLabel = getRecipeLabel(recipeId, language, true);
    const text = formatTtsSwitchFlavorMessage(nickname, drinkLabel, language);
    const fallbackTexts = [this.buildGenericOrderFallback(drinkLabel, language)];
    const shouldPreempt = this.isSpeaking && this.currentPriority === PRIORITY_IDLE;
    this.enqueue({
      priority: PRIORITY_ORDER_DELIVER,
      slotKind: 'switch',
      text,
      fallbackTexts,
      language,
      preemptCurrent: shouldPreempt,
    });
  }

  public enqueueWakeUp(language: Language = this.language): void {
    if (!this.enabled) return;
    const now = Date.now();
    this.isBaristaDozing = false;
    if (now - this.lastWakeUpTtsAt < 1500) {
      return;
    }
    // Skip separate wake-up line if an order or donate speech was just queued or is already speaking
    if (this.isSpeaking || this.queue.some((q) => q.priority <= PRIORITY_ORDER_DELIVER)) {
      return;
    }
    this.lastWakeUpTtsAt = now;
    const text = formatTtsWakeUpMessage(language);
    this.interruptIdle();
    this.enqueue({
      priority: PRIORITY_DONATE,
      slotKind: 'wake',
      text,
      language,
    });
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
      this.enqueue({
        priority: PRIORITY_IDLE,
        slotKind: 'idle',
        text: phrases[idx],
        language,
      });
    }
  }

  private enqueue(opts: {
    priority: TtsPriority;
    slotKind: TtsSlotKind;
    text: string;
    fallbackTexts?: readonly string[];
    language: Language;
    donors?: string[];
    orderEntries?: GroupedOrderTtsEntry[];
    danceStyle?: DanceStyle;
    isManual?: boolean;
    onDone?: () => void;
    preemptCurrent?: boolean;
  }): void {
    const cleanText = opts.text.trim();
    if (!this.enabled || !cleanText) {
      opts.onDone?.();
      return;
    }

    const now = Date.now();
    // Prune stale pending items (ready has tight TTL so past cups never announce over new ones)
    this.queue = this.queue.filter((q) => isQueueItemFresh(q, now));

    if (opts.priority < PRIORITY_IDLE) {
      this.interruptIdle();
      // Prefetch audio buffer immediately upon entering the TTS queue so playback starts at 0ms when its turn comes
      sharedTtsPlayer.prewarmPhrases([cleanText, ...(opts.fallbackTexts ?? [])], opts.language);
    }

    const item: TtsQueueItem = {
      id: this.nextItemId++,
      priority: opts.priority,
      slotKind: opts.slotKind,
      text: cleanText,
      fallbackTexts: opts.fallbackTexts,
      language: opts.language,
      createdAt: now,
      donors: opts.donors,
      orderEntries: opts.orderEntries,
      danceStyle: opts.danceStyle,
      isManual: opts.isManual,
      onDone: opts.onDone,
    };

    if (opts.preemptCurrent) {
      if (opts.priority === PRIORITY_DONATE) {
        // Drop stale idle/past-cup ready/start_brew items before dance, keeping pending customer chat orders
        this.queue = this.queue.filter(
          (q) => q.priority === PRIORITY_DONATE || q.slotKind === 'order'
        );
      } else {
        this.queue = this.queue.filter((q) => q.priority < PRIORITY_IDLE);
      }
      this.queue.unshift(item);
      if (this.isSpeaking) {
        this.cancelCurrentUtterance();
      }
      this.pumpNext();
      return;
    }

    // Only keep the latest counter step / flavor-switch notice per slot; 'ready' and grouped 'order' stay ordered
    if (opts.slotKind === 'start_brew' || opts.slotKind === 'switch') {
      const existingIdx = this.queue.findIndex((q) => q.slotKind === opts.slotKind);
      if (existingIdx !== -1) {
        this.queue[existingIdx] = item;
        if (!this.isSpeaking) {
          this.pumpNext();
        }
        return;
      }
    }

    const firstLowerIdx = this.queue.findIndex((q) => q.priority > item.priority);
    if (firstLowerIdx === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(firstLowerIdx, 0, item);
    }

    if (this.queue.length > GAMEPLAY_LIMITS.TTS_MAX_QUEUE_ITEMS) {
      let dropIdx = -1;
      for (let i = this.queue.length - 1; i >= 0; i -= 1) {
        if (this.queue[i].priority > PRIORITY_DONATE) {
          dropIdx = i;
          break;
        }
      }
      if (dropIdx !== -1) {
        this.queue.splice(dropIdx, 1);
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

    const now = Date.now();
    this.queue = this.queue.filter((q) => isQueueItemFresh(q, now));

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
      this.activeRelayFinish = null;
      this.activeRelayUtteranceId = null;
      this.isSpeaking = false;
      this.currentPriority = null;
      item.onDone?.();
      this.pumpNext();
    };

    const inIframe =
      typeof window !== 'undefined' && window.parent && window.parent !== window;

    const relayTimeoutMs = Math.min(10500, Math.max(4200, item.text.length * 85 + 3200));

    // When running inside Live Preview (?mirror=1) without iframe gesture unlock, relay directly to Admin
    if (inIframe && !drinkBarAudio.isUnlocked() && this.relaySpeakToParent(item)) {
      this.didRelayActiveSpeech = true;
      this.activeRelayUtteranceId = item.id;
      this.activeRelayFinish = finishOnce;
      this.armRelayWatchdog(relayTimeoutMs, finishOnce);
      return;
    }

    void sharedTtsPlayer.speak({
      text: item.text,
      fallbackTexts: item.fallbackTexts,
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
        this.activeRelayUtteranceId = item.id;
        this.activeRelayFinish = finishOnce;
        this.armRelayWatchdog(relayTimeoutMs, finishOnce);
        return true;
      },
    });
  }

  private cancelCurrentUtterance(): void {
    this.activeUtteranceSeq += 1;
    this.clearRelayWatchdog();
    this.activeRelayFinish = null;
    this.activeRelayUtteranceId = null;
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
      utteranceId: item.id,
      text: item.text,
      fallbackTexts: item.fallbackTexts,
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
