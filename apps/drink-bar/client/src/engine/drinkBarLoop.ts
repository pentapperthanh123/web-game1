import { startBackgroundTicker, type BackgroundTickerHandle } from '@shared/backgroundTicker';
import { GAMEPLAY_LIMITS, STAGE_METRICS } from '@shared/config';
import { getBrewStep, RECIPE_MAP, type BrewPhaseAction } from '@shared/recipes';
import type { ActiveDrink, DanceStyle, DrinkBarLiveState, RecipeId, SfxKind } from '@shared/types';
import { drinkBarAudio } from '../services/audioManager';
import { drinkBarTts } from '../services/ttsEngine';
import { useDrinkBarStore } from '../store/drinkBarStore';
import {
  CAFE_POUR_END_PROGRESS,
  clamp01,
  computeLiquidFillSnapshot,
  CUP_BOTTOM_Y,
  CUP_HEIGHT,
  LID_PICKUP_END_PROGRESS,
  LID_SNAP_MOMENT_PROGRESS,
  STRAW_INSERT_START_PROGRESS,
} from './brewEffects';
import {
  drawBarBackdrop,
  drawBarCounter,
  type BarEquipmentState,
} from './drawBarScene';
import {
  BARISTA_CENTER_X,
  BARISTA_DOZE_NOSE_Y,
  drawBartenderBody,
  drawBartenderForegroundArmsAndSpeech,
  IDLE_PHASE_TIMINGS,
  isBobaScoopSubstep,
  isCupPickupSubstep,
  isHoldingOatsideSubstep,
  isHoldingSodaBottleSubstep,
  isLidPickupSubstep,
  isMatchaGrabSubstep,
  isMatchaReturnSubstep,
  isMatchaScoopSubstep,
  isMatchaShelfSubstep,
  isShakerDetachedSubstep,
  isShakerLiftSubstep,
  isSugarButtonSubstep,
  resetDanceJointTransition,
  resolveShakerMachineFillRatio,
  resolveTargetBaristaX,
  stepDanceKinematics,
  WAKE_UP_DURATION_MS,
  type DanceMotion,
} from './drawBartender';
import { drawBarDrinkCups } from './drawDrinkCup';
import { drinkParticles, type CupStationId } from './particlePool';

const STEP2_PREP_SFX_MAP: Record<RecipeId, SfxKind> = {
  matcha: 'chasen',
  thai_tea: 'shaker',
  peach_tea: 'shaker',
  lime_tea: 'whip_froth',
  coffee_milk: 'whip_froth',
  cacao: 'whip_froth',
  berry_soda: 'whip_froth',
  blue_citrus: 'juicer',
};

function resolvePhaseSfx(drink: ActiveDrink, action: BrewPhaseAction): SfxKind | null {
  if (
    isCupPickupSubstep(drink) ||
    isLidPickupSubstep(drink) ||
    isShakerLiftSubstep(drink) ||
    isMatchaGrabSubstep(drink) ||
    isMatchaReturnSubstep(drink)
  ) {
    return 'cup_place';
  }
  if (isSugarButtonSubstep(drink)) {
    return 'sugar_click';
  }
  if (isMatchaScoopSubstep(drink)) {
    return 'matcha_scoop';
  }
  if (isBobaScoopSubstep(drink)) {
    return 'topping';
  }
  switch (action) {
    case 'dispense':
      if (drink.recipeId === 'coffee_milk') return 'cafe_drip';
      if (drink.recipeId === 'blue_citrus') return 'juicer';
      if (drink.recipeId === 'berry_soda') return 'soda_fizz';
      return 'pour';
    case 'tool_prep':
      return STEP2_PREP_SFX_MAP[drink.recipeId];
    case 'add_ice':
      return drink.iceLevel === 'NONE' ? null : 'ice_clink';
    case 'pour_mix':
      return drink.recipeId === 'berry_soda' ? 'soda_fizz' : 'pour';
    case 'topping':
      return 'topping';
    case 'seal':
      if (drink.progress >= STRAW_INSERT_START_PROGRESS) {
        return 'straw_insert';
      }
      if (drink.progress >= LID_SNAP_MOMENT_PROGRESS) {
        return 'lid_snap';
      }
      return drink.progress >= LID_PICKUP_END_PROGRESS ? 'cup_place' : null;
  }
}

function resolveSubstepKey(drink: ActiveDrink, stepNumber: number): string {
  if (isCupPickupSubstep(drink)) return `${drink.orderId}:cup_pickup`;
  if (isMatchaGrabSubstep(drink)) return `${drink.orderId}:matcha_grab`;
  if (isMatchaScoopSubstep(drink)) return `${drink.orderId}:matcha_scoop`;
  if (isMatchaReturnSubstep(drink)) return `${drink.orderId}:matcha_return`;
  if (isSugarButtonSubstep(drink)) return `${drink.orderId}:sugar_press`;
  if (isBobaScoopSubstep(drink)) return `${drink.orderId}:boba_scoop`;
  if (isShakerLiftSubstep(drink)) return `${drink.orderId}:shaker_lift`;
  if (isLidPickupSubstep(drink)) return `${drink.orderId}:lid_pickup`;
  if (
    drink.progress >= LID_PICKUP_END_PROGRESS &&
    drink.progress < LID_SNAP_MOMENT_PROGRESS
  ) {
    return `${drink.orderId}:lid_press`;
  }
  if (
    drink.progress >= LID_SNAP_MOMENT_PROGRESS &&
    drink.progress < STRAW_INSERT_START_PROGRESS
  ) {
    return `${drink.orderId}:lid_snap`;
  }
  if (drink.progress >= STRAW_INSERT_START_PROGRESS) {
    return `${drink.orderId}:straw_insert`;
  }
  return `${drink.orderId}:${stepNumber}`;
}

const DANCE_HEART_COLORS: readonly string[] = ['#F0788C', '#FF5E7E', '#FF8FA3'];
const DANCE_WAVE_TRAIL_COLORS: readonly string[] = ['#7FC8D9', '#A8E6CF', '#F4A6BE'];
const DANCE_HYPE_STAR_COLORS: readonly string[] = ['#F7C95B', '#7FC8D9', '#F0788C'];

let pendingForceSleepRequest = false;

export function requestBaristaForceSleep(): void {
  pendingForceSleepRequest = true;
}

export class DrinkBarCanvasLoop {
  private readonly canvas: HTMLCanvasElement;
  private rafId: number | null = null;
  private bgTicker: BackgroundTickerHandle | null = null;
  private visibilityHandler: (() => void) | null = null;
  private lastTickMs = 0;
  private lastSimWallMs = 0;
  private elapsedSec = 0;
  private prevStationKey1 = '';
  private lastAmbientSfxSec = 0;
  private wasDancing = false;
  private prevDanceStyle: DanceStyle | null = null;
  private prevDanceStartedAt = 0;
  private prevDanceBeatIndex = -1;
  private danceFrameCounter = 0;
  // Smooth horizontal barista walk position & velocity (zero per-frame allocations)
  private baristaPosX = BARISTA_CENTER_X;
  private baristaWalkVelocity = 0;
  private idleElapsedSec = 0;
  private wakeUpUntil = 0;
  private wasDozing = false;
  private lastWipeSparkleSec = 0;
  private prevHasOrder = false;
  private prevSpeedBoostUntil = 0;
  private prevWaveUntil = 0;
  // Reusable mutable equipment state object (zero per-frame object allocations)
  private readonly equipmentState: BarEquipmentState = {
    activeRecipeId: null,
    activeAction: null,
    stepProgress: 0,
    isFastBoost: false,
    isPickingCup: false,
    isPickingLid: false,
    isTakingMatchaFromShelf: false,
    isHoldingOatside: false,
    isHoldingSodaBottle: false,
    isShakerDetached: false,
    shakerFillRatio: 0,
    isPressingSugarButton: false,
    isUsingFrother: false,
    isScoopingBoba: false,
    isScoopingIce: false,
    danceStyle: null,
    danceBeatPulse: 0,
    manekiExcitedProgress: 0,
    hasQueuedGuests: false,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    // Strict DPR = 1 locked 720x1280 stage canvas
    this.canvas.width = STAGE_METRICS.WIDTH * STAGE_METRICS.DEVICE_PIXEL_RATIO;
    this.canvas.height = STAGE_METRICS.HEIGHT * STAGE_METRICS.DEVICE_PIXEL_RATIO;
  }

  public start(): void {
    if (this.rafId !== null) return;
    this.lastTickMs = performance.now();
    this.lastSimWallMs = Date.now();
    this.rafId = requestAnimationFrame(this.frame);
    this.bgTicker = startBackgroundTicker(
      STAGE_METRICS.FRAME_INTERVAL_MS,
      () => this.onBackgroundTick()
    );
    if (typeof document !== 'undefined' && !this.visibilityHandler) {
      this.visibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          this.lastTickMs = performance.now();
          this.lastSimWallMs = Date.now();
          this.renderCurrentFrame();
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler, { passive: true });
    }
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.bgTicker) {
      this.bgTicker.stop();
      this.bgTicker = null;
    }
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  private onBackgroundTick(): void {
    const nowWall = Date.now();
    const gapMs = nowWall - this.lastSimWallMs;
    const isHidden = typeof document !== 'undefined' && document.hidden;
    const isDeeplyThrottled = gapMs >= 200;

    // Background ticker ONLY steps when tab is actually hidden or rAF is deeply throttled (>200ms)
    // Never compete with active requestAnimationFrame on foreground tabs!
    if (!isHidden && !isDeeplyThrottled) {
      return;
    }
    this.lastSimWallMs = nowWall;
    this.lastTickMs = performance.now();

    let remainingSec = Math.min(3.0, gapMs / 1000);
    while (remainingSec > 0.001) {
      const stepSec = Math.min(0.2, remainingSec);
      this.stepSimulation(stepSec);
      remainingSec -= stepSec;
    }
    this.renderCurrentFrame();
  }

  private frame = (nowMs: number): void => {
    this.rafId = requestAnimationFrame(this.frame);

    const deltaMs = nowMs - this.lastTickMs;
    // Strict 30 FPS lock (delta >= 1/30s = 33.333ms)
    if (deltaMs < STAGE_METRICS.FRAME_INTERVAL_MS) {
      return;
    }

    const dtSec = Math.min(0.1, deltaMs / 1000);
    this.lastTickMs = nowMs - (deltaMs % STAGE_METRICS.FRAME_INTERVAL_MS);
    this.lastSimWallMs = Date.now();

    this.stepSimulation(dtSec);
    this.renderCurrentFrame();
  };

  private stepSimulation(dtSec: number): void {
    this.elapsedSec += dtSec;

    const store = useDrinkBarStore.getState();
    store.tick(dtSec);

    const state = useDrinkBarStore.getState();
    const nowEpoch = Date.now();
    const isFastBoost = nowEpoch < state.speedBoostUntil;
    const isWaving = nowEpoch < state.waveUntil;
    const isDancing = nowEpoch < state.danceUntil;

    const prevWasDancing = this.wasDancing;
    if (isDancing) {
      const styleSwitched = this.wasDancing && this.prevDanceStyle !== state.danceStyle;
      const restarted = this.wasDancing && this.prevDanceStartedAt !== state.danceStartedAt;
      if (!this.wasDancing) {
        drinkBarAudio.stopBrewingSfx();
      }
      if (styleSwitched || restarted) {
        drinkParticles.clearDanceParticles();
        resetDanceJointTransition();
        this.prevDanceBeatIndex = -1;
      }
      this.prevDanceStyle = state.danceStyle;
      this.prevDanceStartedAt = state.danceStartedAt;
    } else if (this.wasDancing) {
      drinkBarAudio.stopDanceMusic();
      drinkBarTts.onDanceEnded();
      drinkParticles.clearDanceParticles();
      resetDanceJointTransition();
      this.prevStationKey1 = '';
      this.prevDanceStyle = null;
      this.prevDanceStartedAt = 0;
      this.prevDanceBeatIndex = -1;
    }
    this.wasDancing = isDancing;

    const danceMotion = stepDanceKinematics(
      isDancing,
      state.danceStyle,
      state.danceStartedAt,
      this.elapsedSec,
      dtSec
    );

    if (pendingForceSleepRequest) {
      pendingForceSleepRequest = false;
      this.idleElapsedSec = IDLE_PHASE_TIMINGS.STRETCH_YAWN_END_SEC + 1.2;
      this.wasDozing = true;
      this.wakeUpUntil = 0;
      this.prevHasOrder = false;
      this.prevSpeedBoostUntil = state.speedBoostUntil;
      this.prevWaveUntil = state.waveUntil;
      drinkBarTts.setBaristaDozing(true);
    }

    const primary = state.activeSlots[0];
    const hasOrder = Boolean(primary);

    const justGotOrder = !this.prevHasOrder && hasOrder;
    const justGotGift = !prevWasDancing && isDancing;
    const justGotLikes =
      state.speedBoostUntil > this.prevSpeedBoostUntil ||
      state.waveUntil > this.prevWaveUntil;

    if (this.wasDozing && this.wakeUpUntil <= nowEpoch && (justGotOrder || justGotGift || justGotLikes)) {
      this.wakeUpUntil = nowEpoch + WAKE_UP_DURATION_MS;
      drinkParticles.emitBubblePop(this.baristaPosX + 4, BARISTA_DOZE_NOSE_Y);
      drinkBarAudio.play('wake_pop');
      drinkBarTts.enqueueWakeUp(state.config.language);
    }

    this.prevHasOrder = hasOrder;
    this.prevSpeedBoostUntil = state.speedBoostUntil;
    this.prevWaveUntil = state.waveUntil;

    if (!isDancing && !isWaving && !primary) {
      this.idleElapsedSec += dtSec;
      // WIPE phase (~0-4.5s): emit 1-2 clean sparkles periodically
      if (
        this.idleElapsedSec < IDLE_PHASE_TIMINGS.WIPE_END_SEC &&
        this.elapsedSec - this.lastWipeSparkleSec > IDLE_PHASE_TIMINGS.WIPE_SPARKLE_INTERVAL_SEC
      ) {
        this.lastWipeSparkleSec = this.elapsedSec;
        const sweep = Math.sin(this.idleElapsedSec * 4.2);
        const clothX = this.baristaPosX + 8 + sweep * 42;
        const clothY = STAGE_METRICS.COUNTER_TOP_Y + 6;
        drinkParticles.emitCounterCleanSparkles(clothX, clothY);
      }
    } else {
      this.idleElapsedSec = 0;
    }

    const nextIsDozing = this.idleElapsedSec >= IDLE_PHASE_TIMINGS.STRETCH_YAWN_END_SEC;
    if (nextIsDozing !== this.wasDozing) {
      drinkBarTts.setBaristaDozing(nextIsDozing);
    }
    this.wasDozing = nextIsDozing;

    this.syncBrewingPhaseSfx(primary, isDancing);
    this.emitStationAmbientParticles(primary, 1, isFastBoost, isDancing);
    this.emitDanceVfxParticles(danceMotion);
    drinkParticles.update(dtSec);

    // Smoothly lerp barista X position toward active station equipment (gentle stroll when idle)
    const targetBaristaX = resolveTargetBaristaX(primary, isDancing, isWaving, this.idleElapsedSec);
    const prevBaristaX = this.baristaPosX;
    const isIdleStroll = !isDancing && !isWaving && !primary;
    const lerpRate = isIdleStroll ? 2.8 : 7.5;
    const lerpAlpha = 1 - Math.exp(-lerpRate * dtSec);
    this.baristaPosX += (targetBaristaX - this.baristaPosX) * lerpAlpha;
    if (Math.abs(targetBaristaX - this.baristaPosX) < 0.4) {
      this.baristaPosX = targetBaristaX;
    }
    this.baristaWalkVelocity = dtSec > 0 ? (this.baristaPosX - prevBaristaX) / dtSec : 0;

    // Update reusable equipment state snapshot in-place (zero per-frame allocations)
    this.equipmentState.hasQueuedGuests =
      Boolean(state.activeSlots[0]) ||
      state.vipQueue.length + state.normalQueue.length + state.departingGuests.length > 0;
    this.equipmentState.danceStyle = isDancing ? state.danceStyle : null;
    this.equipmentState.danceBeatPulse = isDancing ? danceMotion.beatPulse : 0;
    const excitedRemainingMs = Math.max(0, state.manekiExcitedUntil - nowEpoch);
    this.equipmentState.manekiExcitedProgress = clamp01(
      excitedRemainingMs / GAMEPLAY_LIMITS.MANEKI_NEKO_EXCITED_MS
    );

    if (primary && primary.phase === 'BREWING') {
      const step = getBrewStep(primary.progress, primary.recipeId);
      const span = Math.max(1, step.maxProgress - step.minProgress);
      const isPausedForDance = isDancing;

      this.equipmentState.activeRecipeId = primary.recipeId;
      this.equipmentState.activeAction = isPausedForDance ? null : step.action;
      this.equipmentState.stepProgress = isPausedForDance
        ? 0
        : clamp01((primary.progress - step.minProgress) / span);
      this.equipmentState.isFastBoost = !isPausedForDance && isFastBoost;
      this.equipmentState.isPickingCup = !isPausedForDance && isCupPickupSubstep(primary);
      this.equipmentState.isPickingLid = !isPausedForDance && isLidPickupSubstep(primary);
      this.equipmentState.isTakingMatchaFromShelf = !isPausedForDance && isMatchaShelfSubstep(primary);
      this.equipmentState.isHoldingOatside = !isPausedForDance && isHoldingOatsideSubstep(primary);
      this.equipmentState.isHoldingSodaBottle = !isPausedForDance && isHoldingSodaBottleSubstep(primary);
      this.equipmentState.isShakerDetached = !isPausedForDance && isShakerDetachedSubstep(primary);

      let preservedShakerFill = resolveShakerMachineFillRatio(primary);
      if (isPausedForDance && isShakerDetachedSubstep(primary)) {
        const pourProgress = clamp01((primary.progress - 56) / 22);
        preservedShakerFill = Math.max(0.2, 0.94 * (1 - pourProgress));
      }
      this.equipmentState.shakerFillRatio = preservedShakerFill;

      this.equipmentState.isPressingSugarButton = !isPausedForDance && isSugarButtonSubstep(primary);
      this.equipmentState.isUsingFrother =
        !isPausedForDance &&
        ((step.action === 'tool_prep' &&
          (primary.recipeId === 'coffee_milk' ||
            primary.recipeId === 'cacao' ||
            primary.recipeId === 'berry_soda')) ||
          (step.action === 'pour_mix' &&
            (primary.recipeId === 'coffee_milk' || primary.recipeId === 'cacao') &&
            primary.progress < CAFE_POUR_END_PROGRESS));
      this.equipmentState.isScoopingBoba = !isPausedForDance && isBobaScoopSubstep(primary);
      this.equipmentState.isScoopingIce =
        !isPausedForDance && step.action === 'add_ice' && !isBobaScoopSubstep(primary);
    } else {
      this.equipmentState.activeRecipeId = null;
      this.equipmentState.activeAction = null;
      this.equipmentState.stepProgress = 0;
      this.equipmentState.isFastBoost = false;
      this.equipmentState.isPickingCup = false;
      this.equipmentState.isPickingLid = false;
      this.equipmentState.isTakingMatchaFromShelf = false;
      this.equipmentState.isHoldingOatside = false;
      this.equipmentState.isHoldingSodaBottle = false;
      this.equipmentState.isShakerDetached = false;
      this.equipmentState.shakerFillRatio = 0;
      this.equipmentState.isPressingSugarButton = false;
      this.equipmentState.isUsingFrother = false;
      this.equipmentState.isScoopingBoba = false;
      this.equipmentState.isScoopingIce = false;
    }
  }

  private renderCurrentFrame(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const state = useDrinkBarStore.getState();
    const nowEpoch = Date.now();
    const isFastBoost = nowEpoch < state.speedBoostUntil;
    const isWaving = nowEpoch < state.waveUntil;
    const isDancing = nowEpoch < state.danceUntil;

    this.render(ctx, state, nowEpoch, isFastBoost, isWaving, isDancing);
  }

  private render(
    ctx: CanvasRenderingContext2D,
    state: DrinkBarLiveState,
    nowEpoch: number,
    isFastBoost: boolean,
    isWaving: boolean,
    isDancing: boolean
  ): void {
    // Layer 1: Airy café wall, 2-tier pastel shelves (tea urns, syrup pumps, matcha tin, oatside), pendant lamps
    drawBarBackdrop(ctx, this.elapsedSec, this.equipmentState);

    const wakeUpProgress =
      this.wakeUpUntil > nowEpoch ? (this.wakeUpUntil - nowEpoch) / WAKE_UP_DURATION_MS : 0;

    // Layer 2: Single central barista walking smoothly between equipment stations (or 3 TikTok dance styles)
    drawBartenderBody(
      ctx,
      state.bartenderMood,
      state.activeSlots[0],
      isFastBoost,
      isWaving,
      isDancing,
      state.danceTier,
      state.danceStyle,
      state.danceStartedAt,
      this.elapsedSec,
      this.baristaPosX,
      this.baristaWalkVelocity,
      this.idleElapsedSec,
      wakeUpProgress
    );

    // Layer 3: Full-width wooden counter + shaker, sugar jar + button, ice bin, menu stand, cups/lids, espresso & plant
    drawBarCounter(ctx, this.elapsedSec, this.equipmentState);

    // Layer 4: Primary centered layered drink cup (~70% compact scale) on counter coaster
    drawBarDrinkCups(
      ctx,
      state.activeSlots,
      state.config.language,
      this.elapsedSec,
      isDancing
    );

    // Layer 5: Barista foreground arms (clean De Casteljau sleeves, pick->use->put-away choreography OR 3 dances)
    drawBartenderForegroundArmsAndSpeech(
      ctx,
      state.activeSlots[0],
      state.bartenderSpeech,
      isFastBoost,
      isWaving,
      isDancing,
      state.danceTier,
      state.danceStyle,
      state.danceStartedAt,
      this.elapsedSec,
      this.baristaPosX,
      this.baristaWalkVelocity,
      this.idleElapsedSec,
      wakeUpProgress
    );

    // Layer 6: Fixed-pool particles (<= 60)
    drinkParticles.draw(ctx);
  }

  private emitStationAmbientParticles(
    drink: ActiveDrink | null,
    cupId: CupStationId,
    isFastBoost: boolean,
    isDancing: boolean
  ): void {
    if (!drink || drink.phase !== 'BREWING' || isDancing) return;
    if (isShakerLiftSubstep(drink)) return;

    const step = getBrewStep(drink.progress, drink.recipeId);
    const accent = RECIPE_MAP[drink.recipeId].accentColor;

    // Ice-cube chill mist droplets when cubes drop into the cup
    if (
      step.action === 'add_ice' &&
      !isBobaScoopSubstep(drink) &&
      drink.iceLevel !== 'NONE' &&
      Math.random() < 0.24
    ) {
      drinkParticles.emitAmbientPour(cupId, 636, '#E8F7FA', false, false);
      return;
    }

    if (step.action !== 'pour_mix') return;
    if (
      (drink.recipeId === 'coffee_milk' || drink.recipeId === 'cacao') &&
      drink.progress >= CAFE_POUR_END_PROGRESS
    )
      return;

    const isSodaPouring = drink.recipeId === 'berry_soda';
    const surfaceY = computeLiquidFillSnapshot(drink.recipeId, drink.progress).surfaceY;
    drinkParticles.emitAmbientPour(cupId, surfaceY, accent, isFastBoost, isSodaPouring);
  }

  private emitDanceVfxParticles(dance: DanceMotion): void {
    if (!dance.isDancing) return;
    this.danceFrameCounter += 1;
    const isNewBeat = dance.beatIndex !== this.prevDanceBeatIndex;
    if (isNewBeat) {
      this.prevDanceBeatIndex = dance.beatIndex;
    }

    const cx = BARISTA_CENTER_X + dance.swayX;
    if (dance.style === 'heart_sway') {
      if (!isNewBeat) return;
      for (let i = 0; i < 3; i += 1) {
        let sideSign = 0;
        let hx = cx;
        let hy = 426;
        if (i === 0) {
          sideSign = -1;
          hx = dance.leftHandX;
          hy = dance.leftHandY - 6;
        } else if (i === 1) {
          sideSign = 1;
          hx = dance.rightHandX;
          hy = dance.rightHandY - 6;
        }
        const vx =
          sideSign === 0
            ? (Math.random() - 0.5) * 14
            : sideSign * (16 + Math.random() * 18);
        drinkParticles.spawnDanceParticle(
          'heart',
          hx + (Math.random() - 0.5) * 10,
          hy,
          vx,
          -(42 + Math.random() * 24),
          6.4 + Math.random() * 2.2,
          0.95,
          DANCE_HEART_COLORS[i % DANCE_HEART_COLORS.length]
        );
      }
      drinkParticles.spawnDanceParticle(
        'sparkle',
        cx + (Math.random() - 0.5) * 84,
        448 + Math.random() * 28,
        (Math.random() - 0.5) * 20,
        -(24 + Math.random() * 20),
        4.2,
        0.75,
        '#F7C95B'
      );
      return;
    }

    if (dance.style === 'groove_wave') {
      // Emit delicate pastel light trail strictly at hand positions clear of barista face box
      if (this.danceFrameCounter % 2 !== 0) return;
      if (Math.abs(dance.leftHandX - cx) >= 28) {
        drinkParticles.spawnDanceParticle(
          'wave_trail',
          dance.leftHandX,
          dance.leftHandY,
          -12 + Math.cos(dance.beatPhase) * 8,
          -8,
          4.2,
          0.42,
          DANCE_WAVE_TRAIL_COLORS[this.danceFrameCounter % DANCE_WAVE_TRAIL_COLORS.length]
        );
      }
      if (Math.abs(dance.rightHandX - cx) >= 28) {
        drinkParticles.spawnDanceParticle(
          'wave_trail',
          dance.rightHandX,
          dance.rightHandY,
          12 + Math.cos(dance.beatPhase) * 8,
          -8,
          4.2,
          0.42,
          DANCE_WAVE_TRAIL_COLORS[(this.danceFrameCounter + 1) % DANCE_WAVE_TRAIL_COLORS.length]
        );
      }
      return;
    }

    // Style 3 ("Quẩy Nhiệt"): Beat-synced stars & hip-shake energy bursts
    if (!isNewBeat) return;
    for (let i = 0; i < 4; i += 1) {
      const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.45;
      const speed = 34 + Math.random() * 34;
      const originX = i % 2 === 0 ? dance.leftHandX : dance.rightHandX;
      const originY = i % 2 === 0 ? dance.leftHandY : dance.rightHandY;
      drinkParticles.spawnDanceParticle(
        'star',
        originX,
        originY - 4,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 18,
        4.6 + Math.random() * 2.0,
        0.65,
        DANCE_HYPE_STAR_COLORS[i % DANCE_HYPE_STAR_COLORS.length]
      );
    }
    if (dance.isBackFacing) {
      const hipSideSign = dance.beatIndex % 2 === 0 ? -1 : 1;
      drinkParticles.spawnDanceParticle(
        'sparkle',
        cx + dance.hipShakeX + hipSideSign * 42,
        610 + dance.bounceY,
        hipSideSign * 36,
        -22,
        5.0,
        0.55,
        '#F7C95B'
      );
    }
  }

  private syncBrewingPhaseSfx(
    primary: ActiveDrink | null,
    isDancing: boolean
  ): void {
    if (isDancing) {
      return;
    }
    this.prevStationKey1 = this.checkStationPhaseSfx(primary, this.prevStationKey1);
  }

  private checkStationPhaseSfx(drink: ActiveDrink | null, prevKey: string): string {
    if (!drink || drink.phase !== 'BREWING') {
      return '';
    }
    const step = getBrewStep(drink.progress, drink.recipeId);
    const nextKey = resolveSubstepKey(drink, step.step);

    if (nextKey !== prevKey) {
      const sfx = resolvePhaseSfx(drink, step.action);
      if (sfx) {
        drinkBarAudio.play(sfx);
      }
      return nextKey;
    }

    if (
      isSugarButtonSubstep(drink) &&
      this.elapsedSec - this.lastAmbientSfxSec >= 0.42
    ) {
      this.lastAmbientSfxSec = this.elapsedSec;
      drinkBarAudio.play('sugar_click');
      return nextKey;
    }

    const stepSfx = resolvePhaseSfx(drink, step.action);
    let sfxIntervalSec = 0.62;
    if (stepSfx === 'whip_froth') {
      sfxIntervalSec = 0.28;
    } else if (drink.recipeId === 'thai_tea' || drink.recipeId === 'peach_tea') {
      sfxIntervalSec = 0.46;
    }
    if (
      !isCupPickupSubstep(drink) &&
      !isLidPickupSubstep(drink) &&
      !isShakerLiftSubstep(drink) &&
      !isMatchaGrabSubstep(drink) &&
      !isMatchaReturnSubstep(drink) &&
      (step.action === 'dispense' || step.action === 'tool_prep') &&
      this.elapsedSec - this.lastAmbientSfxSec >= sfxIntervalSec
    ) {
      this.lastAmbientSfxSec = this.elapsedSec;
      if (stepSfx) {
        drinkBarAudio.play(stepSfx);
      }
    } else if (
      isBobaScoopSubstep(drink) &&
      this.elapsedSec - this.lastAmbientSfxSec >= 0.48
    ) {
      this.lastAmbientSfxSec = this.elapsedSec;
      drinkBarAudio.play('topping');
    } else if (
      step.action === 'add_ice' &&
      !isBobaScoopSubstep(drink) &&
      drink.iceLevel !== 'NONE' &&
      this.elapsedSec - this.lastAmbientSfxSec >= 0.48
    ) {
      this.lastAmbientSfxSec = this.elapsedSec;
      drinkBarAudio.play('ice_clink');
    } else if (
      step.action === 'pour_mix' &&
      !isShakerLiftSubstep(drink) &&
      this.elapsedSec - this.lastAmbientSfxSec >= 0.52
    ) {
      this.lastAmbientSfxSec = this.elapsedSec;
      const fill = computeLiquidFillSnapshot(drink.recipeId, drink.progress);
      const fillRatio = clamp01((CUP_BOTTOM_Y - fill.surfaceY) / Math.max(1, CUP_HEIGHT - 6));
      const pitchScale = 0.88 + fillRatio * 0.56;
      drinkBarAudio.play('pour', undefined, undefined, pitchScale);
      if (drink.recipeId === 'berry_soda') {
        drinkBarAudio.play('soda_fizz');
      }
    }

    return nextKey;
  }
}
