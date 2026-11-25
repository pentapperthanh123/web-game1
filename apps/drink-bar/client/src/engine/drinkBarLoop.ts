import { STAGE_METRICS } from '@shared/config';
import { getBrewStep, RECIPE_MAP, type BrewPhaseAction } from '@shared/recipes';
import type { ActiveDrink, BrewToolType, SfxKind } from '@shared/types';
import { drinkBarAudio } from '../services/audioManager';
import { useDrinkBarStore } from '../store/drinkBarStore';
import { computeLiquidFillSnapshot } from './brewEffects';
import { drawBarBackdrop, drawBarCounter } from './drawBarScene';
import {
  drawBartenderBody,
  drawBartenderForegroundArmsAndSpeech,
} from './drawBartender';
import { drawBarDrinkCups } from './drawDrinkCup';
import { drinkParticles, type CupStationId } from './particlePool';

const TOOL_SFX_MAP: Record<BrewToolType, SfxKind> = {
  chasen: 'chasen',
  shaker: 'shaker',
  coffee_machine: 'cafe_drip',
  soda_pour: 'soda_fizz',
  juicer: 'juicer',
};

function resolvePhaseSfx(drink: ActiveDrink, action: BrewPhaseAction): SfxKind | null {
  switch (action) {
    case 'tool_prep':
      return TOOL_SFX_MAP[RECIPE_MAP[drink.recipeId].toolType];
    case 'add_ice':
      return drink.iceLevel === 'NONE' ? null : 'ice_clink';
    case 'pour_mix':
      return 'pour';
    case 'topping':
      return 'topping';
    case 'seal':
      return 'lid_snap';
  }
}

export class DrinkBarCanvasLoop {
  private readonly canvas: HTMLCanvasElement;
  private rafId: number | null = null;
  private lastTickMs = 0;
  private elapsedSec = 0;
  private prevStationKey1 = '';
  private prevStationKey2 = '';
  private lastAmbientSfxSec = 0;
  private wasDancing = false;

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
      // Force resume step SFX on active brewing stations immediately after dance ends
      this.prevStationKey1 = '';
      this.prevStationKey2 = '';
    }
    this.wasDancing = isDancing;

    this.syncBrewingPhaseSfx(state.activeSlots[0], state.activeSlots[1], isDancing);

    this.emitStationAmbientParticles(state.activeSlots[0], 1, isFastBoost, isDancing);
    this.emitStationAmbientParticles(state.activeSlots[1], 2, isFastBoost, isDancing);
    drinkParticles.update(dtSec);

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

    // Layer 1: Warm café wall, arch window, pendant lights
    drawBarBackdrop(ctx, this.elapsedSec);

    // Layer 2: Both bartenders standing naturally behind counter (or 3 TikTok dance styles)
    drawBartenderBody(
      ctx,
      state.bartenderMood,
      state.activeSlots[0],
      state.activeSlots[1],
      isFastBoost,
      isWaving,
      isDancing,
      state.danceTier,
      state.danceStyle,
      state.danceStartedAt,
      this.elapsedSec
    );

    // Layer 3: Full-width wooden counter top & front body + ingredient/topping stations
    drawBarCounter(ctx);

    // Layer 4: Both station layered drink cups on counter coasters (reading unified activeSlots)
    drawBarDrinkCups(
      ctx,
      state.activeSlots,
      state.config.language,
      this.elapsedSec,
      isDancing
    );

    // Layer 5: Bartender foreground arms (per-recipe tools OR 3 synchronized TikTok dance styles)
    drawBartenderForegroundArmsAndSpeech(
      ctx,
      state.activeSlots[0],
      state.activeSlots[1],
      state.bartenderSpeech,
      isFastBoost,
      isWaving,
      isDancing,
      state.danceTier,
      state.danceStyle,
      state.danceStartedAt,
      this.elapsedSec
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
    // Pause particle streams cleanly while bartenders dance or for non-bubbly cafe
    if (!drink || drink.phase !== 'BREWING' || isDancing) return;
    if (drink.recipeId === 'coffee_milk') return;

    const step = getBrewStep(drink.progress, drink.recipeId);
    const isSodaPouring =
      drink.recipeId === 'berry_soda' &&
      (step.action === 'tool_prep' || step.action === 'pour_mix');
    if (step.action !== 'pour_mix' && !isSodaPouring) return;

    const surfaceY = computeLiquidFillSnapshot(drink.recipeId, drink.progress).surfaceY;
    const accent = RECIPE_MAP[drink.recipeId].accentColor;
    drinkParticles.emitAmbientPour(cupId, surfaceY, accent, isFastBoost, isSodaPouring);
  }

  private syncBrewingPhaseSfx(
    primary: ActiveDrink | null,
    secondary: ActiveDrink | null,
    isDancing: boolean
  ): void {
    if (isDancing) {
      // Pause brewing tool ambient SFX cleanly while 2 bartenders perform TikTok Dance
      return;
    }
    this.prevStationKey1 = this.checkStationPhaseSfx(primary, this.prevStationKey1);
    this.prevStationKey2 = this.checkStationPhaseSfx(secondary, this.prevStationKey2);
  }

  private checkStationPhaseSfx(drink: ActiveDrink | null, prevKey: string): string {
    if (!drink || drink.phase !== 'BREWING') {
      return '';
    }
    const step = getBrewStep(drink.progress, drink.recipeId);
    const nextKey = `${drink.orderId}:${step.step}`;

    if (nextKey !== prevKey) {
      const sfx = resolvePhaseSfx(drink, step.action);
      if (sfx) {
        drinkBarAudio.play(sfx);
      }
      return nextKey;
    }

    const sfxIntervalSec =
      RECIPE_MAP[drink.recipeId].toolType === 'shaker' ? 0.46 : 0.65;
    if (
      step.action === 'tool_prep' &&
      this.elapsedSec - this.lastAmbientSfxSec >= sfxIntervalSec
    ) {
      this.lastAmbientSfxSec = this.elapsedSec;
      const sfx = resolvePhaseSfx(drink, step.action);
      if (sfx) {
        drinkBarAudio.play(sfx);
      }
    } else if (
      step.action === 'add_ice' &&
      drink.iceLevel !== 'NONE' &&
      drink.progress < 40 &&
      this.elapsedSec - this.lastAmbientSfxSec >= 0.52
    ) {
      this.lastAmbientSfxSec = this.elapsedSec;
      drinkBarAudio.play('ice_clink');
    } else if (
      step.action === 'pour_mix' &&
      this.elapsedSec - this.lastAmbientSfxSec >= 0.56
    ) {
      this.lastAmbientSfxSec = this.elapsedSec;
      const pitchScale =
        0.95 + Math.min(1, Math.max(0, (drink.progress - 45) / 30)) * 0.45;
      drinkBarAudio.play('pour', undefined, undefined, pitchScale);
      if (drink.recipeId === 'berry_soda') {
        drinkBarAudio.play('soda_fizz');
      }
    }

    return nextKey;
  }
}
