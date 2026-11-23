/**
 * VoiceManager.ts - Single-Channel Audio Player
 * 
 * Rules:
 * - At most ONE voice playing at any given time.
 * - Static Caster lines: drop if currently speaking or if dynamic queue has pending items.
 * - Dynamic TTS: FIFO queue for donor names, team introductions, etc.
 * - Automatic BGM ducking callback (onSpeakingChange).
 * - 10-second watchdog timer to prevent hung audio playback.
 */

import { CASTERS_INDEX } from '../../data/castersIndex';
import { audioService } from '../audioService';
import { isCurrentRoundIntroActive } from '../../store/roundIntroStore';
import { useAudioStore } from '../../store/audioStore';
import { useCasterStore } from '../../store/casterStore';

export const VOICE_MANAGER_CONSTANTS = {
  TTS_ROUTE: '/api/tts',
  AUDIO_BASE_PATH: '/audio/casters',
  SAFETY_TIMEOUT_MS: 10000,
  DYNAMIC_CHAIN_DELAY_MS: 150,
  DYNAMIC_ERROR_DELAY_MS: 1000,
  MAX_NICKNAME_LENGTH: 20,
  FALLBACK_NICKNAME: 'một bạn ẩn danh',
  LOG_PREFIX: '[VoiceManager]',
} as const;

interface DynamicQueueItem {
  text: string;
  reactEventKey?: string;
  forceGoogle?: boolean;
}

class VoiceManagerService {
  private currentAudio: HTMLAudioElement | null = null;
  private readonly dynamicQueue: DynamicQueueItem[] = [];
  private isPlaying = false;
  private readonly lastPlayedIndex = new Map<string, number>();
  private onSpeakingChangeCb: ((isSpeaking: boolean) => void) | null = null;
  private readonly speakingListeners = new Set<(isSpeaking: boolean) => void>();
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;
  private isSpeakingState = false;

  private notifySpeaking(isSpeaking: boolean): void {
    if (this.isSpeakingState === isSpeaking) return;
    this.isSpeakingState = isSpeaking;
    try {
      if (isSpeaking) {
        audioService.duckCombat(10000);
      }
    } catch {}
    if (this.onSpeakingChangeCb) {
      try {
        this.onSpeakingChangeCb(isSpeaking);
      } catch (err) {
        console.error(`${VOICE_MANAGER_CONSTANTS.LOG_PREFIX} Error in onSpeakingChange:`, err);
      }
    }
    for (const listener of this.speakingListeners) {
      try {
        listener(isSpeaking);
      } catch (err) {
        console.error(`${VOICE_MANAGER_CONSTANTS.LOG_PREFIX} Error in speaking listener:`, err);
      }
    }
  }

  private clearSafetyTimer(): void {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }

  private setSafetyTimer(onTimeout: () => void): void {
    this.clearSafetyTimer();
    this.safetyTimer = setTimeout(() => {
      console.warn(`${VOICE_MANAGER_CONSTANTS.LOG_PREFIX} Watchdog timeout reached (10s), forcing cleanup.`);
      this.safetyTimer = null;
      onTimeout();
    }, VOICE_MANAGER_CONSTANTS.SAFETY_TIMEOUT_MS);
  }

  /**
   * Register callback to handle BGM ducking (volume reduction while voices play).
   */
  public onSpeakingChange(cb: (isSpeaking: boolean) => void): () => void {
    this.speakingListeners.add(cb);
    return () => {
      this.speakingListeners.delete(cb);
    };
  }

  /**
   * Play a static pre-generated caster MP3 by eventKey.
   * If any voice is active, dynamic queue has pending items, TTS is playing,
   * or the round intro / stream opening is active, this request is dropped immediately.
   */
  public playCaster(eventKey: string): void {
    if (
      !useCasterStore.getState().isTtsEnabled ||
      this.isPlaying ||
      this.dynamicQueue.length > 0 ||
      useAudioStore.getState().isTTSPlaying ||
      (isCurrentRoundIntroActive() && eventKey !== 'donate_react_vip')
    ) {
      return;
    }

    const variants = CASTERS_INDEX[eventKey];
    if (!variants || variants.length === 0) {
      console.warn(`${VOICE_MANAGER_CONSTANTS.LOG_PREFIX} No variants found for eventKey: ${eventKey}`);
      return;
    }

    // Pick random variant while avoiding the last played index
    const lastIdx = this.lastPlayedIndex.get(eventKey);
    let chosenIdx = 0;
    if (variants.length === 1) {
      chosenIdx = 0;
    } else {
      do {
        chosenIdx = Math.floor(Math.random() * variants.length);
      } while (chosenIdx === lastIdx);
    }
    this.lastPlayedIndex.set(eventKey, chosenIdx);

    const variant = variants[chosenIdx];
    const audioUrl = `${VOICE_MANAGER_CONSTANTS.AUDIO_BASE_PATH}/${variant.id}.mp3`;

    this.playAudioFile(audioUrl, () => {
      this.isPlaying = false;
      this.processDynamicQueue();
    });
  }

  /**
   * Enqueue dynamic Google TTS speech into the FIFO queue.
   * After the dynamic clip completes, an optional static reaction audio can be chained.
   */
  public speakDynamic(text: string, reactEventKey?: string, forceGoogle: boolean = false): void {
    if (!useCasterStore.getState().isTtsEnabled) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    this.dynamicQueue.push({ text: trimmed, reactEventKey, forceGoogle });

    if (!this.isPlaying) {
      this.processDynamicQueue();
    }
  }

  private processDynamicQueue(): void {
    if (this.isPlaying) return;

    if (this.dynamicQueue.length === 0) {
      this.notifySpeaking(false);
      return;
    }

    const item = this.dynamicQueue.shift();
    if (!item) {
      this.notifySpeaking(false);
      return;
    }

    const googleParam = item.forceGoogle ? '&provider=google' : '';
    const ttsUrl = `${VOICE_MANAGER_CONSTANTS.TTS_ROUTE}?text=${encodeURIComponent(item.text)}${googleParam}`;

    this.playAudioFile(ttsUrl, () => {
      if (item.reactEventKey) {
        setTimeout(() => {
          this.isPlaying = false;
          this.playReaction(item.reactEventKey!);
        }, VOICE_MANAGER_CONSTANTS.DYNAMIC_CHAIN_DELAY_MS);
      } else {
        this.isPlaying = false;
        this.processDynamicQueue();
      }
    }, () => {
      // On error, wait briefly and advance
      setTimeout(() => {
        this.isPlaying = false;
        this.processDynamicQueue();
      }, VOICE_MANAGER_CONSTANTS.DYNAMIC_ERROR_DELAY_MS);
    });
  }

  private playReaction(eventKey: string): void {
    const variants = CASTERS_INDEX[eventKey];
    if (!variants || variants.length === 0) {
      this.processDynamicQueue();
      return;
    }

    const lastIdx = this.lastPlayedIndex.get(eventKey);
    let chosenIdx = 0;
    if (variants.length > 1) {
      do {
        chosenIdx = Math.floor(Math.random() * variants.length);
      } while (chosenIdx === lastIdx);
    }
    this.lastPlayedIndex.set(eventKey, chosenIdx);

    const variant = variants[chosenIdx];
    const audioUrl = `${VOICE_MANAGER_CONSTANTS.AUDIO_BASE_PATH}/${variant.id}.mp3`;

    this.playAudioFile(audioUrl, () => {
      this.isPlaying = false;
      this.processDynamicQueue();
    });
  }

  private playAudioFile(url: string, onEnded: () => void, onError?: () => void): void {
    this.stopCurrentAudio();
    this.isPlaying = true;
    this.notifySpeaking(true);

    const audio = new Audio(url);
    audio.volume = 1.0;
    this.currentAudio = audio;

    let hasCleanedUp = false;
    const cleanup = () => {
      if (hasCleanedUp) return;
      hasCleanedUp = true;
      this.clearSafetyTimer();
      audio.onended = null;
      audio.onerror = null;
      if (this.currentAudio === audio) {
        this.currentAudio = null;
      }
    };

    audio.onended = () => {
      cleanup();
      onEnded();
    };

    audio.onerror = (e) => {
      console.warn(`${VOICE_MANAGER_CONSTANTS.LOG_PREFIX} Audio playback failed: ${url}`, e);
      cleanup();
      if (onError) onError();
      else onEnded();
    };

    this.setSafetyTimer(() => {
      cleanup();
      try {
        audio.pause();
      } catch {}
      onEnded();
    });

    audio.play().catch((err) => {
      console.warn(`${VOICE_MANAGER_CONSTANTS.LOG_PREFIX} play() promise rejected: ${url}`, err);
      cleanup();
      if (onError) onError();
      else onEnded();
    });
  }

  private stopCurrentAudio(): void {
    this.clearSafetyTimer();
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }
  }

  /**
   * Filter TikTok viewer nickname: remove emojis, special characters, limit length.
   */
  public cleanNickname(name: string): string {
    if (!name || typeof name !== 'string') {
      return VOICE_MANAGER_CONSTANTS.FALLBACK_NICKNAME;
    }
    const EMOJI_REGEX = /[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu;
    const NON_LETTER_NUM_SPACE_REGEX = /[^\p{L}\p{N}\s]/gu;
    const MULTI_SPACE_REGEX = /\s+/g;

    const sanitized = name
      .replace(EMOJI_REGEX, '')
      .replace(NON_LETTER_NUM_SPACE_REGEX, ' ')
      .replace(MULTI_SPACE_REGEX, ' ')
      .trim();

    if (!sanitized) {
      return VOICE_MANAGER_CONSTANTS.FALLBACK_NICKNAME;
    }

    if (sanitized.length > VOICE_MANAGER_CONSTANTS.MAX_NICKNAME_LENGTH) {
      return sanitized.slice(0, VOICE_MANAGER_CONSTANTS.MAX_NICKNAME_LENGTH).trim();
    }
    return sanitized;
  }

  /**
   * Stop all voice playback and clear pending queues.
   */
  public stopAll(): void {
    this.stopCurrentAudio();
    this.dynamicQueue.length = 0;
    this.isPlaying = false;
    this.notifySpeaking(false);
  }

  public isBusy(): boolean {
    return this.isPlaying || this.dynamicQueue.length > 0;
  }
}

export const VoiceManager = new VoiceManagerService();
export const voiceManager = VoiceManager;
