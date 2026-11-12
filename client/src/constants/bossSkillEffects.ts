import {
  BOSS_SKILL_VFX,
  BOSS_STATUS_EFFECT,
  BossSkillEffectProfile,
} from '../types/bossSkill';

const ULTIMATE_UNLOCK_PHASE = 2;

const DOT = {
  LIGHT: { durationMs: 4000, tickDamage: 4 },
  MEDIUM: { durationMs: 5000, tickDamage: 6 },
  HEAVY: { durationMs: 6000, tickDamage: 9 },
} as const;

const STUN = {
  SHORT: { durationMs: 1500 },
  LONG: { durationMs: 2500 },
} as const;

const WEAKEN = {
  SHORT: { durationMs: 4000 },
  LONG: { durationMs: 6000 },
} as const;

const LIFESTEAL = {
  LOW: { durationMs: 0, ratio: 0.35 },
  HIGH: { durationMs: 0, ratio: 0.6 },
} as const;

/**
 * VFX archetype + status effect + phase gate for every boss skill, keyed by skill id.
 * Keeping it separate from the raw skill data lets client and admin share the same table.
 */
export const BOSS_SKILL_EFFECTS: Readonly<Record<string, BossSkillEffectProfile>> = {
  // ── Baron Nashor: Void poison ────────────────────────────────────────
  baron_acid_spit: {
    vfxType: BOSS_SKILL_VFX.PROJECTILE_ARC,
    vfxParams: { secondaryColor: '#4ade80', count: 5 },
    statusEffect: { type: BOSS_STATUS_EFFECT.POISON, ...DOT.LIGHT },
  },
  baron_void_spikes: {
    vfxType: BOSS_SKILL_VFX.GROUND_SPIKES,
    vfxParams: { secondaryColor: '#c084fc', count: 7 },
  },
  baron_tail_sweep: {
    vfxType: BOSS_SKILL_VFX.CRESCENT_SWEEP,
    vfxParams: { secondaryColor: '#f0abfc', scale: 1.1 },
  },
  baron_void_cataclysm: {
    vfxType: BOSS_SKILL_VFX.NOVA,
    vfxParams: { secondaryColor: '#a855f7', scale: 1.3 },
    statusEffect: { type: BOSS_STATUS_EFFECT.POISON, ...DOT.MEDIUM },
    minPhase: ULTIMATE_UNLOCK_PHASE,
  },

  // ── Elder Dragon: celestial fire ─────────────────────────────────────
  elder_dragon_breath: {
    vfxType: BOSS_SKILL_VFX.PROJECTILE_ARC,
    vfxParams: { secondaryColor: '#fbbf24', count: 4, scale: 1.2 },
    statusEffect: { type: BOSS_STATUS_EFFECT.BURN, ...DOT.LIGHT },
  },
  elder_wing_buffet: {
    vfxType: BOSS_SKILL_VFX.CRESCENT_SWEEP,
    vfxParams: { secondaryColor: '#fde68a', scale: 1.25 },
    statusEffect: { type: BOSS_STATUS_EFFECT.WEAKEN, ...WEAKEN.SHORT },
  },
  elder_meteor_rain: {
    vfxType: BOSS_SKILL_VFX.METEOR_RAIN,
    vfxParams: { secondaryColor: '#fb923c', count: 8 },
    statusEffect: { type: BOSS_STATUS_EFFECT.BURN, ...DOT.MEDIUM },
  },
  elder_cataclysmic_burn: {
    vfxType: BOSS_SKILL_VFX.NOVA,
    vfxParams: { secondaryColor: '#f97316', scale: 1.4 },
    statusEffect: { type: BOSS_STATUS_EFFECT.BURN, ...DOT.HEAVY },
    minPhase: ULTIMATE_UNLOCK_PHASE,
  },

  // ── Rift Herald: brute force ─────────────────────────────────────────
  herald_charge: {
    vfxType: BOSS_SKILL_VFX.CHARGE_DASH,
    vfxParams: { secondaryColor: '#6ee7b7' },
    statusEffect: { type: BOSS_STATUS_EFFECT.STUN, ...STUN.SHORT },
  },
  herald_void_cleave: {
    vfxType: BOSS_SKILL_VFX.CRESCENT_SWEEP,
    vfxParams: { secondaryColor: '#34d399', count: 2 },
  },
  herald_eye_gaze: {
    vfxType: BOSS_SKILL_VFX.BEAM,
    vfxParams: { secondaryColor: '#ec4899', scale: 1.1 },
  },
  herald_seismic_slam: {
    vfxType: BOSS_SKILL_VFX.SEISMIC_SLAM,
    vfxParams: { secondaryColor: '#f9a8d4', scale: 1.5 },
    statusEffect: { type: BOSS_STATUS_EFFECT.STUN, ...STUN.LONG },
    minPhase: ULTIMATE_UNLOCK_PHASE,
  },

  // ── Mountain Drake: magma & stone ────────────────────────────────────
  mountain_magma_spit: {
    vfxType: BOSS_SKILL_VFX.PROJECTILE_ARC,
    vfxParams: { secondaryColor: '#fdba74', count: 3, scale: 1.3 },
    statusEffect: { type: BOSS_STATUS_EFFECT.BURN, ...DOT.LIGHT },
  },
  mountain_rock_slide: {
    vfxType: BOSS_SKILL_VFX.METEOR_RAIN,
    vfxParams: { secondaryColor: '#78350f', count: 6, scale: 1.3 },
    statusEffect: { type: BOSS_STATUS_EFFECT.STUN, ...STUN.SHORT },
  },
  mountain_tectonic_roar: {
    vfxType: BOSS_SKILL_VFX.SEISMIC_SLAM,
    vfxParams: { secondaryColor: '#f59e0b', scale: 1.2 },
    statusEffect: { type: BOSS_STATUS_EFFECT.STUN, ...STUN.SHORT },
  },
  mountain_volcanic_eruption: {
    vfxType: BOSS_SKILL_VFX.NOVA,
    vfxParams: { secondaryColor: '#f97316', scale: 1.5 },
    statusEffect: { type: BOSS_STATUS_EFFECT.BURN, ...DOT.HEAVY },
    minPhase: ULTIMATE_UNLOCK_PHASE,
  },

  // ── Storm Drake: wind & thunder ──────────────────────────────────────
  storm_lightning_spark: {
    vfxType: BOSS_SKILL_VFX.LIGHTNING_STRIKE,
    vfxParams: { secondaryColor: '#c7d2fe', count: 2 },
  },
  storm_wind_vortex: {
    vfxType: BOSS_SKILL_VFX.VORTEX,
    vfxParams: { secondaryColor: '#a5b4fc', scale: 1.1 },
    statusEffect: { type: BOSS_STATUS_EFFECT.WEAKEN, ...WEAKEN.SHORT },
  },
  storm_thunder_barrage: {
    vfxType: BOSS_SKILL_VFX.LIGHTNING_STRIKE,
    vfxParams: { secondaryColor: '#e9d5ff', count: 7, scale: 1.2 },
  },
  storm_tempest_wrath: {
    vfxType: BOSS_SKILL_VFX.NOVA,
    vfxParams: { secondaryColor: '#8b5cf6', scale: 1.4 },
    statusEffect: { type: BOSS_STATUS_EFFECT.WEAKEN, ...WEAKEN.LONG },
    minPhase: ULTIMATE_UNLOCK_PHASE,
  },

  // ── Void Titan: entropy & lifesteal ──────────────────────────────────
  void_annihilation_beam: {
    vfxType: BOSS_SKILL_VFX.BEAM,
    vfxParams: { secondaryColor: '#f0abfc', scale: 1.3 },
    statusEffect: { type: BOSS_STATUS_EFFECT.LIFESTEAL, ...LIFESTEAL.LOW },
  },
  void_singularity_crush: {
    vfxType: BOSS_SKILL_VFX.VORTEX,
    vfxParams: { secondaryColor: '#d8b4fe', scale: 1.3 },
    statusEffect: { type: BOSS_STATUS_EFFECT.LIFESTEAL, ...LIFESTEAL.LOW },
  },
  void_rift_collapse: {
    vfxType: BOSS_SKILL_VFX.GROUND_SPIKES,
    vfxParams: { secondaryColor: '#e879f9', count: 9, scale: 1.3 },
  },
  void_apocalypse_oblivion: {
    vfxType: BOSS_SKILL_VFX.NOVA,
    vfxParams: { secondaryColor: '#9333ea', scale: 1.6 },
    statusEffect: { type: BOSS_STATUS_EFFECT.LIFESTEAL, ...LIFESTEAL.HIGH },
    minPhase: ULTIMATE_UNLOCK_PHASE,
  },
};

/** Used when a skill id has no entry (keeps old behaviour: generic slam). */
export const DEFAULT_BOSS_SKILL_EFFECT: BossSkillEffectProfile = {
  vfxType: BOSS_SKILL_VFX.SEISMIC_SLAM,
};

export const getBossSkillEffect = (skillId: string): BossSkillEffectProfile =>
  BOSS_SKILL_EFFECTS[skillId] ?? DEFAULT_BOSS_SKILL_EFFECT;
