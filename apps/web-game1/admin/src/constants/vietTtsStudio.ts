import { VoiceCategoryKey } from '../types/vietTtsStudio';

export const VIET_TTS_STUDIO_API = {
  GET_VOICES: '/api/caster/voices',
  GET_SAMPLE: (voiceId: string) => `/api/caster/sample/${encodeURIComponent(voiceId)}`,
  TEST_VOICE: '/api/caster/test-voice',
  SAVE_CONFIG: '/api/caster/config',
  GENERATE_AUDIO: '/api/caster/generate-audio',
  GENERATE_STATUS: '/api/caster/generate-status',
} as const;

export interface CategoryFilterItem {
  readonly key: VoiceCategoryKey;
  readonly label: string;
}

export const CATEGORY_FILTERS: readonly CategoryFilterItem[] = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'ESPORTS', label: '🔥 Esports & Thể Thao' },
  { key: 'NARRATION', label: '🎙️ Dẫn Chuyện / Phóng Sự' },
  { key: 'FEMALE', label: '👩 Giọng Nữ' },
  { key: 'CHARACTER', label: '🎭 Nhân Vật / Meme' },
  { key: 'CUSTOM', label: '📁 Giọng Clone (.wav)' },
];

export interface PresetQuote {
  readonly id: string;
  readonly label: string;
  readonly text: string;
}

export const PRESET_QUOTES: readonly PresetQuote[] = [
  {
    id: 'match_start',
    label: 'Khai Chiến',
    text: 'Khai chiến! Hai đội toàn lực xông lên!',
  },
  {
    id: 'lead_change',
    label: 'Lật Kèo',
    text: 'Đổi ngôi dẫn đầu rồi! Pha lật kèo quá gắt!',
  },
  {
    id: 'boss_enrage',
    label: 'Boss Cuồng Nộ',
    text: 'Boss nổi thịnh nộ rồi! Sát thương diện rộng cực kỳ nguy hiểm!',
  },
  {
    id: 'final_10s',
    label: '10s Cuối',
    text: 'Mười giây cuối cùng! Một pha bứt tốc là định đoạt tất cả!',
  },
  {
    id: 'donate_vip',
    label: 'Cảm Ơn VIP',
    text: 'Cú nổ quà quá chất! Cảm ơn sếp lớn đã tiếp lửa!',
  },
];

export const SPEED_CONFIG = {
  DEFAULT: 1.05,
  MIN: 0.8,
  MAX: 1.3,
  STEP: 0.05,
} as const;

export const POLL_INTERVAL_MS = 2_000;
export const MAX_PREVIEW_TEXT_CHARS = 200;
