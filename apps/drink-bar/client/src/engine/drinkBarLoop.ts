import { STAGE_METRICS } from '@shared/config';
import { getBrewStep, RECIPE_MAP, type BrewPhaseAction } from '@shared/recipes';
import type { ActiveDrink, RecipeId, SfxKind } from '@shared/types';
import { drinkBarAudio } from '../services/audioManager';
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
  drawBartenderBody,
  drawBartenderForegroundArmsAndSpeech,
  isBobaScoopSubstep,
  isCupPickupSubstep,
  isHoldingOatsideSubstep,
  isLidPickupSubstep,
  isMatchaGrabSubstep,
  isMatchaReturnSubstep,
  isMatchaScoopSubstep,
  isMatchaShelfSubstep,
  isShakerDetachedSubstep,
  isShakerLiftSubstep,
  isSugarButtonSubstep,
  resolveShakerMachineFillRatio,
  resolveTargetBaristaX,
} from './drawBartender';
import { drawBarDrinkCups } from './drawDrinkCup';
import { drinkParticles, type CupStationId } from './particlePool';

const STEP2_PREP_SFX_MAP: Record<RecipeId, SfxKind> = {
  matcha: 'chasen',
  thai_tea: 'shaker',
  peach_tea: 'shaker',
  lime_tea: 'whip_froth',
  coffee_milk: 'whip_froth',
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
      return drink.recipeId === 'coffee_milk' ? 'cafe_drip' : 'pour';
    case 'tool_prep':
      return STEP2_PREP_SFX_MAP[drink.recipeId];
    case 'add_ice':
      return drink.iceLevel === 'NONE' ? null : 'ice_clink';
    case 'pour_mix':
      return 'pour';
    case 'topping':
      return 'topping';
    case 'seal':
      if (drink.progress >= STRAW_INSERT_START_PROGRESS) {
        return 'straw_insert';
      }
      // Fire crisp lid_snap strictly at the exact snap-lock frame (93.5%), not during downward approach
      return drink.progress >= LID_SNAP_MOMENT_PROGRESS ? 'lid_snap' : null;
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

export class DrinkBarCanvasLoop {
  private readonly canvas: HTMLCanvasElement;
  private rafId: number | null = null;
  private lastTickMs = 0;
  private elapsedSec = 0;
  private prevStationKey1 = '';
  private lastAmbientSfxSec = 0;
  private wasDancing = false;
  // Smooth horizontal barista walk position & velocity (zero per-frame allocations)
  private baristaPosX = BARISTA_CENTER_X;
  private baristaWalkVelocity = 0;
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
    isShakerDetached: false,
    shakerFillRatio: 0,
    isPressingSugarButton: false,
    isUsingFrother: false,
    isScoopingBoba: false,
    isScoopingIce: false,
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
    this.rafId = requestAnimationFrame(this.frame);
  }

  public stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
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
    this.elapsedSec += dtSec;

    const store = useDrinkBarStore.getState();
    store.tick(dtSec);

    const state = useDrinkBarStore.getState();
    const nowEpoch = Date.now();
    const isFastBoost = nowEpoch < state.speedBoostUntil;
    const isWaving = nowEpoch < state.waveUntil;
    const isDancing = nowEpoch < state.danceUntil;

    if (!this.wasDancing && isDancing) {
      drinkBarAudio.stopBrewingSfx();
    } else if (this.wasDancing && !isDancing) {
      drinkBarAudio.stopDanceMusic();
      this.prevStationKey1 = '';
    }
    this.wasDancing = isDancing;

    const primary = state.activeSlots[0];
    this.syncBrewingPhaseSfx(primary, isDancing);
    this.emitStationAmbientParticles(primary, 1, isFastBoost, isDancing);
    drinkParticles.update(dtSec);

    // Smoothly lerp barista X position toward active station equipment
    const targetBaristaX = resolveTargetBaristaX(primary, isDancing);
    const prevBaristaX = this.baristaPosX;
    const lerpAlpha = 1 - Math.exp(-7.5 * dtSec);
    this.baristaPosX += (targetBaristaX - this.baristaPosX) * lerpAlpha;
    if (Math.abs(targetBaristaX - this.baristaPosX) < 0.4) {
      this.baristaPosX = targetBaristaX;
    }
    this.baristaWalkVelocity = dtSec > 0 ? (this.baristaPosX - prevBaristaX) / dtSec : 0;

    // Update reusable equipment state snapshot in-place (zero per-frame allocations)
    if (primary && primary.phase === 'BREWING' && !isDancing) {
      const step = getBrewStep(primary.progress, primary.recipeId);
      const span = Math.max(1, step.maxProgress - step.minProgress);
      this.equipmentState.activeRecipeId = primary.recipeId;
      this.equipmentState.activeAction = step.action;
      this.equipmentState.stepProgress = clamp01((primary.progress - step.minProgress) / span);
      this.equipmentState.isFastBoost = isFastBoost;
      this.equipmentState.isPickingCup = isCupPickupSubstep(primary);
      this.equipmentState.isPickingLid = isLidPickupSubstep(primary);
      this.equipmentState.isTakingMatchaFromShelf = isMatchaShelfSubstep(primary);
      this.equipmentState.isHoldingOatside = isHoldingOatsideSubstep(primary);
      this.equipmentState.isShakerDetached = isShakerDetachedSubstep(primary);
      this.equipmentState.shakerFillRatio = resolveShakerMachineFillRatio(primary);
      this.equipmentState.isPressingSugarButton = isSugarButtonSubstep(primary);
      this.equipmentState.isUsingFrother =
        (step.action === 'tool_prep' &&
          (primary.recipeId === 'coffee_milk' || primary.recipeId === 'berry_soda')) ||
        (step.action === 'pour_mix' &&
          primary.recipeId === 'coffee_milk' &&
          primary.progress < CAFE_POUR_END_PROGRESS);
      this.equipmentState.isScoopingBoba = isBobaScoopSubstep(primary);
      this.equipmentState.isScoopingIce = step.action === 'add_ice' && !isBobaScoopSubstep(primary);
    } else {
      this.equipmentState.activeRecipeId = null;
      this.equipmentState.activeAction = null;
      this.equipmentState.stepProgress = 0;
      this.equipmentState.isFastBoost = false;
      this.equipmentState.isPickingCup = false;
      this.equipmentState.isPickingLid = false;
      this.equipmentState.isTakingMatchaFromShelf = false;
      this.equipmentState.isHoldingOatside = false;
      this.equipmentState.isShakerDetached = false;
      this.equipmentState.shakerFillRatio = 0;
      this.equipmentState.isPressingSugarButton = false;
      this.equipmentState.isUsingFrother = false;
      this.equipmentState.isScoopingBoba = false;
      this.equipmentState.isScoopingIce = false;
    }

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    this.render(ctx, isFastBoost, isWaving, isDancing);
  };

  private render(
    ctx: CanvasRenderingContext2D,
    isFastBoost: boolean,
    isWaving: boolean,
    isDancing: boolean
  ): void {
    const state = useDrinkBarStore.getState();

    // Layer 1: Airy café wall, 2-tier pastel shelves (tea urns, syrup pumps, matcha tin, oatside), pendant lamps
    drawBarBackdrop(ctx, this.elapsedSec, this.equipmentState);

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
      this.baristaWalkVelocity
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
      this.baristaWalkVelocity
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
    if (drink.recipeId === 'coffee_milk' && drink.progress >= CAFE_POUR_END_PROGRESS) return;

    const isSodaPouring = drink.recipeId === 'berry_soda';
    const surfaceY = computeLiquidFillSnapshot(drink.recipeId, drink.progress).surfaceY;
    drinkParticles.emitAmbientPour(cupId, surfaceY, accent, isFastBoost, isSodaPouring);
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

    const sfxIntervalSec =
      drink.recipeId === 'thai_tea' || drink.recipeId === 'peach_tea' ? 0.46 : 0.62;
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
      const sfx = resolvePhaseSfx(drink, step.action);
      if (sfx) {
        drinkBarAudio.play(sfx);
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
