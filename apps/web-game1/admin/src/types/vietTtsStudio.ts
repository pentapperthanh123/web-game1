/**
 * Type definitions for Viet-TTS Studio (Voice explorer, preview player, configuration, batch generator).
 */

export type VoiceGender = 'male' | 'female';

export type VoiceCategoryKey =
  | 'ALL'
  | 'ESPORTS'
  | 'NARRATION'
  | 'FEMALE'
  | 'CHARACTER'
  | 'CUSTOM';

export interface VietTtsVoice {
  readonly id: string;
  readonly name: string;
  readonly gender: VoiceGender;
  readonly category: string;
  readonly tag: string;
  readonly description: string;
  readonly isCustomClone?: boolean;
  readonly sampleUrl?: string;
  readonly hasSample?: boolean;
}

export interface VietTtsCurrentConfig {
  readonly voiceMale: string;
  readonly voiceFemale: string;
  readonly vietTtsUrl: string;
}

export interface VietTtsVoicesResponse {
  readonly success: boolean;
  readonly voices: readonly VietTtsVoice[];
  readonly current: VietTtsCurrentConfig;
}

export interface AudioPreviewState {
  readonly isPlaying: boolean;
  readonly activeVoiceId: string | null;
  readonly isLoadingVoice: boolean;
  readonly errorMessage: string | null;
}

export interface BatchGenerationStatus {
  readonly isRunning: boolean;
  readonly startedAt: number;
  readonly completedAt: number | null;
  readonly lastLine: string;
  readonly exitCode: number | null;
  readonly logs: readonly string[];
}
