import { DRINK_BAR_PALETTE } from '@shared/config';
import { getMessages } from '@shared/i18n';
import {
  formatBrewStepBadge,
  RECIPE_BREW_PHASES,
  RECIPE_MAP,
} from '@shared/recipes';
import type { ActiveDrink, IceLevel, Language, RecipeId } from '@shared/types';
import {
  clamp01,
  computeLiquidFillSnapshot,
  CUP1_CX,
  CUP2_CX,
  CUP_BOTTOM_HALF_W,
  CUP_BOTTOM_Y,
  CUP_CORNER_R,
  CUP_HEIGHT,
  CUP_TOP_HALF_W,
  CUP_TOP_Y,
} from './brewEffects';
import { roundedRectPath } from './drawBarScene';

export { CUP1_CX, CUP2_CX, CUP_TOP_Y, CUP_BOTTOM_Y };

function buildCupInteriorPath(ctx: CanvasRenderingContext2D, cupCx: number): void {
  const tl = cupCx - CUP_TOP_HALF_W;
  const tr = cupCx + CUP_TOP_HALF_W;
  const bl = cupCx - CUP_BOTTOM_HALF_W;
  const br = cupCx + CUP_BOTTOM_HALF_W;

  ctx.beginPath();
  ctx.moveTo(tl, CUP_TOP_Y);
  ctx.lineTo(tr, CUP_TOP_Y);
  ctx.lineTo(br + 3, CUP_BOTTOM_Y - CUP_CORNER_R);
  ctx.quadraticCurveTo(br, CUP_BOTTOM_Y, br - CUP_CORNER_R, CUP_BOTTOM_Y);
  ctx.lineTo(bl + CUP_CORNER_R, CUP_BOTTOM_Y);
  ctx.quadraticCurveTo(bl, CUP_BOTTOM_Y, bl - 3, CUP_BOTTOM_Y - CUP_CORNER_R);
  ctx.closePath();
}

export function drawBarDrinkCups(
  ctx: CanvasRenderingContext2D,
  activeSlots: readonly [ActiveDrink | null, ActiveDrink | null],
  language: Language,
  elapsedSec: number,
  isDancing = false
): void {
  drawDrinkCupAtStation(ctx, CUP1_CX, activeSlots[0], language, elapsedSec, false, isDancing);
  drawDrinkCupAtStation(ctx, CUP2_CX, activeSlots[1], language, elapsedSec, true, isDancing);
}

function drawDrinkCupAtStation(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  drink: ActiveDrink | null,
  language: Language,
  elapsedSec: number,
  isSecondaryIdleCoaster: boolean,
  isDancing: boolean
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Compact coaster & soft drop shadow anchored on counter top
  ctx.beginPath();
  ctx.ellipse(cupCx, CUP_BOTTOM_Y + 4, 42, 8.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(59, 40, 32, 0.16)';
  ctx.fill();

  // Active glowing coaster halo when order is running on this station
  if (drink && drink.phase === 'BREWING') {
    const pulse = 0.88 + Math.sin(elapsedSec * 4.5) * 0.12;
    const glowR = 40 * pulse;
    const glowGrad = ctx.createRadialGradient(cupCx, CUP_BOTTOM_Y + 1, 16, cupCx, CUP_BOTTOM_Y + 1, glowR + 10);
    const glowColor = drink.isSignature ? 'rgba(247, 201, 91, 0.45)' : 'rgba(255, 235, 170, 0.52)';
    glowGrad.addColorStop(0, glowColor);
    glowGrad.addColorStop(1, 'rgba(255, 235, 170, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.ellipse(cupCx, CUP_BOTTOM_Y + 1, glowR + 8, (glowR + 8) * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft glowing outer ring
    ctx.beginPath();
    ctx.ellipse(cupCx, CUP_BOTTOM_Y + 1, 38.5, 8.2, 0, 0, Math.PI * 2);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = drink.isSignature ? 'rgba(247, 201, 91, 0.85)' : 'rgba(255, 242, 190, 0.9)';
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.ellipse(cupCx, CUP_BOTTOM_Y + 1, 36, 7.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = drink?.isSignature ? '#F7C95B' : '#E8B584';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  if (!drink) {
    if (!isSecondaryIdleCoaster) {
      drawEmptyGlassWaiting(ctx, cupCx);
    }
    ctx.restore();
    return;
  }

  const recipe = RECIPE_MAP[drink.recipeId];
  const progress = Math.max(0, Math.min(100, drink.progress));
  const hasBoba = drink.toppings.includes('boba_pearls');
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

  // 4. Clipped liquid layers, staggered uniform ice cubes & boba pearls inside cup
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

  // Boba pearls: in Milk Tea from P1 (10%+), or in other drinks ONLY when gifted boba_pearls topping
  const hasBottomBoba =
    (drink.recipeId === 'thai_tea' && progress >= 10) ||
    (hasBoba && progress >= 75);

  drawIceDropAndFloatingCubes(
    ctx,
    cupCx,
    drink.orderId,
    drink.recipeId,
    drink.iceLevel,
    progress,
    liquidSurfaceY,
    hasBottomBoba || drink.recipeId === 'thai_tea',
    elapsedSec
  );

  if (hasBottomBoba) {
    const bobaAlpha =
      progress >= 75 ? 1 : clamp01((progress - 10) / 14);
    if (bobaAlpha > 0.05) {
      drawBobaPearls(ctx, cupCx, elapsedSec, bobaAlpha);
    }
  }

  // Inner foam / Salted cream cap + Matcha or Cocoa dusting strictly on liquid surface (P4: 75% -> 89%, cup stays OPEN!)
  const usePlushCream = hasCream || drink.recipeId === 'thai_tea';
  if (!usePlushCream && progress >= 75) {
    const foamGrow = clamp01((progress - 75) / 12);
    if (drink.recipeId === 'coffee_milk') {
      drawSaltedCoffeeCreamCap(ctx, cupCx, liquidSurfaceY, foamGrow);
    } else {
      drawInnerFoamLayer(ctx, cupCx, liquidSurfaceY, recipe.secondaryColor, foamGrow);
      if (drink.recipeId === 'matcha') {
        drawMatchaDustingOnFoam(ctx, cupCx, liquidSurfaceY - 4, foamGrow);
      }
    }
  }

  ctx.restore();

  // 6. Plush cream cheese / whipped cream rising smoothly to fill dome lid (Milk Tea & gifted Cream Swirl, P4-P5)
  if (usePlushCream && progress >= 75) {
    drawCreamSwirl(
      ctx,
      cupCx,
      Math.max(CUP_TOP_Y + 4, liquidSurfaceY + 2),
      recipe.accentColor,
      clamp01((progress - 75) / 12),
      drink.recipeId === 'thai_tea'
    );
  }

  // 7. Fresh fruit garnish perched on rim (P4: >= 78%)
  if (hasFruit && progress >= 78) {
    drawFruitGarnish(ctx, cupCx, recipe.fruitType, recipe.accentColor);
  }

  // 8. Glass vertical specular reflections + completion shine sweep (96% -> 100%)
  drawGlassReflections(ctx, cupCx);
  if (progress >= 96) {
    drawCompletionShineSweep(ctx, cupCx, clamp01((progress - 96) / 4));
  }

  // 9. Crisp rounded cup outline: OPEN mouth in P1-P4 (0-89%), dome lid ONLY in P5 (>= 90%, NO straw!)
  buildCupInteriorPath(ctx, cupCx);
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  if (progress >= 90) {
    const lidDrop = clamp01((progress - 90) / 4.5);
    drawDomeSealingLid(ctx, cupCx, lidDrop);
  } else {
    drawOpenCupRim(ctx, cupCx);
  }

  // 10. Subtle Signature gold emblem on cup front if Signature
  if (drink.isSignature) {
    drawSignatureCupBadge(ctx, cupCx);
  }

  // 11. Neat phase progress pill below coaster on counter top (same activeSlots source)
  drawCupProgressPill(ctx, cupCx, drink, language, isDancing);

  ctx.restore();
}

function drawEmptyGlassWaiting(ctx: CanvasRenderingContext2D, cupCx: number): void {
  buildCupInteriorPath(ctx, cupCx);
  ctx.fillStyle = 'rgba(255, 253, 249, 0.42)';
  ctx.fill();
  drawGlassReflections(ctx, cupCx);
  buildCupInteriorPath(ctx, cupCx);
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  drawOpenCupRim(ctx, cupCx);
}

function drawOpenCupRim(ctx: CanvasRenderingContext2D, cupCx: number): void {
  // Open elliptical glass mouth (clearly unsealed in P1 -> P4 so powder/toppings drop straight in)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cupCx, CUP_TOP_Y, CUP_TOP_HALF_W, 5.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 253, 249, 0.22)';
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  ctx.restore();
}

function drawDomeSealingLid(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  dropFactor: number
): void {
  const dropOffsetY = -(1 - dropFactor) * 18;
  ctx.save();
  ctx.translate(0, dropOffsetY);
  ctx.beginPath();
  ctx.arc(cupCx, CUP_TOP_Y - 2, CUP_TOP_HALF_W, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 253, 249, 0.58)';
  ctx.fill();
  ctx.lineWidth = 2.8;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Lid snap-on rim band (drawn ONLY in P5 when sealed)
  roundedRectPath(
    ctx,
    cupCx - CUP_TOP_HALF_W - 4,
    CUP_TOP_Y - 5,
    (CUP_TOP_HALF_W + 4) * 2,
    10,
    5
  );
  ctx.fillStyle = 'rgba(255, 253, 249, 0.9)';
  ctx.fill();
  ctx.lineWidth = 2.6;
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
    if (fill.layer1TopY < CUP_BOTTOM_Y - 1) {
      drawWavyLiquidBand(ctx, cupCx, fill.layer1TopY, fill.layer1BottomY, '#F7E8D4', elapsedSec, 1.8, 0);
    }
    if (fill.layer2TopY !== null) {
      drawWavyLiquidBand(ctx, cupCx, fill.layer2TopY, fill.layer1TopY + 8, '#6F4732', elapsedSec, 1.8, 1.7);
      // Soft warm caramel-milk coffee gradient band (#B0825C) blending the milk-coffee interface
      const blendGrad = ctx.createLinearGradient(0, fill.layer1TopY - 14, 0, fill.layer1TopY + 14);
      blendGrad.addColorStop(0, 'rgba(111, 71, 50, 0)');
      blendGrad.addColorStop(0.45, 'rgba(176, 130, 92, 0.92)');
      blendGrad.addColorStop(0.75, 'rgba(205, 166, 128, 0.85)');
      blendGrad.addColorStop(1, 'rgba(247, 232, 212, 0)');
      ctx.fillStyle = blendGrad;
      ctx.fillRect(
        cupCx - CUP_TOP_HALF_W,
        fill.layer1TopY - 14,
        CUP_TOP_HALF_W * 2,
        28
      );
    }
    return fill.surfaceY;
  }

  if (recipeId === 'berry_soda') {
    if (fill.layer1TopY < CUP_BOTTOM_Y - 1) {
      drawWavyLiquidBand(ctx, cupCx, fill.layer1TopY, fill.layer1BottomY, '#E04F6D', elapsedSec, 2.0, 0.3);
    }
    if (fill.layer2TopY !== null) {
      drawWavyLiquidBand(ctx, cupCx, fill.layer2TopY, fill.layer1TopY + 8, '#7FC8D9', elapsedSec, 2.6, 1.4);
      drawFizzBubbles(ctx, cupCx, fill.layer2TopY + 6, CUP_BOTTOM_Y - 8, elapsedSec);
    }
    return fill.surfaceY;
  }

  // Uniform single-layer drinks: thai_tea (#D89E68) and blue_citrus (#F49E60)
  if (fill.layer1TopY < CUP_BOTTOM_Y - 1) {
    const recipe = RECIPE_MAP[recipeId];
    drawWavyLiquidBand(ctx, cupCx, fill.layer1TopY, fill.layer1BottomY, recipe.baseColor, elapsedSec, 2.5, 0.6);
  }
  return fill.surfaceY;
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

  const icePhase = RECIPE_BREW_PHASES[recipeId].find((p) => p.action === 'add_ice');
  const iceStart = icePhase?.minProgress ?? 25;
  const iceEnd = icePhase?.maxProgress ?? 40;

  if (progress < iceStart) {
    return;
  }

  const cupSeed = hashCupOrderSeed(cupOrderId);
  const seedBaseFrac = seededIceUnit(cupSeed, 0, 0);
  const isDroppingPhase = progress < iceEnd;
  const phaseProgress = clamp01((progress - iceStart) / Math.max(1, iceEnd - iceStart));

  const floorOffset = reserveBottomForBoba ? 25 : 9;
  const cupFloorY = CUP_BOTTOM_Y - floorOffset;
  const liquidDepth = Math.max(0, CUP_BOTTOM_Y - liquidSurfaceY);
  const buoyancyBlend = clamp01((liquidDepth - 12) / 26);

  for (let i = 0; i < cubeCount; i += 1) {
    // Compact cube scale (~0.72x–0.78x of earlier 12px cubes): 8.6px .. 9.7px
    const size = 8.6 + seededIceUnit(cupSeed, i, 4) * 1.1;
    const half = size * 0.5;
    const rot = (seededIceUnit(cupSeed, i, 3) - 0.5) * 1.18;

    // Golden-ratio quasi-random horizontal spread with seeded jitter (no grid/columns, no clumping)
    const goldenU = ((seedBaseFrac + i * 0.6180339887) % 1) * 2 - 1;
    const jitterX = (seededIceUnit(cupSeed, i, 1) - 0.5) * 0.16;
    const normX = Math.max(-0.92, Math.min(0.92, goldenU * 0.88 + jitterX));

    // Organic vertical depth offset inside liquid floating zone
    const jitterY = (seededIceUnit(cupSeed, i, 2) - 0.5) * 0.36;
    const depthFrac = clamp01((i + 0.4 + jitterY) / Math.max(1, cubeCount));

    // Upper bound stays strictly below liquidSurfaceY so cubes never poke into cream/toppings/lid
    const minBuoyantY = Math.max(CUP_TOP_Y + half + 5, liquidSurfaceY + size * 0.62 + 1.5);
    const maxSafeY = Math.max(minBuoyantY, cupFloorY - size * 0.55);
    const floatingSpan = Math.min(maxSafeY - minBuoyantY, 28 + cubeCount * 1.4);

    // Dry resting height when ice sits at bottom before liquid is poured
    const dryPileY = Math.max(
      CUP_TOP_Y + 14,
      maxSafeY - (1 - depthFrac) * Math.min(24, cubeCount * 2.1)
    );
    const buoyantY = minBuoyantY + depthFrac * floatingSpan;

    let cubeY = dryPileY * (1 - buoyancyBlend) + buoyantY * buoyancyBlend;
    const bobOffset =
      Math.sin(elapsedSec * 1.9 + i * 1.37 + seedBaseFrac * 6.28) * (0.9 * buoyancyBlend);
    cubeY = Math.max(minBuoyantY, Math.min(maxSafeY, cubeY + bobOffset));

    if (isDroppingPhase) {
      const cubeStart = (i / cubeCount) * 0.64;
      const localT = clamp01((phaseProgress - cubeStart) / 0.36);
      if (localT <= 0.01) {
        continue;
      }
      const targetY = dryPileY;
      const startY = CUP_TOP_Y - 10;
      if (localT < 0.75) {
        const fallT = localT / 0.75;
        cubeY = startY + (targetY - startY) * (fallT * fallT);
      } else {
        const bounceT = (localT - 0.75) / 0.25;
        const bounceOffset = Math.sin(bounceT * Math.PI) * 5.5 * (1 - bounceT);
        cubeY = targetY - bounceOffset;
      }
    }

    // Taper-aware horizontal clamp so zero cube corners ever poke outside glass wall
    const maxSafeX = computeTaperedMaxIceX(cubeY, size);
    const clampedOx = normX * maxSafeX;

    ctx.save();
    ctx.translate(cupCx + clampedOx, cubeY);
    ctx.rotate(rot);
    roundedRectPath(ctx, -half, -half, size, size, 2.3);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.56)';
    ctx.fill();
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = 'rgba(59, 40, 32, 0.45)';
    ctx.stroke();

    // Crisp white specular gleam on top-left corner of every ice cube
    ctx.beginPath();
    ctx.moveTo(-half + 1.8, -half + 4.1);
    ctx.lineTo(-half + 1.8, -half + 1.8);
    ctx.lineTo(-half + 4.1, -half + 1.8);
    ctx.lineWidth = 1.35;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
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
  const span = Math.max(18, bottomY - topY);
  ctx.save();
  ctx.fillStyle = '#E8F7FA';
  for (let i = 0; i < 12; i += 1) {
    const cycle = (elapsedSec * 0.85 + i * 0.13) % 1;
    const bx = cupCx - 26 + ((i * 17) % 52) + Math.sin(elapsedSec * 4.5 + i) * 2.4;
    const by = bottomY - cycle * span;
    const r = 1.8 + (i % 3) * 0.9;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
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
  const leftX = cupCx - CUP_TOP_HALF_W - 6;
  const rightX = cupCx + CUP_TOP_HALF_W + 6;
  const midX = cupCx;
  const waveA = Math.sin(elapsedSec * 4.2 + phaseOffset) * amplitude;
  const waveB = Math.cos(elapsedSec * 3.8 + phaseOffset) * amplitude;

  ctx.beginPath();
  ctx.moveTo(leftX, topY + waveA);
  ctx.quadraticCurveTo(cupCx - 22, topY - waveB, midX, topY + waveA * 0.5);
  ctx.quadraticCurveTo(cupCx + 22, topY + waveB, rightX, topY - waveA);
  ctx.lineTo(rightX, bottomY);
  ctx.lineTo(leftX, bottomY);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(leftX + 4, topY + waveA);
  ctx.quadraticCurveTo(cupCx - 22, topY - waveB, midX, topY + waveA * 0.5);
  ctx.quadraticCurveTo(cupCx + 22, topY + waveB, rightX - 4, topY - waveA);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.52)';
  ctx.stroke();
}

function drawBobaPearls(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  elapsedSec: number,
  alpha: number
): void {
  const pearls: readonly [number, number, number][] = [
    [-18, CUP_BOTTOM_Y - 9, 4.4],
    [-9, CUP_BOTTOM_Y - 8, 4.7],
    [0, CUP_BOTTOM_Y - 10, 4.7],
    [10, CUP_BOTTOM_Y - 8, 4.5],
    [18, CUP_BOTTOM_Y - 10, 4.3],
    [-13, CUP_BOTTOM_Y - 17, 4.3],
    [-4, CUP_BOTTOM_Y - 18, 4.5],
    [6, CUP_BOTTOM_Y - 17, 4.3],
    [14, CUP_BOTTOM_Y - 18, 4.1],
  ];

  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < pearls.length; i += 1) {
    const [ox, py, r] = pearls[i];
    const bounce = Math.sin(elapsedSec * 3.1 + i) * 0.9;
    const px = cupCx + ox;
    ctx.beginPath();
    ctx.arc(px, py + bounce, r, 0, Math.PI * 2);
    ctx.fillStyle = '#4A2E23';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(px - 1.2, py + bounce - 1.2, 1.2, 0, Math.PI * 2);
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

  // Bottom cream cheese layer resting flush on liquid surface (extends smoothly into cup mouth)
  roundedRectPath(ctx, -33, -15, 66, 19, 8.5);
  ctx.fillStyle = baseFill;
  ctx.fill();
  ctx.lineWidth = 2.3;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Middle swirl tier filling lower dome cavity
  roundedRectPath(ctx, -26, -29, 52, 17, 8);
  ctx.fillStyle = midFill;
  ctx.fill();
  ctx.stroke();

  // Top whipped peak filling cleanly inside upper dome arch (no gap under dome lid)
  ctx.beginPath();
  ctx.moveTo(-15, -26);
  ctx.quadraticCurveTo(0, -47, 16, -26);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.arc(-8, -19, 2.0, 0, Math.PI * 2);
  ctx.arc(9, -16, 2.1, 0, Math.PI * 2);
  ctx.arc(1, -31, 1.9, 0, Math.PI * 2);
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
    [-22, -2, 1.8],
    [-11, 0, 1.5],
    [0, -3, 2.0],
    [12, -1, 1.6],
    [22, -2, 1.7],
    [-6, 2, 1.4],
    [8, 2, 1.5],
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
  const shineX = cupCx - CUP_TOP_HALF_W + sweepRatio * (CUP_TOP_HALF_W * 2 + 24);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.beginPath();
  ctx.moveTo(shineX - 14, CUP_TOP_Y);
  ctx.lineTo(shineX + 4, CUP_TOP_Y);
  ctx.lineTo(shineX - 18, CUP_BOTTOM_Y);
  ctx.lineTo(shineX - 36, CUP_BOTTOM_Y);
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
  const capH = 14 * grow;
  const topY = surfaceY - capH;
  ctx.save();

  // Warm coffee-foam base band (#C99A72) kissing espresso surface
  ctx.fillStyle = '#C99A72';
  ctx.fillRect(cupCx - CUP_TOP_HALF_W, surfaceY - 4 * grow, CUP_TOP_HALF_W * 2, 8);

  // Velvety salted cream top (#FFF6E8)
  ctx.fillStyle = '#FFF6E8';
  ctx.beginPath();
  ctx.moveTo(cupCx - CUP_TOP_HALF_W, surfaceY + 1);
  ctx.lineTo(cupCx - CUP_TOP_HALF_W, topY + 3);
  ctx.quadraticCurveTo(cupCx - 16, topY - 4, cupCx, topY + 2);
  ctx.quadraticCurveTo(cupCx + 18, topY - 4, cupCx + CUP_TOP_HALF_W, topY + 3);
  ctx.lineTo(cupCx + CUP_TOP_HALF_W, surfaceY + 1);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cupCx - CUP_TOP_HALF_W + 3, topY + 3);
  ctx.quadraticCurveTo(cupCx - 16, topY - 4, cupCx, topY + 2);
  ctx.quadraticCurveTo(cupCx + 18, topY - 4, cupCx + CUP_TOP_HALF_W - 3, topY + 3);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(111, 71, 50, 0.35)';
  ctx.stroke();

  // Delicate cocoa swirl streaks across salted cream top
  ctx.globalAlpha = grow * 0.85;
  ctx.strokeStyle = '#6F4732';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cupCx - 18, topY + 5);
  ctx.quadraticCurveTo(cupCx - 4, topY + 1, cupCx + 6, topY + 5);
  ctx.quadraticCurveTo(cupCx + 16, topY + 7, cupCx + 22, topY + 4);
  ctx.stroke();

  ctx.fillStyle = '#8C593C';
  ctx.beginPath();
  ctx.arc(cupCx - 10, topY + 3, 1.3, 0, Math.PI * 2);
  ctx.arc(cupCx + 3, topY + 4, 1.4, 0, Math.PI * 2);
  ctx.arc(cupCx + 13, topY + 2.5, 1.2, 0, Math.PI * 2);
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
  const foamH = 11 * grow;
  const topY = surfaceY - foamH;
  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.fillStyle = foamColor;
  ctx.beginPath();
  ctx.moveTo(cupCx - CUP_TOP_HALF_W, surfaceY + 4);
  ctx.lineTo(cupCx - CUP_TOP_HALF_W, topY + 3);
  ctx.quadraticCurveTo(cupCx - 20, topY - 4, cupCx, topY + 2);
  ctx.quadraticCurveTo(cupCx + 20, topY - 4, cupCx + CUP_TOP_HALF_W, topY + 3);
  ctx.lineTo(cupCx + CUP_TOP_HALF_W, surfaceY + 4);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cupCx - CUP_TOP_HALF_W + 4, topY + 3);
  ctx.quadraticCurveTo(cupCx - 20, topY - 4, cupCx, topY + 2);
  ctx.quadraticCurveTo(cupCx + 20, topY - 4, cupCx + CUP_TOP_HALF_W - 4, topY + 3);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(59, 40, 32, 0.25)';
  ctx.stroke();
  ctx.restore();
}

function drawFruitGarnish(
  ctx: CanvasRenderingContext2D,
  cupCx: number,
  fruitType: 'leaf' | 'peach' | 'bean' | 'berry' | 'lime',
  accentColor: string
): void {
  const gx = cupCx + CUP_TOP_HALF_W - 4;
  const gy = CUP_TOP_Y - 3;

  ctx.save();
  ctx.translate(gx, gy);
  ctx.rotate(0.28);

  if (fruitType === 'leaf') {
    ctx.beginPath();
    ctx.ellipse(0, -6, 9.5, 5, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#7FB86B';
    ctx.fill();
    ctx.lineWidth = 2.1;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();
  } else if (fruitType === 'berry') {
    ctx.beginPath();
    ctx.arc(0, -3, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#F0788C';
    ctx.fill();
    ctx.lineWidth = 2.1;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 11, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = accentColor;
    ctx.fill();
    ctx.lineWidth = 2.1;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();
  }

  ctx.restore();
}

function drawGlassReflections(ctx: CanvasRenderingContext2D, cupCx: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)';
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(cupCx - CUP_TOP_HALF_W + 8, CUP_TOP_Y + 11);
  ctx.lineTo(cupCx - CUP_BOTTOM_HALF_W + 6, CUP_BOTTOM_Y - 14);
  ctx.stroke();

  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(cupCx + CUP_TOP_HALF_W - 8, CUP_TOP_Y + 14);
  ctx.lineTo(cupCx + CUP_BOTTOM_HALF_W - 7, CUP_BOTTOM_Y - 18);
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
  const radius = (isSignature ? 72 : 60) * pulse;
  const cy = (CUP_TOP_Y + CUP_BOTTOM_Y) * 0.5;
  const grad = ctx.createRadialGradient(cupCx, cy, 12, cupCx, cy, radius);
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
  const bw = 62;
  const bh = 16;
  const bx = cupCx;
  const by = CUP_TOP_Y + 38;

  ctx.save();
  roundedRectPath(ctx, bx - bw * 0.5, by - bh * 0.5, bw, bh, 8);
  ctx.fillStyle = '#FFF1C2';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.font = '900 8.5px "Nunito", sans-serif';
  ctx.fillStyle = '#8A5200';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★ SIGNATURE', bx, by + 0.5);
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
  const pillH = 22;
  const px = cupCx - pillW * 0.5;
  const py = CUP_BOTTOM_Y + 11;

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
