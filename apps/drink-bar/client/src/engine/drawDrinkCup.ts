import { DRINK_BAR_PALETTE, GAMEPLAY_LIMITS } from '@shared/config';
import { getMessages } from '@shared/i18n';
import {
  formatBrewStepBadge,
  RECIPE_BREW_PHASES,
  RECIPE_MAP,
} from '@shared/recipes';
import type { ActiveDrink, IceLevel, Language, RecipeId } from '@shared/types';
import {
  BOBA_SCOOP_END_PROGRESS,
  BOBA_SCOOP_START_PROGRESS,
  CAFE_CREAM_START_PROGRESS,
  clamp01,
  computeLiquidFillSnapshot,
  CUP1_CX,
  CUP2_CX,
  CUP_BOTTOM_HALF_W,
  CUP_BOTTOM_Y,
  CUP_CORNER_R,
  CUP_HEIGHT,
  CUP_PICKUP_END_PROGRESS,
  CUP_TOP_HALF_W,
  CUP_TOP_Y,
  LID_PICKUP_END_PROGRESS,
  THAI_TEA_CREAM_START_PROGRESS,
} from './brewEffects';
import { roundedRectPath } from './drawBarScene';

export { CUP1_CX, CUP2_CX, CUP_TOP_Y, CUP_BOTTOM_Y };

const SHOWCASE_SLIDE_DURATION_MS = 600;
const SHOWCASE_SLIDE_Y_PX = 18;
const SHOWCASE_SCALE_BONUS = 0.05;

export function computeShowcaseSlideFactor(drink: ActiveDrink | null): number {
  if (!drink || drink.phase !== 'SHOWCASE') {
    return 0;
  }
  const elapsedMs = Math.max(0, GAMEPLAY_LIMITS.SHOWCASE_DURATION_MS - drink.showcaseRemainingMs);
  const linearT = clamp01(elapsedMs / SHOWCASE_SLIDE_DURATION_MS);
  // Smooth ease-out cubic slide toward the front edge of the counter
  return 1 - Math.pow(1 - linearT, 3);
}

function buildCupInteriorPath(ctx: CanvasRenderingContext2D, cupCx: number): void {
  const tl = cupCx - CUP_TOP_HALF_W;
  const tr = cupCx + CUP_TOP_HALF_W;
  const bl = cupCx - CUP_BOTTOM_HALF_W;
  const br = cupCx + CUP_BOTTOM_HALF_W;

  ctx.beginPath();
  ctx.moveTo(tl, CUP_TOP_Y);
  ctx.lineTo(tr, CUP_TOP_Y);
  ctx.lineTo(br + 2, CUP_BOTTOM_Y - CUP_CORNER_R);
  ctx.quadraticCurveTo(br, CUP_BOTTOM_Y, br - CUP_CORNER_R, CUP_BOTTOM_Y);
  ctx.lineTo(bl + CUP_CORNER_R, CUP_BOTTOM_Y);
  ctx.quadraticCurveTo(bl, CUP_BOTTOM_Y, bl - 2, CUP_BOTTOM_Y - CUP_CORNER_R);
  ctx.closePath();
}

export function drawBarDrinkCups(
  ctx: CanvasRenderingContext2D,
  activeSlots: readonly [ActiveDrink | null, ActiveDrink | null],
  language: Language,
  elapsedSec: number,
  isDancing = false
): void {
  // Single primary central barista station at CUP1_CX (360)
  drawDrinkCupAtStation(ctx, CUP1_CX, activeSlots[0], language, elapsedSec, isDancing);
}

function drawDrinkCupAtStation(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  drink: ActiveDrink | null,
  language: Language,
  elapsedSec: number,
  isDancing: boolean
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Smooth forward handover slide when cup reaches 100% (SHOWCASE): slides straight toward waiting customers
  const slideFactor = computeShowcaseSlideFactor(drink);
  const slideDy = SHOWCASE_SLIDE_Y_PX * slideFactor;
  const cupScale = 1 + SHOWCASE_SCALE_BONUS * slideFactor;

  ctx.save();
  if (slideFactor > 0) {
    ctx.translate(cupCx, CUP_BOTTOM_Y + slideDy);
    ctx.scale(cupScale, cupScale);
    ctx.translate(-cupCx, -CUP_BOTTOM_Y);
  }

  // 1. Compact coaster & soft drop shadow scaled to ~70% cup base
  ctx.beginPath();
  ctx.ellipse(cupCx, CUP_BOTTOM_Y + 3.5, 30, 6.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(59, 40, 32, 0.16)';
  ctx.fill();

  // Active glowing coaster halo when order is running on this station
  if (drink && drink.phase === 'BREWING') {
    const pulse = 0.88 + Math.sin(elapsedSec * 4.5) * 0.12;
    const glowR = 29 * pulse;
    const glowGrad = ctx.createRadialGradient(
      cupCx,
      CUP_BOTTOM_Y + 1,
      12,
      cupCx,
      CUP_BOTTOM_Y + 1,
      glowR + 8
    );
    const glowColor = drink.isSignature ? 'rgba(247, 201, 91, 0.45)' : 'rgba(255, 235, 170, 0.52)';
    glowGrad.addColorStop(0, glowColor);
    glowGrad.addColorStop(1, 'rgba(255, 235, 170, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.ellipse(cupCx, CUP_BOTTOM_Y + 1, glowR + 6, (glowR + 6) * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft glowing outer ring
    ctx.beginPath();
    ctx.ellipse(cupCx, CUP_BOTTOM_Y + 1, 28, 6.2, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = drink.isSignature ? 'rgba(247, 201, 91, 0.85)' : 'rgba(255, 242, 190, 0.9)';
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(cupCx, CUP_BOTTOM_Y + 1, 26, 5.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = drink?.isSignature ? '#F7C95B' : '#E8B584';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  if (!drink) {
    ctx.restore();
    ctx.restore();
    return;
  }

  // Sub-step 0..CUP_PICKUP_END_PROGRESS: Cup is being carried from Cup Stack onto center coaster by barista
  if (drink.phase === 'BREWING' && drink.progress < CUP_PICKUP_END_PROGRESS) {
    ctx.restore();
    drawCupProgressPill(ctx, cupCx, drink, language, isDancing);
    ctx.restore();
    return;
  }

  const recipe = RECIPE_MAP[drink.recipeId];
  const progress = Math.max(0, Math.min(100, drink.progress));
  const hasFruit = drink.toppings.includes('fruit_slice');
  const hasCream = drink.toppings.includes('cream_swirl');
  const hasSparkle = drink.toppings.includes('sparkle_aura') || drink.isSignature;

  // 2. Signature / Sparkle Aura behind cup when sealing / finished
  if (hasSparkle || progress >= 92) {
    drawSparkleAura(ctx, cupCx, elapsedSec, drink.isSignature);
  }

  // 3. Glass backdrop tint (clean take-away silhouette, zero side handle)
  buildCupInteriorPath(ctx, cupCx);
  ctx.fillStyle = 'rgba(255, 253, 249, 0.48)';
  ctx.fill();

  // 4. Clipped liquid layers, persistent buoyant ice cubes (if ordered with ice) & thai_tea-only boba pearls
  ctx.save();
  buildCupInteriorPath(ctx, cupCx);
  ctx.clip();

  const liquidSurfaceY = drawLiquidLayersByRecipe(
    ctx,
    cupCx,
    drink.recipeId,
    progress,
    elapsedSec
  );

  // Boba pearls belong STRICTLY to thai_tea AND appear ONLY after the boba scoop step begins (43%+)!
  // NEVER draw boba on soda, matcha, cafe, or nuocep!
  const hasBottomBoba =
    drink.recipeId === 'thai_tea' && progress >= BOBA_SCOOP_START_PROGRESS + 1;

  // Keep ice cubes floating cleanly through P3 -> P4 -> P5 -> SHOWCASE (whenever iceLevel !== 'NONE')
  drawIceDropAndFloatingCubes(
    ctx,
    cupCx,
    drink.orderId,
    drink.recipeId,
    drink.iceLevel,
    progress,
    liquidSurfaceY,
    hasBottomBoba,
    elapsedSec
  );

  if (hasBottomBoba) {
    const bobaAlpha = clamp01((progress - (BOBA_SCOOP_START_PROGRESS + 1)) / 4);
    const hasLiquidYet = progress >= 60;
    if (bobaAlpha > 0.05) {
      drawBobaPearls(ctx, cupCx, liquidSurfaceY, elapsedSec, bobaAlpha, hasLiquidYet);
    }
  }

  // Cream Cheese (thai_tea >= 77%) / Salted Cream (cafe >= 78%) / Inner Foam (>= 78%) added ONLY AFTER main liquid pour finishes!
  let creamStartProgress = 78;
  if (drink.recipeId === 'thai_tea') {
    creamStartProgress = THAI_TEA_CREAM_START_PROGRESS;
  } else if (drink.recipeId === 'coffee_milk') {
    creamStartProgress = CAFE_CREAM_START_PROGRESS;
  }
  const creamSpan = Math.max(4, 84 - creamStartProgress);
  const usePlushCream = hasCream;

  if (!usePlushCream && progress >= creamStartProgress) {
    const foamGrow = clamp01((progress - creamStartProgress) / creamSpan);
    if (drink.recipeId === 'coffee_milk') {
      drawSaltedCoffeeCreamCap(ctx, cupCx, liquidSurfaceY, foamGrow);
    } else if (drink.recipeId === 'thai_tea') {
      drawInnerFoamLayer(ctx, cupCx, liquidSurfaceY, '#FFF6DC', foamGrow);
    } else {
      drawInnerFoamLayer(ctx, cupCx, liquidSurfaceY, recipe.secondaryColor, foamGrow);
      if (drink.recipeId === 'matcha') {
        drawMatchaDustingOnFoam(ctx, cupCx, liquidSurfaceY - 3, foamGrow);
      }
    }
  }

  ctx.restore();

  // 6. Plush cream cheese / whipped cream rising smoothly to fill dome lid (gifted Cream Swirl, strictly after main pour!)
  if (usePlushCream && progress >= creamStartProgress) {
    drawCreamSwirl(
      ctx,
      cupCx,
      Math.max(CUP_TOP_Y + 4, liquidSurfaceY + 2),
      recipe.accentColor,
      clamp01((progress - creamStartProgress) / creamSpan),
      drink.recipeId === 'thai_tea'
    );
  }

  // 7. Fresh fruit garnish perched on rim (always on blue_citrus orange juice, or gifted fruit_slice, >= 78%)
  const showFruitGarnish = hasFruit || drink.recipeId === 'blue_citrus';
  if (showFruitGarnish && progress >= 78) {
    drawFruitGarnish(ctx, cupCx, recipe.fruitType, recipe.accentColor);
  }

  // 8. Glass vertical specular reflections + completion shine sweep (94% -> 100%)
  drawGlassReflections(ctx, cupCx);
  if (progress >= 94) {
    drawCompletionShineSweep(ctx, cupCx, clamp01((progress - 94) / 6));
  }

  // 9. Crisp rounded cup outline: OPEN mouth until lid is carried over (>= LID_PICKUP_END_PROGRESS), then dome lid seals!
  buildCupInteriorPath(ctx, cupCx);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  if (progress >= LID_PICKUP_END_PROGRESS) {
    const lidDrop = clamp01((progress - LID_PICKUP_END_PROGRESS) / 5);
    drawDomeSealingLid(ctx, cupCx, lidDrop);
  } else {
    drawOpenCupRim(ctx, cupCx);
  }

  // 10. Subtle Signature gold emblem on cup front if Signature
  if (drink.isSignature) {
    drawSignatureCupBadge(ctx, cupCx);
  }

  // Restore cup handover transform so progress pill remains cleanly anchored above waiting guests
  ctx.restore();

  // 11. Neat phase progress pill below coaster on counter top (same activeSlots source)
  drawCupProgressPill(ctx, cupCx, drink, language, isDancing);

  ctx.restore();
}

function drawOpenCupRim(ctx: CanvasRenderingContext2D, cupCx: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cupCx, CUP_TOP_Y, CUP_TOP_HALF_W, 4.2, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 253, 249, 0.22)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  ctx.restore();
}

function drawDomeSealingLid(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  dropFactor: number
): void {
  const dropOffsetY = -(1 - dropFactor) * 14;
  ctx.save();
  ctx.translate(0, dropOffsetY);
  ctx.beginPath();
  ctx.arc(cupCx, CUP_TOP_Y - 1.5, CUP_TOP_HALF_W, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 253, 249, 0.58)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Lid snap-on rim band (drawn ONLY in P5 when sealed)
  roundedRectPath(
    ctx,
    cupCx - CUP_TOP_HALF_W - 3,
    CUP_TOP_Y - 4,
    (CUP_TOP_HALF_W + 3) * 2,
    8,
    4
  );
  ctx.fillStyle = 'rgba(255, 253, 249, 0.9)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  ctx.restore();
}

function resolveIceCubeCount(iceLevel: IceLevel): number {
  switch (iceLevel) {
    case 'NONE':
      return 0;
    case 'LESS':
      return 5;
    case 'EXTRA':
      return 13;
    case 'NORMAL':
    default:
      return 9;
  }
}

function drawLiquidLayersByRecipe(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  recipeId: RecipeId,
  progress: number,
  elapsedSec: number
): number {
  const fill = computeLiquidFillSnapshot(recipeId, progress);

  if (recipeId === 'matcha') {
    if (fill.layer1TopY < CUP_BOTTOM_Y - 1) {
      drawWavyLiquidBand(ctx, cupCx, fill.layer1TopY, fill.layer1BottomY, '#FFFDF7', elapsedSec, 2.4, 0);
    }
    if (fill.layer2TopY !== null) {
      drawWavyLiquidBand(ctx, cupCx, fill.layer2TopY, fill.layer1TopY + 8, '#A7D397', elapsedSec, 2.2, 1.5);
    }
    return fill.surfaceY;
  }

  if (recipeId === 'coffee_milk') {
    // Already-whisked rich Vietnamese iced coffee blend (NO redundant white milk layer at the bottom!)
    if (fill.layer1TopY < CUP_BOTTOM_Y - 1) {
      drawWavyLiquidBand(ctx, cupCx, fill.layer1TopY, fill.layer1BottomY, '#613820', elapsedSec, 1.5, 1.2);
      // Subtle roasted espresso richness gradient from bottom to top
      const roastGrad = ctx.createLinearGradient(0, fill.layer1TopY, 0, CUP_BOTTOM_Y);
      roastGrad.addColorStop(0, 'rgba(138, 86, 48, 0.24)');
      roastGrad.addColorStop(1, 'rgba(48, 24, 12, 0.34)');
      ctx.fillStyle = roastGrad;
      ctx.fillRect(
        cupCx - CUP_TOP_HALF_W,
        fill.layer1TopY,
        CUP_TOP_HALF_W * 2,
        Math.max(0, CUP_BOTTOM_Y - fill.layer1TopY + 2)
      );
    }
    return fill.surfaceY;
  }

  if (recipeId === 'berry_soda') {
    if (fill.layer1TopY < CUP_BOTTOM_Y - 1) {
      drawWavyLiquidBand(ctx, cupCx, fill.layer1TopY, fill.layer1BottomY, '#E04F6D', elapsedSec, 1.6, 0.3);
    }
    if (fill.layer2TopY !== null) {
      drawWavyLiquidBand(ctx, cupCx, fill.layer2TopY, fill.layer1TopY + 6, '#7FC8D9', elapsedSec, 2.0, 1.4);
      drawFizzBubbles(ctx, cupCx, fill.layer2TopY + 5, CUP_BOTTOM_Y - 6, elapsedSec);
    }
    return fill.surfaceY;
  }

  // Uniform single-layer drinks: thai_tea (#D89E68) and blue_citrus (#FF9526)
  if (fill.layer1TopY < CUP_BOTTOM_Y - 1) {
    const recipe = RECIPE_MAP[recipeId];
    drawWavyLiquidBand(ctx, cupCx, fill.layer1TopY, fill.layer1BottomY, recipe.baseColor, elapsedSec, 1.8, 0.6);
    if (recipeId === 'thai_tea') {
      const sugarGrad = ctx.createLinearGradient(0, CUP_BOTTOM_Y - 24, 0, CUP_BOTTOM_Y + 2);
      sugarGrad.addColorStop(0, 'rgba(116, 66, 36, 0)');
      sugarGrad.addColorStop(1, 'rgba(116, 66, 36, 0.34)');
      ctx.fillStyle = sugarGrad;
      ctx.fillRect(cupCx - CUP_TOP_HALF_W, CUP_BOTTOM_Y - 24, CUP_TOP_HALF_W * 2, 26);
    } else if (recipeId === 'blue_citrus') {
      drawFreshCitrusPulp(ctx, cupCx, fill.layer1TopY, fill.layer1BottomY, elapsedSec);
    }
  }
  return fill.surfaceY;
}

function drawFreshCitrusPulp(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  topY: number,
  bottomY: number,
  elapsedSec: number
): void {
  const span = Math.max(10, bottomY - topY);
  ctx.save();
  ctx.fillStyle = 'rgba(255, 240, 205, 0.45)';
  for (let i = 0; i < 6; i += 1) {
    const phase = (elapsedSec * 1.5 + i * 0.18) % 1;
    const px = cupCx + ((i % 2 === 0 ? -1 : 1) * (4 + i * 2.2)) + Math.sin(elapsedSec * 3 + i) * 1.6;
    const py = bottomY - phase * (span - 6);
    ctx.beginPath();
    ctx.ellipse(px, py, 1.8, 1.0, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function hashCupOrderSeed(orderId: string): number {
  let h = 2166136261;
  for (let i = 0; i < orderId.length; i += 1) {
    h ^= orderId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededIceUnit(cupSeed: number, index: number, channel: number): number {
  let x = cupSeed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 15), 0xc2b2ae35);
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296;
}

function computeTaperedMaxIceX(cubeY: number, cubeSize: number): number {
  const t = clamp01((cubeY - CUP_TOP_Y) / CUP_HEIGHT);
  const wallHalfW = CUP_TOP_HALF_W * (1 - t) + CUP_BOTTOM_HALF_W * t;
  const cornerMargin = cubeSize * 0.72 + 2.4;
  return Math.max(4, wallHalfW - cornerMargin);
}

function drawIceDropAndFloatingCubes(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  cupOrderId: string,
  recipeId: RecipeId,
  iceLevel: IceLevel,
  progress: number,
  liquidSurfaceY: number,
  reserveBottomForBoba: boolean,
  elapsedSec: number
): void {
  const cubeCount = resolveIceCubeCount(iceLevel);
  if (cubeCount <= 0) return;

  const phases = RECIPE_BREW_PHASES[recipeId];
  const icePhase = phases.find((p) => p.action === 'add_ice');
  // For thai_tea, boba is scooped first (42..49%) and ice drops right after (49..56%)
  const iceStart =
    recipeId === 'thai_tea' ? BOBA_SCOOP_END_PROGRESS : (icePhase?.minProgress ?? 42);
  const iceEnd = icePhase?.maxProgress ?? 56;

  // Ice appears once dropping starts (iceStart) and STAYS floating smoothly through pouring, sealing, and finished cup!
  if (progress < iceStart) {
    return;
  }

  const cupSeed = hashCupOrderSeed(cupOrderId);
  const seedBaseFrac = seededIceUnit(cupSeed, 0, 0);
  const isDroppingPhase = progress < iceEnd;
  const phaseProgress = clamp01((progress - iceStart) / Math.max(1, iceEnd - iceStart));

  const floorOffset = reserveBottomForBoba ? 18 : 7;
  const cupFloorY = CUP_BOTTOM_Y - floorOffset;
  const liquidDepth = Math.max(0, CUP_BOTTOM_Y - liquidSurfaceY);
  const buoyancyBlend = clamp01((liquidDepth - 10) / 20);

  for (let i = 0; i < cubeCount; i += 1) {
    // Proportionate cube scale for ~70% cup: 7.6px .. 8.6px with 2.2px rounded corners
    const size = 7.6 + seededIceUnit(cupSeed, i, 4) * 1.0;
    const half = size * 0.5;
    const rot = (seededIceUnit(cupSeed, i, 3) - 0.5) * 0.72;

    const goldenU = ((seedBaseFrac + i * 0.6180339887) % 1) * 2 - 1;
    const jitterX = (seededIceUnit(cupSeed, i, 1) - 0.5) * 0.14;
    const normX = Math.max(-0.88, Math.min(0.88, goldenU * 0.82 + jitterX));

    const jitterY = (seededIceUnit(cupSeed, i, 2) - 0.5) * 0.28;
    const depthFrac = clamp01((i + 0.35 + jitterY) / Math.max(1, cubeCount));

    const minBuoyantY = Math.max(CUP_TOP_Y + half + 5, liquidSurfaceY + size * 0.72 + 2);
    const maxSafeY = Math.min(cupFloorY - size * 0.5, minBuoyantY + Math.min(liquidDepth * 0.65, 26));
    const floatingSpan = Math.max(6, maxSafeY - minBuoyantY);

    const dryPileY = Math.max(
      CUP_TOP_Y + 10,
      cupFloorY - size * 0.55 - (1 - depthFrac) * Math.min(16, cubeCount * 1.6)
    );
    const buoyantY = minBuoyantY + depthFrac * floatingSpan;

    let cubeY = dryPileY * (1 - buoyancyBlend) + buoyantY * buoyancyBlend;
    const bobOffset =
      Math.sin(elapsedSec * 2.2 + i * 1.4 + seedBaseFrac * 6.28) * (0.65 * buoyancyBlend);
    cubeY = Math.max(minBuoyantY, Math.min(maxSafeY, cubeY + bobOffset));

    if (isDroppingPhase) {
      const cubeStart = (i / cubeCount) * 0.64;
      const localT = clamp01((phaseProgress - cubeStart) / 0.36);
      if (localT <= 0.01) {
        continue;
      }
      const targetY = dryPileY;
      const startY = CUP_TOP_Y - 8;
      if (localT < 0.75) {
        const fallT = localT / 0.75;
        cubeY = startY + (targetY - startY) * (fallT * fallT);
      } else {
        const bounceT = (localT - 0.75) / 0.25;
        const bounceOffset = Math.sin(bounceT * Math.PI) * 4.2 * (1 - bounceT);
        cubeY = targetY - bounceOffset;
      }
    }

    const maxSafeX = computeTaperedMaxIceX(cubeY, size);
    const clampedOx = normX * maxSafeX;

    ctx.save();
    ctx.translate(cupCx + clampedOx, cubeY);
    ctx.rotate(rot);
    roundedRectPath(ctx, -half, -half, size, size, 2.2);
    // Slightly more crystal-translucent once submerged/floating in liquid so drink colors shine clearly
    ctx.fillStyle = isDroppingPhase ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.44)';
    ctx.fill();
    ctx.lineWidth = 1.15;
    ctx.strokeStyle = isDroppingPhase ? 'rgba(59, 40, 32, 0.42)' : 'rgba(59, 40, 32, 0.26)';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-half + 1.6, -half + 3.8);
    ctx.lineTo(-half + 1.6, -half + 1.6);
    ctx.lineTo(-half + 3.8, -half + 1.6);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.stroke();

    ctx.restore();
  }
}

function drawFizzBubbles(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  topY: number,
  bottomY: number,
  elapsedSec: number
): void {
  const span = Math.max(14, bottomY - topY);
  ctx.save();
  for (let i = 0; i < 14; i += 1) {
    const cycle = (elapsedSec * 0.92 + i * 0.11) % 1;
    const bx = cupCx - 17 + ((i * 11) % 34) + Math.sin(elapsedSec * 4.5 + i) * 1.8;
    const by = bottomY - cycle * span;
    const r = 1.35 + (i % 3) * 0.7;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 255, 255, 0.85)' : 'rgba(232, 247, 250, 0.72)';
    ctx.fill();
    if (i % 3 === 0) {
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(78, 162, 184, 0.45)';
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawWavyLiquidBand(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  topY: number,
  bottomY: number,
  fillColor: string,
  elapsedSec: number,
  amplitude: number,
  phaseOffset: number
): void {
  const leftX = cupCx - CUP_TOP_HALF_W - 4;
  const rightX = cupCx + CUP_TOP_HALF_W + 4;
  const midX = cupCx;
  const waveA = Math.sin(elapsedSec * 4.2 + phaseOffset) * amplitude;
  const waveB = Math.cos(elapsedSec * 3.8 + phaseOffset) * amplitude;

  ctx.beginPath();
  ctx.moveTo(leftX, topY + waveA);
  ctx.quadraticCurveTo(cupCx - 14, topY - waveB, midX, topY + waveA * 0.5);
  ctx.quadraticCurveTo(cupCx + 14, topY + waveB, rightX, topY - waveA);
  ctx.lineTo(rightX, bottomY);
  ctx.lineTo(leftX, bottomY);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(leftX + 3, topY + waveA);
  ctx.quadraticCurveTo(cupCx - 14, topY - waveB, midX, topY + waveA * 0.5);
  ctx.quadraticCurveTo(cupCx + 14, topY + waveB, rightX - 3, topY - waveA);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
  ctx.stroke();
}

// Naturally scattered black boba pearl positions scaled to ~70% cup [offsetX, offsetYFromBottom, radius]
const BOBA_PEARL_LAYOUT: readonly (readonly [number, number, number])[] = [
  [-10, -7, 3.3],
  [1, -6.5, 3.4],
  [11, -8, 3.2],
  [-12, -17, 3.2],
  [-2, -16, 3.4],
  [8, -19, 3.3],
  [-8, -27, 3.3],
  [4, -28, 3.2],
  [14, -30, 3.0],
  [-13, -37, 3.1],
  [-1, -39, 3.2],
  [9, -41, 3.1],
  [-10, -49, 3.0],
  [2, -51, 3.1],
  [13, -54, 2.9],
];

function drawBobaPearls(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  liquidSurfaceY: number,
  elapsedSec: number,
  alpha: number,
  hasLiquidYet: boolean
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  // Before liquid is poured (43..60%), scooped boba pearls rest naturally at bottom of cup (first 6 pearls);
  // Once milk tea pours in (60%+), all 15 pearls scatter organically throughout the rising liquid body!
  const visibleCount = hasLiquidYet ? BOBA_PEARL_LAYOUT.length : 6;
  for (let i = 0; i < visibleCount; i += 1) {
    const [ox, dy, r] = BOBA_PEARL_LAYOUT[i];
    const py = CUP_BOTTOM_Y + dy;
    if (hasLiquidYet && py < liquidSurfaceY + 6) {
      continue;
    }
    const bounce = hasLiquidYet ? Math.sin(elapsedSec * 2.8 + i * 1.15) * 0.65 : 0;
    const px = cupCx + ox;
    ctx.beginPath();
    ctx.arc(px, py + bounce, r, 0, Math.PI * 2);
    ctx.fillStyle = '#4A2E23';
    ctx.fill();
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px - 0.9, py + bounce - 0.9, 0.95, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fill();
  }
  ctx.restore();
}

function drawCreamSwirl(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  surfaceY: number,
  accentColor: string,
  grow: number,
  isMilkTeaPlush = false
): void {
  const scale = 0.35 + grow * 0.65;
  ctx.save();
  // Anchor base directly on liquid surface so cream rises smoothly up to fill dome lid with zero empty gap
  ctx.translate(cupCx, surfaceY);
  ctx.scale(scale, scale);

  const baseFill = isMilkTeaPlush ? '#FFF7E2' : '#FFFDF7';
  const midFill = isMilkTeaPlush ? '#FFFDF7' : '#FFF8EE';

  // Bottom cream cheese layer resting flush on liquid surface (scaled to ~70% dome cavity)
  roundedRectPath(ctx, -23, -11, 46, 14, 6.5);
  ctx.fillStyle = baseFill;
  ctx.fill();
  ctx.lineWidth = 2.1;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Middle swirl tier filling lower dome cavity
  roundedRectPath(ctx, -18, -21, 36, 12.5, 6);
  ctx.fillStyle = midFill;
  ctx.fill();
  ctx.stroke();

  // Top whipped peak filling cleanly inside upper dome arch
  ctx.beginPath();
  ctx.moveTo(-11, -19);
  ctx.quadraticCurveTo(0, -34, 11, -19);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(-6, -13, 1.6, 0, Math.PI * 2);
  ctx.arc(6.5, -11.5, 1.7, 0, Math.PI * 2);
  ctx.arc(0.5, -22, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMatchaDustingOnFoam(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  surfaceY: number,
  grow: number
): void {
  const specks: readonly [number, number, number][] = [
    [-15, -1.5, 1.4],
    [-8, 0, 1.2],
    [0, -2, 1.5],
    [8.5, -1, 1.3],
    [15, -1.5, 1.3],
    [-4, 1.5, 1.1],
    [5.5, 1.5, 1.2],
  ];
  ctx.save();
  ctx.globalAlpha = grow;
  ctx.fillStyle = '#5F9A49';
  for (const [ox, oy, r] of specks) {
    ctx.beginPath();
    ctx.arc(cupCx + ox, surfaceY + oy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCompletionShineSweep(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  sweepRatio: number
): void {
  ctx.save();
  buildCupInteriorPath(ctx, cupCx);
  ctx.clip();
  const shineX = cupCx - CUP_TOP_HALF_W + sweepRatio * (CUP_TOP_HALF_W * 2 + 18);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.beginPath();
  ctx.moveTo(shineX - 10, CUP_TOP_Y);
  ctx.lineTo(shineX + 3, CUP_TOP_Y);
  ctx.lineTo(shineX - 13, CUP_BOTTOM_Y);
  ctx.lineTo(shineX - 26, CUP_BOTTOM_Y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawSaltedCoffeeCreamCap(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  surfaceY: number,
  grow: number
): void {
  const capH = 10.5 * grow;
  const topY = surfaceY - capH;
  ctx.save();

  ctx.fillStyle = '#C99A72';
  ctx.fillRect(cupCx - CUP_TOP_HALF_W, surfaceY - 3 * grow, CUP_TOP_HALF_W * 2, 6);

  ctx.fillStyle = '#FFF6E8';
  ctx.beginPath();
  ctx.moveTo(cupCx - CUP_TOP_HALF_W, surfaceY + 1);
  ctx.lineTo(cupCx - CUP_TOP_HALF_W, topY + 2.5);
  ctx.quadraticCurveTo(cupCx - 11, topY - 3, cupCx, topY + 1.5);
  ctx.quadraticCurveTo(cupCx + 12, topY - 3, cupCx + CUP_TOP_HALF_W, topY + 2.5);
  ctx.lineTo(cupCx + CUP_TOP_HALF_W, surfaceY + 1);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cupCx - CUP_TOP_HALF_W + 2, topY + 2.5);
  ctx.quadraticCurveTo(cupCx - 11, topY - 3, cupCx, topY + 1.5);
  ctx.quadraticCurveTo(cupCx + 12, topY - 3, cupCx + CUP_TOP_HALF_W - 2, topY + 2.5);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(111, 71, 50, 0.35)';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cupCx - 15, topY + 2.5);
  ctx.quadraticCurveTo(cupCx - 8, topY - 1, cupCx - 2, topY + 1.5);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.stroke();

  ctx.globalAlpha = grow * 0.85;
  ctx.strokeStyle = '#6F4732';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(cupCx - 13, topY + 4);
  ctx.quadraticCurveTo(cupCx - 3, topY + 1, cupCx + 4, topY + 4);
  ctx.quadraticCurveTo(cupCx + 11, topY + 5.5, cupCx + 15, topY + 3);
  ctx.stroke();

  ctx.fillStyle = '#8C593C';
  ctx.beginPath();
  ctx.arc(cupCx - 7, topY + 2.5, 1.1, 0, Math.PI * 2);
  ctx.arc(cupCx + 2, topY + 3, 1.1, 0, Math.PI * 2);
  ctx.arc(cupCx + 9, topY + 2, 1.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawInnerFoamLayer(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  surfaceY: number,
  foamColor: string,
  grow: number
): void {
  const foamH = 8.5 * grow;
  const topY = surfaceY - foamH;
  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = foamColor;
  ctx.beginPath();
  ctx.moveTo(cupCx - CUP_TOP_HALF_W, surfaceY + 3);
  ctx.lineTo(cupCx - CUP_TOP_HALF_W, topY + 2.5);
  ctx.quadraticCurveTo(cupCx - 14, topY - 3, cupCx, topY + 1.5);
  ctx.quadraticCurveTo(cupCx + 14, topY - 3, cupCx + CUP_TOP_HALF_W, topY + 2.5);
  ctx.lineTo(cupCx + CUP_TOP_HALF_W, surfaceY + 3);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cupCx - CUP_TOP_HALF_W + 3, topY + 2.5);
  ctx.quadraticCurveTo(cupCx - 14, topY - 3, cupCx, topY + 1.5);
  ctx.quadraticCurveTo(cupCx + 14, topY - 3, cupCx + CUP_TOP_HALF_W - 3, topY + 2.5);
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = 'rgba(59, 40, 32, 0.25)';
  ctx.stroke();
  ctx.restore();
}

function drawFruitGarnish(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  fruitType: 'leaf' | 'peach' | 'bean' | 'berry' | 'lime' | 'orange',
  accentColor: string
): void {
  const gx = cupCx + CUP_TOP_HALF_W - 3;
  const gy = CUP_TOP_Y - 2;

  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(0.28);

  if (fruitType === 'leaf') {
    ctx.beginPath();
    ctx.ellipse(0, -5, 7.5, 4, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#7FB86B';
    ctx.fill();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();
  } else if (fruitType === 'berry') {
    ctx.beginPath();
    ctx.arc(0, -2.5, 6.2, 0, Math.PI * 2);
    ctx.fillStyle = '#F0788C';
    ctx.fill();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();
  } else if (fruitType === 'orange' || fruitType === 'lime') {
    // Crisp citrus half-wheel garnish scaled to ~70% cup rim
    ctx.beginPath();
    ctx.arc(0, 0, 10.5, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = fruitType === 'orange' ? '#FF7A1A' : '#7FB86B';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 8.4, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = '#FFF8EE';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, 7.2, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = fruitType === 'orange' ? '#FFA633' : '#A7D397';
    ctx.fill();

    ctx.strokeStyle = '#FFF8EE';
    ctx.lineWidth = 1.2;
    for (let a = Math.PI * 0.2; a < Math.PI * 0.9; a += Math.PI * 0.22) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(Math.PI - a) * 7.2, -Math.sin(Math.PI - a) * 7.2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.ellipse(6.5, -9.5, 3.8, 2.1, 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#7FB86B';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 9, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();
  }

  ctx.restore();
}

function drawGlassReflections(ctx: CanvasRenderingContext2D, cupCx: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = 3.8;

  ctx.beginPath();
  ctx.moveTo(cupCx - CUP_TOP_HALF_W + 6, CUP_TOP_Y + 8);
  ctx.lineTo(cupCx - CUP_BOTTOM_HALF_W + 4.5, CUP_BOTTOM_Y - 10);
  ctx.stroke();

  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(cupCx + CUP_TOP_HALF_W - 6, CUP_TOP_Y + 10);
  ctx.lineTo(cupCx + CUP_BOTTOM_HALF_W - 5, CUP_BOTTOM_Y - 13);
  ctx.stroke();
  ctx.restore();
}

function drawSparkleAura(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  elapsedSec: number,
  isSignature: boolean
): void {
  const pulse = 0.94 + Math.sin(elapsedSec * 4.5) * 0.06;
  const radius = (isSignature ? 54 : 44) * pulse;
  const cy = (CUP_TOP_Y + CUP_BOTTOM_Y) * 0.5;
  const grad = ctx.createRadialGradient(cupCx, cy, 10, cupCx, cy, radius);
  if (isSignature) {
    grad.addColorStop(0, 'rgba(247, 201, 91, 0.42)');
    grad.addColorStop(1, 'rgba(247, 201, 91, 0)');
  } else {
    grad.addColorStop(0, 'rgba(255, 249, 214, 0.34)');
    grad.addColorStop(1, 'rgba(255, 249, 214, 0)');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cupCx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawSignatureCupBadge(ctx: CanvasRenderingContext2D, cupCx: number): void {
  const bw = 46;
  const bh = 13;
  const bx = cupCx;
  const by = CUP_TOP_Y + 28;

  ctx.save();
  roundedRectPath(ctx, bx - bw * 0.5, by - bh * 0.5, bw, bh, 6.5);
  ctx.fillStyle = '#FFF1C2';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.font = '900 7px "Nunito", sans-serif';
  ctx.fillStyle = '#8A5200';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ VIP', bx, by + 0.5);
  ctx.restore();
}

function drawCupProgressPill(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  drink: ActiveDrink,
  language: Language,
  isDancing: boolean
): void {
  const msg = getMessages(language);
  const badge = formatBrewStepBadge(
    drink,
    language,
    msg.readyLabel,
    isDancing && drink.phase === 'BREWING' ? msg.dancingPauseLabel : undefined
  );

  const pillW = drink.phase === 'SHOWCASE' || isDancing ? 116 : 124;
  const pillH = 21;
  const px = cupCx - pillW * 0.5;
  const py = CUP_BOTTOM_Y + 7;

  roundedRectPath(ctx, px, py, pillW, pillH, 11);
  let pillBg = '#FFFDF9';
  if (drink.phase === 'SHOWCASE') pillBg = '#FFF1C2';
  else if (isDancing) pillBg = '#FFE6EE';
  ctx.fillStyle = pillBg;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.font = '900 10px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = DRINK_BAR_PALETTE.TEXT_PRIMARY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge.pillText, cupCx, py + pillH * 0.5 + 0.5);
}
