/**
 * Typed static caster manifest and category index for offline MP3 playback.
 * Source of truth: `server/data/casters.json` (synced to `castersManifest.json` by `scripts/generateCasterAudio.mjs`).
 */

import rawManifest from './castersManifest.json';

export const CASTER_TONE = {
  HYPE: 'hype',
  NORMAL: 'normal',
  CALM: 'calm',
} as const;
export type CasterTone = (typeof CASTER_TONE)[keyof typeof CASTER_TONE];

export const TONE_DEFAULT_VOLUME: Readonly<Record<CasterTone, number>> = {
  [CASTER_TONE.HYPE]: 1.0,
  [CASTER_TONE.NORMAL]: 0.85,
  [CASTER_TONE.CALM]: 0.75,
};

export const CASTER_CATEGORY = {
  MATCH_START: 'match_start',
  MATCH_END: 'match_end',
  LEAD_CHANGE: 'lead_change',
  CLOSE_RACE: 'close_race',
  BOSS_HP_50: 'boss_hp_50',
  BOSS_LOW_HP: 'boss_low_hp',
  BOSS_KILLED: 'boss_killed',
  BOSS_ENRAGE: 'boss_enrage',
  SHIELD_UP: 'shield_up',
  SHIELD_BROKEN: 'shield_broken',
  BOSS_SKILL: 'boss_skill',
  SILVER_SCRAPES_START: 'silver_scrapes_start',
  CLUTCH_FINAL_10S: 'clutch_final_10s',
  ONE_SIDED_FINAL_10S: 'one_sided_final_10s',
  CTA_HYPE: 'cta_hype',
  CTA_TRAILING: 'cta_trailing',
  HYPE_SHORT: 'hype_short',
  DONATE_REACT_VIP: 'donate_react_vip',
} as const;
export type CasterCategory = (typeof CASTER_CATEGORY)[keyof typeof CASTER_CATEGORY];

export interface CasterLineEntry {
  readonly id: string;
  readonly category: string;
  readonly tone: CasterTone;
  readonly text: string;
  readonly file: string;
  readonly volume: number;
  readonly gender?: 'male' | 'female';
  readonly voice?: string;
  readonly speed?: number;
}

export type CasterVariant = CasterLineEntry;
export type CastersIndex = Readonly<Record<string, readonly CasterLineEntry[]>>;

/** Maps legacy event keys to standardized caster categories for backward compatibility. */
const LEGACY_EVENT_CATEGORY_MAP: Readonly<Record<string, CasterCategory>> = {
  round_start: CASTER_CATEGORY.MATCH_START,
  blue_comeback: CASTER_CATEGORY.LEAD_CHANGE,
  red_comeback: CASTER_CATEGORY.LEAD_CHANGE,
  neck_and_neck: CASTER_CATEGORY.CLOSE_RACE,
  blue_dominating: CASTER_CATEGORY.CTA_TRAILING,
  red_dominating: CASTER_CATEGORY.CTA_TRAILING,
  room_quiet_cta: CASTER_CATEGORY.CTA_HYPE,
  blue_win: CASTER_CATEGORY.MATCH_END,
  red_win: CASTER_CATEGORY.MATCH_END,
};

export const CASTERS_MANIFEST: readonly CasterLineEntry[] = rawManifest as CasterLineEntry[];

function buildCastersIndex(entries: readonly CasterLineEntry[]): CastersIndex {
  const grouped: Record<string, CasterLineEntry[]> = {};
  for (const entry of entries) {
    if (!grouped[entry.category]) {
      grouped[entry.category] = [];
    }
    grouped[entry.category].push(entry);
  }
  return grouped;
}

export const CASTERS_INDEX: CastersIndex = buildCastersIndex(CASTERS_MANIFEST);

export const CASTERS_BY_ID: ReadonlyMap<string, CasterLineEntry> = new Map(
  CASTERS_MANIFEST.map((entry) => [entry.id, entry])
);

export function resolveCasterCategory(eventKey: string): string {
  return LEGACY_EVENT_CATEGORY_MAP[eventKey] ?? eventKey;
}

export function resolveEntryVolume(entry: CasterLineEntry): number {
  const rawVolume = typeof entry.volume === 'number' ? entry.volume : TONE_DEFAULT_VOLUME[entry.tone];
  return Math.max(0, Math.min(1, rawVolume));
}
