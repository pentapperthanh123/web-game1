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
import { computeShowcaseSlideFactor } from './drawDrinkCup';

export const BARISTA_CENTER_X = 360;
const BARISTA_HEAD_Y = 478;
const BARISTA_TORSO_Y = 508;
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

const IDLE_PHASE_TIMINGS = {
  STROLL_END_SEC: 7.0,
  LOOK_END_SEC: 12.0,
  YAWN_END_SEC: 15.6,
  CYCLE_DURATION_SEC: 26.0,
} as const;

type IdleBaristaPhase = 'STROLL' | 'LOOK_AROUND' | 'YAWN' | 'DOZE';

function resolveIdleBaristaPhase(idleElapsedSec: number): {
  phase: IdleBaristaPhase;
  phaseElapsed: number;
  phaseDuration: number;
} {
  const t = ((idleElapsedSec % IDLE_PHASE_TIMINGS.CYCLE_DURATION_SEC) + IDLE_PHASE_TIMINGS.CYCLE_DURATION_SEC) % IDLE_PHASE_TIMINGS.CYCLE_DURATION_SEC;
  if (t < IDLE_PHASE_TIMINGS.STROLL_END_SEC) {
    return { phase: 'STROLL', phaseElapsed: t, phaseDuration: IDLE_PHASE_TIMINGS.STROLL_END_SEC };
  }
  if (t < IDLE_PHASE_TIMINGS.LOOK_END_SEC) {
    return {
      phase: 'LOOK_AROUND',
      phaseElapsed: t - IDLE_PHASE_TIMINGS.STROLL_END_SEC,
      phaseDuration: IDLE_PHASE_TIMINGS.LOOK_END_SEC - IDLE_PHASE_TIMINGS.STROLL_END_SEC,
    };
  }
  if (t < IDLE_PHASE_TIMINGS.YAWN_END_SEC) {
    return {
      phase: 'YAWN',
      phaseElapsed: t - IDLE_PHASE_TIMINGS.LOOK_END_SEC,
      phaseDuration: IDLE_PHASE_TIMINGS.YAWN_END_SEC - IDLE_PHASE_TIMINGS.LOOK_END_SEC,
    };
  }
  return {
    phase: 'DOZE',
    phaseElapsed: t - IDLE_PHASE_TIMINGS.YAWN_END_SEC,
    phaseDuration: IDLE_PHASE_TIMINGS.CYCLE_DURATION_SEC - IDLE_PHASE_TIMINGS.YAWN_END_SEC,
  };
}

function computeDozeBlend(idle: { phase: IdleBaristaPhase; phaseElapsed: number; phaseDuration: number } | null): number {
  if (!idle || idle.phase !== 'DOZE') return 0;
  const enterSec = 1.1;
  const exitSec = 0.9;
  const inT = clamp01(idle.phaseElapsed / enterSec);
  const outT = clamp01((idle.phaseDuration - idle.phaseElapsed) / exitSec);
  const smoothIn = inT * inT * (3 - 2 * inT);
  const smoothOut = outT * outT * (3 - 2 * outT);
  return Math.min(smoothIn, smoothOut);
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
    if (isWaving || (drink && drink.phase === 'SHOWCASE') || idleElapsedSec < 0.8) {
      return BARISTA_CENTER_X;
    }
    const idle = resolveIdleBaristaPhase(idleElapsedSec);
    if (idle.phase === 'STROLL') {
      const progress = idle.phaseElapsed / idle.phaseDuration;
      if (progress < 0.34) return 286;
      if (progress < 0.72) return 434;
      return BARISTA_CENTER_X;
    }
    if (idle.phase === 'LOOK_AROUND') {
      const progress = idle.phaseElapsed / idle.phaseDuration;
      if (progress < 0.36) return 382;
      if (progress < 0.72) return 338;
      return BARISTA_CENTER_X;
    }
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

const MAX_DANCE_ARM_REACH = 74;
const MIN_DANCE_ARM_REACH = 20;
const MAX_ELBOW_BEND_PX = 22;
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
};

const clampedWristScratch = { x: 0, y: 0 };

function clampDanceWristTarget(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  out: { x: number; y: number }
): void {
  let dx = tx - sx;
  let dy = ty - sy;
  const dist = Math.hypot(dx, dy);
  if (dist > MAX_DANCE_ARM_REACH && dist > 0.001) {
    const scale = MAX_DANCE_ARM_REACH / dist;
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
    // Smooth continuous chest-cupping -> open "bắn tim" release inside every bar
    const heartOpen = 0.5 - 0.5 * Math.cos(beatPhase * 0.5);
    const popLift = Math.abs(beatSin) * 5;

    const cupLx = cx - 15;
    const cupLy = torsoY + 6 + popLift * 0.6;
    const cupRx = cx + 15;
    const cupRy = torsoY + 6 + popLift * 0.6;

    const openLx = cx - 46 + beatSin * 4;
    const openLy = headY - 8 + beatCos * 5;
    const openRx = cx + 46 + beatSin * 4;
    const openRy = headY - 8 - beatCos * 5;

    reusableTargetMotion.leftHandX = cupLx + (openLx - cupLx) * heartOpen;
    reusableTargetMotion.leftHandY = cupLy + (openLy - cupLy) * heartOpen;
    reusableTargetMotion.rightHandX = cupRx + (openRx - cupRx) * heartOpen;
    reusableTargetMotion.rightHandY = cupRy + (openRy - cupRy) * heartOpen;
    reusableTargetMotion.leftElbowBiasX = -10 - heartOpen * 6;
    reusableTargetMotion.leftElbowBiasY = 12 + (1 - heartOpen) * 6;
    reusableTargetMotion.rightElbowBiasX = 10 + heartOpen * 6;
    reusableTargetMotion.rightElbowBiasY = 12 + (1 - heartOpen) * 6;

    reusableDanceMotion.showCenterHeart = heartOpen < 0.48;
    reusableDanceMotion.heartPulseScale = 1 + Math.abs(beatSin) * 0.25;
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
  } else {
    // Style 3 (130 BPM EDM/Phonk): Crisp beat-locked pumps strictly bounded within joint limits
    reusableTargetMotion.swayX = halfBeatSin * 10.5 * amp;
    reusableTargetMotion.bounceY = -Math.pow(Math.abs(beatSin), 0.68) * 10.2 * amp;
    reusableTargetMotion.headTiltRad = beatSin * 0.1 * amp;

    const cx = BARISTA_CENTER_X + reusableTargetMotion.swayX;
    const headY = BARISTA_HEAD_Y + reusableTargetMotion.bounceY;
    const pumpMix = 0.5 - 0.5 * Math.cos(beatPhase * 0.5);
    const upPumpL = headY - 28 + Math.abs(beatCos) * 12;
    const upPumpR = headY - 28 + Math.abs(beatCos) * 12;
    const crossPumpL = headY - 8 + beatSin * 18;
    const crossPumpR = headY - 8 - beatSin * 18;

    reusableTargetMotion.leftHandX = cx - 36 - pumpMix * 8 + beatSin * 5;
    reusableTargetMotion.leftHandY = upPumpL + (crossPumpL - upPumpL) * pumpMix;
    reusableTargetMotion.rightHandX = cx + 36 + pumpMix * 8 + beatSin * 5;
    reusableTargetMotion.rightHandY = upPumpR + (crossPumpR - upPumpR) * pumpMix;
    reusableTargetMotion.leftElbowBiasX = -14;
    reusableTargetMotion.leftElbowBiasY = 13 + Math.abs(beatSin) * 5;
    reusableTargetMotion.rightElbowBiasX = 14;
    reusableTargetMotion.rightElbowBiasY = 13 + Math.abs(beatCos) * 5;

    reusableDanceMotion.showCenterHeart = false;
  }

  // Clamp wrist targets strictly within anatomical shoulder reach & counter boundary
  const targetLeftShoulderX = BARISTA_CENTER_X + reusableTargetMotion.swayX - 36;
  const targetRightShoulderX = BARISTA_CENTER_X + reusableTargetMotion.swayX + 36;
  const targetShoulderY = BARISTA_TORSO_Y + reusableTargetMotion.bounceY + 22;

  clampDanceWristTarget(
    targetLeftShoulderX,
    targetShoulderY,
    reusableTargetMotion.leftHandX,
    reusableTargetMotion.leftHandY,
    clampedWristScratch
  );
  reusableTargetMotion.leftHandX = clampedWristScratch.x;
  reusableTargetMotion.leftHandY = clampedWristScratch.y;

  clampDanceWristTarget(
    targetRightShoulderX,
    targetShoulderY,
    reusableTargetMotion.rightHandX,
    reusableTargetMotion.rightHandY,
    clampedWristScratch
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
  idleElapsedSec = 0
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const dance = computeDanceMotion(isDancing, danceStyle, danceStartedAt, elapsedSec);
  const isWorking = !isDancing && Boolean(activeDrink && activeDrink.phase === 'BREWING');
  const isCelebrating =
    isWaving ||
    Boolean(activeDrink && (activeDrink.phase === 'SHOWCASE' || activeDrink.progress >= 94));
  const rhythmFreq = isFastBoost ? 9.5 : 5.2;

  const isTrueIdle = !isDancing && !isWorking && !isCelebrating;
  const idle = isTrueIdle ? resolveIdleBaristaPhase(idleElapsedSec) : null;
  let idleBobOffset = 0;
  let idleHeadTilt = Math.sin(elapsedSec * 1.45) * 0.024;

  if (idle) {
    if (idle.phase === 'YAWN') {
      const p = clamp01(idle.phaseElapsed / idle.phaseDuration);
      const yawnPeak = p < 0.65 ? Math.sin((p / 0.65) * Math.PI) : 0;
      const settle = p > 0.65 ? clamp01((p - 0.65) / 0.35) : 0;
      idleBobOffset = -yawnPeak * 2.5 + settle * 14;
      idleHeadTilt = -0.07 * yawnPeak + settle * 0.08;
    } else if (idle.phase === 'DOZE') {
      // Lean forward and rest head cozily onto folded arms on the counter table
      const dozeBlend = computeDozeBlend(idle);
      const breathe = Math.sin(elapsedSec * 2.0) * 1.8 * dozeBlend;
      idleBobOffset = dozeBlend * 112 + breathe;
      idleHeadTilt = dozeBlend * 0.24;
    } else if (idle.phase === 'LOOK_AROUND') {
      idleHeadTilt = Math.sin(elapsedSec * 2.1) * 0.09;
    }
  }

  const walkSpeedNorm = clamp01(Math.abs(walkVelocity) / 42);
  const walkHop = -Math.abs(Math.sin(elapsedSec * 14)) * 4.5 * walkSpeedNorm;
  const bob =
    computeCharacterBob(dance, isWorking, elapsedSec, rhythmFreq) +
    (dance.isDancing ? 0 : walkHop + idleBobOffset);
  const effectiveMood: BartenderMood = dance.isDancing ? 'TIKTOK_DANCE' : mood;
  const walkTilt = Math.sign(walkVelocity) * 0.045 * walkSpeedNorm;
  const headTilt = dance.isDancing ? dance.headTiltRad : idleHeadTilt + walkTilt;

  const cx = dance.isDancing ? BARISTA_CENTER_X + dance.swayX : baristaPosX;

  if (dance.isDancing) {
    if (dance.style === 'party_hype') {
      drawPartyHypeSpotlights(ctx, dance.blend, elapsedSec);
    }
    drawDanceBackAura(ctx, cx, BARISTA_HEAD_Y + 26, danceTier, dance.style, elapsedSec);
  }

  drawCentralBaristaTorsoAndHead(
    ctx,
    effectiveMood,
    isCelebrating,
    cx,
    bob,
    headTilt,
    elapsedSec,
    idle
  );

  ctx.restore();
}

function drawPartyHypeSpotlights(
  ctx: CanvasRenderingContext2D,
  blend: number,
  elapsedSec: number
): void {
  ctx.save();
  ctx.globalAlpha = 0.28 * blend;
  const sway = Math.sin(elapsedSec * 3.5) * 24;

  const leftGrad = ctx.createLinearGradient(240, 210, 330 + sway, 660);
  leftGrad.addColorStop(0, 'rgba(255, 214, 138, 0.78)');
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
  rightGrad.addColorStop(0, 'rgba(174, 226, 244, 0.78)');
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

function drawCentralBaristaTorsoAndHead(
  ctx: CanvasRenderingContext2D,
  mood: BartenderMood,
  isCelebrating: boolean,
  cx: number,
  bob: number,
  headTiltRad: number,
  elapsedSec: number,
  idle: { phase: IdleBaristaPhase; phaseElapsed: number; phaseDuration: number } | null = null
): void {
  const dozeBlend = computeDozeBlend(idle);
  const headY = BARISTA_HEAD_Y + bob + dozeBlend * 22;
  const torsoY = BARISTA_TORSO_Y + bob;

  // Back hair silhouette framing neck & shoulders
  ctx.fillStyle = '#4B3227';
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_W;
  ctx.beginPath();
  ctx.arc(cx - 28, headY + 20, 19, 0, Math.PI * 2);
  ctx.arc(cx + 28, headY + 20, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Clean raglan white shirt torso (extends below counter top so character never floats)
  ctx.beginPath();
  ctx.moveTo(cx - 26, torsoY);
  ctx.quadraticCurveTo(cx - 46, torsoY + 6, cx - 44, torsoY + 36);
  ctx.lineTo(cx - 41, torsoY + 160);
  ctx.lineTo(cx + 41, torsoY + 160);
  ctx.lineTo(cx + 44, torsoY + 36);
  ctx.quadraticCurveTo(cx + 46, torsoY + 6, cx + 26, torsoY);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // Cute pastel strawberry-pink barista apron
  roundedRectPath(ctx, cx - 31, torsoY + 28, 62, 134, 14);
  ctx.fillStyle = '#F29BB5';
  ctx.fill();
  ctx.stroke();

  // Apron straps
  ctx.fillStyle = '#E5809E';
  roundedRectPath(ctx, cx - 23, torsoY + 2, 10, 32, 4);
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, cx + 13, torsoY + 2, 10, 32, 4);
  ctx.fill();
  ctx.stroke();

  // Coffee-leaf pin on apron chest
  ctx.beginPath();
  ctx.ellipse(cx - 18, torsoY + 43, 6, 3.8, -0.4, 0, Math.PI * 2);
  ctx.fillStyle = '#89C073';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Stitched apron front pocket
  ctx.lineWidth = OUTLINE_W;
  roundedRectPath(ctx, cx - 18, torsoY + 60, 36, 25, 8);
  ctx.fillStyle = '#E5809E';
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 253, 249, 0.72)';
  ctx.lineWidth = 1.6;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(cx - 12, torsoY + 66);
  ctx.lineTo(cx + 12, torsoY + 66);
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

  drawCharacterFace(ctx, mood, isCelebrating, elapsedSec, idle);
  ctx.restore();

  if (idle?.phase === 'DOZE') {
    drawSleepyZzzGlyphs(ctx, cx + 40, headY - 32, idle.phaseElapsed);
  }
}

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
    const fontSize = Math.round(12 + i * 2.5);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = `900 ${fontSize}px "Fredoka", "Nunito", sans-serif`;
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
  idle: { phase: IdleBaristaPhase; phaseElapsed: number; phaseDuration: number } | null = null
): void {
  const isBlinking = elapsedSec % 3.8 > 3.62;
  const isExcited = mood === 'TIKTOK_DANCE' || isCelebrating;
  const isYawning = Boolean(!isExcited && idle?.phase === 'YAWN');
  const isDozing = Boolean(!isExcited && idle?.phase === 'DOZE');
  const isDozingEyesClosed = isDozing && computeDozeBlend(idle) > 0.35;

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
    const lookOffsetX =
      idle?.phase === 'LOOK_AROUND' ? Math.sin(elapsedSec * 2.1) * 1.8 : 0;
    ctx.beginPath();
    ctx.arc(-14 + lookOffsetX, 5, 4.6, 0, Math.PI * 2);
    ctx.arc(14 + lookOffsetX, 5, 4.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-15.5 + lookOffsetX, 3.4, 1.8, 0, Math.PI * 2);
    ctx.arc(12.5 + lookOffsetX, 3.4, 1.8, 0, Math.PI * 2);
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
  idleElapsedSec = 0
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const dance = computeDanceMotion(isDancing, danceStyle, danceStartedAt, elapsedSec);

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

  let idleBobOffset = 0;
  if (idle?.phase === 'YAWN') {
    const p = clamp01(idle.phaseElapsed / idle.phaseDuration);
    const yawnPeak = p < 0.65 ? Math.sin((p / 0.65) * Math.PI) : 0;
    const settle = p > 0.65 ? clamp01((p - 0.65) / 0.35) : 0;
    idleBobOffset = -yawnPeak * 2.5 + settle * 14;
  } else if (idle?.phase === 'DOZE') {
    const dozeBlend = computeDozeBlend(idle);
    const breathe = Math.sin(elapsedSec * 2.0) * 1.8 * dozeBlend;
    idleBobOffset = dozeBlend * 112 + breathe;
  }

  const walkSpeedNorm = clamp01(Math.abs(walkVelocity) / 42);
  const walkHop = -Math.abs(Math.sin(elapsedSec * 14)) * 4.5 * walkSpeedNorm;
  const bob = computeCharacterBob(dance, isWorking, elapsedSec, freq) + walkHop + idleBobOffset;
  const dozeHeadExtraY = computeDozeBlend(idle) * 22;

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
    idle
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
  idle: { phase: IdleBaristaPhase; phaseElapsed: number; phaseDuration: number } | null = null
): void {
  const leftShoulderX = cx - 36;
  const leftShoulderY = torsoY + 24 + bob;
  const rightShoulderX = cx + 36;
  const rightShoulderY = torsoY + 24 + bob;

  // Direct handover animation at 100% (SHOWCASE): left hand waves cheerfully, right hand pushes/hands cup forward to customer
  if (drink && drink.phase === 'SHOWCASE') {
    const slideFactor = computeShowcaseSlideFactor(drink);
    const waveSwing = Math.sin(elapsedSec * 7.5) * 9;
    const leftHandX = cx - 50 + waveSwing;
    const leftHandY = headY + 12;
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHandX, leftHandY, -1);
    drawHandCircle(ctx, leftHandX, leftHandY);

    const pushX = CUP1_CX + CUP_TOP_HALF_W + 7;
    const pushY = CUP_TOP_Y + 26 + 24 * slideFactor;
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, pushX, pushY, 1);
    drawHandCircle(ctx, pushX, pushY);
    return;
  }

  const action = resolveBrewAction(drink);

  if (!action || !drink) {
    if (isWaving) {
      const waveOffset = Math.sin(elapsedSec * 5.2) * 10;
      const leftHandX = cx - 48 + waveOffset;
      const leftHandY = headY + 8;
      drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHandX, leftHandY, -1);
      drawHandCircle(ctx, leftHandX, leftHandY);

      const rightHandX = cx + 46;
      const rightHandY = STAGE_METRICS.COUNTER_TOP_Y - 6;
      drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightHandX, rightHandY, 1);
      drawHandCircle(ctx, rightHandX, rightHandY);
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
      idle
    );
    return;
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
  idle: { phase: IdleBaristaPhase; phaseElapsed: number; phaseDuration: number } | null
): void {
  const phase = idle?.phase ?? 'STROLL';
  const counterY = STAGE_METRICS.COUNTER_TOP_Y - 6;

  if (phase === 'YAWN' && idle) {
    const p = clamp01(idle.phaseElapsed / idle.phaseDuration);
    const yawnPeak = p < 0.65 ? Math.sin((p / 0.65) * Math.PI) : 0;
    const settle = p > 0.65 ? clamp01((p - 0.65) / 0.35) : 0;
    // Left hand covers mouth politely while yawning, then lowers onto counter; right hand rests calmly on counter
    const coverX = cx - 10 - (1 - yawnPeak) * 28 + settle * 12;
    const coverY = headY + 24 + (1 - yawnPeak) * (counterY - (headY + 24));
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, coverX, coverY, -1);
    drawHandCircle(ctx, coverX, coverY);

    const restRightX = cx + 38 - settle * 6;
    const restRightY = counterY;
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, restRightX, restRightY, 1);
    drawHandCircle(ctx, restRightX, restRightY);
    return;
  }

  if (phase === 'DOZE') {
    // Folded pillow arms resting flat on the counter table beneath her head
    const dozeBlend = computeDozeBlend(idle);
    const restY = STAGE_METRICS.COUNTER_TOP_Y - 7;
    const leftX = cx - 42 + (cx + 16 - (cx - 42)) * dozeBlend;
    const rightX = cx + 42 + (cx - 18 - (cx + 42)) * dozeBlend;
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftX, restY + 1, -1);
    drawHandCircle(ctx, leftX, restY + 1);
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightX, restY - 2, 1);
    drawHandCircle(ctx, rightX, restY - 2);
    return;
  }

  if (phase === 'LOOK_AROUND') {
    // One hand rests on hip/apron, right hand taps rhythmically on counter while scanning for customers
    const leftHipX = cx - 42;
    const leftHipY = torsoY + 64;
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHipX, leftHipY, -1);
    drawHandCircle(ctx, leftHipX, leftHipY);

    const tapLift = Math.abs(Math.sin(elapsedSec * 4.2)) * 5;
    const rightTapX = cx + 44 + Math.sin(elapsedSec * 2.1) * 4;
    const rightTapY = counterY - tapLift;
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightTapX, rightTapY, 1);
    drawHandCircle(ctx, rightTapX, rightTapY);
    return;
  }

  // STROLL: Pacing left/right while tidying & wiping counter with a small pastel cloth
  const leftSwing = Math.sin(elapsedSec * 4.5) * 8;
  const leftX = cx - 46 + leftSwing;
  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftX, counterY - 2, -1);
  drawHandCircle(ctx, leftX, counterY - 2);

  const wipeOffset = Math.sin(elapsedSec * 5.6) * 14;
  const clothX = cx + 38 + wipeOffset;
  const clothY = counterY - 1;
  ctx.save();
  roundedRectPath(ctx, clothX - 11, clothY - 4, 22, 10, 4);
  ctx.fillStyle = '#D9F0F6';
  ctx.fill();
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  ctx.restore();
  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, clothX, clothY - 2, 1);
  drawHandCircle(ctx, clothX, clothY - 2);
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
      drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jarRimX, jarRimY, -1);
      drawHandCircle(ctx, jarRimX, jarRimY);

      const scoopCycle = (Math.sin(elapsedSec * 5.6) + 1) * 0.5;
      const startX = BAR_STATION_COORDS.BOBA_JAR_X + 8;
      const endX = CUP1_CX + 4;
      const startY = STAGE_METRICS.COUNTER_TOP_Y - 22;
      const endY = CUP_TOP_Y - 18;
      const scoopX = startX + (endX - startX) * scoopCycle;
      const scoopY = startY + (endY - startY) * scoopCycle - Math.sin(scoopCycle * Math.PI) * 18;

      drawCartoonArm(ctx, rightShoulderX, rightShoulderY, scoopX, scoopY, 1);
      drawBobaLadleScoopAction(ctx, scoopX, scoopY, scoopCycle > 0.72, elapsedSec);
      return;
    }

    const binRimX = BAR_STATION_COORDS.ICE_BIN_X + 10;
    const binRimY = STAGE_METRICS.COUNTER_TOP_Y - 12;
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, binRimX, binRimY, -1);
    drawHandCircle(ctx, binRimX, binRimY);

    // Scoop lifts from ice bin cleanly OVER open cup mouth (360, CUP_TOP_Y - 18 = 572)
    const scoopCycle = (Math.sin(elapsedSec * 5.2) + 1) * 0.5;
    const startX = BAR_STATION_COORDS.ICE_BIN_X + 8;
    const endX = CUP1_CX + 6;
    const startY = STAGE_METRICS.COUNTER_TOP_Y - 22;
    const endY = CUP_TOP_Y - 18;
    const scoopX = startX + (endX - startX) * scoopCycle;
    const scoopY = startY + (endY - startY) * scoopCycle - Math.sin(scoopCycle * Math.PI) * 18;

    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, scoopX, scoopY, 1);
    drawIceScoopAndCubes(
      ctx,
      scoopX,
      scoopY,
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
      drawCartoonArm(ctx, leftShoulderX, leftShoulderY, CUP1_CX - CUP_TOP_HALF_W - 2, CUP_TOP_Y + 12, -1);
      drawHandCircle(ctx, CUP1_CX - CUP_TOP_HALF_W - 2, CUP_TOP_Y + 12);

      const creamerX = CUP1_CX + 26 + Math.sin(elapsedSec * 4.5) * 4;
      const creamerY = CUP_TOP_Y - 38 + Math.cos(elapsedSec * 4.5) * 2.5;
      drawCartoonArm(ctx, rightShoulderX, rightShoulderY, creamerX, creamerY, 1);
      drawBaristaCreamerJugAction(ctx, creamerX, creamerY, CUP1_CX, 1, elapsedSec, '#FFF6DC');
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
      drawCartoonArm(ctx, leftShoulderX, leftShoulderY, CUP1_CX - CUP_TOP_HALF_W - 2, CUP_TOP_Y + 12, -1);
      drawHandCircle(ctx, CUP1_CX - CUP_TOP_HALF_W - 2, CUP_TOP_Y + 12);

      const creamerX = CUP1_CX + 26 + Math.sin(elapsedSec * 4.5) * 4;
      const creamerY = CUP_TOP_Y - 38 + Math.cos(elapsedSec * 4.5) * 2.5;
      drawCartoonArm(ctx, rightShoulderX, rightShoulderY, creamerX, creamerY, 1);
      drawBaristaCreamerJugAction(ctx, creamerX, creamerY, CUP1_CX, 1, elapsedSec, '#FFF6E8');
      return;
    }

    // 4h. Fresh fruit slice rim garnish (78%+ of P4 for Orange, Peach Tea, and Lime Tea)
    if (
      (drink.recipeId === 'blue_citrus' ||
        drink.recipeId === 'peach_tea' ||
        drink.recipeId === 'lime_tea') &&
      drink.progress >= 78
    ) {
      drawCartoonArm(ctx, leftShoulderX, leftShoulderY, CUP1_CX - CUP_TOP_HALF_W - 2, CUP_TOP_Y + 12, -1);
      drawHandCircle(ctx, CUP1_CX - CUP_TOP_HALF_W - 2, CUP_TOP_Y + 12);

      const garnishX = CUP1_CX + 18 + Math.sin(elapsedSec * 3.5) * 2.5;
      const garnishY = CUP_TOP_Y - 16 + Math.cos(elapsedSec * 3.5) * 2;
      drawCartoonArm(ctx, rightShoulderX, rightShoulderY, garnishX, garnishY, 1);
      drawPlaceFruitGarnishAction(
        ctx,
        garnishX,
        garnishY,
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
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, steadyX, steadyY, 1);
    drawHandCircle(ctx, steadyX, steadyY);

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

    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, handX, handY, -1);
    drawPourLiquidEffect(ctx, {
      toolType: pourVessel,
      handX,
      handY,
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
    drawHandCircle(ctx, handX, handY);
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

    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftLidX, lidY, -1);
    drawHandCircle(ctx, leftLidX, lidY);
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightLidX, lidY, 1);
    drawHandCircle(ctx, rightLidX, lidY);
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
  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, steadyX, steadyY, -1);
  drawHandCircle(ctx, steadyX, steadyY);

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

  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, handX, handY, 1);

  // Straw being held in right hand
  ctx.save();
  ctx.translate(handX, handY);
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

  drawHandCircle(ctx, handX, handY);
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

  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftGuideX, leftGuideY, -1);
  drawHandCircle(ctx, leftGuideX, leftGuideY);
  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightGripX, rightGripY, 1);
  drawHandCircle(ctx, rightGripX, rightGripY);
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

  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, shakerX - 8, shakerY + 4, -1);
  drawHandCircle(ctx, shakerX - 8, shakerY + 4);
  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, shakerX + 10, shakerY - 4, 1);
  drawHandCircle(ctx, shakerX + 10, shakerY - 4);
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
  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftX, leftY, -1);
  drawHandCircle(ctx, leftX, leftY);

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

  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, jugX, jugY, 1);
  drawHandCircle(ctx, jugX, jugY);
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
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 12, jugY + 4, -1);
    drawHandCircle(ctx, jugX - 12, jugY + 4);

    // Right hand reaches toward Color 2 Cyan Soda bottle
    const reachX = 428;
    const reachY = STAGE_METRICS.COUNTER_TOP_Y - 22;
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, reachX, reachY, 1);
    drawHandCircle(ctx, reachX, reachY);
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

  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, bottleX, bottleY, -1);
  drawHandCircle(ctx, bottleX, bottleY);

  const steadyX = CUP1_CX + CUP_TOP_HALF_W + 2;
  const steadyY = CUP_TOP_Y + 12;
  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, steadyX, steadyY, 1);
  drawHandCircle(ctx, steadyX, steadyY);
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

    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, cartonX - 6, cartonY + 4, 1);
    drawHandCircle(ctx, cartonX - 6, cartonY + 4);

    // Left hand reaches down to pick up prepared chawan bowl (x=420) / stainless espresso pitcher
    const reachX = BAR_STATION_COORDS.PREP_PAD_X;
    const reachY = STAGE_METRICS.COUNTER_TOP_Y - 12;
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, reachX, reachY, -1);
    drawHandCircle(ctx, reachX, reachY);
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

  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, vesselX - 10, vesselY + 4, -1);
  drawHandCircle(ctx, vesselX - 10, vesselY + 4);

  const steadyX = CUP1_CX + CUP_TOP_HALF_W + 2;
  const steadyY = CUP_TOP_Y + 12 + (1 - easeT) * 6;
  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, steadyX, steadyY, 1);
  drawHandCircle(ctx, steadyX, steadyY);
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

  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftGripX, gripY, -1);
  drawHandCircle(ctx, leftGripX, gripY);
  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightGripX, gripY, 1);
  drawHandCircle(ctx, rightGripX, gripY);
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
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, jugX + 14, jugBottomY - 16, 1);
    drawHandCircle(ctx, jugX + 14, jugBottomY - 16);

    // Left hand presses coral-gold sugar button down rhythmically!
    const pressOffset = Math.abs(Math.sin(elapsedSec * 12)) * 4.5;
    const btnX = BAR_STATION_COORDS.SUGAR_BTN_X;
    const btnY = BAR_STATION_COORDS.SUGAR_BTN_Y - 12 + pressOffset;
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, btnX, btnY, -1);
    drawHandCircle(ctx, btnX, btnY);
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
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 18, jugBottomY - 16, -1);
    drawHandCircle(ctx, jugX - 18, jugBottomY - 16);

    const leverX = BAR_STATION_COORDS.TEA_URN_1_SPIGOT_X + 6;
    const leverY = 368;
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, leverX, leverY, 1);
    drawHandCircle(ctx, leverX, leverY);
    return;
  }

  if (drink.recipeId === 'peach_tea' || drink.recipeId === 'lime_tea') {
    if (drink.progress < TEA_URN_DISPENSE_END_PROGRESS) {
      const jugX = BAR_STATION_COORDS.TEA_URN_2_SPIGOT_X;
      const jugBottomY = 444;
      drawGraduatedMeasuringCup(ctx, jugX, jugBottomY, '#C98A4B', fillLevel);
      drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 18, jugBottomY - 16, -1);
      drawHandCircle(ctx, jugX - 18, jugBottomY - 16);

      const leverX = BAR_STATION_COORDS.TEA_URN_2_SPIGOT_X + 6;
      const leverY = 368;
      drawCartoonArm(ctx, rightShoulderX, rightShoulderY, leverX, leverY, 1);
      drawHandCircle(ctx, leverX, leverY);
      return;
    }

    const isPeach = drink.recipeId === 'peach_tea';
    const syrupX = isPeach ? BAR_STATION_COORDS.SYRUP_2_X : BAR_STATION_COORDS.SYRUP_3_X;
    const syrupColor = isPeach ? '#FF9D5C' : '#A4D466';
    const jugBottomY = 446;
    drawGraduatedMeasuringCup(ctx, syrupX, jugBottomY, syrupColor, fillLevel);
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, syrupX - 18, jugBottomY - 16, -1);
    drawHandCircle(ctx, syrupX - 18, jugBottomY - 16);

    const pumpHandY = 352 + Math.abs(Math.sin(elapsedSec * 8)) * 4;
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, syrupX + 4, pumpHandY, 1);
    drawHandCircle(ctx, syrupX + 4, pumpHandY);
    return;
  }

  if (drink.recipeId === 'coffee_milk') {
    const jugX = 500;
    const jugBottomY = STAGE_METRICS.COUNTER_TOP_Y + 12;
    drawGraduatedMeasuringCup(ctx, jugX, jugBottomY, '#F5E4CC', fillLevel * 0.65);
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 16, jugBottomY - 14, -1);
    drawHandCircle(ctx, jugX - 16, jugBottomY - 14);

    const machineHandX = 568;
    const machineHandY = STAGE_METRICS.COUNTER_TOP_Y - 38 + Math.sin(elapsedSec * 4) * 2;
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, machineHandX, machineHandY, 1);
    drawHandCircle(ctx, machineHandX, machineHandY);
    return;
  }

  if (drink.recipeId === 'berry_soda') {
    const jugX = BAR_STATION_COORDS.SYRUP_1_X;
    const jugBottomY = 446;
    drawGraduatedMeasuringCup(ctx, jugX, jugBottomY, '#E04F6D', fillLevel);
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 18, jugBottomY - 16, -1);
    drawHandCircle(ctx, jugX - 18, jugBottomY - 16);

    const pumpHandY = 350 + Math.abs(Math.sin(elapsedSec * 8)) * 4;
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, BAR_STATION_COORDS.SYRUP_1_X + 4, pumpHandY, 1);
    drawHandCircle(ctx, BAR_STATION_COORDS.SYRUP_1_X + 4, pumpHandY);
    return;
  }

  if (drink.recipeId === 'blue_citrus') {
    const jugX = 276;
    const jugBottomY = STAGE_METRICS.COUNTER_TOP_Y + 12;
    drawGraduatedMeasuringCup(ctx, jugX, jugBottomY, '#FF9526', fillLevel * 0.6);
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 16, jugBottomY - 14, -1);
    drawHandCircle(ctx, jugX - 16, jugBottomY - 14);

    const orangeX = 302;
    const orangeY = STAGE_METRICS.COUNTER_TOP_Y - 26 + Math.sin(elapsedSec * 5) * 3;
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, orangeX, orangeY, 1);
    drawPlaceFruitGarnishAction(ctx, orangeX, orangeY, 1, 'orange');
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
  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, jugX - 16, jugBottomY - 14, -1);
  drawHandCircle(ctx, jugX - 16, jugBottomY - 14);

  const cartonX = jugX + 34;
  const cartonY = jugBottomY - 64 + Math.sin(elapsedSec * 4) * 2;
  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, cartonX, cartonY, 1);
  drawPourLiquidEffect(ctx, {
    toolType: 'oatside_milk',
    handX: cartonX,
    handY: cartonY,
    cupCx: jugX,
    side: 1,
    liquidColor: '#FFFDF7',
    accentColor: '#FFFDF7',
    targetSurfaceY: jugBottomY - 8 - (0.22 + milkFill * 0.68) * 22,
    isFastBoost: false,
    isSodaFizz: false,
    elapsedSec,
  });
  drawHandCircle(ctx, cartonX, cartonY);
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
  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHandX, leftHandY, -1);
  drawHandCircle(ctx, leftHandX, leftHandY);

  // Right arm reaches up & carries sage-green MATCHA canister smoothly
  const gripX = tinCx + 15;
  const gripY = tinCy - 2;
  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, gripX, gripY, 1);
  drawMatchaCanister(ctx, tinCx, tinCy, false);
  drawHandCircle(ctx, gripX, gripY);
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
  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHandX, leftHandY, -1);
  drawHandCircle(ctx, leftHandX, leftHandY);

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

  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, handX, handY, 1);
  drawMatchaScoopSpoon(ctx, handX, handY, hasPowderOnSpoon, spoonTilt);
  drawHandCircle(ctx, handX, handY);
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
    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHandX, leftHandY, -1);
    drawHandCircle(ctx, leftHandX, leftHandY);

    const btnX = 136;
    const btnY = STAGE_METRICS.COUNTER_TOP_Y - 26 + Math.sin(elapsedSec * 6) * 2;
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, btnX, btnY, 1);
    drawHandCircle(ctx, btnX, btnY);
    return;
  }

  if (drink.recipeId === 'blue_citrus') {
    const juicerX = 276;
    const juicerBaseY = STAGE_METRICS.COUNTER_TOP_Y + 12;
    const pressBob = Math.abs(Math.sin(elapsedSec * freq)) * 4;
    const pressX = juicerX + 3;
    const pressY = juicerBaseY - 45 + pressBob;

    // Pressing hand behind orange rind so vivid orange slice segments stay 100% visible
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, pressX, pressY, 1);
    drawHandCircle(ctx, pressX, pressY);

    drawCitrusJuicerOnCounter(ctx, juicerX, juicerBaseY, elapsedSec);

    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, juicerX - 20, juicerBaseY - 12, -1);
    drawHandCircle(ctx, juicerX - 20, juicerBaseY - 12);
    return;
  }

  // Matcha P2: Froth smoothly inside ceramic chawan bowl using bamboo Chasen whisk on dedicated open prep pad!
  if (drink.recipeId === 'matcha') {
    const bowlX = MATCHA_CHAWAN_COUNTER_X;
    const bowlBottomY = MATCHA_CHAWAN_COUNTER_BOTTOM_Y;

    drawCartoonArm(ctx, leftShoulderX, leftShoulderY, bowlX - 22, bowlBottomY - 12, -1);
    drawHandCircle(ctx, bowlX - 22, bowlBottomY - 12);

    const grip = drawMatchaChawanWithFrother(ctx, bowlX, bowlBottomY, elapsedSec, isFastBoost);
    drawCartoonArm(ctx, rightShoulderX, rightShoulderY, grip.x, grip.y, 1);
    drawHandCircle(ctx, grip.x, grip.y);
    return;
  }

  // Cafe & Soda P2: Whip silky foam in brushed stainless pitcher on open prep pad!
  const pitcherX = BAR_STATION_COORDS.PREP_PAD_X;
  const pitcherBottomY = STAGE_METRICS.COUNTER_TOP_Y + 12;
  const liquidColor = PREP_LIQUID_COLOR_MAP[drink.recipeId] ?? '#5A321C';
  const foamColor = PREP_FOAM_COLOR_MAP[drink.recipeId] ?? '#FFF6E8';

  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, pitcherX - 18, pitcherBottomY - 14, -1);
  drawHandCircle(ctx, pitcherX - 18, pitcherBottomY - 14);

  const grip = drawStainlessPitcherWithFrother(
    ctx,
    pitcherX,
    pitcherBottomY,
    liquidColor,
    foamColor,
    elapsedSec,
    isFastBoost
  );
  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, grip.x, grip.y, 1);
  drawHandCircle(ctx, grip.x, grip.y);
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
  _headY: number,
  torsoY: number,
  dance: DanceMotion
): void {
  const leftShoulderX = cx - 36;
  const leftShoulderY = torsoY + 22;
  const rightShoulderX = cx + 36;
  const rightShoulderY = torsoY + 22;

  if (dance.style === 'heart_sway' && dance.showCenterHeart) {
    drawFloatingHeart(ctx, cx, torsoY - 12, 9.5 * dance.heartPulseScale);
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
  ctx.lineWidth = 15.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 10.8;
  ctx.strokeStyle = BARISTA_SKIN;
  ctx.stroke();

  const sleeveT = 0.48;
  const q0x = sx + (elbowX - sx) * sleeveT;
  const q0y = sy + (elbowY - sy) * sleeveT;
  const q1x = elbowX + (hx - elbowX) * sleeveT;
  const q1y = elbowY + (hy - elbowY) * sleeveT;
  const sleeveEndX = q0x + (q1x - q0x) * sleeveT;
  const sleeveEndY = q0y + (q1y - q0y) * sleeveT;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(q0x, q0y, sleeveEndX, sleeveEndY);
  ctx.lineWidth = 16.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 11.4;
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
    drawDanceSparkleStar(ctx, cx, 382, 6 + Math.sin(elapsedSec * 7) * 1.6, '#F7C95B');
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
  hx: number,
  hy: number,
  side: -1 | 1
): void {
  const elbowX = (sx + hx) * 0.5 + side * 12;
  const elbowY = (sy + hy) * 0.5 + 14;

  // 1. Full arm outline + skin forearm fill
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(elbowX, elbowY, hx, hy);
  ctx.lineWidth = 15.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 10.8;
  ctx.strokeStyle = BARISTA_SKIN;
  ctx.stroke();

  // 2. Exact De Casteljau sub-curve [0 .. sleeveT] for white raglan shirt sleeve (0.00px deviation!)
  const sleeveT = 0.48;
  const q0x = sx + (elbowX - sx) * sleeveT;
  const q0y = sy + (elbowY - sy) * sleeveT;
  const q1x = elbowX + (hx - elbowX) * sleeveT;
  const q1y = elbowY + (hy - elbowY) * sleeveT;
  const sleeveEndX = q0x + (q1x - q0x) * sleeveT;
  const sleeveEndY = q0y + (q1y - q0y) * sleeveT;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(q0x, q0y, sleeveEndX, sleeveEndY);
  ctx.lineWidth = 16.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 11.4;
  ctx.strokeStyle = '#FFFDF9';
  ctx.stroke();
}

function drawHandCircle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 7.6, 0, Math.PI * 2);
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
