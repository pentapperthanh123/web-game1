import { DRINK_BAR_PALETTE, GAMEPLAY_LIMITS, STAGE_METRICS } from '@shared/config';
import { getBrewStep, RECIPE_BREW_PHASES, RECIPE_MAP, type BrewPhaseAction } from '@shared/recipes';
import type {
  ActiveDrink,
  BartenderMood,
  BartenderSpeech,
  DanceStyle,
  GiftTier,
} from '@shared/types';
import {
  BOBA_SCOOP_END_PROGRESS,
  BOBA_SCOOP_START_PROGRESS,
  CAFE_CREAM_START_PROGRESS,
  CAFE_POUR_END_PROGRESS,
  clamp01,
  computeLiquidFillSnapshot,
  CUP1_CX,
  CUP_BOTTOM_HALF_W,
  CUP_BOTTOM_Y,
  CUP_HEIGHT,
  CUP_PICKUP_END_PROGRESS,
  CUP_TOP_HALF_W,
  CUP_TOP_Y,
  DISPENSE_END_PROGRESS,
  drawGraduatedMeasuringCup,
  drawMatchaCanister,
  drawMatchaChawanWithFrother,
  drawPourLiquidEffect,
  drawRealisticBobaShaker,
  drawStainlessPitcherWithFrother,
  LID_PICKUP_END_PROGRESS,
  LID_SNAP_END_PROGRESS,
  LID_SNAP_MOMENT_PROGRESS,
  MATCHA_GRAB_END_PROGRESS,
  MATCHA_MILK_PREP_END_PROGRESS,
  MATCHA_MILK_SPLIT_RATIO,
  MATCHA_SCOOP_END_PROGRESS,
  MATCHA_SHELF_END_PROGRESS,
  MATCHA_SWAP_END_RATIO,
  SHAKER_LIFT_END_PROGRESS,
  SODA_SWAP_END_RATIO,
  SODA_SYRUP_SPLIT_RATIO,
  STRAW_INSERT_END_PROGRESS,
  STRAW_INSERT_START_PROGRESS,
  SUGAR_PRESS_START_PROGRESS,
  SYRUP_PUMP_END_PROGRESS,
  TEA_URN_DISPENSE_END_PROGRESS,
  THAI_TEA_CREAM_START_PROGRESS,
  THAI_TEA_POUR_END_PROGRESS,
  transformRotatedAnchor,
  type PourVesselKind,
} from './brewEffects';
import { BAR_STATION_COORDS, roundedRectPath } from './drawBarScene';
import { computeShowcaseSlideFactor, SHOWCASE_HANDOFF_MS } from './drawDrinkCup';

export const BARISTA_CENTER_X = 360;
export const BARISTA_HEAD_Y = 486;
export const BARISTA_DOZE_NOSE_Y = BARISTA_HEAD_Y + 126 + 16;
export const WAKE_UP_DURATION_MS = 380;
const BARISTA_TORSO_Y = 516;
const STAGE_WORK_CENTER_X = 360;
const OUTLINE_W = 2.6;
const BARISTA_SKIN = '#FDE0C2';

export function isCupPickupSubstep(drink: ActiveDrink | null): boolean {
  return Boolean(
    drink &&
      drink.phase === 'BREWING' &&
      drink.progress < CUP_PICKUP_END_PROGRESS
  );
}

export function isMatchaGrabSubstep(drink: ActiveDrink | null): boolean {
  return Boolean(
    drink &&
      drink.phase === 'BREWING' &&
      drink.recipeId === 'matcha' &&
      drink.progress >= MATCHA_MILK_PREP_END_PROGRESS &&
      drink.progress < MATCHA_GRAB_END_PROGRESS
  );
}

export function isMatchaScoopSubstep(drink: ActiveDrink | null): boolean {
  return Boolean(
    drink &&
      drink.phase === 'BREWING' &&
      drink.recipeId === 'matcha' &&
      drink.progress >= MATCHA_GRAB_END_PROGRESS &&
      drink.progress < MATCHA_SCOOP_END_PROGRESS
  );
}

export function isMatchaReturnSubstep(drink: ActiveDrink | null): boolean {
  return Boolean(
    drink &&
      drink.phase === 'BREWING' &&
      drink.recipeId === 'matcha' &&
      drink.progress >= MATCHA_SCOOP_END_PROGRESS &&
      drink.progress < MATCHA_SHELF_END_PROGRESS
  );
}

export function isMatchaShelfSubstep(drink: ActiveDrink | null): boolean {
  return Boolean(
    drink &&
      drink.phase === 'BREWING' &&
      drink.recipeId === 'matcha' &&
      drink.progress >= MATCHA_MILK_PREP_END_PROGRESS &&
      drink.progress < MATCHA_SHELF_END_PROGRESS
  );
}

export function isSugarButtonSubstep(drink: ActiveDrink | null): boolean {
  return Boolean(
    drink &&
      drink.phase === 'BREWING' &&
      drink.recipeId !== 'matcha' &&
      drink.progress >= SUGAR_PRESS_START_PROGRESS &&
      drink.progress < DISPENSE_END_PROGRESS
  );
}

export function isBobaScoopSubstep(drink: ActiveDrink | null): boolean {
  return Boolean(
    drink &&
      drink.phase === 'BREWING' &&
      drink.recipeId === 'thai_tea' &&
      drink.progress >= BOBA_SCOOP_START_PROGRESS &&
      drink.progress < BOBA_SCOOP_END_PROGRESS
  );
}

export function isShakerLiftSubstep(drink: ActiveDrink | null): boolean {
  return Boolean(
    drink &&
      drink.phase === 'BREWING' &&
      (drink.recipeId === 'thai_tea' || drink.recipeId === 'peach_tea') &&
      drink.progress >= 56 &&
      drink.progress < SHAKER_LIFT_END_PROGRESS
  );
}

export function isShakerDetachedSubstep(drink: ActiveDrink | null): boolean {
  if (!drink || drink.phase !== 'BREWING') return false;
  if (drink.recipeId === 'thai_tea') {
    return drink.progress >= 56 && drink.progress < THAI_TEA_POUR_END_PROGRESS;
  }
  if (drink.recipeId === 'peach_tea') {
    return drink.progress >= 56 && drink.progress < 78;
  }
  return false;
}

/**
 * Returns the physical liquid fill level (0..1) inside the shaker resting on the shaker machine.
 * Fills for thai_tea and peach_tea during P2/P3 (0.94), detaches during P4, and stays EMPTY (0) once poured!
 */
export function resolveShakerMachineFillRatio(drink: ActiveDrink | null): number {
  if (
    !drink ||
    (drink.recipeId !== 'thai_tea' && drink.recipeId !== 'peach_tea') ||
    drink.phase !== 'BREWING'
  ) {
    return 0;
  }
  if (drink.progress >= DISPENSE_END_PROGRESS && drink.progress < 56) {
    return 0.94;
  }
  return 0;
}

export function isLidPickupSubstep(drink: ActiveDrink | null): boolean {
  return Boolean(
    drink &&
      drink.phase === 'BREWING' &&
      drink.progress >= 84 &&
      drink.progress < LID_PICKUP_END_PROGRESS
  );
}

export function isStrawInsertSubstep(drink: ActiveDrink | null): boolean {
  return Boolean(
    drink &&
      drink.phase === 'BREWING' &&
      drink.progress >= STRAW_INSERT_START_PROGRESS &&
      drink.progress < 100
  );
}

export function isHoldingOatsideSubstep(drink: ActiveDrink | null): boolean {
  if (!drink || drink.phase !== 'BREWING' || drink.recipeId !== 'matcha') return false;
  if (
    drink.progress >= CUP_PICKUP_END_PROGRESS &&
    drink.progress < MATCHA_MILK_PREP_END_PROGRESS
  ) {
    return true;
  }
  const action = getBrewStep(drink.progress, drink.recipeId).action;
  if (action !== 'pour_mix') return false;
  return resolvePourRatio(drink) <= MATCHA_MILK_SPLIT_RATIO + 0.05;
}

export function isHoldingSodaBottleSubstep(drink: ActiveDrink | null): boolean {
  if (!drink || drink.phase !== 'BREWING' || drink.recipeId !== 'berry_soda') return false;
  const action = getBrewStep(drink.progress, drink.recipeId).action;
  if (action !== 'pour_mix') return false;
  return resolvePourRatio(drink) > SODA_SYRUP_SPLIT_RATIO;
}

export const IDLE_PHASE_TIMINGS = {
  WIPE_END_SEC: 4.5,
  STRETCH_YAWN_END_SEC: 6.8,
  WIPE_SPARKLE_INTERVAL_SEC: 1.35,
  DREAM_DELAY_SEC: 2.5,
  DREAM_CYCLE_SEC: 5.0,
  DREAM_VISIBLE_SEC: 3.6,
} as const;

export type IdleBaristaPhase = 'WIPE' | 'STRETCH_YAWN' | 'DOZE';

function resolveIdleBaristaPhase(idleElapsedSec: number): {
  phase: IdleBaristaPhase;
  phaseElapsed: number;
  phaseDuration: number;
} {
  if (idleElapsedSec < IDLE_PHASE_TIMINGS.WIPE_END_SEC) {
    return {
      phase: 'WIPE',
      phaseElapsed: idleElapsedSec,
      phaseDuration: IDLE_PHASE_TIMINGS.WIPE_END_SEC,
    };
  }
  if (idleElapsedSec < IDLE_PHASE_TIMINGS.STRETCH_YAWN_END_SEC) {
    return {
      phase: 'STRETCH_YAWN',
      phaseElapsed: idleElapsedSec - IDLE_PHASE_TIMINGS.WIPE_END_SEC,
      phaseDuration: IDLE_PHASE_TIMINGS.STRETCH_YAWN_END_SEC - IDLE_PHASE_TIMINGS.WIPE_END_SEC,
    };
  }
  return {
    phase: 'DOZE',
    phaseElapsed: idleElapsedSec - IDLE_PHASE_TIMINGS.STRETCH_YAWN_END_SEC,
    phaseDuration: 9999,
  };
}

function computeDozeBlend(
  idle: { phase: IdleBaristaPhase; phaseElapsed: number; phaseDuration: number } | null
): number {
  if (!idle || idle.phase !== 'DOZE') return 0;
  const enterSec = 1.0;
  const inT = clamp01(idle.phaseElapsed / enterSec);
  return inT * inT * (3 - 2 * inT);
}

const reusableIdlePose = {
  bobOffset: 0,
  headTilt: 0,
  dozeBlend: 0,
  yawnPeak: 0,
  yawnSettle: 0,
};

function computeIdlePoseSnapshot(
  idle: { phase: IdleBaristaPhase; phaseElapsed: number; phaseDuration: number } | null,
  elapsedSec: number
): typeof reusableIdlePose {
  reusableIdlePose.bobOffset = 0;
  reusableIdlePose.headTilt = Math.sin(elapsedSec * 1.45) * 0.024;
  reusableIdlePose.dozeBlend = 0;
  reusableIdlePose.yawnPeak = 0;
  reusableIdlePose.yawnSettle = 0;

  if (!idle) return reusableIdlePose;

  if (idle.phase === 'WIPE') {
    const p = clamp01(idle.phaseElapsed / idle.phaseDuration);
    const inLean = clamp01(p / 0.14);
    const outLean = clamp01((1 - p) / 0.14);
    const leanBlend = Math.min(
      inLean * inLean * (3 - 2 * inLean),
      outLean * outLean * (3 - 2 * outLean)
    );
    const sweep = Math.sin(idle.phaseElapsed * 4.2);
    // Lean gently forward toward counter while wiping so shoulders connect cleanly to counter top
    reusableIdlePose.bobOffset = leanBlend * 36 + Math.abs(sweep) * 2.5 * leanBlend;
    reusableIdlePose.headTilt = sweep * 0.055 * leanBlend;
    return reusableIdlePose;
  }

  if (idle.phase === 'STRETCH_YAWN') {
    const p = clamp01(idle.phaseElapsed / idle.phaseDuration);
    if (p < 0.5) {
      // First ~1.15s: cute stretch up
      const stretchT = p / 0.5;
      const lift = Math.sin(stretchT * Math.PI);
      reusableIdlePose.bobOffset = -lift * 4.0;
      reusableIdlePose.headTilt = -lift * 0.06;
    } else {
      // Second ~1.15s: hand covers mouth for yawn
      const yawnT = (p - 0.5) / 0.5;
      const yawnPeak = Math.sin(yawnT * Math.PI);
      reusableIdlePose.yawnPeak = yawnPeak;
      reusableIdlePose.yawnSettle = yawnT;
      reusableIdlePose.bobOffset = -yawnPeak * 2.0;
      reusableIdlePose.headTilt = 0.06 * yawnPeak;
    }
    return reusableIdlePose;
  }

  if (idle.phase === 'DOZE') {
    const dozeBlend = computeDozeBlend(idle);
    const breathe = Math.sin(elapsedSec * 2.0) * 1.8 * dozeBlend;
    reusableIdlePose.dozeBlend = dozeBlend;
    reusableIdlePose.bobOffset = dozeBlend * 104 + breathe;
    reusableIdlePose.headTilt = dozeBlend * 0.24;
    return reusableIdlePose;
  }

  return reusableIdlePose;
}

export function resolveTargetBaristaX(
  drink: ActiveDrink | null,
  isDancing: boolean,
  isWaving = false,
  idleElapsedSec = 0
): number {
  if (isDancing) {
    return BARISTA_CENTER_X;
  }
  if (!drink || drink.phase !== 'BREWING') {
    return BARISTA_CENTER_X;
  }

  // Sub-step 0..7%: Walk right to Cup Stack (x=502), pick cup, then carry back to center coaster (x=360)
  if (isCupPickupSubstep(drink)) {
    const pickupT = clamp01(drink.progress / CUP_PICKUP_END_PROGRESS);
    return pickupT < 0.45 ? 452 : BARISTA_CENTER_X;
  }

  const action = getBrewStep(drink.progress, drink.recipeId).action;
  if (action === 'dispense') {
    if (isMatchaGrabSubstep(drink)) {
      const t = clamp01(
        (drink.progress - MATCHA_MILK_PREP_END_PROGRESS) /
          (MATCHA_GRAB_END_PROGRESS - MATCHA_MILK_PREP_END_PROGRESS)
      );
      return t < 0.45 ? 448 : 408;
    }
    if (isMatchaScoopSubstep(drink)) return 408;
    if (isMatchaReturnSubstep(drink)) {
      const t = clamp01(
        (drink.progress - MATCHA_SCOOP_END_PROGRESS) /
          (MATCHA_SHELF_END_PROGRESS - MATCHA_SCOOP_END_PROGRESS)
      );
      return t < 0.4 ? 408 : 448;
    }
    if (isSugarButtonSubstep(drink)) return 194;
    if (drink.recipeId === 'thai_tea') return 224;
    if (drink.recipeId === 'peach_tea') {
      return drink.progress < TEA_URN_DISPENSE_END_PROGRESS ? 296 : 388;
    }
    if (drink.recipeId === 'lime_tea') {
      return drink.progress < TEA_URN_DISPENSE_END_PROGRESS ? 296 : 418;
    }
    if (drink.recipeId === 'coffee_milk') return 508;
    if (drink.recipeId === 'berry_soda') return 368;
    if (drink.recipeId === 'matcha') return 408;
    return 296;
  }

  if (action === 'tool_prep') {
    if (drink.recipeId === 'thai_tea' || drink.recipeId === 'peach_tea') return 148;
    if (
      drink.recipeId === 'matcha' ||
      drink.recipeId === 'lime_tea' ||
      drink.recipeId === 'coffee_milk' ||
      drink.recipeId === 'berry_soda'
    ) {
      return 408;
    }
    return 296;
  }

  if (action === 'add_ice') {
    if (isBobaScoopSubstep(drink)) return 268;
    return 304;
  }

  if (action === 'pour_mix' && isShakerLiftSubstep(drink)) {
    const liftT = clamp01((drink.progress - 56) / (SHAKER_LIFT_END_PROGRESS - 56));
    return liftT < 0.45 ? 188 : BARISTA_CENTER_X;
  }

  if (action === 'seal' && isLidPickupSubstep(drink)) {
    const lidT = clamp01((drink.progress - 84) / (LID_PICKUP_END_PROGRESS - 84));
    return lidT < 0.45 ? 468 : BARISTA_CENTER_X;
  }

  return BARISTA_CENTER_X;
}

export interface DanceMotion {
  isDancing: boolean;
  style: DanceStyle;
  blend: number;
  swayX: number;
  bounceY: number;
  headTiltRad: number;
  beatPhase: number;
  beatPulse: number;
  beatIndex: number;
  poseIndex: number;
  leftHandX: number;
  leftHandY: number;
  rightHandX: number;
  rightHandY: number;
  leftElbowBiasX: number;
  leftElbowBiasY: number;
  rightElbowBiasX: number;
  rightElbowBiasY: number;
  showCenterHeart: boolean;
  heartPulseScale: number;
  isHeartAtChest?: boolean;
  heartArchCubic?: HeartArchCubic;
  turnScaleX: number;
  isBackFacing: boolean;
  hipShakeX: number;
  hipTiltRad: number;
  legBeatOffset: number;
  peekDir: number;
}

export interface HeartArchCubic {
  enabled: boolean;
  cp1Lx: number;
  cp1Ly: number;
  cp2Lx: number;
  cp2Ly: number;
  endLx: number;
  endLy: number;
  cp1Rx: number;
  cp1Ry: number;
  cp2Rx: number;
  cp2Ry: number;
  endRx: number;
  endRy: number;
}

const DANCE_BPM_OMEGA: Readonly<Record<DanceStyle, number>> = {
  heart_sway: (126 / 60) * Math.PI,  // ~6.60 rad/s -> upbeat 126 BPM Jingle Bells Pop
  groove_wave: (114 / 60) * Math.PI, // ~5.97 rad/s -> lively 114 BPM Noel Groove
  party_hype: (138 / 60) * Math.PI,  // ~7.23 rad/s -> hype 138 BPM Carol of the Bells EDM
};

const DANCE_AMP_MAP: Readonly<Record<DanceStyle, number>> = {
  heart_sway: 0.9,
  groove_wave: 1.05,
  party_hype: 1.25,
};

const PARTY_HYPE_CHOREO = {
  BEAT_HZ: 138 / 60,
  CYCLE_BEATS: 8,
  FRONT_END_BEAT: 2.8,
  SPIN_TO_BACK_END_BEAT: 3.55,
  HIP_STAGE_ONE_END_BEAT: 5.2,
  BACK_END_BEAT: 7.25,
  PEEK_RIGHT_START_BEAT: 4.05,
  PEEK_RIGHT_END_BEAT: 5.15,
  PEEK_LEFT_START_BEAT: 5.65,
  PEEK_LEFT_END_BEAT: 6.85,
  MIN_BODY_SCALE_X: 0.24,
  FRONT_SWAY_X: 11.5,
  FRONT_BOUNCE_Y: 11.0,
  HIP_SHAKE_X: 14.5,
  HIP_TILT_RAD: 0.19,
  BACK_BOUNCE_Y: 8.8,
  LEG_HOP_PX: 8.5,
} as const;

const MAX_DANCE_ARM_REACH = 60;
const MAX_HEART_ARCH_ARM_REACH = 98;
const MIN_DANCE_ARM_REACH = 18;
const MAX_ELBOW_BEND_PX = 32;
const MAX_CHIBI_ARM_REACH = 200;
const DANCE_COUNTER_CLEAR_Y = STAGE_METRICS.COUNTER_TOP_Y - 12;

const DANCE_NOTE_X_OFFSETS: readonly number[] = [-68, -42, 42, 68];
const DANCE_NOTE_SYMBOLS: readonly string[] = ['♪', '♫', '♫', '♪'];
const DANCE_NOTE_COLORS: readonly string[] = ['#F0788C', '#F7C95B', '#7FC8D9', '#A7D397'];

// Reusable mutable dance & joint-clamp buffers (zero per-frame allocations at 30 FPS)
const reusableDanceMotion: DanceMotion = {
  isDancing: false,
  style: 'heart_sway',
  blend: 0,
  swayX: 0,
  bounceY: 0,
  headTiltRad: 0,
  beatPhase: 0,
  beatPulse: 0,
  beatIndex: 0,
  poseIndex: 0,
  leftHandX: BARISTA_CENTER_X - 46,
  leftHandY: BARISTA_HEAD_Y - 8,
  rightHandX: BARISTA_CENTER_X + 46,
  rightHandY: BARISTA_HEAD_Y - 8,
  leftElbowBiasX: -12,
  leftElbowBiasY: 14,
  rightElbowBiasX: 12,
  rightElbowBiasY: 14,
  showCenterHeart: false,
  heartPulseScale: 1,
  turnScaleX: 1,
  isBackFacing: false,
  hipShakeX: 0,
  hipTiltRad: 0,
  legBeatOffset: 0,
  peekDir: 0,
  heartArchCubic: {
    enabled: false,
    cp1Lx: 0,
    cp1Ly: 0,
    cp2Lx: 0,
    cp2Ly: 0,
    endLx: 0,
    endLy: 0,
    cp1Rx: 0,
    cp1Ry: 0,
    cp2Rx: 0,
    cp2Ry: 0,
    endRx: 0,
    endRy: 0,
  },
};

const reusableTargetMotion = {
  swayX: 0,
  bounceY: 0,
  headTiltRad: 0,
  leftHandX: BARISTA_CENTER_X - 46,
  leftHandY: BARISTA_HEAD_Y - 8,
  rightHandX: BARISTA_CENTER_X + 46,
  rightHandY: BARISTA_HEAD_Y - 8,
  leftElbowBiasX: -12,
  leftElbowBiasY: 14,
  rightElbowBiasX: 12,
  rightElbowBiasY: 14,
  turnScaleX: 1,
  hipShakeX: 0,
  hipTiltRad: 0,
  legBeatOffset: 0,
  peekDir: 0,
};

const clampedWristScratch = { x: 0, y: 0 };

function clampDanceWristTarget(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  out: { x: number; y: number },
  maxReach = MAX_DANCE_ARM_REACH
): void {
  let dx = tx - sx;
  let dy = ty - sy;
  const dist = Math.hypot(dx, dy);
  if (dist > maxReach && dist > 0.001) {
    const scale = maxReach / dist;
    dx *= scale;
    dy *= scale;
  } else if (dist < MIN_DANCE_ARM_REACH && dist > 0.001) {
    const scale = MIN_DANCE_ARM_REACH / dist;
    dx *= scale;
    dy *= scale;
  }
  out.x = sx + dx;
  out.y = Math.min(DANCE_COUNTER_CLEAR_Y, sy + dy);
}

export function resetDanceJointTransition(): void {
  reusableDanceMotion.blend = 0;
  reusableDanceMotion.turnScaleX = 1;
  reusableDanceMotion.isBackFacing = false;
  reusableDanceMotion.hipShakeX = 0;
  reusableDanceMotion.hipTiltRad = 0;
  reusableDanceMotion.legBeatOffset = 0;
  reusableDanceMotion.peekDir = 0;
}

function computePartyHypeTurnScaleX(cycleBeat: number): number {
  if (cycleBeat < PARTY_HYPE_CHOREO.FRONT_END_BEAT) {
    return 1;
  }
  if (cycleBeat < PARTY_HYPE_CHOREO.SPIN_TO_BACK_END_BEAT) {
    const u =
      (cycleBeat - PARTY_HYPE_CHOREO.FRONT_END_BEAT) /
      (PARTY_HYPE_CHOREO.SPIN_TO_BACK_END_BEAT - PARTY_HYPE_CHOREO.FRONT_END_BEAT);
    return Math.cos(u * Math.PI);
  }
  if (cycleBeat < PARTY_HYPE_CHOREO.BACK_END_BEAT) {
    return -1;
  }
  const u =
    (cycleBeat - PARTY_HYPE_CHOREO.BACK_END_BEAT) /
    (PARTY_HYPE_CHOREO.CYCLE_BEATS - PARTY_HYPE_CHOREO.BACK_END_BEAT);
  return -Math.cos(u * Math.PI);
}

function populatePartyHypeTargets(
  danceLocalSec: number,
  beatPhase: number,
  halfBeatSin: number,
  beatSin: number,
  beatCos: number,
  amp: number
): void {
  const cycleBeat = (danceLocalSec * PARTY_HYPE_CHOREO.BEAT_HZ) % PARTY_HYPE_CHOREO.CYCLE_BEATS;
  const turnScaleX = computePartyHypeTurnScaleX(cycleBeat);
  reusableTargetMotion.turnScaleX = turnScaleX;

  const isBackHold =
    cycleBeat >= PARTY_HYPE_CHOREO.SPIN_TO_BACK_END_BEAT &&
    cycleBeat < PARTY_HYPE_CHOREO.BACK_END_BEAT;

  if (isBackHold) {
    const hipWave = Math.sin(beatPhase * 2);
    const hipBounce = Math.pow(Math.abs(hipWave), 0.72);
    reusableTargetMotion.swayX = hipWave * 4.5 * amp;
    reusableTargetMotion.bounceY = -hipBounce * PARTY_HYPE_CHOREO.BACK_BOUNCE_Y * amp;
    reusableTargetMotion.hipShakeX = hipWave * PARTY_HYPE_CHOREO.HIP_SHAKE_X * amp;
    reusableTargetMotion.hipTiltRad = hipWave * PARTY_HYPE_CHOREO.HIP_TILT_RAD * amp;
    reusableTargetMotion.headTiltRad = -hipWave * 0.14 * amp;
    reusableTargetMotion.legBeatOffset = hipWave * PARTY_HYPE_CHOREO.LEG_HOP_PX * amp;

    let peekDir = 0;
    if (
      cycleBeat >= PARTY_HYPE_CHOREO.PEEK_RIGHT_START_BEAT &&
      cycleBeat < PARTY_HYPE_CHOREO.PEEK_RIGHT_END_BEAT
    ) {
      peekDir = 1;
    } else if (
      cycleBeat >= PARTY_HYPE_CHOREO.PEEK_LEFT_START_BEAT &&
      cycleBeat < PARTY_HYPE_CHOREO.PEEK_LEFT_END_BEAT
    ) {
      peekDir = -1;
    }
    reusableTargetMotion.peekDir = peekDir;

    const cx = BARISTA_CENTER_X + reusableTargetMotion.swayX;
    const headY = BARISTA_HEAD_Y + reusableTargetMotion.bounceY;
    const torsoY = BARISTA_TORSO_Y + reusableTargetMotion.bounceY;
    const hipBaseX = cx + reusableTargetMotion.hipShakeX * 0.78;
    const hipHandY = torsoY + 72;

    // Screen LEFT shoulder (anatomical right) holds swaying left hip
    reusableTargetMotion.rightHandX = hipBaseX - 31;
    reusableTargetMotion.rightHandY = hipHandY;
    reusableTargetMotion.rightElbowBiasX = -18;
    reusableTargetMotion.rightElbowBiasY = -2;

    // Screen RIGHT shoulder (anatomical left) pumps overhead first, then doubles on swaying hips
    if (cycleBeat < PARTY_HYPE_CHOREO.HIP_STAGE_ONE_END_BEAT) {
      reusableTargetMotion.leftHandX = cx + 46 + hipWave * 8;
      reusableTargetMotion.leftHandY = headY - 26 + Math.abs(beatCos) * 14;
      reusableTargetMotion.leftElbowBiasX = 14;
      reusableTargetMotion.leftElbowBiasY = 14;
    } else {
      reusableTargetMotion.leftHandX = hipBaseX + 31;
      reusableTargetMotion.leftHandY = hipHandY;
      reusableTargetMotion.leftElbowBiasX = 18;
      reusableTargetMotion.leftElbowBiasY = -2;
    }
    return;
  }

  const isSpinning = cycleBeat >= PARTY_HYPE_CHOREO.FRONT_END_BEAT;
  const spinLift = isSpinning ? -Math.sin((1 - Math.abs(turnScaleX)) * Math.PI * 0.5) * 12 * amp : 0;
  reusableTargetMotion.swayX = isSpinning ? 0 : halfBeatSin * PARTY_HYPE_CHOREO.FRONT_SWAY_X * amp;
  reusableTargetMotion.bounceY =
    -Math.pow(Math.abs(beatSin), 0.68) * PARTY_HYPE_CHOREO.FRONT_BOUNCE_Y * amp + spinLift;
  reusableTargetMotion.headTiltRad = isSpinning ? turnScaleX * 0.08 : beatSin * 0.12 * amp;
  reusableTargetMotion.hipShakeX = 0;
  reusableTargetMotion.hipTiltRad = 0;
  reusableTargetMotion.legBeatOffset = beatSin * 6.5 * amp;
  reusableTargetMotion.peekDir = 0;

  const cx = BARISTA_CENTER_X + reusableTargetMotion.swayX;
  const headY = BARISTA_HEAD_Y + reusableTargetMotion.bounceY;
  const pumpMix = 0.5 - 0.5 * Math.cos(beatPhase * 0.5);
  const upPumpL = headY - 30 + Math.abs(beatCos) * 14;
  const upPumpR = headY - 30 + Math.abs(beatSin) * 14;
  const crossPumpL = headY - 6 + beatSin * 20;
  const crossPumpR = headY - 6 - beatSin * 20;
  const localLx = -38 - pumpMix * 8 + beatSin * 6;
  const localRx = 38 + pumpMix * 8 + beatSin * 6;

  reusableTargetMotion.leftHandX = cx + localLx * turnScaleX;
  reusableTargetMotion.leftHandY = upPumpL + (crossPumpL - upPumpL) * pumpMix;
  reusableTargetMotion.rightHandX = cx + localRx * turnScaleX;
  reusableTargetMotion.rightHandY = upPumpR + (crossPumpR - upPumpR) * pumpMix;
  reusableTargetMotion.leftElbowBiasX = -15 * turnScaleX;
  reusableTargetMotion.leftElbowBiasY = 13 + Math.abs(beatSin) * 5;
  reusableTargetMotion.rightElbowBiasX = 15 * turnScaleX;
  reusableTargetMotion.rightElbowBiasY = 13 + Math.abs(beatCos) * 5;
}

export function stepDanceKinematics(
  isDancing: boolean,
  danceStyle: DanceStyle,
  danceStartedAt: number,
  elapsedSec: number,
  dtSec: number
): DanceMotion {
  if (!isDancing) {
    reusableDanceMotion.isDancing = false;
    reusableDanceMotion.style = danceStyle;
    reusableDanceMotion.blend = 0;
    reusableDanceMotion.swayX = 0;
    reusableDanceMotion.bounceY = 0;
    reusableDanceMotion.headTiltRad = 0;
    reusableDanceMotion.beatPhase = 0;
    reusableDanceMotion.beatPulse = 0;
    reusableDanceMotion.beatIndex = 0;
    reusableDanceMotion.poseIndex = 0;
    reusableDanceMotion.showCenterHeart = false;
    reusableDanceMotion.turnScaleX = 1;
    reusableDanceMotion.isBackFacing = false;
    reusableDanceMotion.hipShakeX = 0;
    reusableDanceMotion.hipTiltRad = 0;
    reusableDanceMotion.legBeatOffset = 0;
    reusableDanceMotion.peekDir = 0;
    if (reusableDanceMotion.heartArchCubic) {
      reusableDanceMotion.heartArchCubic.enabled = false;
    }
    return reusableDanceMotion;
  }

  const blend =
    danceStartedAt > 0
      ? clamp01((Date.now() - danceStartedAt) / GAMEPLAY_LIMITS.DANCE_TRANSITION_MS)
      : 1;

  const omega = DANCE_BPM_OMEGA[danceStyle];
  const amp = DANCE_AMP_MAP[danceStyle] * blend;
  const danceLocalSec = danceStartedAt > 0 ? Math.max(0, (Date.now() - danceStartedAt) / 1000) : elapsedSec;
  const beatPhase = danceLocalSec * omega;
  const halfBeatSin = Math.sin(beatPhase * 0.5);
  const beatSin = Math.sin(beatPhase);
  const beatCos = Math.cos(beatPhase);
  const beatPulse = Math.pow(Math.abs(beatSin), 1.4);

  reusableDanceMotion.isDancing = true;
  reusableDanceMotion.style = danceStyle;
  reusableDanceMotion.blend = blend;
  reusableDanceMotion.beatPhase = beatPhase;
  reusableDanceMotion.beatPulse = beatPulse;
  reusableDanceMotion.beatIndex = Math.floor(beatPhase / Math.PI);
  reusableDanceMotion.poseIndex = Math.floor(beatPhase / (Math.PI * 2)) % 2;

  if (danceStyle === 'heart_sway') {
    reusableTargetMotion.swayX = halfBeatSin * 8.5 * amp;
    reusableTargetMotion.bounceY = -Math.abs(beatSin) * 7.5 * amp;
    reusableTargetMotion.headTiltRad = halfBeatSin * 0.14 * amp;

    const cx = BARISTA_CENTER_X + reusableTargetMotion.swayX;
    const headY = BARISTA_HEAD_Y + reusableTargetMotion.bounceY;
    const torsoY = BARISTA_TORSO_Y + reusableTargetMotion.bounceY;

    // 4-phase idol heart choreography cycle:
    // 0.0..1.2: OVERHEAD BIG HEART ARCH (Vòng 2 tay tạo hình trái tim lớn trên đầu)
    // 1.2..2.0: BẮN TIM / POP OPEN OUTWARD (Bung 2 tay bắn tim lấp lánh sang 2 bên)
    // 2.0..3.0: CHEST HEART (2 tay khum trước ngực tạo hình trái tim)
    // 3.0..4.0: SWEET SWAY BACK TO OVERHEAD HEART (Uốn lượn mượt mà về lại vòm tim lớn)
    const cyclePhase = (danceLocalSec * (126 / 60) * 0.5) % 4;

    // Keyframe 1: Overhead Big Heart Arch (Elbows flare wide, lobes arc high up & hands dip into center notch!)
    const overheadK = {
      cp1Lx: cx - 96,
      cp1Ly: headY + 6,
      cp2Lx: cx - 52,
      cp2Ly: headY - 80,
      endLx: cx - 3.5,
      endLy: headY - 44,
      cp1Rx: cx + 96,
      cp1Ry: headY + 6,
      cp2Rx: cx + 52,
      cp2Ry: headY - 80,
      endRx: cx + 3.5,
      endRy: headY - 44,
    };

    // Keyframe 2: Shoot Hearts / Bắn Tim open
    const openK = {
      cp1Lx: cx - 50,
      cp1Ly: headY + 14,
      cp2Lx: cx - 46,
      cp2Ly: headY - 2,
      endLx: cx - 44 + beatSin * 3,
      endLy: headY - 6 + beatCos * 4,
      cp1Rx: cx + 50,
      cp1Ry: headY + 14,
      cp2Rx: cx + 46,
      cp2Ry: headY - 2,
      endRx: cx + 44 + beatSin * 3,
      endRy: headY - 6 - beatCos * 4,
    };

    // Keyframe 3: Chest Heart (2 tay khum trước ngực/cằm)
    const chestK = {
      cp1Lx: cx - 38,
      cp1Ly: torsoY + 18,
      cp2Lx: cx - 24,
      cp2Ly: torsoY + 8,
      endLx: cx - 8,
      endLy: torsoY + 4,
      cp1Rx: cx + 38,
      cp1Ry: torsoY + 18,
      cp2Rx: cx + 24,
      cp2Ry: torsoY + 8,
      endRx: cx + 8,
      endRy: torsoY + 4,
    };

    let srcK = overheadK;
    let dstK = overheadK;
    let ease = 0;
    let showHeart = false;
    let isChestHeart = false;

    if (cyclePhase < 1.2) {
      // Phase 1: Overhead Big Heart Arch (giữ dáng trái tim lớn đẹp mắt)
      srcK = overheadK;
      dstK = overheadK;
      ease = 0;
      showHeart = true;
      isChestHeart = false;
    } else if (cyclePhase < 2.0) {
      // Phase 2: Bung mở bắn tim sang 2 bên
      const t = (cyclePhase - 1.2) / 0.8;
      ease = t * t * (3 - 2 * t);
      srcK = overheadK;
      dstK = openK;
      showHeart = false;
      isChestHeart = false;
    } else if (cyclePhase < 3.0) {
      // Phase 3: Thu tay về tạo tim trước ngực
      const t = cyclePhase - 2.0;
      ease = t * t * (3 - 2 * t);
      srcK = openK;
      dstK = chestK;
      showHeart = t > 0.45;
      isChestHeart = true;
    } else {
      // Phase 4: Vươn tay uốn cong lên lại vòm tim lớn
      const t = cyclePhase - 3.0;
      ease = t * t * (3 - 2 * t);
      srcK = chestK;
      dstK = overheadK;
      showHeart = t > 0.45;
      isChestHeart = false;
    }

    if (reusableDanceMotion.heartArchCubic) {
      const c = reusableDanceMotion.heartArchCubic;
      c.enabled = true;
      c.cp1Lx = srcK.cp1Lx + (dstK.cp1Lx - srcK.cp1Lx) * ease;
      c.cp1Ly = srcK.cp1Ly + (dstK.cp1Ly - srcK.cp1Ly) * ease;
      c.cp2Lx = srcK.cp2Lx + (dstK.cp2Lx - srcK.cp2Lx) * ease;
      c.cp2Ly = srcK.cp2Ly + (dstK.cp2Ly - srcK.cp2Ly) * ease;
      c.endLx = srcK.endLx + (dstK.endLx - srcK.endLx) * ease;
      c.endLy = srcK.endLy + (dstK.endLy - srcK.endLy) * ease;
      c.cp1Rx = srcK.cp1Rx + (dstK.cp1Rx - srcK.cp1Rx) * ease;
      c.cp1Ry = srcK.cp1Ry + (dstK.cp1Ry - srcK.cp1Ry) * ease;
      c.cp2Rx = srcK.cp2Rx + (dstK.cp2Rx - srcK.cp2Rx) * ease;
      c.cp2Ry = srcK.cp2Ry + (dstK.cp2Ry - srcK.cp2Ry) * ease;
      c.endRx = srcK.endRx + (dstK.endRx - srcK.endRx) * ease;
      c.endRy = srcK.endRy + (dstK.endRy - srcK.endRy) * ease;
    }

    reusableTargetMotion.leftHandX = srcK.endLx + (dstK.endLx - srcK.endLx) * ease;
    reusableTargetMotion.leftHandY = srcK.endLy + (dstK.endLy - srcK.endLy) * ease;
    reusableTargetMotion.rightHandX = srcK.endRx + (dstK.endRx - srcK.endRx) * ease;
    reusableTargetMotion.rightHandY = srcK.endRy + (dstK.endRy - srcK.endRy) * ease;
    reusableTargetMotion.leftElbowBiasX = -12;
    reusableTargetMotion.leftElbowBiasY = 14;
    reusableTargetMotion.rightElbowBiasX = 12;
    reusableTargetMotion.rightElbowBiasY = 14;

    reusableDanceMotion.showCenterHeart = showHeart;
    reusableDanceMotion.heartPulseScale = 1.05 + Math.abs(beatSin) * 0.28;
    reusableDanceMotion.isHeartAtChest = isChestHeart;
    reusableTargetMotion.turnScaleX = 1;
    reusableTargetMotion.hipShakeX = 0;
    reusableTargetMotion.hipTiltRad = 0;
    reusableTargetMotion.legBeatOffset = 0;
    reusableTargetMotion.peekDir = 0;
  } else if (danceStyle === 'groove_wave') {
    reusableTargetMotion.swayX = halfBeatSin * 15 * amp;
    reusableTargetMotion.bounceY = -Math.abs(beatSin) * 6.0 * amp;
    reusableTargetMotion.headTiltRad = Math.cos(beatPhase * 0.5) * 0.1 * amp;

    const cx = BARISTA_CENTER_X + reusableTargetMotion.swayX;
    const headY = BARISTA_HEAD_Y + reusableTargetMotion.bounceY;
    // Cascading wave: shoulder -> elbow -> wrist offset across left & right arms (never crosses face)
    const sweepX = Math.sin(beatPhase * 0.5) * 14;
    const leftElbowWave = Math.sin(beatPhase - 0.55);
    const leftWristWave = Math.sin(beatPhase - 1.15);
    const rightElbowWave = Math.sin(beatPhase - 1.85);
    const rightWristWave = Math.sin(beatPhase - 2.45);

    reusableTargetMotion.leftHandX = Math.min(cx - 34, cx - 44 + sweepX);
    reusableTargetMotion.leftHandY = headY - 4 + leftWristWave * 18;
    reusableTargetMotion.rightHandX = Math.max(cx + 34, cx + 44 + sweepX);
    reusableTargetMotion.rightHandY = headY - 4 + rightWristWave * 18;
    reusableTargetMotion.leftElbowBiasX = -14 + leftElbowWave * 4;
    reusableTargetMotion.leftElbowBiasY = 12 + leftElbowWave * 9;
    reusableTargetMotion.rightElbowBiasX = 14 + rightElbowWave * 4;
    reusableTargetMotion.rightElbowBiasY = 12 + rightElbowWave * 9;

    reusableDanceMotion.showCenterHeart = false;
    reusableTargetMotion.turnScaleX = 1;
    reusableTargetMotion.hipShakeX = 0;
    reusableTargetMotion.hipTiltRad = 0;
    reusableTargetMotion.legBeatOffset = 0;
    reusableTargetMotion.peekDir = 0;
  } else {
    // Style 3 (138 BPM EDM/Phonk): Crisp beat-locked front pumps + spin turn + back hip/booty shake
    populatePartyHypeTargets(danceLocalSec, beatPhase, halfBeatSin, beatSin, beatCos, amp);
    reusableDanceMotion.showCenterHeart = false;
  }

  // Clamp wrist targets strictly within anatomical shoulder reach & counter boundary
  const shoulderSpan = 36 * (danceStyle === 'party_hype' ? reusableTargetMotion.turnScaleX : 1);
  const targetLeftShoulderX = BARISTA_CENTER_X + reusableTargetMotion.swayX - shoulderSpan;
  const targetRightShoulderX = BARISTA_CENTER_X + reusableTargetMotion.swayX + shoulderSpan;
  const targetShoulderY = BARISTA_TORSO_Y + reusableTargetMotion.bounceY + 22;

  const maxArmReach =
    danceStyle === 'heart_sway' ? MAX_HEART_ARCH_ARM_REACH : MAX_DANCE_ARM_REACH;

  clampDanceWristTarget(
    targetLeftShoulderX,
    targetShoulderY,
    reusableTargetMotion.leftHandX,
    reusableTargetMotion.leftHandY,
    clampedWristScratch,
    maxArmReach
  );
  reusableTargetMotion.leftHandX = clampedWristScratch.x;
  reusableTargetMotion.leftHandY = clampedWristScratch.y;

  clampDanceWristTarget(
    targetRightShoulderX,
    targetShoulderY,
    reusableTargetMotion.rightHandX,
    reusableTargetMotion.rightHandY,
    clampedWristScratch,
    maxArmReach
  );
  reusableTargetMotion.rightHandX = clampedWristScratch.x;
  reusableTargetMotion.rightHandY = clampedWristScratch.y;

  // Smooth joint reset interpolation (~120ms settle when switching styles)
  const smoothAlpha = dtSec > 0 ? clamp01(1 - Math.exp(-18 * dtSec)) : 1;
  reusableDanceMotion.swayX += (reusableTargetMotion.swayX - reusableDanceMotion.swayX) * smoothAlpha;
  reusableDanceMotion.bounceY += (reusableTargetMotion.bounceY - reusableDanceMotion.bounceY) * smoothAlpha;
  reusableDanceMotion.headTiltRad += (reusableTargetMotion.headTiltRad - reusableDanceMotion.headTiltRad) * smoothAlpha;
  reusableDanceMotion.leftHandX += (reusableTargetMotion.leftHandX - reusableDanceMotion.leftHandX) * smoothAlpha;
  reusableDanceMotion.leftHandY += (reusableTargetMotion.leftHandY - reusableDanceMotion.leftHandY) * smoothAlpha;
  reusableDanceMotion.rightHandX += (reusableTargetMotion.rightHandX - reusableDanceMotion.rightHandX) * smoothAlpha;
  reusableDanceMotion.rightHandY += (reusableTargetMotion.rightHandY - reusableDanceMotion.rightHandY) * smoothAlpha;
  reusableDanceMotion.leftElbowBiasX += (reusableTargetMotion.leftElbowBiasX - reusableDanceMotion.leftElbowBiasX) * smoothAlpha;
  reusableDanceMotion.leftElbowBiasY += (reusableTargetMotion.leftElbowBiasY - reusableDanceMotion.leftElbowBiasY) * smoothAlpha;
  reusableDanceMotion.rightElbowBiasX += (reusableTargetMotion.rightElbowBiasX - reusableDanceMotion.rightElbowBiasX) * smoothAlpha;
  reusableDanceMotion.rightElbowBiasY += (reusableTargetMotion.rightElbowBiasY - reusableDanceMotion.rightElbowBiasY) * smoothAlpha;
  reusableDanceMotion.turnScaleX += (reusableTargetMotion.turnScaleX - reusableDanceMotion.turnScaleX) * smoothAlpha;
  reusableDanceMotion.hipShakeX += (reusableTargetMotion.hipShakeX - reusableDanceMotion.hipShakeX) * smoothAlpha;
  reusableDanceMotion.hipTiltRad += (reusableTargetMotion.hipTiltRad - reusableDanceMotion.hipTiltRad) * smoothAlpha;
  reusableDanceMotion.legBeatOffset += (reusableTargetMotion.legBeatOffset - reusableDanceMotion.legBeatOffset) * smoothAlpha;
  reusableDanceMotion.peekDir += (reusableTargetMotion.peekDir - reusableDanceMotion.peekDir) * smoothAlpha;
  reusableDanceMotion.isBackFacing = reusableDanceMotion.turnScaleX < 0;

  return reusableDanceMotion;
}

function computeDanceMotion(
  isDancing: boolean,
  danceStyle: DanceStyle,
  danceStartedAt: number,
  elapsedSec: number
): DanceMotion {
  if (reusableDanceMotion.isDancing === isDancing && reusableDanceMotion.style === danceStyle) {
    return reusableDanceMotion;
  }
  return stepDanceKinematics(isDancing, danceStyle, danceStartedAt, elapsedSec, 1 / 30);
}

function computeCharacterBob(
  dance: DanceMotion,
  isWorking: boolean,
  elapsedSec: number,
  rhythmFreq: number
): number {
  if (dance.isDancing) {
    return dance.bounceY;
  }
  if (isWorking) {
    return Math.sin(elapsedSec * rhythmFreq) * 3.4;
  }
  return Math.sin(elapsedSec * 2.05) * 2.0;
}

function resolvePourRatio(drink: ActiveDrink): number {
  const pourPhase = RECIPE_BREW_PHASES[drink.recipeId].find((p) => p.action === 'pour_mix');
  const pourStart = pourPhase?.minProgress ?? 56;
  const pourSpan = Math.max(10, (pourPhase?.maxProgress ?? 84) - pourStart);
  return clamp01((drink.progress - pourStart) / pourSpan);
}

function resolveStepProgress(drink: ActiveDrink): number {
  const step = getBrewStep(drink.progress, drink.recipeId);
  const span = Math.max(1, step.maxProgress - step.minProgress);
  return clamp01((drink.progress - step.minProgress) / span);
}

function resolveActivePourColor(drink: ActiveDrink): string {
  const recipe = RECIPE_MAP[drink.recipeId];
  const pourRatio = resolvePourRatio(drink);

  if (drink.recipeId === 'matcha') {
    return pourRatio > MATCHA_MILK_SPLIT_RATIO ? '#A7D397' : '#FFFDF7';
  }
  if (drink.recipeId === 'coffee_milk') {
    return '#613820';
  }
  if (drink.recipeId === 'berry_soda') {
    return pourRatio > SODA_SYRUP_SPLIT_RATIO ? '#7FC8D9' : '#E04F6D';
  }
  return recipe.baseColor;
}

function resolveActivePourVessel(drink: ActiveDrink): PourVesselKind {
  const pourRatio = resolvePourRatio(drink);

  if (drink.recipeId === 'matcha') {
    return pourRatio <= MATCHA_MILK_SPLIT_RATIO ? 'oatside_milk' : 'chasen';
  }
  if (drink.recipeId === 'coffee_milk') {
    return 'steel_pitcher';
  }
  if (drink.recipeId === 'berry_soda') {
    return pourRatio <= SODA_SYRUP_SPLIT_RATIO ? 'measuring_jug' : 'soda_pour';
  }
  if (drink.recipeId === 'blue_citrus' || drink.recipeId === 'lime_tea') {
    return 'measuring_jug';
  }
  return 'shaker';
}

function resolveBrewAction(drink: ActiveDrink | null): BrewPhaseAction | null {
  if (!drink || drink.phase !== 'BREWING') {
    return null;
  }
  return getBrewStep(drink.progress, drink.recipeId).action;
}

export function drawBartenderBody(
  ctx: CanvasRenderingContext2D,
  mood: BartenderMood,
  activeDrink: ActiveDrink | null,
  isFastBoost: boolean,
  isWaving: boolean,
  isDancing: boolean,
  danceTier: GiftTier,
  danceStyle: DanceStyle,
  danceStartedAt: number,
  elapsedSec: number,
  baristaPosX = BARISTA_CENTER_X,
  walkVelocity = 0,
  idleElapsedSec = 0,
  wakeUpProgress = 0
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const effectiveIsDancing = isDancing && wakeUpProgress <= 0;
  const dance = computeDanceMotion(effectiveIsDancing, danceStyle, danceStartedAt, elapsedSec);
  const isWorking = !isDancing && Boolean(activeDrink && activeDrink.phase === 'BREWING');
  const isCelebrating =
    isWaving ||
    Boolean(activeDrink && (activeDrink.phase === 'SHOWCASE' || activeDrink.progress >= 94));
  const rhythmFreq = isFastBoost ? 9.5 : 5.2;

  const isTrueIdle = !isDancing && !isWorking && !isCelebrating;
  const idle = isTrueIdle ? resolveIdleBaristaPhase(idleElapsedSec) : null;
  const idlePose = computeIdlePoseSnapshot(idle, elapsedSec);
  const idleBobOffset = idle ? idlePose.bobOffset : 0;
  const idleHeadTilt = idlePose.headTilt;

  const walkSpeedNorm = clamp01(Math.abs(walkVelocity) / 42);
  const walkHop = -Math.abs(Math.sin(elapsedSec * 14)) * 4.5 * walkSpeedNorm;
  const wakeUpHop = wakeUpProgress > 0 ? -Math.sin(wakeUpProgress * Math.PI) * 14 : 0;
  const bob =
    computeCharacterBob(dance, isWorking, elapsedSec, rhythmFreq) +
    (dance.isDancing ? 0 : walkHop + idleBobOffset + wakeUpHop);
  const effectiveMood: BartenderMood = dance.isDancing ? 'TIKTOK_DANCE' : mood;
  const walkTilt = Math.sign(walkVelocity) * 0.045 * walkSpeedNorm;
  const headTilt = dance.isDancing ? dance.headTiltRad : idleHeadTilt + walkTilt;

  const cx = dance.isDancing ? BARISTA_CENTER_X + dance.swayX : baristaPosX;

  if (dance.isDancing) {
    if (dance.style === 'party_hype') {
      drawPartyHypeSpotlights(ctx, dance.blend, elapsedSec, dance.beatPulse);
    }
    drawDanceBackAura(ctx, cx, BARISTA_HEAD_Y + 26, danceTier, dance.style, elapsedSec);
  }

  const walkStride = Math.sin(elapsedSec * 14) * walkSpeedNorm;

  drawCentralBaristaTorsoAndHead(
    ctx,
    effectiveMood,
    isCelebrating,
    cx,
    bob,
    headTilt,
    elapsedSec,
    idle,
    walkStride,
    wakeUpProgress,
    dance
  );

  ctx.restore();
}

function drawPartyHypeSpotlights(
  ctx: CanvasRenderingContext2D,
  blend: number,
  elapsedSec: number,
  beatPulse = 0.5
): void {
  ctx.save();
  ctx.globalAlpha = (0.24 + beatPulse * 0.14) * blend;
  const sway = Math.sin(elapsedSec * 4.2) * 28;

  const leftGrad = ctx.createLinearGradient(240, 210, 330 + sway, 660);
  leftGrad.addColorStop(0, 'rgba(255, 214, 138, 0.82)');
  leftGrad.addColorStop(1, 'rgba(255, 214, 138, 0)');
  ctx.fillStyle = leftGrad;
  ctx.beginPath();
  ctx.moveTo(222, 210);
  ctx.lineTo(262, 210);
  ctx.lineTo(410 + sway, 660);
  ctx.lineTo(250 + sway, 660);
  ctx.closePath();
  ctx.fill();

  const rightGrad = ctx.createLinearGradient(480, 210, 390 - sway, 660);
  rightGrad.addColorStop(0, 'rgba(174, 226, 244, 0.82)');
  rightGrad.addColorStop(1, 'rgba(174, 226, 244, 0)');
  ctx.fillStyle = rightGrad;
  ctx.beginPath();
  ctx.moveTo(458, 210);
  ctx.lineTo(498, 210);
  ctx.lineTo(470 - sway, 660);
  ctx.lineTo(310 - sway, 660);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDanceBackAura(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  tier: GiftTier,
  style: DanceStyle,
  elapsedSec: number
): void {
  const pulse = 0.92 + Math.sin(elapsedSec * 7) * 0.08;
  const radius = (tier === 'LARGE' ? 96 : 82) * pulse;
  const grad = ctx.createRadialGradient(cx, cy, 14, cx, cy, radius);
  if (style === 'party_hype') {
    grad.addColorStop(0, 'rgba(247, 201, 91, 0.45)');
    grad.addColorStop(1, 'rgba(247, 201, 91, 0)');
  } else if (style === 'groove_wave') {
    grad.addColorStop(0, 'rgba(127, 200, 217, 0.38)');
    grad.addColorStop(1, 'rgba(127, 200, 217, 0)');
  } else {
    grad.addColorStop(0, 'rgba(240, 120, 140, 0.36)');
    grad.addColorStop(1, 'rgba(240, 120, 140, 0)');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  if (style === 'groove_wave') {
    const waveR = 52 + ((elapsedSec * 30) % 34);
    const waveAlpha = Math.max(0, 1 - (waveR - 52) / 34) * 0.46;
    ctx.beginPath();
    ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(127, 200, 217, ${waveAlpha.toFixed(2)})`;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
}

const BACK_APRON_STRAP_SEGMENTS: readonly [number, number, number, number][] = [
  [-19, -37, 28, 28],
  [19, -37, -28, 28],
];

function drawBackTurnedPartyHypeBarista(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  torsoY: number,
  headTiltRad: number,
  dance: DanceMotion
): void {
  const legW = 14;
  const legH = 54;
  const leftLegKick = Math.max(0, dance.legBeatOffset);
  const rightLegKick = Math.max(0, -dance.legBeatOffset);
  const legXShift = dance.hipShakeX * 0.24;
  const leftLegY = torsoY + 100 - leftLegKick;
  const rightLegY = torsoY + 100 - rightLegKick;

  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_W;

  // 1. Alternating tip-toe hopping legs behind counter + cream sock cuffs
  roundedRectPath(ctx, cx - 22 + legXShift, leftLegY, legW, legH, 6);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, cx - 22 + legXShift, leftLegY + 26, legW, legH - 26, 5);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, cx + 8 + legXShift, rightLegY, legW, legH, 6);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, cx + 8 + legXShift, rightLegY + 26, legW, legH - 26, 5);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.stroke();

  // 2. Swaying flared cocoa skirt ("lắc mông") + motion wiggle arcs
  const skirtCenterX = cx + dance.hipShakeX * 0.85;
  ctx.save();
  ctx.translate(skirtCenterX, torsoY + 74);
  ctx.rotate(dance.hipTiltRad);
  ctx.beginPath();
  ctx.moveTo(-33, 0);
  ctx.lineTo(-42, 33);
  ctx.quadraticCurveTo(0, 39, 42, 33);
  ctx.lineTo(33, 0);
  ctx.closePath();
  ctx.fillStyle = '#6E483B';
  ctx.fill();
  ctx.lineWidth = OUTLINE_W;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.strokeStyle = 'rgba(59, 40, 32, 0.35)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-20, 12);
  ctx.lineTo(-25, 31);
  ctx.moveTo(0, 14);
  ctx.lineTo(dance.hipShakeX * 0.14, 32);
  ctx.moveTo(20, 12);
  ctx.lineTo(25, 31);
  ctx.stroke();
  ctx.restore();

  if (Math.abs(dance.hipShakeX) > 2.2) {
    ctx.save();
    ctx.strokeStyle = '#F0788C';
    ctx.lineWidth = 2.6;
    const motionShift = dance.hipShakeX * 0.25;
    // Left (( motion arcs
    ctx.beginPath();
    ctx.arc(skirtCenterX - 44 + motionShift, torsoY + 90, 9, Math.PI * 0.68, Math.PI * 1.32);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(skirtCenterX - 50 + motionShift, torsoY + 90, 13, Math.PI * 0.72, Math.PI * 1.28);
    ctx.stroke();
    // Right )) motion arcs
    ctx.beginPath();
    ctx.arc(skirtCenterX + 44 + motionShift, torsoY + 90, 9, -Math.PI * 0.32, Math.PI * 0.32);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(skirtCenterX + 50 + motionShift, torsoY + 90, 13, -Math.PI * 0.28, Math.PI * 0.28);
    ctx.stroke();
    ctx.restore();
  }

  // 3. White shirt back + pink crisscross apron straps + fluttering waist ribbon bow
  ctx.save();
  ctx.translate(cx + dance.hipShakeX * 0.28, torsoY + 40);
  ctx.rotate(dance.hipTiltRad * 0.35);

  ctx.beginPath();
  ctx.moveTo(-25, -40);
  ctx.quadraticCurveTo(-44, -34, -42, -6);
  ctx.lineTo(-37, 40);
  ctx.quadraticCurveTo(0, 44, 37, 40);
  ctx.lineTo(42, -6);
  ctx.quadraticCurveTo(44, -34, 25, -40);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = OUTLINE_W;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Shirt back collar seam
  ctx.beginPath();
  ctx.moveTo(-16, -39);
  ctx.quadraticCurveTo(0, -32, 16, -39);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = 'rgba(59, 40, 32, 0.28)';
  ctx.stroke();

  // Crisscross pink apron back straps
  for (let i = 0; i < BACK_APRON_STRAP_SEGMENTS.length; i += 1) {
    const seg = BACK_APRON_STRAP_SEGMENTS[i];
    ctx.beginPath();
    ctx.moveTo(seg[0], seg[1]);
    ctx.lineTo(seg[2], seg[3]);
    ctx.lineWidth = 12.2;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();
    ctx.lineWidth = 7.4;
    ctx.strokeStyle = '#E5809E';
    ctx.stroke();
  }

  // Waist apron band
  ctx.lineWidth = OUTLINE_W;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  roundedRectPath(ctx, -36, 26, 72, 9.5, 4.5);
  ctx.fillStyle = '#F29BB5';
  ctx.fill();
  ctx.stroke();

  // Cute waist ribbon bow dancing with hip sway
  ctx.save();
  ctx.translate(dance.hipShakeX * 0.14, 31);
  ctx.rotate(dance.hipTiltRad * 0.55);

  ctx.fillStyle = '#E5809E';
  ctx.beginPath();
  ctx.moveTo(-4, 2);
  ctx.lineTo(-16, 24);
  ctx.lineTo(-6, 21);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, 2);
  ctx.lineTo(16, 24);
  ctx.lineTo(6, 21);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#F0788C';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-20, -12, -18, 4);
  ctx.quadraticCurveTo(-15, 13, 0, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(20, -12, 18, 4);
  ctx.quadraticCurveTo(15, 13, 0, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 1, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#F7C95B';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // 4. Back head, swaying hair silhouette, cheeky over-shoulder peek & baseball cap back strap
  ctx.save();
  ctx.translate(cx, headY);
  ctx.rotate(headTiltRad);

  // Swaying cocoa pigtails behind shoulders
  const hairSwingX = dance.hipTiltRad * 14;
  ctx.fillStyle = '#4B3227';
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_W;
  ctx.beginPath();
  ctx.arc(-30 + hairSwingX, 20, 18.5, 0, Math.PI * 2);
  ctx.arc(30 + hairSwingX, 20, 18.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cheeky over-shoulder peek wink
  if (Math.abs(dance.peekDir) > 0.35) {
    const peekSign = dance.peekDir >= 0 ? 1 : -1;
    ctx.beginPath();
    ctx.ellipse(peekSign * 26, 5, 15, 13, 0, 0, Math.PI * 2);
    ctx.fillStyle = BARISTA_SKIN;
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(peekSign * 31, 9, 4.8, 2.8, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#F9A8B8';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(peekSign * 28, 2, 3.8, Math.PI * 1.15, Math.PI * 1.85);
    ctx.lineWidth = 2.1;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();
  }

  // Ears
  ctx.fillStyle = BARISTA_SKIN;
  ctx.lineWidth = OUTLINE_W;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.beginPath();
  ctx.arc(-36, 4, 7.5, 0, Math.PI * 2);
  ctx.arc(36, 4, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Full rounded cocoa back hair bob
  ctx.beginPath();
  ctx.ellipse(0, 3, 37.5, 33, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#4B3227';
  ctx.fill();
  ctx.stroke();

  // Subtle hair highlight strands
  ctx.beginPath();
  ctx.arc(-10, 6, 22, Math.PI * 0.2, Math.PI * 0.72);
  ctx.strokeStyle = 'rgba(255, 232, 214, 0.18)';
  ctx.lineWidth = 2.0;
  ctx.stroke();

  // Subtle visor side edge hints
  ctx.fillStyle = '#F4A6BE';
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_W;
  ctx.beginPath();
  ctx.ellipse(-36, -11, 5.5, 2.8, -0.2, 0, Math.PI * 2);
  ctx.ellipse(36, -11, 5.5, 2.8, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Barista cap back crown
  ctx.beginPath();
  ctx.arc(0, -10, 38, Math.PI * 1.02, Math.PI * 1.98, false);
  ctx.quadraticCurveTo(0, -4, -38, -10);
  ctx.closePath();
  ctx.fillStyle = '#7D4D4A';
  ctx.fill();
  ctx.stroke();

  // Cap back keyhole cutout revealing hair + pastel pink adjustable strap
  ctx.beginPath();
  ctx.arc(0, -11, 14, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = '#4B3227';
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, -16, -15, 32, 7.5, 3.5);
  ctx.fillStyle = '#F4A6BE';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(5, -11.2, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = '#F7C95B';
  ctx.fill();

  // Cap top golden button
  ctx.beginPath();
  ctx.arc(0, -49, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#F7C95B';
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawCentralBaristaTorsoAndHead(
  ctx: CanvasRenderingContext2D,
  mood: BartenderMood,
  isCelebrating: boolean,
  cx: number,
  bob: number,
  headTiltRad: number,
  elapsedSec: number,
  idle: { phase: IdleBaristaPhase; phaseElapsed: number; phaseDuration: number } | null = null,
  walkStride = 0,
  wakeUpProgress = 0,
  dance: DanceMotion | null = null
): void {
  const dozeBlend = computeDozeBlend(idle);
  const headY = BARISTA_HEAD_Y + bob + dozeBlend * 22;
  const torsoY = BARISTA_TORSO_Y + bob;

  const isPartyHype = Boolean(dance && dance.isDancing && dance.style === 'party_hype');
  if (isPartyHype) {
    const absTurnScaleX = Math.max(
      PARTY_HYPE_CHOREO.MIN_BODY_SCALE_X,
      Math.abs(dance!.turnScaleX)
    );
    ctx.save();
    ctx.translate(cx, 0);
    ctx.scale(absTurnScaleX, 1);
    ctx.translate(-cx, 0);
    if (dance!.isBackFacing) {
      drawBackTurnedPartyHypeBarista(ctx, cx, headY, torsoY, headTiltRad, dance!);
      ctx.restore();
      return;
    }
  }

  // Back hair silhouette framing neck & shoulders
  ctx.fillStyle = '#4B3227';
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_W;
  ctx.beginPath();
  ctx.arc(cx - 28, headY + 20, 19, 0, Math.PI * 2);
  ctx.arc(cx + 28, headY + 20, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 1. Cute legs behind the counter (animated stride when walking or beat bounce in party_hype)
  const legHopL = isPartyHype ? Math.max(0, dance!.legBeatOffset) : Math.max(0, walkStride) * 4.5;
  const legHopR = isPartyHype ? Math.max(0, -dance!.legBeatOffset) : Math.max(0, -walkStride) * 4.5;
  const leftLegY = torsoY + 100 - legHopL;
  const rightLegY = torsoY + 100 - legHopR;
  const legW = 14;
  const legH = 54;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_W;

  // Left leg + cozy cream sock cuff
  roundedRectPath(ctx, cx - 22 - walkStride * 2.5, leftLegY, legW, legH, 6);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, cx - 22 - walkStride * 2.5, leftLegY + 26, legW, legH - 26, 5);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.stroke();

  // Right leg + cozy cream sock cuff
  roundedRectPath(ctx, cx + 8 + walkStride * 2.5, rightLegY, legW, legH, 6);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, cx + 8 + walkStride * 2.5, rightLegY + 26, legW, legH - 26, 5);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.stroke();

  // 2. Flared cocoa café skirt framing the waist and legs
  ctx.beginPath();
  ctx.moveTo(cx - 33, torsoY + 74);
  ctx.lineTo(cx - 40, torsoY + 106);
  ctx.quadraticCurveTo(cx, torsoY + 111, cx + 40, torsoY + 106);
  ctx.lineTo(cx + 33, torsoY + 74);
  ctx.closePath();
  ctx.fillStyle = '#6E483B';
  ctx.fill();
  ctx.stroke();

  // Subtle skirt pleat lines
  ctx.strokeStyle = 'rgba(59, 40, 32, 0.35)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx - 22, torsoY + 86);
  ctx.lineTo(cx - 25, torsoY + 104);
  ctx.moveTo(cx + 22, torsoY + 86);
  ctx.lineTo(cx + 25, torsoY + 104);
  ctx.stroke();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_W;

  // 3. Well-proportioned raglan white shirt torso
  ctx.beginPath();
  ctx.moveTo(cx - 25, torsoY);
  ctx.quadraticCurveTo(cx - 44, torsoY + 6, cx - 42, torsoY + 34);
  ctx.lineTo(cx - 37, torsoY + 80);
  ctx.quadraticCurveTo(cx, torsoY + 84, cx + 37, torsoY + 80);
  ctx.lineTo(cx + 42, torsoY + 34);
  ctx.quadraticCurveTo(cx + 44, torsoY + 6, cx + 25, torsoY);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // 4. Compact pastel strawberry-pink barista apron overlapping skirt waist
  roundedRectPath(ctx, cx - 29, torsoY + 25, 58, 74, 13);
  ctx.fillStyle = '#F29BB5';
  ctx.fill();
  ctx.stroke();

  // Apron straps
  ctx.fillStyle = '#E5809E';
  roundedRectPath(ctx, cx - 22, torsoY + 2, 9.5, 27, 4);
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, cx + 12.5, torsoY + 2, 9.5, 27, 4);
  ctx.fill();
  ctx.stroke();

  // Coffee-leaf pin on apron chest
  ctx.beginPath();
  ctx.ellipse(cx - 17, torsoY + 38, 5.8, 3.6, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#89C073';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Stitched apron front pocket
  ctx.lineWidth = OUTLINE_W;
  roundedRectPath(ctx, cx - 16, torsoY + 52, 32, 22, 7);
  ctx.fillStyle = '#E5809E';
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 253, 249, 0.72)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(cx - 10, torsoY + 58);
  ctx.lineTo(cx + 10, torsoY + 58);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_W;

  // Neck bow tie
  ctx.fillStyle = '#F0788C';
  ctx.beginPath();
  ctx.moveTo(cx, torsoY + 12);
  ctx.lineTo(cx - 11, torsoY + 6);
  ctx.lineTo(cx - 11, torsoY + 17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, torsoY + 12);
  ctx.lineTo(cx + 11, torsoY + 6);
  ctx.lineTo(cx + 11, torsoY + 17);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, torsoY + 11.5, 4.2, 0, Math.PI * 2);
  ctx.fillStyle = '#F7C95B';
  ctx.fill();
  ctx.stroke();

  // Head + Chibi Face + Energetic Barista Baseball Cap
  ctx.save();
  ctx.translate(cx, headY);
  ctx.rotate(headTiltRad);

  ctx.fillStyle = BARISTA_SKIN;
  ctx.beginPath();
  ctx.arc(-36, 4, 7.5, 0, Math.PI * 2);
  ctx.arc(36, 4, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(0, 2, 37, 33, 0, 0, Math.PI * 2);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4B3227';
  ctx.beginPath();
  ctx.moveTo(-36, -6);
  ctx.quadraticCurveTo(-22, -22, 0, -20);
  ctx.quadraticCurveTo(22, -22, 36, -6);
  ctx.quadraticCurveTo(26, -1, 14, -7);
  ctx.quadraticCurveTo(0, 0, -14, -7);
  ctx.quadraticCurveTo(-26, -1, -36, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Barista Cap crown
  ctx.beginPath();
  ctx.arc(0, -10, 38, Math.PI * 1.03, Math.PI * 1.97, false);
  ctx.closePath();
  ctx.fillStyle = '#7D4D4A';
  ctx.fill();
  ctx.lineWidth = OUTLINE_W;
  ctx.stroke();

  // Cap top button
  ctx.beginPath();
  ctx.arc(0, -49, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = '#F7C95B';
  ctx.fill();
  ctx.stroke();

  // Pastel visor brim
  ctx.beginPath();
  ctx.moveTo(-38, -11);
  ctx.quadraticCurveTo(0, -22, 42, -11);
  ctx.quadraticCurveTo(10, -3, -38, -11);
  ctx.closePath();
  ctx.fillStyle = '#F4A6BE';
  ctx.fill();
  ctx.stroke();

  // Emblem badge
  ctx.beginPath();
  ctx.arc(0, -26, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.lineWidth = 1.9;
  ctx.stroke();
  ctx.fillStyle = '#F0788C';
  ctx.beginPath();
  ctx.arc(0, -26, 2.8, 0, Math.PI * 2);
  ctx.fill();

  drawCharacterFace(ctx, mood, isCelebrating, elapsedSec, idle, wakeUpProgress);
  ctx.restore();

  if (idle?.phase === 'DOZE' && wakeUpProgress <= 0) {
    drawSleepyZzzGlyphs(ctx, cx + 40, headY - 32, idle.phaseElapsed);
    if (idle.phaseElapsed >= IDLE_PHASE_TIMINGS.DREAM_DELAY_SEC) {
      drawDreamBubble(
        ctx,
        cx,
        headY,
        idle.phaseElapsed - IDLE_PHASE_TIMINGS.DREAM_DELAY_SEC,
        elapsedSec
      );
    }
  }

  if (wakeUpProgress > 0) {
    drawWakeUpExclamationMark(ctx, cx, headY, wakeUpProgress);
  }

  if (isPartyHype) {
    ctx.restore();
  }
}

function drawWakeUpExclamationMark(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  progress: number
): void {
  const bounceY = Math.sin(progress * Math.PI) * 12;
  const markX = cx;
  const markY = headY - 62 - bounceY;
  const scale = 0.85 + Math.sin(progress * Math.PI) * 0.35;

  ctx.save();
  ctx.translate(markX, markY);
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.arc(0, 0, 13.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FFF9E6';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.font = '900 18px "Fredoka", "Nunito", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.strokeText('!', 0, 1);
  ctx.fillStyle = '#FF4757';
  ctx.fillText('!', 0, 1);

  ctx.restore();
}

function drawDreamBubble(
  ctx: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  dreamElapsed: number,
  elapsedSec: number
): void {
  const cycleSec = IDLE_PHASE_TIMINGS.DREAM_CYCLE_SEC;
  const visibleSec = IDLE_PHASE_TIMINGS.DREAM_VISIBLE_SEC;
  const cycleIndex = Math.floor(dreamElapsed / cycleSec) % 3;
  const localSec = dreamElapsed % cycleSec;

  if (localSec >= visibleSec) return;

  const visibleT = localSec / visibleSec;
  let scale = 1;
  let alpha = 1;
  if (visibleT < 0.12) {
    const inT = visibleT / 0.12;
    scale = inT * inT * (3 - 2 * inT);
    alpha = scale;
  } else if (visibleT > 0.86) {
    const outT = (1 - visibleT) / 0.14;
    scale = outT;
    alpha = outT;
  } else {
    scale = 1 + Math.sin(elapsedSec * 3.2) * 0.04;
    alpha = 0.96;
  }

  if (scale <= 0.01) return;

  const floatY = Math.sin(elapsedSec * 2.5) * 3;
  const bubble1X = headX - 28;
  const bubble1Y = headY - 14 + floatY * 0.3;
  const bubble2X = headX - 44;
  const bubble2Y = headY - 26 + floatY * 0.6;
  const mainX = headX - 74;
  const mainY = headY - 46 + floatY;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

  // Trail 1
  ctx.beginPath();
  ctx.arc(bubble1X, bubble1Y, 3.8 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.0;
  ctx.fill();
  ctx.stroke();

  // Trail 2
  ctx.beginPath();
  ctx.arc(bubble2X, bubble2Y, 6.0 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.0;
  ctx.fill();
  ctx.stroke();

  // Main cloud bubble
  ctx.save();
  ctx.translate(mainX, mainY);
  ctx.scale(scale, scale);

  ctx.beginPath();
  ctx.arc(-14, 2, 13, Math.PI * 0.6, Math.PI * 1.5);
  ctx.arc(-4, -10, 14, Math.PI * 0.95, Math.PI * 1.85);
  ctx.arc(14, -8, 13, Math.PI * 1.25, Math.PI * 0.05);
  ctx.arc(16, 6, 12, Math.PI * 1.8, Math.PI * 0.65);
  ctx.arc(0, 12, 13, Math.PI * 0.1, Math.PI * 0.95);
  ctx.closePath();

  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  if (cycleIndex === 0) {
    drawDreamMilkTea(ctx);
  } else if (cycleIndex === 1) {
    drawDreamRose(ctx);
  } else {
    drawDreamCrown(ctx);
  }

  ctx.restore();
  ctx.restore();
}

function drawDreamMilkTea(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Straw
  ctx.beginPath();
  ctx.moveTo(1, -7);
  ctx.lineTo(5, -16);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#F0788C';
  ctx.stroke();
  ctx.lineWidth = 1.0;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Cup body
  ctx.beginPath();
  ctx.moveTo(-7, -6);
  ctx.lineTo(-5, 9);
  ctx.lineTo(5, 9);
  ctx.lineTo(7, -6);
  ctx.closePath();
  ctx.fillStyle = '#E8A265';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Cream dome lid
  ctx.beginPath();
  ctx.arc(0, -6, 7.2, Math.PI, 0);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Boba pearls
  ctx.fillStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.beginPath();
  ctx.arc(-2.5, 6, 1.4, 0, Math.PI * 2);
  ctx.arc(1.5, 6.5, 1.4, 0, Math.PI * 2);
  ctx.arc(3.5, 4.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDreamRose(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Stem & leaf
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(0, 11);
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = '#81C784';
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(3.5, 8, 3.2, 1.8, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#A5D6A7';
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Rose bloom
  ctx.beginPath();
  ctx.arc(0, -1, 6.5, 0, Math.PI * 2);
  ctx.fillStyle = '#F48FB1';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Petal swirl
  ctx.beginPath();
  ctx.arc(0, -1, 3.2, 0.2, Math.PI * 1.6);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = '#C2185B';
  ctx.stroke();
  ctx.restore();
}

function drawDreamCrown(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  // Crown base & 3 peaks
  ctx.beginPath();
  ctx.moveTo(-9, 7);
  ctx.lineTo(9, 7);
  ctx.lineTo(10, -2);
  ctx.lineTo(5, 2);
  ctx.lineTo(0, -6);
  ctx.lineTo(-5, 2);
  ctx.lineTo(-10, -2);
  ctx.closePath();
  ctx.fillStyle = '#FFD54F';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // 3 peak tip jewels
  ctx.fillStyle = '#E91E63';
  ctx.beginPath();
  ctx.arc(-10, -2.5, 1.4, 0, Math.PI * 2);
  ctx.arc(0, -6.5, 1.6, 0, Math.PI * 2);
  ctx.arc(10, -2.5, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // Center jewel
  ctx.beginPath();
  ctx.arc(0, 3.5, 1.8, 0, Math.PI * 2);
  ctx.fillStyle = '#4FC3F7';
  ctx.fill();
  ctx.restore();
}

const ZZZ_FONT_STYLES: readonly string[] = [
  '900 12px "Fredoka", "Nunito", sans-serif',
  '900 15px "Fredoka", "Nunito", sans-serif',
  '900 17px "Fredoka", "Nunito", sans-serif',
];

function drawSleepyZzzGlyphs(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  phaseElapsed: number
): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 3; i += 1) {
    const t = ((phaseElapsed * 0.55 + i * 0.33) % 1);
    const zx = originX + i * 10 + Math.sin(phaseElapsed * 2.2 + i) * 4;
    const zy = originY - t * 38;
    const alpha = Math.sin(t * Math.PI) * 0.9;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = ZZZ_FONT_STYLES[i];
    ctx.lineWidth = 3;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.strokeText('z', zx, zy);
    ctx.fillStyle = '#E8F7FA';
    ctx.fillText('z', zx, zy);
  }
  ctx.restore();
}

function drawCharacterFace(
  ctx: CanvasRenderingContext2D,
  mood: BartenderMood,
  isCelebrating: boolean,
  elapsedSec: number,
  idle: { phase: IdleBaristaPhase; phaseElapsed: number; phaseDuration: number } | null = null,
  wakeUpProgress = 0
): void {
  const isBlinking = elapsedSec % 3.8 > 3.62;
  const isExcited = mood === 'TIKTOK_DANCE' || isCelebrating;
  const isYawning = Boolean(!isExcited && idle?.phase === 'STRETCH_YAWN' && idle.phaseElapsed >= 1.15);
  const isDozing = Boolean(!isExcited && idle?.phase === 'DOZE');
  const isDozingEyesClosed = isDozing && computeDozeBlend(idle) > 0.35 && wakeUpProgress <= 0;

  if (wakeUpProgress > 0) {
    // Startled shocked face (O.O) with exclamation
    ctx.fillStyle = 'rgba(244, 139, 163, 0.55)';
    ctx.beginPath();
    ctx.ellipse(-20, 12, 7.5, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(20, 12, 7.5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wide white open eyes
    ctx.beginPath();
    ctx.arc(-14, 4, 6.2, 0, Math.PI * 2);
    ctx.arc(14, 4, 6.2, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();

    // Small black pupils
    ctx.fillStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.beginPath();
    ctx.arc(-14, 4, 2.6, 0, Math.PI * 2);
    ctx.arc(14, 4, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // Startled open mouth
    ctx.beginPath();
    ctx.ellipse(0, 15, 3.8, 5.0, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#E47B92';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();
    return;
  }

  ctx.fillStyle = 'rgba(244, 139, 163, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-20, 12, 7.5, 4.2, 0, 0, Math.PI * 2);
  ctx.ellipse(20, 12, 7.5, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.fillStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.6;

  if (isExcited) {
    ctx.beginPath();
    ctx.arc(-14, 5, 5.5, Math.PI * 1.15, Math.PI * 1.85, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(14, 5, 5.5, Math.PI * 1.15, Math.PI * 1.85, false);
    ctx.stroke();
  } else if (isYawning || isDozingEyesClosed) {
    // Cozy downward sleepy closed-eye arcs (︶ ︶)
    ctx.beginPath();
    ctx.arc(-14, 4, 5.2, Math.PI * 0.12, Math.PI * 0.88, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(14, 4, 5.2, Math.PI * 0.12, Math.PI * 0.88, false);
    ctx.stroke();
  } else if (isBlinking) {
    ctx.beginPath();
    ctx.moveTo(-19, 5);
    ctx.lineTo(-9, 5);
    ctx.moveTo(9, 5);
    ctx.lineTo(19, 5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-14, 5, 4.6, 0, Math.PI * 2);
    ctx.arc(14, 5, 4.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-15.5, 3.4, 1.8, 0, Math.PI * 2);
    ctx.arc(12.5, 3.4, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isYawning && idle) {
    const yawnOpen = Math.sin((idle.phaseElapsed / idle.phaseDuration) * Math.PI);
    const rx = 3.2 + yawnOpen * 2.6;
    const ry = 3.5 + yawnOpen * 4.4;
    ctx.beginPath();
    ctx.ellipse(0, 15, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#E47B92';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.stroke();
  } else if (isDozingEyesClosed) {
    // Tiny cute O-mouth + gentle pastel sleep bubble
    ctx.beginPath();
    ctx.arc(0, 14.5, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = '#E47B92';
    ctx.fill();
    ctx.lineWidth = 1.8;
    ctx.stroke();

    const bubbleR = 3.2 + Math.sin(elapsedSec * 2.6) * 1.4;
    ctx.beginPath();
    ctx.arc(4, 16.5, bubbleR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(232, 247, 250, 0.85)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (isExcited) {
    ctx.beginPath();
    ctx.arc(0, 14, 6.5, 0, Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = '#E47B92';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 13, 5.5, 0.15 * Math.PI, 0.85 * Math.PI, false);
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
}

export function drawBartenderForegroundArmsAndSpeech(
  ctx: CanvasRenderingContext2D,
  activeDrink: ActiveDrink | null,
  speech: BartenderSpeech | null,
  isFastBoost: boolean,
  isWaving: boolean,
  isDancing: boolean,
  danceTier: GiftTier,
  danceStyle: DanceStyle,
  danceStartedAt: number,
  elapsedSec: number,
  baristaPosX = BARISTA_CENTER_X,
  walkVelocity = 0,
  idleElapsedSec = 0,
  wakeUpProgress = 0
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const effectiveIsDancing = isDancing && wakeUpProgress <= 0;
  const dance = computeDanceMotion(effectiveIsDancing, danceStyle, danceStartedAt, elapsedSec);

  if (dance.isDancing) {
    drawSynchronizedTikTokDanceArms(
      ctx,
      BARISTA_CENTER_X + dance.swayX,
      BARISTA_HEAD_Y + dance.bounceY,
      BARISTA_TORSO_Y + dance.bounceY,
      dance
    );
    drawTikTokDanceMusicNotesAndSparkles(ctx, dance, danceTier, elapsedSec);

    if (speech && speech.text.trim()) {
      drawCelebrationSpeechBanner(ctx, speech.text, danceTier);
    }
    ctx.restore();
    return;
  }

  const freq = isFastBoost ? 9.5 : 5.2;
  const isWorking = Boolean(activeDrink && activeDrink.phase === 'BREWING');
  const isCelebrating = isWaving || Boolean(activeDrink && activeDrink.phase === 'SHOWCASE');
  const isTrueIdle = !isWorking && !isCelebrating;
  const idle = isTrueIdle ? resolveIdleBaristaPhase(idleElapsedSec) : null;
  const idlePose = computeIdlePoseSnapshot(idle, elapsedSec);
  const idleBobOffset = idle ? idlePose.bobOffset : 0;

  const walkSpeedNorm = clamp01(Math.abs(walkVelocity) / 42);
  const walkHop = -Math.abs(Math.sin(elapsedSec * 14)) * 4.5 * walkSpeedNorm;
  const wakeUpHop = wakeUpProgress > 0 ? -Math.sin(wakeUpProgress * Math.PI) * 14 : 0;
  const bob = computeCharacterBob(dance, isWorking, elapsedSec, freq) + walkHop + idleBobOffset + wakeUpHop;
  const dozeHeadExtraY = idlePose.dozeBlend * 22;

  drawCentralBaristaArms(
    ctx,
    baristaPosX,
    BARISTA_HEAD_Y + idleBobOffset + dozeHeadExtraY,
    BARISTA_TORSO_Y,
    activeDrink,
    bob,
    isFastBoost,
    isWaving,
    freq,
    elapsedSec,
    idle,
    wakeUpProgress
  );

  if (speech && speech.text.trim()) {
    drawCelebrationSpeechBanner(ctx, speech.text, 'SMALL');
  }

  ctx.restore();
}

function drawCentralBaristaArms(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  torsoY: number,
  drink: ActiveDrink | null,
  bob: number,
  isFastBoost: boolean,
  isWaving: boolean,
  freq: number,
  elapsedSec: number,
  idle: { phase: IdleBaristaPhase; phaseElapsed: number; phaseDuration: number } | null = null,
  wakeUpProgress = 0
): void {
  const leftShoulderX = cx - 36;
  const leftShoulderY = torsoY + 24 + bob;
  const rightShoulderX = cx + 36;
  const rightShoulderY = torsoY + 24 + bob;

  if (wakeUpProgress > 0) {
    drawIdleBaristaArms(
      ctx,
      cx,
      headY,
      torsoY,
      leftShoulderX,
      leftShoulderY,
      rightShoulderX,
      rightShoulderY,
      elapsedSec,
      idle,
      wakeUpProgress
    );
    return;
  }

  // Direct handover animation at 100% (SHOWCASE): left hand waves goodbye; right hand pushes cup forward then retracts smoothly after customer grabs it
  if (drink && drink.phase === 'SHOWCASE') {
    const slideFactor = computeShowcaseSlideFactor(drink);
    const waveSwing = Math.sin(elapsedSec * 7.5) * 9;
    const leftHandX = cx - 50 + waveSwing;
    const leftHandY = headY + 12;
    const armEnd1 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHandX, leftHandY, -1);
    drawHandCircle(ctx, armEnd1.x, armEnd1.y);

    const showcaseElapsedMs = Math.max(
      0,
      GAMEPLAY_LIMITS.SHOWCASE_DURATION_MS - drink.showcaseRemainingMs
    );
    const retractT = clamp01((showcaseElapsedMs - SHOWCASE_HANDOFF_MS) / 360);
    const retractEase = retractT * retractT * (3 - 2 * retractT);

    const forwardPushX = CUP1_CX + CUP_TOP_HALF_W + 7;
    const forwardPushY = CUP_TOP_Y + 26 + 28 * slideFactor;
    const restHipX = cx + 38;
    const restHipY = torsoY + 52 + bob;
    const pushX = forwardPushX + (restHipX - forwardPushX) * retractEase;
    const pushY = forwardPushY + (restHipY - forwardPushY) * retractEase;

    const armEnd2 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, pushX, pushY, 1);
    drawHandCircle(ctx, armEnd2.x, armEnd2.y);
    return;
  }

  const action = resolveBrewAction(drink);

  if (!action || !drink) {
    if (isWaving) {
      const waveOffset = Math.sin(elapsedSec * 5.2) * 10;
      const leftHandX = cx - 48 + waveOffset;
      const leftHandY = headY + 8;
      const armEnd3 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHandX, leftHandY, -1);
      drawHandCircle(ctx, armEnd3.x, armEnd3.y);

      const rightHandX = cx + 38;
      const rightHandY = torsoY + 52 + bob;
      const armEnd4 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightHandX, rightHandY, 1);
      drawHandCircle(ctx, armEnd4.x, armEnd4.y);
      return;
    }

    drawIdleBaristaArms(
      ctx,
      cx,
      headY,
      torsoY,
      leftShoulderX,
      leftShoulderY,
      rightShoulderX,
      rightShoulderY,
      elapsedSec,
      idle,
      wakeUpProgress
    );
    return;
  }

function drawCounterCleanGleam(
  ctx: CanvasRenderingContext2D,
  gleamX: number,
  gleamY: number,
  phaseElapsed: number
): void {
  const pulse = 0.35 + 0.45 * Math.abs(Math.sin(phaseElapsed * 4.2));
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.strokeStyle = '#FFFDF9';
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(gleamX - 7, gleamY + 4);
  ctx.lineTo(gleamX + 3, gleamY - 4);
  ctx.moveTo(gleamX + 3, gleamY + 5);
  ctx.lineTo(gleamX + 10, gleamY - 1);
  ctx.stroke();
  ctx.restore();
}

function drawIdleBaristaArms(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  torsoY: number,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number,
  elapsedSec: number,
  idle: { phase: IdleBaristaPhase; phaseElapsed: number; phaseDuration: number } | null,
  wakeUpProgress = 0
): void {
  // Derive hipY from animated shoulderY so hands always track vertical bob
  const hipY = leftShoulderY + 28;
  const counterSurfaceY = STAGE_METRICS.COUNTER_TOP_Y + 6;

  if (wakeUpProgress > 0) {
    // Startled arms jumping synchronously with body hop
    const handL = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, cx - 40, leftShoulderY + 8, -1);
    drawHandCircle(ctx, handL.x, handL.y);
    const handR = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, cx + 40, rightShoulderY + 8, 1);
    drawHandCircle(ctx, handR.x, handR.y);
    return;
  }

  const phase = idle?.phase ?? 'WIPE';
  const idlePose = computeIdlePoseSnapshot(idle, elapsedSec);

  if (phase === 'WIPE') {
    const t = idle?.phaseElapsed ?? elapsedSec;
    const sweep = Math.sin(t * 4.2);
    const depthWobble = Math.cos(t * 8.4) * 3;
    const targetClothX = cx + 8 + sweep * 42;
    const targetClothY = counterSurfaceY + depthWobble;

    // Left arm & hand steadying cleanly on counter edge
    const handL = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, cx - 36, counterSurfaceY, -1, 108);
    drawHandCircle(ctx, handL.x, handL.y);

    // Subtle clean shine streaks trailing behind the pastel cloth
    drawCounterCleanGleam(ctx, targetClothX - sweep * 16, counterSurfaceY - 1, t);

    // Right arm reaches smoothly onto counter; cloth is held directly under hand endpoint
    const handR = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, targetClothX, targetClothY - 2, 1, 108);
    const clothX = handR.x;
    const clothY = handR.y + 2;

    ctx.save();
    roundedRectPath(ctx, clothX - 12, clothY - 6, 24, 12, 4);
    ctx.fillStyle = '#BEE3F8';
    ctx.fill();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(clothX - 4, clothY - 4);
    ctx.lineTo(clothX - 4, clothY + 4);
    ctx.moveTo(clothX + 4, clothY - 4);
    ctx.lineTo(clothX + 4, clothY + 4);
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = 'rgba(59, 40, 32, 0.35)';
    ctx.stroke();
    ctx.restore();

    drawHandCircle(ctx, handR.x, handR.y);
    return;
  }

  if (phase === 'STRETCH_YAWN' && idle) {
    const p = clamp01(idle.phaseElapsed / idle.phaseDuration);
    const wipeEndT = IDLE_PHASE_TIMINGS.WIPE_END_SEC;
    const wipeEndClothX = cx + 8 + Math.sin(wipeEndT * 4.2) * 42;
    const wipeEndClothY = counterSurfaceY + Math.cos(wipeEndT * 8.4) * 3 - 2;

    const startLX = cx - 36;
    const startLY = counterSurfaceY;
    const startRX = wipeEndClothX;
    const startRY = wipeEndClothY;

    const stretchLX = cx - 34;
    const stretchLY = headY - 28;
    const stretchRX = cx + 34;
    const stretchRY = headY - 28;

    const yawnLX = cx - 4;
    const yawnLY = headY + 16;
    const yawnRX = cx + 38;
    const yawnRY = hipY;

    const dozeStartLX = cx - 36;
    const dozeStartLY = torsoY + 56;
    const dozeStartRX = cx + 36;
    const dozeStartRY = torsoY + 56;

    let lx = stretchLX;
    let ly = stretchLY;
    let rx = stretchRX;
    let ry = stretchRY;

    if (p < 0.2) {
      const u = p / 0.2;
      const ease = u * u * (3 - 2 * u);
      lx = startLX + (stretchLX - startLX) * ease;
      ly = startLY + (stretchLY - startLY) * ease;
      rx = startRX + (stretchRX - startRX) * ease;
      ry = startRY + (stretchRY - startRY) * ease;
    } else if (p < 0.46) {
      const lift = Math.sin(((p - 0.2) / 0.26) * Math.PI) * 6;
      lx = stretchLX - lift * 0.5;
      ly = stretchLY - lift;
      rx = stretchRX + lift * 0.5;
      ry = stretchRY - lift;
    } else if (p < 0.62) {
      const u = (p - 0.46) / 0.16;
      const ease = u * u * (3 - 2 * u);
      lx = stretchLX + (yawnLX - stretchLX) * ease;
      ly = stretchLY + (yawnLY - stretchLY) * ease;
      rx = stretchRX + (yawnRX - stretchRX) * ease;
      ry = stretchRY + (yawnRY - stretchRY) * ease;
    } else if (p < 0.84) {
      lx = yawnLX;
      ly = yawnLY;
      rx = yawnRX;
      ry = yawnRY;
    } else {
      const u = (p - 0.84) / 0.16;
      const ease = u * u * (3 - 2 * u);
      lx = yawnLX + (dozeStartLX - yawnLX) * ease;
      ly = yawnLY + (dozeStartLY - yawnLY) * ease;
      rx = yawnRX + (dozeStartRX - yawnRX) * ease;
      ry = yawnRY + (dozeStartRY - yawnRY) * ease;
    }

    const handL = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, lx, ly, -1, 128);
    drawHandCircle(ctx, handL.x, handL.y);
    const handR = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rx, ry, 1, 128);
    drawHandCircle(ctx, handR.x, handR.y);
    return;
  }

  if (phase === 'DOZE') {
    // Folded arms glide seamlessly from hipY+4 down onto counter pillow beneath head
    const dozeBlend = idlePose.dozeBlend;
    const restY = STAGE_METRICS.COUNTER_TOP_Y - 7;
    const startY = torsoY + 56;
    const leftX = cx - 36 + (cx + 16 - (cx - 36)) * dozeBlend;
    const leftY = startY + (restY + 1 - startY) * dozeBlend;
    const rightX = cx + 36 + (cx - 18 - (cx + 36)) * dozeBlend;
    const rightY = startY + (restY - 2 - startY) * dozeBlend;
    const armEnd5 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftX, leftY, -1, 72);
    drawHandCircle(ctx, armEnd5.x, armEnd5.y);
    const armEnd6 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightX, rightY, 1, 72);
    drawHandCircle(ctx, armEnd6.x, armEnd6.y);
    return;
  }
}

  // SUB-STEP 0..7%: Lấy cốc từ chồng ly bên phải đặt vào đế pha chính (x=360)
  if (isCupPickupSubstep(drink)) {
    drawCupPickupAction(
      ctx,
      drink,
      leftShoulderX,
      leftShoulderY,
      rightShoulderX,
      rightShoulderY
    );
    return;
  }

  const recipe = RECIPE_MAP[drink.recipeId];
  const stepProg = resolveStepProgress(drink);

  // STEP 1 (7–20%): Lấy Matcha trên kệ / Hứng cốt trà / Chiết xuất cafe / Bấm nút lấy đường
  if (action === 'dispense') {
    drawStep1DispenseAction(
      ctx,
      drink,
      leftShoulderX,
      leftShoulderY,
      rightShoulderX,
      rightShoulderY,
      stepProg,
      elapsedSec
    );
    return;
  }

  // STEP 2 (20–42%): Máy đánh tơi cầm tay trong bát chawan/ca inox / Máy lắc đôi / Ép cam tươi
  if (action === 'tool_prep') {
    drawStep2PrepAction(
      ctx,
      drink,
      leftShoulderX,
      leftShoulderY,
      rightShoulderX,
      rightShoulderY,
      isFastBoost,
      freq,
      elapsedSec
    );
    return;
  }

  // STEP 3 (42–56%): Với Trà Sữa múc trân châu (42..49%) rồi mới múc đá (49..56%); các món khác múc đá (42..56%)!
  if (action === 'add_ice') {
    if (isBobaScoopSubstep(drink)) {
      const jarRimX = BAR_STATION_COORDS.BOBA_JAR_X + 10;
      const jarRimY = STAGE_METRICS.COUNTER_TOP_Y - 12;
      const armEnd7 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jarRimX, jarRimY, -1);
      drawHandCircle(ctx, armEnd7.x, armEnd7.y);

      const scoopCycle = (Math.sin(elapsedSec * 5.6) + 1) * 0.5;
      const startX = BAR_STATION_COORDS.BOBA_JAR_X + 8;
      const endX = CUP1_CX + 4;
      const startY = STAGE_METRICS.COUNTER_TOP_Y - 22;
      const endY = CUP_TOP_Y - 18;
      const scoopX = startX + (endX - startX) * scoopCycle;
      const scoopY = startY + (endY - startY) * scoopCycle - Math.sin(scoopCycle * Math.PI) * 18;

      const bobaHand = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, scoopX, scoopY, 1);
      drawBobaLadleScoopAction(ctx, bobaHand.x, bobaHand.y, scoopCycle > 0.72, elapsedSec);
      return;
    }

    const binRimX = BAR_STATION_COORDS.ICE_BIN_X + 10;
    const binRimY = STAGE_METRICS.COUNTER_TOP_Y - 12;
    const armEnd8 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, binRimX, binRimY, -1);
    drawHandCircle(ctx, armEnd8.x, armEnd8.y);

    // Scoop lifts from ice bin cleanly OVER open cup mouth (360, CUP_TOP_Y - 18 = 572)
    const scoopCycle = (Math.sin(elapsedSec * 5.2) + 1) * 0.5;
    const startX = BAR_STATION_COORDS.ICE_BIN_X + 8;
    const endX = CUP1_CX + 6;
    const startY = STAGE_METRICS.COUNTER_TOP_Y - 22;
    const endY = CUP_TOP_Y - 18;
    const scoopX = startX + (endX - startX) * scoopCycle;
    const scoopY = startY + (endY - startY) * scoopCycle - Math.sin(scoopCycle * Math.PI) * 18;

    const iceHand = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, scoopX, scoopY, 1);
    drawIceScoopAndCubes(
      ctx,
      iceHand.x,
      iceHand.y,
      1,
      drink.iceLevel !== 'NONE',
      scoopCycle > 0.72,
      elapsedSec
    );
    return;
  }

  // STEP 4 (56–84%): Lấy dụng cụ vừa pha → Rót khớp mặt chất lỏng → Cất gọn trước khi đổi dụng cụ / đổ kem!
  if (action === 'pour_mix') {
    const pourRatio = resolvePourRatio(drink);

    // 4a. Milk Tea (56..60%): Nhấc bình shaker rời khỏi máy lắc đôi đưa về ly chính
    if (isShakerLiftSubstep(drink)) {
      drawShakerLiftAction(
        ctx,
        drink,
        leftShoulderX,
        leftShoulderY,
        rightShoulderX,
        rightShoulderY
      );
      return;
    }

    // 4b. Milk Tea (74..77%): Cất bình shaker rỗng & cầm ca kem cheese lên
    if (
      drink.recipeId === 'thai_tea' &&
      drink.progress >= THAI_TEA_POUR_END_PROGRESS &&
      drink.progress < THAI_TEA_CREAM_START_PROGRESS
    ) {
      const swapT = clamp01(
        (drink.progress - THAI_TEA_POUR_END_PROGRESS) /
          (THAI_TEA_CREAM_START_PROGRESS - THAI_TEA_POUR_END_PROGRESS)
      );
      drawSwapToCreamerAction(
        ctx,
        swapT,
        '#FFF6DC',
        leftShoulderX,
        leftShoulderY,
        rightShoulderX,
        rightShoulderY
      );
      return;
    }

    // 4c. Milk Tea (77..84%): Rót lớp Kem Cheese mịn lên trên cùng sau khi đã rót xong trà sữa!
    if (drink.recipeId === 'thai_tea' && drink.progress >= THAI_TEA_CREAM_START_PROGRESS) {
      const armEnd9 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, CUP1_CX - CUP_TOP_HALF_W - 2, CUP_TOP_Y + 12, -1);
      drawHandCircle(ctx, armEnd9.x, armEnd9.y);

      const creamerX = CUP1_CX + 26 + Math.sin(elapsedSec * 4.5) * 4;
      const creamerY = CUP_TOP_Y - 38 + Math.cos(elapsedSec * 4.5) * 2.5;
      const creamHand = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, creamerX, creamerY, 1);
      drawBaristaCreamerJugAction(ctx, creamHand.x, creamHand.y, CUP1_CX, 1, elapsedSec, '#FFF6DC');
      return;
    }

    // 4d. Matcha swap beat (0.36..0.48): Cất bịch sữa OATSIDE xong mới cầm bát Matcha lên rót!
    if (
      drink.recipeId === 'matcha' &&
      pourRatio > MATCHA_MILK_SPLIT_RATIO &&
      pourRatio <= MATCHA_SWAP_END_RATIO
    ) {
      const swapT = clamp01(
        (pourRatio - MATCHA_MILK_SPLIT_RATIO) / (MATCHA_SWAP_END_RATIO - MATCHA_MILK_SPLIT_RATIO)
      );
      drawPutAwayMilkAndPickVesselAction(
        ctx,
        true,
        swapT,
        leftShoulderX,
        leftShoulderY,
        rightShoulderX,
        rightShoulderY
      );
      return;
    }

    // 4e. Soda 2-color swap beat (0.32..0.44): Rót xong màu 1 (siro dâu), cất ca màu 1 rồi cầm chai Soda xanh màu 2!
    if (
      drink.recipeId === 'berry_soda' &&
      pourRatio > SODA_SYRUP_SPLIT_RATIO &&
      pourRatio <= SODA_SWAP_END_RATIO
    ) {
      const swapT = clamp01(
        (pourRatio - SODA_SYRUP_SPLIT_RATIO) / (SODA_SWAP_END_RATIO - SODA_SYRUP_SPLIT_RATIO)
      );
      drawSodaTwoColorSwapAction(
        ctx,
        swapT,
        leftShoulderX,
        leftShoulderY,
        rightShoulderX,
        rightShoulderY
      );
      return;
    }

    // 4f. Cafe (75..78%): Cất ca cà phê inox & cầm ca kem muối lên
    if (
      drink.recipeId === 'coffee_milk' &&
      drink.progress >= CAFE_POUR_END_PROGRESS &&
      drink.progress < CAFE_CREAM_START_PROGRESS
    ) {
      const swapT = clamp01(
        (drink.progress - CAFE_POUR_END_PROGRESS) /
          (CAFE_CREAM_START_PROGRESS - CAFE_POUR_END_PROGRESS)
      );
      drawSwapToCreamerAction(
        ctx,
        swapT,
        '#FFF6E8',
        leftShoulderX,
        leftShoulderY,
        rightShoulderX,
        rightShoulderY
      );
      return;
    }

    // 4g. Cafe (78..84%): Rót lớp Kem Muối mịn lên trên cùng sau khi rót xong cà phê!
    if (drink.recipeId === 'coffee_milk' && drink.progress >= CAFE_CREAM_START_PROGRESS) {
      const armEnd10 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, CUP1_CX - CUP_TOP_HALF_W - 2, CUP_TOP_Y + 12, -1);
      drawHandCircle(ctx, armEnd10.x, armEnd10.y);

      const creamerX = CUP1_CX + 26 + Math.sin(elapsedSec * 4.5) * 4;
      const creamerY = CUP_TOP_Y - 38 + Math.cos(elapsedSec * 4.5) * 2.5;
      const creamHand = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, creamerX, creamerY, 1);
      drawBaristaCreamerJugAction(ctx, creamHand.x, creamHand.y, CUP1_CX, 1, elapsedSec, '#FFF6E8');
      return;
    }

    // 4h. Fresh fruit slice rim garnish (78%+ of P4 for Orange, Peach Tea, and Lime Tea)
    if (
      (drink.recipeId === 'blue_citrus' ||
        drink.recipeId === 'peach_tea' ||
        drink.recipeId === 'lime_tea') &&
      drink.progress >= 78
    ) {
      const armEnd11 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, CUP1_CX - CUP_TOP_HALF_W - 2, CUP_TOP_Y + 12, -1);
      drawHandCircle(ctx, armEnd11.x, armEnd11.y);

      const garnishX = CUP1_CX + 18 + Math.sin(elapsedSec * 3.5) * 2.5;
      const garnishY = CUP_TOP_Y - 16 + Math.cos(elapsedSec * 3.5) * 2;
      const garnishHand = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, garnishX, garnishY, 1);
      drawPlaceFruitGarnishAction(
        ctx,
        garnishHand.x,
        garnishHand.y,
        1,
        RECIPE_MAP[drink.recipeId].fruitType
      );
      return;
    }

    // 4i. Coordinated 2-handed pouring aligned tightly to ~70% cup mouth & exact liquid surfaceY
    const pourBob = Math.sin(elapsedSec * freq) * 2.0;
    const handX = CUP1_CX - 32 + pourBob * 0.3;
    const handY = CUP_TOP_Y - 40 + Math.cos(elapsedSec * freq) * 2.0;
    const surfaceY = computeLiquidFillSnapshot(drink.recipeId, drink.progress).surfaceY;
    const pourColor = resolveActivePourColor(drink);
    const pourVessel = resolveActivePourVessel(drink);

    // Secondary (right) hand gently steadies cup side rim
    const steadyX = CUP1_CX + CUP_TOP_HALF_W + 2;
    const steadyY = CUP_TOP_Y + 12;
    const armEnd12 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, steadyX, steadyY, 1);
    drawHandCircle(ctx, armEnd12.x, armEnd12.y);

    // Primary (left) hand tilts vessel smoothly downward (shaker drains 0.94 -> 0.0 across pour span!)
    const shakerPourEnd = drink.recipeId === 'peach_tea' ? 78 : THAI_TEA_POUR_END_PROGRESS;
    const shakerDrainFrac =
      pourVessel === 'shaker'
        ? clamp01(
            (drink.progress - SHAKER_LIFT_END_PROGRESS) /
              (shakerPourEnd - SHAKER_LIFT_END_PROGRESS)
          )
        : 0;
    const vesselFillRatio = pourVessel === 'shaker' ? Math.max(0, 0.94 * (1 - shakerDrainFrac)) : 0.85;

    const pourHand = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, handX, handY, -1);
    drawPourLiquidEffect(ctx, {
      toolType: pourVessel,
      handX: pourHand.x,
      handY: pourHand.y,
      cupCx: CUP1_CX,
      side: -1,
      liquidColor: pourColor,
      accentColor: recipe.accentColor,
      targetSurfaceY: surfaceY,
      isFastBoost,
      isSodaFizz: pourVessel === 'soda_pour',
      elapsedSec,
      vesselFillRatio,
    });
    drawHandCircle(ctx, pourHand.x, pourHand.y);
    return;
  }

  // STEP 5 (84–100%): 3-beat realistic lid seal choreography
  // Beat 1 (84..90%): Pick dome lid from stack & align centered above cup rim
  if (isLidPickupSubstep(drink)) {
    drawLidPickupAction(
      ctx,
      drink,
      leftShoulderX,
      leftShoulderY,
      rightShoulderX,
      rightShoulderY
    );
    return;
  }

  // Beat 2 (90..96%): Both hands grip lid edges, press down onto rim (90..93.5%), snap elastic bounce (93.5..96%)
  if (drink.progress < LID_SNAP_END_PROGRESS) {
    const pressT = clamp01(
      (drink.progress - LID_PICKUP_END_PROGRESS) /
        (LID_SNAP_MOMENT_PROGRESS - LID_PICKUP_END_PROGRESS)
    );
    const easePress = pressT * pressT * (3 - 2 * pressT);
    let snapDipY = 0;
    if (drink.progress >= LID_SNAP_MOMENT_PROGRESS) {
      const bounceT = clamp01(
        (drink.progress - LID_SNAP_MOMENT_PROGRESS) /
          (LID_SNAP_END_PROGRESS - LID_SNAP_MOMENT_PROGRESS)
      );
      snapDipY = Math.sin(bounceT * Math.PI) * 3.2;
    }

    const lidLowerY = (1 - easePress) * 15;
    const leftLidX = CUP1_CX - CUP_TOP_HALF_W - 1.5;
    const rightLidX = CUP1_CX + CUP_TOP_HALF_W + 1.5;
    const lidY = CUP_TOP_Y - 2 - lidLowerY + snapDipY;

    const armEnd13 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftLidX, lidY, -1);
    drawHandCircle(ctx, armEnd13.x, armEnd13.y);
    const armEnd14 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightLidX, lidY, 1);
    drawHandCircle(ctx, armEnd14.x, armEnd14.y);
    return;
  }

  // Beat 3 (96..100%): Clean straw pickup & downward insertion into sealed dome lid hole
  drawStrawInsertAction(
    ctx,
    drink,
    leftShoulderX,
    leftShoulderY,
    rightShoulderX,
    rightShoulderY
  );
}

function drawStrawInsertAction(
  ctx: CanvasRenderingContext2D,
  drink: ActiveDrink,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number
): void {
  const strawT = clamp01(
    (drink.progress - STRAW_INSERT_START_PROGRESS) /
      (STRAW_INSERT_END_PROGRESS - STRAW_INSERT_START_PROGRESS)
  );
  const recipe = RECIPE_MAP[drink.recipeId];

  // Left hand gently steadies the cup rim
  const steadyX = CUP1_CX - CUP_TOP_HALF_W - 2;
  const steadyY = CUP_TOP_Y + 12;
  const armEnd15 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, steadyX, steadyY, -1);
  drawHandCircle(ctx, armEnd15.x, armEnd15.y);

  // Right hand carries straw:
  // Sub-beat 1 (0..0.4): Reaches toward straw dispenser on right counter and brings straw up
  // Sub-beat 2 (0.4..1.0): Aligns centered above dome lid aperture and inserts downward into cup
  let handX: number;
  let handY: number;

  if (strawT < 0.4) {
    const reachT = clamp01(strawT / 0.4);
    const easeReach = reachT * reachT * (3 - 2 * reachT);
    const startX = BAR_STATION_COORDS.CUP_STACK_X - 6;
    const startY = STAGE_METRICS.COUNTER_TOP_Y - 12;
    const targetX = CUP1_CX + 14;
    const targetY = CUP_TOP_Y - 32;
    handX = startX + (targetX - startX) * easeReach;
    handY = startY + (targetY - startY) * easeReach;
  } else {
    const downT = clamp01((strawT - 0.4) / 0.6);
    const easeDown = downT * downT * (3 - 2 * downT);
    handX = CUP1_CX + 3 - easeDown * 2;
    handY = CUP_TOP_Y - 32 + easeDown * 18;
  }

  const strawHand = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, handX, handY, 1);

  // Straw being held in right hand
  ctx.save();
  ctx.translate(strawHand.x, strawHand.y);
  ctx.rotate(-0.16);
  roundedRectPath(ctx, -2.6, -16, 5.2, 34, 2.4);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Spiral accent rings matching recipe color
  ctx.save();
  ctx.clip();
  ctx.fillStyle = recipe.accentColor;
  for (let y = -14; y < 14; y += 9) {
    ctx.beginPath();
    ctx.moveTo(-4, y);
    ctx.lineTo(4, y + 4);
    ctx.lineTo(4, y + 7);
    ctx.lineTo(-4, y + 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();

  drawHandCircle(ctx, strawHand.x, strawHand.y);
}

function drawLidPickupAction(
  ctx: CanvasRenderingContext2D,
  drink: ActiveDrink,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number
): void {
  const lidT = clamp01((drink.progress - 84) / (LID_PICKUP_END_PROGRESS - 84));
  const carryT = clamp01((lidT - 0.16) / 0.84);
  const easeT = carryT * carryT * (3 - 2 * carryT);

  const startX = BAR_STATION_COORDS.LID_STACK_X;
  const startY = STAGE_METRICS.COUNTER_TOP_Y - 18;
  const endX = CUP1_CX;
  const endY = CUP_TOP_Y - 15;

  const lidCx = startX + (endX - startX) * easeT;
  const lidY = startY + (endY - startY) * easeT - Math.sin(easeT * Math.PI) * 26;
  const lidR = 11 + (CUP_TOP_HALF_W - 11) * easeT;

  // Draw carried dome lid matching exact reduced cup rim width (NO straw, #3B2820 2.5px outline)
  ctx.save();
  ctx.beginPath();
  ctx.arc(lidCx, lidY, lidR, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 253, 249, 0.72)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  roundedRectPath(ctx, lidCx - lidR - 2.2, lidY - 3.2, (lidR + 2.2) * 2, 6.8, 3.4);
  ctx.fillStyle = 'rgba(255, 253, 249, 0.92)';
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Right hand lifts & centers dome lid above cup; left hand meets left rim cleanly at end of carry (0px jump into Beat 2)
  const rimGripOffset = lidR + 1.5;
  const rightGripX = lidCx + rimGripOffset;
  const rightGripY = lidY - 2;
  const leftGuideX = easeT > 0.55 ? lidCx - rimGripOffset : CUP1_CX - CUP_TOP_HALF_W - 6;
  const leftGuideY = easeT > 0.55 ? lidY - 2 : CUP_TOP_Y + 6;

  const armEnd16 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftGuideX, leftGuideY, -1);
  drawHandCircle(ctx, armEnd16.x, armEnd16.y);
  const armEnd17 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightGripX, rightGripY, 1);
  drawHandCircle(ctx, armEnd17.x, armEnd17.y);
}

function drawShakerLiftAction(
  ctx: CanvasRenderingContext2D,
  drink: ActiveDrink,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number
): void {
  const liftT = clamp01((drink.progress - 56) / (SHAKER_LIFT_END_PROGRESS - 56));
  const easeT = liftT * liftT * (3 - 2 * liftT);

  const startX = BAR_STATION_COORDS.SHAKER_RIGHT_CLAMP_X; // Right clamp of Double Shaker Machine
  const startY = STAGE_METRICS.COUNTER_TOP_Y - 24;
  const endX = CUP1_CX - 32;
  const endY = CUP_TOP_Y - 40;

  const shakerX = startX + (endX - startX) * easeT;
  const shakerY = startY + (endY - startY) * easeT - Math.sin(easeT * Math.PI) * 26;

  // Draw carried realistic 3-piece tapered boba shaker (cap pops off right before pour)
  ctx.save();
  ctx.translate(shakerX, shakerY);
  ctx.rotate(easeT * 0.35);
  drawRealisticBobaShaker(ctx, {
    liquidColor: RECIPE_MAP[drink.recipeId].baseColor,
    fillRatio: 0.92,
    isCapClosed: easeT < 0.72,
    isPouringTilted: false,
    isShaking: false,
    elapsedSec: 0,
  });
  ctx.restore();

  const armEnd18 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, shakerX - 8, shakerY + 4, -1);
  drawHandCircle(ctx, armEnd18.x, armEnd18.y);
  const armEnd19 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, shakerX + 10, shakerY - 4, 1);
  drawHandCircle(ctx, armEnd19.x, armEnd19.y);
}

function drawSwapToCreamerAction(
  ctx: CanvasRenderingContext2D,
  swapT: number,
  creamColor: string,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number
): void {
  const easeT = swapT * swapT * (3 - 2 * swapT);

  // Left hand sets down empty vessel & moves to steady cup rim
  const leftX = 290 + (CUP1_CX - CUP_TOP_HALF_W - 2 - 290) * easeT;
  const leftY = STAGE_METRICS.COUNTER_TOP_Y - 14 + (CUP_TOP_Y + 12 - (STAGE_METRICS.COUNTER_TOP_Y - 14)) * easeT;
  const armEnd20 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftX, leftY, -1);
  drawHandCircle(ctx, armEnd20.x, armEnd20.y);

  // Right hand lifts mini stainless creamer jug filled with Kem Cheese / Kem Muối up to pour position!
  const jugX = 434 + (CUP1_CX + 26 - 434) * easeT;
  const jugY = STAGE_METRICS.COUNTER_TOP_Y - 16 + (CUP_TOP_Y - 38 - (STAGE_METRICS.COUNTER_TOP_Y - 16)) * easeT - Math.sin(easeT * Math.PI) * 16;

  ctx.save();
  ctx.translate(jugX, jugY);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  roundedRectPath(ctx, -10, -12, 20, 24, 5);
  ctx.fillStyle = '#F2F4F8';
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, -6, -8, 12, 6, 2);
  ctx.fillStyle = creamColor;
  ctx.fill();
  ctx.restore();

  const armEnd21 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, jugX, jugY, 1);
  drawHandCircle(ctx, armEnd21.x, armEnd21.y);
}

function drawSodaTwoColorSwapAction(
  ctx: CanvasRenderingContext2D,
  swapT: number,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number
): void {
  // First half (0..0.5): Left hand sets down Color 1 Pink Berry Syrup measuring cup neatly on counter
  if (swapT < 0.5) {
    const putT = clamp01(swapT / 0.5);
    const jugX = CUP1_CX - 32 - putT * 46;
    const jugY = CUP_TOP_Y - 40 + putT * (STAGE_METRICS.COUNTER_TOP_Y + 10 - (CUP_TOP_Y - 40));

    drawGraduatedMeasuringCup(ctx, jugX, jugY + 18, '#E04F6D', 0.25);
    const armEnd22 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 12, jugY + 4, -1);
    drawHandCircle(ctx, armEnd22.x, armEnd22.y);

    // Right hand reaches toward Color 2 Cyan Soda bottle
    const reachX = 428;
    const reachY = STAGE_METRICS.COUNTER_TOP_Y - 22;
    const armEnd23 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, reachX, reachY, 1);
    drawHandCircle(ctx, armEnd23.x, armEnd23.y);
    return;
  }

  // Second half (0.5..1.0): Left hand lifts chilled Color 2 Cyan Soda bottle smoothly into pouring position!
  const liftT = clamp01((swapT - 0.5) / 0.5);
  const bottleX = 428 + (CUP1_CX - 32 - 428) * liftT;
  const bottleY =
    STAGE_METRICS.COUNTER_TOP_Y -
    22 +
    (CUP_TOP_Y - 40 - (STAGE_METRICS.COUNTER_TOP_Y - 22)) * liftT -
    Math.sin(liftT * Math.PI) * 20;

  ctx.save();
  ctx.translate(bottleX, bottleY);
  ctx.rotate(-0.15 + liftT * 0.25);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  roundedRectPath(ctx, -9.5, -16, 19, 34, 6);
  ctx.fillStyle = '#7FC8D9';
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, -6.5, -9, 13, 16, 3);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  roundedRectPath(ctx, -4.8, -28, 9.6, 13, 3);
  ctx.fillStyle = '#E8F7FA';
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const armEnd24 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, bottleX, bottleY, -1);
  drawHandCircle(ctx, armEnd24.x, armEnd24.y);

  const steadyX = CUP1_CX + CUP_TOP_HALF_W + 2;
  const steadyY = CUP_TOP_Y + 12;
  const armEnd25 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, steadyX, steadyY, 1);
  drawHandCircle(ctx, armEnd25.x, armEnd25.y);
}

function drawPutAwayMilkAndPickVesselAction(
  ctx: CanvasRenderingContext2D,
  isMatcha: boolean,
  swapT: number,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number
): void {
  const easeT = swapT * swapT * (3 - 2 * swapT);

  // First half (0..0.5): Right hand returns OATSIDE carton neatly back up toward shelf
  if (swapT < 0.5) {
    const putT = clamp01(swapT / 0.5);
    const cartonX = CUP1_CX + 18 + putT * 118;
    const cartonY = CUP_TOP_Y - 26 - putT * 120;

    ctx.save();
    ctx.translate(cartonX, cartonY);
    ctx.rotate((1 - putT) * 0.25);
    ctx.lineWidth = 2.3;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    roundedRectPath(ctx, -10, -16, 20, 32, 3.5);
    ctx.fillStyle = '#F6EAD7';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#D49A6A';
    ctx.fillRect(-8.5, -4, 17, 10);
    ctx.restore();

    const armEnd26 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, cartonX - 6, cartonY + 4, 1);
    drawHandCircle(ctx, armEnd26.x, armEnd26.y);

    // Left hand reaches down to pick up prepared chawan bowl (x=420) / stainless espresso pitcher
    const reachX = BAR_STATION_COORDS.PREP_PAD_X;
    const reachY = STAGE_METRICS.COUNTER_TOP_Y - 12;
    const armEnd27 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, reachX, reachY, -1);
    drawHandCircle(ctx, armEnd27.x, armEnd27.y);
    return;
  }

  // Second half (0.5..1.0): Left hand lifts prepared Chawan Matcha (x=420) / Espresso Pitcher smoothly to pour position!
  const liftT = clamp01((swapT - 0.5) / 0.5);
  const startVesselX = BAR_STATION_COORDS.PREP_PAD_X;
  const vesselX = startVesselX + (CUP1_CX - 32 - startVesselX) * liftT;
  const vesselY =
    STAGE_METRICS.COUNTER_TOP_Y -
    14 +
    (CUP_TOP_Y - 40 - (STAGE_METRICS.COUNTER_TOP_Y - 14)) * liftT -
    Math.sin(liftT * Math.PI) * 14;

  if (isMatcha) {
    drawHeldMatchaChawan(ctx, vesselX, vesselY);
  } else {
    ctx.save();
    ctx.translate(vesselX, vesselY);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    roundedRectPath(ctx, -10, -14, 20, 28, 5);
    ctx.fillStyle = '#DCE3EA';
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -12, 8.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5A321C';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  const armEnd28 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, vesselX - 10, vesselY + 4, -1);
  drawHandCircle(ctx, armEnd28.x, armEnd28.y);

  const steadyX = CUP1_CX + CUP_TOP_HALF_W + 2;
  const steadyY = CUP_TOP_Y + 12 + (1 - easeT) * 6;
  const armEnd29 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, steadyX, steadyY, 1);
  drawHandCircle(ctx, armEnd29.x, armEnd29.y);
}

function drawCupPickupAction(
  ctx: CanvasRenderingContext2D,
  drink: ActiveDrink,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number
): void {
  const pickupT = clamp01(drink.progress / CUP_PICKUP_END_PROGRESS);
  // Smooth ease-in-out carry from Cup Stack (454, 626) -> Center Coaster (360, 672) matching 1:1 cup size
  const carryT = clamp01((pickupT - 0.25) / 0.75);
  const easeT = carryT * carryT * (3 - 2 * carryT);

  const cupCx = BAR_STATION_COORDS.CUP_STACK_X + (CUP1_CX - BAR_STATION_COORDS.CUP_STACK_X) * easeT;
  const arcLift = Math.sin(easeT * Math.PI) * 28;
  const cupBottomY =
    STAGE_METRICS.COUNTER_TOP_Y -
    10 +
    (CUP_BOTTOM_Y - (STAGE_METRICS.COUNTER_TOP_Y - 10)) * easeT -
    arcLift;
  const cupScale = 0.72 + 0.28 * easeT;

  const topW = CUP_TOP_HALF_W * cupScale;
  const botW = CUP_BOTTOM_HALF_W * cupScale;
  const cupH = CUP_HEIGHT * cupScale;
  const topY = cupBottomY - cupH;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cupCx - topW, topY);
  ctx.lineTo(cupCx + topW, topY);
  ctx.lineTo(cupCx + botW, cupBottomY - 6);
  ctx.quadraticCurveTo(cupCx + botW, cupBottomY, cupCx + botW - 8, cupBottomY);
  ctx.lineTo(cupCx - botW + 8, cupBottomY);
  ctx.quadraticCurveTo(cupCx - botW, cupBottomY, cupCx - botW, cupBottomY - 6);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 253, 249, 0.72)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cupCx, topY, topW, 3.8 * cupScale, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  const gripY = topY + cupH * 0.48;
  const leftGripX = cupCx - topW + 1;
  const rightGripX = cupCx + topW - 1;

  const armEnd30 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftGripX, gripY, -1);
  drawHandCircle(ctx, armEnd30.x, armEnd30.y);
  const armEnd31 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightGripX, gripY, 1);
  drawHandCircle(ctx, armEnd31.x, armEnd31.y);
}

const PREP_LIQUID_COLOR_MAP: Readonly<Record<string, string>> = {
  matcha: '#A7D397',
  lime_tea: '#A4D466',
  coffee_milk: '#5A321C',
  berry_soda: '#E04F6D',
};

const PREP_FOAM_COLOR_MAP: Readonly<Record<string, string>> = {
  matcha: '#DCF0CE',
  lime_tea: '#EFF9DC',
  coffee_milk: '#FFF6E8',
  berry_soda: '#FFD6E0',
};

function drawStep1DispenseAction(
  ctx: CanvasRenderingContext2D,
  drink: ActiveDrink,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number,
  stepProg: number,
  elapsedSec: number
): void {
  const fillLevel = 0.25 + stepProg * 0.68;

  // Sub-step 15..20% (non-matcha): Press Sugar Dispenser Button on counter (x=171)!
  if (isSugarButtonSubstep(drink)) {
    const jugX = BAR_STATION_COORDS.SUGAR_BTN_X + 26;
    const jugBottomY = STAGE_METRICS.COUNTER_TOP_Y + 12;
    const jugColor = RECIPE_MAP[drink.recipeId].baseColor;
    drawGraduatedMeasuringCup(ctx, jugX, jugBottomY, jugColor, 0.72);

    // Right hand steadies measuring cup beside sugar chute
    const armEnd32 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, jugX + 14, jugBottomY - 16, 1);
    drawHandCircle(ctx, armEnd32.x, armEnd32.y);

    // Left hand presses coral-gold sugar button down rhythmically!
    const pressOffset = Math.abs(Math.sin(elapsedSec * 12)) * 4.5;
    const btnX = BAR_STATION_COORDS.SUGAR_BTN_X;
    const btnY = BAR_STATION_COORDS.SUGAR_BTN_Y - 12 + pressOffset;
    const armEnd33 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, btnX, btnY, -1);
    drawHandCircle(ctx, armEnd33.x, armEnd33.y);
    return;
  }

  // Matcha Sub-step 1 (10.5..13%): Reach up & bring green MATCHA canister down from shelf to prep zone
  if (isMatchaGrabSubstep(drink)) {
    drawMatchaShelfTransferAction(
      ctx,
      drink,
      leftShoulderX,
      leftShoulderY,
      rightShoulderX,
      rightShoulderY,
      true
    );
    return;
  }

  // Matcha Sub-step 2 (13..17.5%): Scoop green matcha powder with bamboo spoon into chawan bowl + fine green dust
  if (isMatchaScoopSubstep(drink)) {
    drawMatchaPowderScoopAction(
      ctx,
      drink,
      leftShoulderX,
      leftShoulderY,
      rightShoulderX,
      rightShoulderY,
      elapsedSec
    );
    return;
  }

  // Matcha Sub-step 3 (17.5..20%): Close bamboo lid & set MATCHA canister neatly back onto lower shelf
  if (isMatchaReturnSubstep(drink)) {
    drawMatchaShelfTransferAction(
      ctx,
      drink,
      leftShoulderX,
      leftShoulderY,
      rightShoulderX,
      rightShoulderY,
      false
    );
    return;
  }

  if (drink.recipeId === 'thai_tea') {
    const jugX = BAR_STATION_COORDS.TEA_URN_1_SPIGOT_X;
    const jugBottomY = 444;
    drawGraduatedMeasuringCup(ctx, jugX, jugBottomY, '#D89E68', fillLevel);
    const armEnd34 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 18, jugBottomY - 16, -1);
    drawHandCircle(ctx, armEnd34.x, armEnd34.y);

    const leverX = BAR_STATION_COORDS.TEA_URN_1_SPIGOT_X + 6;
    const leverY = 368;
    const armEnd35 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, leverX, leverY, 1);
    drawHandCircle(ctx, armEnd35.x, armEnd35.y);
    return;
  }

  if (drink.recipeId === 'peach_tea' || drink.recipeId === 'lime_tea') {
    if (drink.progress < TEA_URN_DISPENSE_END_PROGRESS) {
      const jugX = BAR_STATION_COORDS.TEA_URN_2_SPIGOT_X;
      const jugBottomY = 444;
      drawGraduatedMeasuringCup(ctx, jugX, jugBottomY, '#C98A4B', fillLevel);
      const armEnd36 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 18, jugBottomY - 16, -1);
      drawHandCircle(ctx, armEnd36.x, armEnd36.y);

      const leverX = BAR_STATION_COORDS.TEA_URN_2_SPIGOT_X + 6;
      const leverY = 368;
      const armEnd37 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, leverX, leverY, 1);
      drawHandCircle(ctx, armEnd37.x, armEnd37.y);
      return;
    }

    const isPeach = drink.recipeId === 'peach_tea';
    const syrupX = isPeach ? BAR_STATION_COORDS.SYRUP_2_X : BAR_STATION_COORDS.SYRUP_3_X;
    const syrupColor = isPeach ? '#FF9D5C' : '#A4D466';
    const jugBottomY = 446;
    drawGraduatedMeasuringCup(ctx, syrupX, jugBottomY, syrupColor, fillLevel);
    const armEnd38 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, syrupX - 18, jugBottomY - 16, -1);
    drawHandCircle(ctx, armEnd38.x, armEnd38.y);

    const pumpHandY = 352 + Math.abs(Math.sin(elapsedSec * 8)) * 4;
    const armEnd39 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, syrupX + 4, pumpHandY, 1);
    drawHandCircle(ctx, armEnd39.x, armEnd39.y);
    return;
  }

  if (drink.recipeId === 'coffee_milk') {
    const jugX = 500;
    const jugBottomY = STAGE_METRICS.COUNTER_TOP_Y + 12;
    drawGraduatedMeasuringCup(ctx, jugX, jugBottomY, '#F5E4CC', fillLevel * 0.65);
    const armEnd40 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 16, jugBottomY - 14, -1);
    drawHandCircle(ctx, armEnd40.x, armEnd40.y);

    const machineHandX = 568;
    const machineHandY = STAGE_METRICS.COUNTER_TOP_Y - 38 + Math.sin(elapsedSec * 4) * 2;
    const armEnd41 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, machineHandX, machineHandY, 1);
    drawHandCircle(ctx, armEnd41.x, armEnd41.y);
    return;
  }

  if (drink.recipeId === 'berry_soda') {
    const jugX = BAR_STATION_COORDS.SYRUP_1_X;
    const jugBottomY = 446;
    drawGraduatedMeasuringCup(ctx, jugX, jugBottomY, '#E04F6D', fillLevel);
    const armEnd42 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 18, jugBottomY - 16, -1);
    drawHandCircle(ctx, armEnd42.x, armEnd42.y);

    const pumpHandY = 350 + Math.abs(Math.sin(elapsedSec * 8)) * 4;
    const armEnd43 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, BAR_STATION_COORDS.SYRUP_1_X + 4, pumpHandY, 1);
    drawHandCircle(ctx, armEnd43.x, armEnd43.y);
    return;
  }

  if (drink.recipeId === 'blue_citrus') {
    const jugX = 276;
    const jugBottomY = STAGE_METRICS.COUNTER_TOP_Y + 12;
    drawGraduatedMeasuringCup(ctx, jugX, jugBottomY, '#FF9526', fillLevel * 0.6);
    const armEnd44 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 16, jugBottomY - 14, -1);
    drawHandCircle(ctx, armEnd44.x, armEnd44.y);

    const orangeX = 302;
    const orangeY = STAGE_METRICS.COUNTER_TOP_Y - 26 + Math.sin(elapsedSec * 5) * 3;
    const orangeHand = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, orangeX, orangeY, 1);
    drawPlaceFruitGarnishAction(ctx, orangeHand.x, orangeHand.y, 1, 'orange');
    return;
  }

  // Matcha Sub-step 7..10.5%: Pour OATSIDE milk into graduated measuring cup on open right-center prep pad
  const milkFill = clamp01(
    (drink.progress - CUP_PICKUP_END_PROGRESS) /
      (MATCHA_MILK_PREP_END_PROGRESS - CUP_PICKUP_END_PROGRESS)
  );
  const jugX = BAR_STATION_COORDS.PREP_PAD_X;
  const jugBottomY = STAGE_METRICS.COUNTER_TOP_Y + 12;
  drawGraduatedMeasuringCup(ctx, jugX, jugBottomY, '#FFFDF7', 0.22 + milkFill * 0.68);
  const armEnd45 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 16, jugBottomY - 14, -1);
  drawHandCircle(ctx, armEnd45.x, armEnd45.y);

  const cartonX = jugX + 34;
  const cartonY = jugBottomY - 64 + Math.sin(elapsedSec * 4) * 2;
  const milkHand = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, cartonX, cartonY, 1);
  drawPourLiquidEffect(ctx, {
    toolType: 'oatside_milk',
    handX: milkHand.x,
    handY: milkHand.y,
    cupCx: jugX,
    side: 1,
    liquidColor: '#FFFDF7',
    accentColor: '#FFFDF7',
    targetSurfaceY: jugBottomY - 8 - (0.22 + milkFill * 0.68) * 22,
    isFastBoost: false,
    isSodaFizz: false,
    elapsedSec,
  });
  drawHandCircle(ctx, milkHand.x, milkHand.y);
}

// Dedicated clear counter prep zone (404..482) strictly clear of MENU (282..316), Center Cup (337..383), and Cup Stack (486+)
const MATCHA_CHAWAN_COUNTER_X = BAR_STATION_COORDS.PREP_PAD_X; // 420
const MATCHA_CHAWAN_COUNTER_BOTTOM_Y = STAGE_METRICS.COUNTER_TOP_Y + 12;
const MATCHA_TIN_COUNTER_X = 466;
const MATCHA_TIN_COUNTER_CY = STAGE_METRICS.COUNTER_TOP_Y - 13;
const MATCHA_TIN_SHELF_X = BAR_STATION_COORDS.MATCHA_TIN_X;
const MATCHA_TIN_SHELF_Y = BAR_STATION_COORDS.MATCHA_TIN_Y + 1;

function drawHeldMatchaChawan(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number
): void {
  ctx.save();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.beginPath();
  ctx.moveTo(cx - 18, cy - 6);
  ctx.bezierCurveTo(cx - 18, cy + 12, cx - 9, cy + 15, cx, cy + 15);
  ctx.bezierCurveTo(cx + 9, cy + 15, cx + 18, cy + 12, cx + 18, cy - 6);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx, cy - 6, 18, 4.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#8BC478';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCounterChawanWithPowder(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  powderFillRatio: number
): void {
  const topY = bottomY - 26;
  const clampedPowder = clamp01(powderFillRatio);

  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Ceramic chawan foot ring
  roundedRectPath(ctx, cx - 10, bottomY - 5, 20, 5, 2);
  ctx.fillStyle = '#EFE6DC';
  ctx.fill();
  ctx.stroke();

  // Cream ceramic chawan belly
  ctx.beginPath();
  ctx.moveTo(cx - 21, topY);
  ctx.bezierCurveTo(cx - 21, bottomY - 5, cx - 11, bottomY - 3, cx, bottomY - 3);
  ctx.bezierCurveTo(cx + 11, bottomY - 3, cx + 21, bottomY - 5, cx + 21, topY);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // Empty cream ceramic bowl rim interior before powder falls in
  ctx.beginPath();
  ctx.ellipse(cx, topY, 21, 5.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#F7EFE6';
  ctx.fill();
  ctx.stroke();

  // Rising vibrant jade-green matcha powder mound scooped into bowl
  if (clampedPowder > 0.05) {
    const rx = 6 + clampedPowder * 11.5;
    const ry = 2.2 + clampedPowder * 3.8;
    ctx.beginPath();
    ctx.moveTo(cx - rx, topY + 1);
    ctx.quadraticCurveTo(cx, topY - ry * 2.1, cx + rx, topY + 1);
    ctx.quadraticCurveTo(cx, topY + 3.4, cx - rx, topY + 1);
    ctx.closePath();
    ctx.fillStyle = '#75B45D';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  ctx.restore();
}

function drawMatchaShelfTransferAction(
  ctx: CanvasRenderingContext2D,
  drink: ActiveDrink,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number,
  isGrabbingDown: boolean
): void {
  const startProg = isGrabbingDown ? MATCHA_MILK_PREP_END_PROGRESS : MATCHA_SCOOP_END_PROGRESS;
  const endProg = isGrabbingDown ? MATCHA_GRAB_END_PROGRESS : MATCHA_SHELF_END_PROGRESS;
  const rawT = clamp01((drink.progress - startProg) / Math.max(0.5, endProg - startProg));

  // Keep chawan resting visibly on counter while tin is picked from shelf / returned to shelf
  drawCounterChawanWithPowder(
    ctx,
    MATCHA_CHAWAN_COUNTER_X,
    MATCHA_CHAWAN_COUNTER_BOTTOM_Y,
    isGrabbingDown ? 0 : 1
  );

  let tinCx: number;
  let tinCy: number;

  if (isGrabbingDown) {
    const reachPhase = 0.25;
    if (rawT < reachPhase) {
      tinCx = MATCHA_TIN_SHELF_X;
      tinCy = MATCHA_TIN_SHELF_Y;
    } else {
      const carryT = clamp01((rawT - reachPhase) / (1 - reachPhase));
      const easeT = carryT * carryT * (3 - 2 * carryT);
      tinCx = MATCHA_TIN_SHELF_X + (MATCHA_TIN_COUNTER_X - MATCHA_TIN_SHELF_X) * easeT;
      tinCy =
        MATCHA_TIN_SHELF_Y +
        (MATCHA_TIN_COUNTER_CY - MATCHA_TIN_SHELF_Y) * easeT -
        Math.sin(easeT * Math.PI) * 18;
    }
  } else {
    const liftEnd = 0.78;
    if (rawT > liftEnd) {
      tinCx = MATCHA_TIN_SHELF_X;
      tinCy = MATCHA_TIN_SHELF_Y;
    } else {
      const carryT = clamp01(rawT / liftEnd);
      const easeT = carryT * carryT * (3 - 2 * carryT);
      tinCx = MATCHA_TIN_COUNTER_X + (MATCHA_TIN_SHELF_X - MATCHA_TIN_COUNTER_X) * easeT;
      tinCy =
        MATCHA_TIN_COUNTER_CY +
        (MATCHA_TIN_SHELF_Y - MATCHA_TIN_COUNTER_CY) * easeT -
        Math.sin(easeT * Math.PI) * 20;
    }
  }

  // Left hand steadies chawan (or waits naturally near counter center)
  const leftHandX = MATCHA_CHAWAN_COUNTER_X - 20;
  const leftHandY = MATCHA_CHAWAN_COUNTER_BOTTOM_Y - 12;
  const armEnd46 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHandX, leftHandY, -1);
  drawHandCircle(ctx, armEnd46.x, armEnd46.y);

  // Right arm reaches up & carries sage-green MATCHA canister smoothly
  const gripX = tinCx + 15;
  const gripY = tinCy - 2;
  const tinHand = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, gripX, gripY, 1);
  drawMatchaCanister(ctx, tinCx, tinCy, false);
  drawHandCircle(ctx, tinHand.x, tinHand.y);
}

function drawMatchaScoopSpoon(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  hasPowderOnSpoon: boolean,
  tiltRad: number
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tiltRad);
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Warm bamboo chashaku scoop handle & curved bowl tip
  roundedRectPath(ctx, -20, -2.5, 23, 5, 2.2);
  ctx.fillStyle = '#E5B887';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-22, 0.5, 5.8, 3.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#D49E6A';
  ctx.fill();
  ctx.stroke();

  if (hasPowderOnSpoon) {
    ctx.beginPath();
    ctx.ellipse(-22, -1.6, 4.4, 2.8, 0, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = '#75B45D';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

function drawMatchaPowderDust(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  elapsedSec: number
): void {
  ctx.save();
  // Soft emerald dust cloud puff right at sprinkle point
  const cloudPulse = 0.65 + Math.sin(elapsedSec * 14) * 0.25;
  ctx.fillStyle = `rgba(139, 196, 120, ${(0.42 * cloudPulse).toFixed(2)})`;
  ctx.beginPath();
  ctx.ellipse(targetX, targetY - 6, 11, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Falling fine jade-green matcha powder particles into ceramic chawan
  for (let i = 0; i < 6; i += 1) {
    const p = (elapsedSec * 4.2 + i * 0.16) % 1;
    const px = originX + (targetX - originX) * p + Math.sin(elapsedSec * 11 + i * 1.3) * 3.5;
    const py = originY + (targetY - originY) * p;
    ctx.fillStyle = i % 2 === 0 ? '#5F9A49' : '#8BC478';
    ctx.beginPath();
    ctx.arc(px, py, i % 3 === 0 ? 2.2 : 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawMatchaPowderScoopAction(
  ctx: CanvasRenderingContext2D,
  drink: ActiveDrink,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number,
  elapsedSec: number
): void {
  const scoopProg = clamp01(
    (drink.progress - MATCHA_GRAB_END_PROGRESS) /
      (MATCHA_SCOOP_END_PROGRESS - MATCHA_GRAB_END_PROGRESS)
  );

  // 1. Chawan on left with rising emerald matcha powder mound
  drawCounterChawanWithPowder(
    ctx,
    MATCHA_CHAWAN_COUNTER_X,
    MATCHA_CHAWAN_COUNTER_BOTTOM_Y,
    scoopProg
  );

  // 2. Open sage-green MATCHA canister on counter + bamboo lid resting cleanly in front-right (zero overlap with Cup Stack x=486+)
  drawMatchaCanister(ctx, MATCHA_TIN_COUNTER_X, MATCHA_TIN_COUNTER_CY, true);
  ctx.save();
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  roundedRectPath(ctx, MATCHA_TIN_COUNTER_X - 11, MATCHA_CHAWAN_COUNTER_BOTTOM_Y + 5, 22, 7, 3);
  ctx.fillStyle = '#E5B887';
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, MATCHA_TIN_COUNTER_X - 4, MATCHA_CHAWAN_COUNTER_BOTTOM_Y + 2, 8, 3.8, 1.8);
  ctx.fillStyle = '#D49E6A';
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Left hand holds ceramic chawan steady
  const leftHandX = MATCHA_CHAWAN_COUNTER_X - 21;
  const leftHandY = MATCHA_CHAWAN_COUNTER_BOTTOM_Y - 12;
  const armEnd47 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHandX, leftHandY, -1);
  drawHandCircle(ctx, armEnd47.x, armEnd47.y);

  // 3. Smooth looping 2-scoop bamboo chashaku arc from open canister -> directly centered above chawan mouth -> sprinkle!
  const cycle = (scoopProg * 2) % 1;
  const tinScoopX = MATCHA_TIN_COUNTER_X + 18;
  const tinScoopY = MATCHA_TIN_COUNTER_CY - 22;
  const chawanMouthY = MATCHA_CHAWAN_COUNTER_BOTTOM_Y - 26;
  const bowlPourX = MATCHA_CHAWAN_COUNTER_X + 20;
  const bowlPourY = chawanMouthY - 22;

  let handX = tinScoopX;
  let handY = tinScoopY;
  let spoonTilt = 0.25;
  let hasPowderOnSpoon = false;
  let isSprinkling = false;

  if (cycle < 0.32) {
    // Dip spoon into green matcha canister mouth
    const dipT = cycle / 0.32;
    handX = tinScoopX + 2;
    handY = tinScoopY + Math.sin(dipT * Math.PI) * 10;
    spoonTilt = 0.42;
    hasPowderOnSpoon = dipT > 0.5;
  } else if (cycle < 0.66) {
    // Lift brimming matcha heap in arc directly above ceramic chawan mouth
    const moveT = (cycle - 0.32) / 0.34;
    const easeT = moveT * moveT * (3 - 2 * moveT);
    handX = tinScoopX + (bowlPourX - tinScoopX) * easeT;
    handY = tinScoopY + (bowlPourY - tinScoopY) * easeT - Math.sin(easeT * Math.PI) * 20;
    spoonTilt = 0.2 - easeT * 0.55;
    hasPowderOnSpoon = true;
  } else {
    // Gentle tap & tilt with spoon tip locked straight above chawan mouth center
    const tapT = (cycle - 0.66) / 0.34;
    handX = bowlPourX + Math.sin(tapT * Math.PI * 4) * 2.2;
    handY = bowlPourY + Math.abs(Math.sin(tapT * Math.PI * 2)) * 3.5;
    spoonTilt = -0.58;
    hasPowderOnSpoon = tapT < 0.45;
    isSprinkling = true;
  }

  if (isSprinkling) {
    const spoonTip = transformRotatedAnchor(handX, handY, spoonTilt, -22, 0.5);
    drawMatchaPowderDust(
      ctx,
      spoonTip.x,
      spoonTip.y,
      MATCHA_CHAWAN_COUNTER_X,
      chawanMouthY,
      elapsedSec
    );
  }

  const spoonHand = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, handX, handY, 1);
  drawMatchaScoopSpoon(ctx, spoonHand.x, spoonHand.y, hasPowderOnSpoon, spoonTilt);
  drawHandCircle(ctx, spoonHand.x, spoonHand.y);
}

function drawStep2PrepAction(
  ctx: CanvasRenderingContext2D,
  drink: ActiveDrink,
  leftShoulderX: number,
  leftShoulderY: number,
  rightShoulderX: number,
  rightShoulderY: number,
  isFastBoost: boolean,
  freq: number,
  elapsedSec: number
): void {
  if (drink.recipeId === 'thai_tea' || drink.recipeId === 'peach_tea') {
    const leftHandX = 112;
    const leftHandY = STAGE_METRICS.COUNTER_TOP_Y - 46;
    const armEnd48 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHandX, leftHandY, -1);
    drawHandCircle(ctx, armEnd48.x, armEnd48.y);

    const btnX = 136;
    const btnY = STAGE_METRICS.COUNTER_TOP_Y - 26 + Math.sin(elapsedSec * 6) * 2;
    const armEnd49 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, btnX, btnY, 1);
    drawHandCircle(ctx, armEnd49.x, armEnd49.y);
    return;
  }

  if (drink.recipeId === 'blue_citrus') {
    const juicerX = 276;
    const juicerBaseY = STAGE_METRICS.COUNTER_TOP_Y + 12;
    const pressBob = Math.abs(Math.sin(elapsedSec * freq)) * 4;
    const pressX = juicerX + 3;
    const pressY = juicerBaseY - 45 + pressBob;

    // Pressing hand behind orange rind so vivid orange slice segments stay 100% visible
    const armEnd50 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, pressX, pressY, 1);
    drawHandCircle(ctx, armEnd50.x, armEnd50.y);

    drawCitrusJuicerOnCounter(ctx, juicerX, juicerBaseY, elapsedSec);

    const armEnd51 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, juicerX - 20, juicerBaseY - 12, -1);
    drawHandCircle(ctx, armEnd51.x, armEnd51.y);
    return;
  }

  // Matcha P2: Froth smoothly inside ceramic chawan bowl using bamboo Chasen whisk on dedicated open prep pad!
  if (drink.recipeId === 'matcha') {
    const bowlX = MATCHA_CHAWAN_COUNTER_X;
    const bowlBottomY = MATCHA_CHAWAN_COUNTER_BOTTOM_Y;

    const armEnd52 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, bowlX - 22, bowlBottomY - 12, -1);
    drawHandCircle(ctx, armEnd52.x, armEnd52.y);

    const grip = drawMatchaChawanWithFrother(ctx, bowlX, bowlBottomY, elapsedSec, isFastBoost);
    const armEnd53 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, grip.x, grip.y, 1);
    drawHandCircle(ctx, armEnd53.x, armEnd53.y);
    return;
  }

  // Cafe & Soda P2: Whip silky foam in brushed stainless pitcher on open prep pad!
  const pitcherX = BAR_STATION_COORDS.PREP_PAD_X;
  const pitcherBottomY = STAGE_METRICS.COUNTER_TOP_Y + 12;
  const liquidColor = PREP_LIQUID_COLOR_MAP[drink.recipeId] ?? '#5A321C';
  const foamColor = PREP_FOAM_COLOR_MAP[drink.recipeId] ?? '#FFF6E8';

  const armEnd54 = drawCartoonArm(ctx, leftShoulderX, leftShoulderY, pitcherX - 18, pitcherBottomY - 14, -1);
  drawHandCircle(ctx, armEnd54.x, armEnd54.y);

  const grip = drawStainlessPitcherWithFrother(
    ctx,
    pitcherX,
    pitcherBottomY,
    liquidColor,
    foamColor,
    elapsedSec,
    isFastBoost
  );
  const armEnd55 = drawCartoonArm(ctx, rightShoulderX, rightShoulderY, grip.x, grip.y, 1);
  drawHandCircle(ctx, armEnd55.x, armEnd55.y);
}

function drawBobaLadleScoopAction(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  isTippingOverCup: boolean,
  elapsedSec: number
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(isTippingOverCup ? -0.78 : -0.32);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Ladle handle & round boba spoon bowl
  roundedRectPath(ctx, -18, -3, 18, 5, 2.2);
  ctx.fillStyle = '#D99B66';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-18, 0, 7, 0, Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = '#E4E9EE';
  ctx.fill();
  ctx.stroke();

  // Dark glossy boba pearls perched on ladle
  ctx.fillStyle = '#4A2E23';
  ctx.beginPath();
  ctx.arc(-20, -2, 2.8, 0, Math.PI * 2);
  ctx.arc(-15, -2.5, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Falling glossy black boba pearls visibly dropping from ladle straight into open cup mouth!
  if (isTippingOverCup) {
    ctx.save();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.fillStyle = '#4A2E23';
    for (let i = 0; i < 3; i += 1) {
      const dropT = (elapsedSec * 4.6 + i * 0.33) % 1;
      const dropX = CUP1_CX + (i - 1) * 5;
      const dropY = hy + 6 + dropT * (CUP_TOP_Y + 8 - (hy + 6));
      ctx.beginPath();
      ctx.arc(dropX, dropY, 3.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHandCircle(ctx, hx, hy);
}

function drawIceScoopAndCubes(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  side: -1 | 1,
  hasIce: boolean,
  isTippingOverCup = false,
  elapsedSec = 0
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(side * (isTippingOverCup ? -0.78 : -0.35));
  roundedRectPath(ctx, -side * 16, -6, 18, 12, 4);
  ctx.fillStyle = '#D9F1F7';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  if (hasIce) {
    roundedRectPath(ctx, -side * 11, -10, 8, 8, 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  // Falling ice cubes visibly dropping right from scoop lip into the open cup mouth (CUP_TOP_Y = 590)!
  if (hasIce && isTippingOverCup) {
    ctx.save();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    for (let i = 0; i < 2; i += 1) {
      const dropT = (elapsedSec * 4.2 + i * 0.5) % 1;
      const dropX = CUP1_CX + (i === 0 ? -4 : 5);
      const dropY = hy + 6 + dropT * (CUP_TOP_Y + 6 - (hy + 6));
      roundedRectPath(ctx, dropX - 3.8, dropY - 3.8, 7.6, 7.6, 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  drawHandCircle(ctx, hx, hy);
}

function drawCitrusJuicerOnCounter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  elapsedSec: number
): void {
  const pitcherCx = cx + 30;
  const spoutStartX = cx + 18;
  const spoutStartY = cy - 16;
  const fillH = 8 + Math.abs(Math.sin(elapsedSec * 1.6)) * 8;
  const pitcherSurfaceY = cy - 2 - fillH;

  ctx.save();
  roundedRectPath(ctx, cx - 18, cy - 28, 36, 28, 8);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 10, cy - 28);
  ctx.lineTo(cx, cy - 40);
  ctx.lineTo(cx + 10, cy - 28);
  ctx.closePath();
  ctx.fillStyle = '#E4E7EB';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Prominent fresh halved orange slice with crisp segments & #3B2820 2.5px outline
  const squeeze = Math.abs(Math.sin(elapsedSec * 5.2)) * 4;
  const orangeY = cy - 29 + squeeze;

  ctx.beginPath();
  ctx.arc(cx, orangeY, 16, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = '#FF7A1A';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, orangeY, 13, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = '#FFF8EE';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, orangeY, 11.4, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = '#FFA633';
  ctx.fill();

  ctx.strokeStyle = '#FFF8EE';
  ctx.lineWidth = 1.4;
  for (let a = Math.PI * 0.18; a < Math.PI * 0.9; a += Math.PI * 0.21) {
    ctx.beginPath();
    ctx.moveTo(cx, orangeY);
    ctx.lineTo(cx + Math.cos(Math.PI - a) * 11, orangeY - Math.sin(Math.PI - a) * 11);
    ctx.stroke();
  }

  for (let d = 0; d < 3; d += 1) {
    const dPhase = (elapsedSec * 4.5 + d * 0.33) % 1;
    const dx = (d === 0 ? -1 : d === 1 ? 1 : 0) * (6 + dPhase * 8);
    const dy = cy - 30 + dPhase * 10 - Math.sin(dPhase * Math.PI) * 5;
    ctx.beginPath();
    ctx.arc(cx + dx, dy, 1.9, 0, Math.PI * 2);
    ctx.fillStyle = '#FF9526';
    ctx.fill();
  }

  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(spoutStartX, spoutStartY);
  ctx.lineTo(spoutStartX + 5, spoutStartY + 1);
  ctx.stroke();

  drawGraduatedMeasuringCup(ctx, pitcherCx, cy, '#FF9526', fillH / 22);

  ctx.strokeStyle = '#FF9526';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(spoutStartX + 5, spoutStartY + 1);
  ctx.quadraticCurveTo(pitcherCx, spoutStartY + 2, pitcherCx, pitcherSurfaceY + 1);
  ctx.stroke();
  ctx.restore();
}

function drawBaristaCreamerJugAction(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  cupCx: number,
  side: -1 | 1,
  elapsedSec: number,
  creamColor = '#FFF6E8'
): void {
  const pourDir = -side;
  const tilt = pourDir * 0.72;
  const spout = transformRotatedAnchor(hx, hy, tilt, pourDir * 14, -8);
  const surfaceY = CUP_TOP_Y + 9;
  const ribbonEndX = cupCx + Math.sin(elapsedSec * 5.2) * 10;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(spout.x, spout.y);
  ctx.quadraticCurveTo(
    spout.x + (ribbonEndX - spout.x) * 0.55,
    spout.y + 10,
    ribbonEndX,
    surfaceY
  );
  ctx.lineWidth = 6.8;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 4.6;
  ctx.strokeStyle = creamColor;
  ctx.stroke();

  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(ribbonEndX, surfaceY, 7.5, 3.0, 0, 0, Math.PI * 2);
  ctx.fillStyle = creamColor;
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);

  ctx.beginPath();
  ctx.arc(-pourDir * 10, -2, 6, -Math.PI * 0.45, Math.PI * 0.45, false);
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  roundedRectPath(ctx, -10, -12, 20, 24, 5);
  ctx.fillStyle = '#F2F4F8';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillRect(-2, -9, 3, 18);

  roundedRectPath(ctx, -6, -8, 12, 6, 2);
  ctx.fillStyle = creamColor;
  ctx.fill();
  ctx.restore();

  drawHandCircle(ctx, hx, hy);
}

function drawPlaceFruitGarnishAction(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  side: -1 | 1,
  fruitType: 'leaf' | 'peach' | 'bean' | 'berry' | 'lime' | 'orange' = 'orange'
): void {
  const rindColorMap: Record<string, string> = {
    orange: '#FF7A1A',
    peach: '#F26D30',
    lime: '#7FB86B',
  };
  const fleshColorMap: Record<string, string> = {
    orange: '#FFA633',
    peach: '#FFC27A',
    lime: '#A7D397',
  };
  const rindColor = rindColorMap[fruitType] ?? '#FF7A1A';
  const fleshColor = fleshColorMap[fruitType] ?? '#FFA633';

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-side * 0.22);

  ctx.beginPath();
  ctx.arc(0, 0, 14, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = rindColor;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  if (fruitType !== 'peach') {
    ctx.beginPath();
    ctx.arc(0, 0, 11.2, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = '#FFF8EE';
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(0, 0, fruitType === 'peach' ? 10.6 : 9.6, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = fleshColor;
  ctx.fill();

  if (fruitType !== 'peach') {
    ctx.strokeStyle = '#FFF8EE';
    ctx.lineWidth = 1.4;
    for (let a = Math.PI * 0.2; a < Math.PI * 0.9; a += Math.PI * 0.22) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(Math.PI - a) * 9.5, -Math.sin(Math.PI - a) * 9.5);
      ctx.stroke();
    }
  }

  ctx.beginPath();
  ctx.ellipse(8.5, -13, 4.6, 2.5, 0.6, 0, Math.PI * 2);
  ctx.fillStyle = '#7FB86B';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  ctx.restore();

  drawHandCircle(ctx, hx, hy);
}

function drawSynchronizedTikTokDanceArms(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  torsoY: number,
  dance: DanceMotion
): void {
  const isPartyHype = dance.style === 'party_hype';
  const shoulderSpan = 36 * (isPartyHype ? dance.turnScaleX : 1);
  const shoulderShiftX = isPartyHype && dance.isBackFacing ? dance.hipShakeX * 0.28 : 0;
  const shoulderAnchorX = cx + shoulderShiftX;
  const leftShoulderX = shoulderAnchorX - shoulderSpan;
  const leftShoulderY = torsoY + 22;
  const rightShoulderX = shoulderAnchorX + shoulderSpan;
  const rightShoulderY = torsoY + 22;

  if (dance.style === 'heart_sway' && dance.heartArchCubic?.enabled) {
    const c = dance.heartArchCubic;
    drawCubicBezierArm(
      ctx,
      leftShoulderX,
      leftShoulderY,
      c.cp1Lx,
      c.cp1Ly,
      c.cp2Lx,
      c.cp2Ly,
      c.endLx,
      c.endLy
    );
    drawCubicBezierArm(
      ctx,
      rightShoulderX,
      rightShoulderY,
      c.cp1Rx,
      c.cp1Ry,
      c.cp2Rx,
      c.cp2Ry,
      c.endRx,
      c.endRy
    );

    if (dance.showCenterHeart) {
      if (dance.isHeartAtChest) {
        drawFloatingHeart(ctx, cx, torsoY + 4, 11 * dance.heartPulseScale);
      } else {
        drawFloatingHeart(ctx, cx, headY - 32, 13 * dance.heartPulseScale);
      }
    }
    return;
  }

  drawArticulatedDanceArm(
    ctx,
    leftShoulderX,
    leftShoulderY,
    dance.leftHandX,
    dance.leftHandY,
    dance.leftElbowBiasX,
    dance.leftElbowBiasY
  );
  drawHandCircle(ctx, dance.leftHandX, dance.leftHandY);

  drawArticulatedDanceArm(
    ctx,
    rightShoulderX,
    rightShoulderY,
    dance.rightHandX,
    dance.rightHandY,
    dance.rightElbowBiasX,
    dance.rightElbowBiasY
  );
  drawHandCircle(ctx, dance.rightHandX, dance.rightHandY);
}

function drawCubicBezierArm(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  cp1x: number,
  cp1y: number,
  cp2x: number,
  cp2y: number,
  hx: number,
  hy: number
): void {
  // 1. Full arm outline & skin forearm fill
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, hx, hy);
  ctx.lineWidth = 15.0;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 10.4;
  ctx.strokeStyle = BARISTA_SKIN;
  ctx.stroke();

  // 2. White raglan sleeve using exact De Casteljau subdivision at sleeveT = 0.46
  const sleeveT = 0.46;
  const p01_x = sx + (cp1x - sx) * sleeveT;
  const p01_y = sy + (cp1y - sy) * sleeveT;
  const p12_x = cp1x + (cp2x - cp1x) * sleeveT;
  const p12_y = cp1y + (cp2y - cp1y) * sleeveT;
  const p23_x = cp2x + (hx - cp2x) * sleeveT;
  const p23_y = cp2y + (hy - cp2y) * sleeveT;

  const p012_x = p01_x + (p12_x - p01_x) * sleeveT;
  const p012_y = p01_y + (p12_y - p01_y) * sleeveT;
  const p123_x = p12_x + (p23_x - p12_x) * sleeveT;
  const p123_y = p12_y + (p23_y - p12_y) * sleeveT;

  const sleeveEndX = p012_x + (p123_x - p012_x) * sleeveT;
  const sleeveEndY = p012_y + (p123_y - p012_y) * sleeveT;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.bezierCurveTo(p01_x, p01_y, p012_x, p012_y, sleeveEndX, sleeveEndY);
  ctx.lineWidth = 15.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 11.0;
  ctx.strokeStyle = '#FFFDF9';
  ctx.stroke();

  // 3. Hand circle at the end
  ctx.beginPath();
  ctx.arc(hx, hy, 7.2, 0, Math.PI * 2);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
}

function drawArticulatedDanceArm(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  elbowBiasX: number,
  elbowBiasY: number
): void {
  const clampedBiasX = Math.max(-MAX_ELBOW_BEND_PX, Math.min(MAX_ELBOW_BEND_PX, elbowBiasX));
  const clampedBiasY = Math.max(-MAX_ELBOW_BEND_PX, Math.min(MAX_ELBOW_BEND_PX, elbowBiasY));
  const elbowX = (sx + hx) * 0.5 + clampedBiasX;
  const elbowY = Math.min(DANCE_COUNTER_CLEAR_Y, (sy + hy) * 0.5 + clampedBiasY);

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(elbowX, elbowY, hx, hy);
  ctx.lineWidth = 15.0;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 10.4;
  ctx.strokeStyle = BARISTA_SKIN;
  ctx.stroke();

  const sleeveT = 0.52;
  const q0x = sx + (elbowX - sx) * sleeveT;
  const q0y = sy + (elbowY - sy) * sleeveT;
  const q1x = elbowX + (hx - elbowX) * sleeveT;
  const q1y = elbowY + (hy - elbowY) * sleeveT;
  const sleeveEndX = q0x + (q1x - q0x) * sleeveT;
  const sleeveEndY = q0y + (q1y - q0y) * sleeveT;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(q0x, q0y, sleeveEndX, sleeveEndY);
  ctx.lineWidth = 15.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 11.0;
  ctx.strokeStyle = '#FFFDF9';
  ctx.stroke();
}

function drawTikTokDanceMusicNotesAndSparkles(
  ctx: CanvasRenderingContext2D,
  dance: DanceMotion,
  tier: GiftTier,
  elapsedSec: number
): void {
  const floatA = Math.sin(elapsedSec * 5.2) * 8;
  const floatB = Math.cos(elapsedSec * 4.6) * 8;

  ctx.save();
  ctx.globalAlpha = dance.blend;

  if (dance.style === 'heart_sway') {
    const cx = BARISTA_CENTER_X + dance.swayX * 0.4;
    const cy = dance.bounceY * 0.4;
    drawFloatingHeart(ctx, cx - 64, 412 + floatA + cy, 9);
    drawFloatingHeart(ctx, cx + 64, 404 - floatB + cy, 9);
    drawFloatingHeart(ctx, cx - 44, 386 - floatB + cy, 7);
    drawFloatingHeart(ctx, cx + 44, 388 + floatA + cy, 7);
    drawFloatingHeart(ctx, cx - 22, 360 + floatA * 0.5 + cy, 8.5);
    drawFloatingHeart(ctx, cx + 22, 362 - floatB * 0.5 + cy, 8.5);
    drawDanceSparkleStar(ctx, cx, 376, 6 + Math.sin(elapsedSec * 7) * 1.6, '#F7C95B');
    drawDanceSparkleStar(ctx, cx - 52, 370 + floatB, 5.5, '#F0788C');
    drawDanceSparkleStar(ctx, cx + 52, 372 - floatA, 5.5, '#F7C95B');
    ctx.restore();
    return;
  }

  ctx.font = '900 22px "Fredoka", "Nunito", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  const cx = BARISTA_CENTER_X;
  for (let i = 0; i < 4; i += 1) {
    const nx = cx + DANCE_NOTE_X_OFFSETS[i] + dance.swayX * 0.35;
    let baseNoteY = 412 - floatA;
    if (i === 0) {
      baseNoteY = 414 + floatA;
    } else if (i === 1) {
      baseNoteY = 392 - floatB;
    } else if (i === 2) {
      baseNoteY = 394 + floatB;
    }
    const ny = baseNoteY + dance.bounceY * 0.35;
    ctx.strokeText(DANCE_NOTE_SYMBOLS[i], nx, ny);
    ctx.fillStyle = DANCE_NOTE_COLORS[i];
    ctx.fillText(DANCE_NOTE_SYMBOLS[i], nx, ny);
  }

  if (tier === 'LARGE' || dance.style === 'party_hype') {
    drawDanceSparkleStar(ctx, cx - 78, 382 + floatB, 6.5, '#F7C95B');
    drawDanceSparkleStar(ctx, cx + 78, 384 - floatA, 6.5, '#F0788C');
  }
  ctx.restore();
}

function drawFloatingHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, size * 0.35);
  ctx.bezierCurveTo(-size, -size * 0.3, -size * 0.9, -size * 1.1, 0, -size * 0.45);
  ctx.bezierCurveTo(size * 0.9, -size * 1.1, size, -size * 0.3, 0, size * 0.35);
  ctx.closePath();
  ctx.fillStyle = '#F0788C';
  ctx.fill();
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  ctx.restore();
}

function drawDanceSparkleStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.2, -r * 0.2, r, 0);
  ctx.quadraticCurveTo(r * 0.2, r * 0.2, 0, r);
  ctx.quadraticCurveTo(-r * 0.2, r * 0.2, -r, 0);
  ctx.quadraticCurveTo(-r * 0.2, -r * 0.2, 0, -r);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  ctx.restore();
}

/**
 * Clean anatomically-aligned quadratic Bezier arm with exact De Casteljau sleeve subdivision
 * so the white shirt sleeve lies 100.00% on the arm curve with ZERO stray strokes or floating lines.
 */
function drawCartoonArm(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  side: -1 | 1,
  maxReach = MAX_CHIBI_ARM_REACH
): { x: number; y: number } {
  let dx = tx - sx;
  let dy = ty - sy;
  const dist = Math.hypot(dx, dy);
  let hx = tx;
  let hy = ty;
  if (dist > maxReach && dist > 0.001) {
    const scale = maxReach / dist;
    hx = sx + dx * scale;
    hy = sy + dy * scale;
  }
  const elbowX = (sx + hx) * 0.5 + side * 10;
  const elbowY = (sy + hy) * 0.5 + 10;

  // 1. Full arm outline + skin forearm fill
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(elbowX, elbowY, hx, hy);
  ctx.lineWidth = 15.0;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 10.4;
  ctx.strokeStyle = BARISTA_SKIN;
  ctx.stroke();

  // 2. Exact De Casteljau sub-curve [0 .. sleeveT] for white raglan shirt sleeve (proportional across reaches, 0.00px deviation!)
  const sleeveT = Math.min(0.56, Math.max(0.28, 36 / Math.max(1, dist)));
  const q0x = sx + (elbowX - sx) * sleeveT;
  const q0y = sy + (elbowY - sy) * sleeveT;
  const q1x = elbowX + (hx - elbowX) * sleeveT;
  const q1y = elbowY + (hy - elbowY) * sleeveT;
  const sleeveEndX = q0x + (q1x - q0x) * sleeveT;
  const sleeveEndY = q0y + (q1y - q0y) * sleeveT;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(q0x, q0y, sleeveEndX, sleeveEndY);
  ctx.lineWidth = 15.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 11.0;
  ctx.strokeStyle = '#FFFDF9';
  ctx.stroke();

  return { x: hx, y: hy };
}

function drawHandCircle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 7.2, 0, Math.PI * 2);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
}

function drawCelebrationSpeechBanner(
  ctx: CanvasRenderingContext2D,
  text: string,
  tier: GiftTier
): void {
  ctx.save();
  ctx.font = '800 13px "Fredoka", "Nunito", sans-serif';
  const textW = ctx.measureText(text).width;
  const w = Math.min(260, Math.max(132, textW + 30));
  const h = 30;
  const x = STAGE_WORK_CENTER_X - w * 0.5;
  const y = 172;

  roundedRectPath(ctx, x, y + 3, w, h, 14);
  ctx.fillStyle = 'rgba(59, 40, 32, 0.16)';
  ctx.fill();

  roundedRectPath(ctx, x, y, w, h, 14);
  ctx.fillStyle = tier === 'LARGE' ? '#FFF1C2' : '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.fillStyle = DRINK_BAR_PALETTE.TEXT_PRIMARY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, STAGE_WORK_CENTER_X, y + h * 0.5 + 0.5);
  ctx.restore();
}
