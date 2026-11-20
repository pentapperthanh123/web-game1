import {
  BOSS_SKILL_VFX_QUAKE_WEIGHT,
  BOSS_ULTIMATE_FEEDBACK,
} from '../constants/bossUltimateFeedback';
import {
  BOSS_SKILL_VFX_DURATION_MS,
  BOSS_SKILL_VFX_IMPACT_RATIO,
  getSkillImpactDelayMs,
  getSkillVfxWindowMs,
} from '../constants/bossSkillVfx';
import { BOSS_SKILL_VFX_SFX, SfxEventName } from '../constants/sfx';
import { audioService } from '../services/audioService';
import { playSound } from '../services/soundManager';
import { BossSkillDefinition, BossSkillVfxLayer } from '../types/bossSkill';
import { GameState } from '../types/game';
import { isBattleHalted } from './storeHelpers';
import { workerSetTimeout } from '../services/workerScheduler';

const MS_PER_SECOND = 1000;

export const ULTIMATE_CUE_KIND = {
  /** Archetype sample of a VFX layer, when the layer starts. */
  SOUND: 'SOUND',
  /** Ground hit: procedural thump + a shake kick, when a heavy layer or the damage lands. */
  KICK: 'KICK',
} as const;

export type UltimateFeedbackCue =
  | { kind: typeof ULTIMATE_CUE_KIND.SOUND; atMs: number; event: SfxEventName }
  | { kind: typeof ULTIMATE_CUE_KIND.KICK; atMs: number; intensity: number };

export interface UltimateFeedbackPlan {
  rumbleDurationMs: number;
  /** 0..1, the heaviest archetype in the skill. */
  quakeWeight: number;
  cues: UltimateFeedbackCue[];
}

const getLayers = (skill: BossSkillDefinition): readonly BossSkillVfxLayer[] => skill.vfxParams?.layers ?? [];

const resolveQuakeWeight = (skill: BossSkillDefinition): number =>
  Math.max(
    BOSS_SKILL_VFX_QUAKE_WEIGHT[skill.vfxType],
    ...getLayers(skill).map((layer) => BOSS_SKILL_VFX_QUAKE_WEIGHT[layer.vfxType])
  );

/** One sample per layer start; the main archetype (played by the cast at 0 ms) seeds the de-duplication. */
const buildSoundCues = (skill: BossSkillDefinition): UltimateFeedbackCue[] => {
  const lastPlayedAtMs = new Map<SfxEventName, number>();
  const mainSound = BOSS_SKILL_VFX_SFX[skill.vfxType];
  if (mainSound) lastPlayedAtMs.set(mainSound, 0);

  const cues: UltimateFeedbackCue[] = [];
  [...getLayers(skill)]
    .sort((first, second) => (first.delayMs ?? 0) - (second.delayMs ?? 0))
    .forEach((layer) => {
      const event = BOSS_SKILL_VFX_SFX[layer.vfxType];
      if (!event) return;
      const atMs = layer.delayMs ?? 0;
      const previousAtMs = lastPlayedAtMs.get(event);
      const isTooClose = previousAtMs !== undefined && atMs - previousAtMs < BOSS_ULTIMATE_FEEDBACK.MIN_SOUND_GAP_MS;
      if (isTooClose) return;
      lastPlayedAtMs.set(event, atMs);
      cues.push({ kind: ULTIMATE_CUE_KIND.SOUND, atMs, event });
    });
  return cues;
};

/** Kicks closer than MIN_KICK_GAP_MS collapse into the stronger one so thumps never stutter. */
const mergeCloseKicks = (kicks: Array<{ atMs: number; intensity: number }>): UltimateFeedbackCue[] => {
  const merged: Array<{ atMs: number; intensity: number }> = [];
  [...kicks]
    .sort((first, second) => first.atMs - second.atMs)
    .forEach((kick) => {
      const previous = merged[merged.length - 1];
      if (previous && kick.atMs - previous.atMs < BOSS_ULTIMATE_FEEDBACK.MIN_KICK_GAP_MS) {
        previous.intensity = Math.max(previous.intensity, kick.intensity);
        return;
      }
      merged.push({ ...kick });
    });
  return merged.map((kick) => ({ kind: ULTIMATE_CUE_KIND.KICK, ...kick }));
};

/** A thump when each heavy ground layer lands, plus one when the damage reaches the champions. */
const buildKickCues = (skill: BossSkillDefinition): UltimateFeedbackCue[] => {
  const layerKicks = getLayers(skill)
    .filter((layer) => BOSS_SKILL_VFX_QUAKE_WEIGHT[layer.vfxType] >= BOSS_ULTIMATE_FEEDBACK.GROUND_KICK_MIN_WEIGHT)
    .map((layer) => ({
      atMs: Math.round(
        (layer.delayMs ?? 0) + BOSS_SKILL_VFX_DURATION_MS[layer.vfxType] * BOSS_SKILL_VFX_IMPACT_RATIO[layer.vfxType]
      ),
      intensity: BOSS_ULTIMATE_FEEDBACK.LAYER_KICK_INTENSITY * BOSS_SKILL_VFX_QUAKE_WEIGHT[layer.vfxType],
    }));
  const impactKick = {
    atMs: getSkillImpactDelayMs(skill.vfxType, skill.vfxParams),
    intensity: BOSS_ULTIMATE_FEEDBACK.IMPACT_KICK_INTENSITY,
  };
  return mergeCloseKicks([...layerKicks, impactKick]);
};

/** Pure: what an ultimate should sound and shake like, read from its VFX layers (no per-skill table). */
export const buildUltimateFeedbackPlan = (skill: BossSkillDefinition): UltimateFeedbackPlan => ({
  rumbleDurationMs: getSkillVfxWindowMs(skill.vfxType, skill.vfxParams) + BOSS_ULTIMATE_FEEDBACK.RUMBLE_TAIL_MS,
  quakeWeight: resolveQuakeWeight(skill),
  cues: [...buildSoundCues(skill), ...buildKickCues(skill)].sort((first, second) => first.atMs - second.atMs),
});

const playCue = (get: () => GameState, cue: UltimateFeedbackCue, pitchRate: number): void => {
  // The round can end while the ultimate is still playing out
  if (isBattleHalted(get())) return;
  if (cue.kind === ULTIMATE_CUE_KIND.SOUND) {
    playSound(cue.event, {
      rateScale: pitchRate,
      volumeScale: BOSS_ULTIMATE_FEEDBACK.LAYER_SOUND_VOLUME_SCALE,
      bypassCombatMute: true,
    });
    return;
  }
  audioService.playQuakeImpact(cue.intensity, pitchRate, true);
  get().triggerScreenShake(cue.intensity);
};

/**
 * Everything an ultimate adds on top of a normal cast: the opening kick, a rumble (screen + sound)
 * that lasts as long as the skill's VFX, one sample per VFX layer and a thump for every ground hit.
 */
export const playBossUltimateFeedback = (get: () => GameState, skill: BossSkillDefinition, pitchRate: number): void => {
  const plan = buildUltimateFeedbackPlan(skill);
  get().triggerScreenShake(BOSS_ULTIMATE_FEEDBACK.CAST_SHAKE_INTENSITY);
  get().triggerScreenRumble(BOSS_ULTIMATE_FEEDBACK.RUMBLE_INTENSITY * plan.quakeWeight, plan.rumbleDurationMs);
  audioService.playQuakeRumble(plan.rumbleDurationMs / MS_PER_SECOND, plan.quakeWeight, pitchRate, true);
  plan.cues.forEach((cue) => {
    workerSetTimeout(() => playCue(get, cue, pitchRate), cue.atMs);
  });
};
