import { DRINK_BAR_PALETTE } from '@shared/config';
import { RECIPE_BREW_PHASES } from '@shared/recipes';
import type { BrewToolType, RecipeId } from '@shared/types';
import { roundedRectPath } from './drawBarScene';

export const CUP1_CX = 408;
export const CUP2_CX = 544;
export const CUP_BOTTOM_Y = 672; // Coaster center remains anchored on counter
export const CUP_HEIGHT = 117; // 0.75x of 156px for balanced proportions & open headroom
export const CUP_TOP_Y = CUP_BOTTOM_Y - CUP_HEIGHT; // 555
export const CUP_TOP_HALF_W = 36; // 0.75x of 48px
export const CUP_BOTTOM_HALF_W = 26; // 0.75x of 35px
export const CUP_CORNER_R = 15; // 0.75x of 20px

export interface Point2D {
  x: number;
  y: number;
}

export interface LiquidFillSnapshot {
  surfaceY: number;
  layer1BottomY: number;
  layer1TopY: number;
  layer2TopY: number | null;
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/**
 * Exact 2D rigid-body transform matching canvas translate(tx, ty) + rotate(rad).
 */
export function transformRotatedAnchor(
  originX: number,
  originY: number,
  angleRad: number,
  localX: number,
  localY: number
): Point2D {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: originX + localX * cos - localY * sin,
    y: originY + localX * sin + localY * cos,
  };
}

/**
 * Single source of truth for liquid layer heights & current surface Y inside a cup.
 * Shared between cup liquid rendering, pour stream endpoints, and particle bounds.
 */
export function computeLiquidFillSnapshot(
  recipeId: RecipeId,
  progress: number
): LiquidFillSnapshot {
  const usableHeight = CUP_HEIGHT - 6; // Fills up to ~90% of interior by end of P3
  const phases = RECIPE_BREW_PHASES[recipeId];
  const prepPhase = phases.find((p) => p.action === 'tool_prep');
  const pourPhase = phases.find((p) => p.action === 'pour_mix');
  const pourStart = pourPhase?.minProgress ?? 45;
  const pourSpan = Math.max(10, (pourPhase?.maxProgress ?? 75) - pourStart);
  const pourRatio = clamp01((progress - pourStart) / pourSpan);

  if (recipeId === 'matcha' || recipeId === 'coffee_milk') {
    if (progress < pourStart) {
      return {
        surfaceY: CUP_BOTTOM_Y - 8,
        layer1BottomY: CUP_BOTTOM_Y + 4,
        layer1TopY: CUP_BOTTOM_Y,
        layer2TopY: null,
      };
    }
    // Matcha: ~53% milk / 47% matcha; Cafe: ~21% milk bottom / ~79% dark coffee top
    const bottomFrac = recipeId === 'matcha' ? 0.48 : 0.19;
    const topFrac = recipeId === 'matcha' ? 0.42 : 0.71;
    const bottomRatio = clamp01(pourRatio * (recipeId === 'coffee_milk' ? 1.8 : 1.35));
    const layer1H = bottomRatio * usableHeight * bottomFrac;
    const layer1TopY = CUP_BOTTOM_Y - layer1H;

    const coffeeStartThreshold = recipeId === 'coffee_milk' ? 0.2 : 0.32;
    if (pourRatio > coffeeStartThreshold) {
      const topRatio = clamp01((pourRatio - coffeeStartThreshold) / (1 - coffeeStartThreshold));
      const layer2H = topRatio * usableHeight * topFrac;
      const layer2TopY = layer1TopY - layer2H;
      return {
        surfaceY: layer2TopY,
        layer1BottomY: CUP_BOTTOM_Y + 4,
        layer1TopY,
        layer2TopY,
      };
    }

    return {
      surfaceY: layer1TopY,
      layer1BottomY: CUP_BOTTOM_Y + 4,
      layer1TopY,
      layer2TopY: null,
    };
  }

  if (recipeId === 'berry_soda') {
    const syrupStart = prepPhase?.minProgress ?? 18;
    const syrupSpan = Math.max(10, (prepPhase?.maxProgress ?? 45) - syrupStart);
    if (progress < syrupStart) {
      return {
        surfaceY: CUP_BOTTOM_Y - 8,
        layer1BottomY: CUP_BOTTOM_Y + 4,
        layer1TopY: CUP_BOTTOM_Y,
        layer2TopY: null,
      };
    }
    const syrupRatio = clamp01((progress - syrupStart) / syrupSpan);
    const syrupH = syrupRatio * usableHeight * 0.24;
    const syrupTopY = CUP_BOTTOM_Y - syrupH;

    if (progress >= pourStart) {
      const sodaH = pourRatio * usableHeight * 0.66;
      const sodaTopY = syrupTopY - sodaH;
      return {
        surfaceY: sodaTopY,
        layer1BottomY: CUP_BOTTOM_Y + 4,
        layer1TopY: syrupTopY,
        layer2TopY: sodaTopY,
      };
    }

    return {
      surfaceY: syrupTopY,
      layer1BottomY: CUP_BOTTOM_Y + 4,
      layer1TopY: syrupTopY,
      layer2TopY: null,
    };
  }

  // Uniform single-color drinks: thai_tea, blue_citrus (~90% cup height)
  if (progress < pourStart) {
    return {
      surfaceY: CUP_BOTTOM_Y - 8,
      layer1BottomY: CUP_BOTTOM_Y + 4,
      layer1TopY: CUP_BOTTOM_Y,
      layer2TopY: null,
    };
  }
  const fillH = pourRatio * usableHeight * 0.90;
  const topY = CUP_BOTTOM_Y - fillH;
  return {
    surfaceY: topY,
    layer1BottomY: CUP_BOTTOM_Y + 4,
    layer1TopY: topY,
    layer2TopY: null,
  };
}

export interface PourVesselParams {
  toolType: BrewToolType;
  handX: number;
  handY: number;
  cupCx: number;
  side: -1 | 1; // -1 = left bartender pouring right, +1 = right bartender pouring left
  liquidColor: string;
  accentColor: string;
  targetSurfaceY: number;
  isFastBoost: boolean;
  isSodaFizz: boolean;
  elapsedSec: number;
}

/**
 * Shared physics-accurate pouring renderer:
 * 1. Tilts bottle/carafe/bowl ~118deg toward cup center.
 * 2. Computes true world spout anchor after rotation.
 * 3. Connects Bezier liquid stream from exact spout anchor straight down to targetSurfaceY.
 * 4. Draws splash droplets + ripples strictly inside cup bounds at targetSurfaceY.
 */
export function drawPourLiquidEffect(
  ctx: CanvasRenderingContext2D,
  params: PourVesselParams
): void {
  const {
    toolType,
    handX,
    handY,
    cupCx,
    side,
    liquidColor,
    accentColor,
    targetSurfaceY,
    isFastBoost,
    isSodaFizz,
    elapsedSec,
  } = params;

  // Direction toward cup center: left bartender (side = -1) pours right (+1)
  const pourDir = -side;
  const isBowl = toolType === 'chasen';
  // Bottles/carafes tilt ~118 deg (2.06 rad); matcha bowl tilts ~66 deg (1.15 rad) from rim lip
  const tiltAngleRad = pourDir * (isBowl ? 1.15 : 2.06);
  const spout = isBowl
    ? transformRotatedAnchor(handX, handY, tiltAngleRad, pourDir * 14, -2)
    : transformRotatedAnchor(handX, handY, tiltAngleRad, 0, -29);

  const clampedTargetY = Math.max(
    CUP_TOP_Y + 12,
    Math.min(CUP_BOTTOM_Y - 8, targetSurfaceY)
  );
  const impactX = cupCx - pourDir * 4;
  const ctrlX = (spout.x + impactX) * 0.5 + pourDir * 5;
  const ctrlY = Math.min(spout.y + 18, (spout.y + clampedTargetY) * 0.42);

  // 1. Liquid stream (clipped smoothly above cup bottom, never cut off in mid-air)
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(spout.x, spout.y);
  ctx.quadraticCurveTo(ctrlX, ctrlY, impactX, clampedTargetY);

  const streamW = isFastBoost ? 8.5 : 6.8;
  ctx.lineWidth = streamW + 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = streamW;
  ctx.strokeStyle = liquidColor;
  ctx.stroke();

  // Crisp inner liquid highlight
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.stroke();

  // 2. Splash ripples & droplets at exact impactY inside cup walls
  drawSurfaceSplashAndFizz(
    ctx,
    impactX,
    clampedTargetY,
    cupCx,
    accentColor,
    isSodaFizz,
    elapsedSec
  );
  ctx.restore();

  // 3. Draw tilted vessel centered at hand pivot so spout aligns 1:1 with mouthLocalY
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(tiltAngleRad);

  if (toolType === 'chasen') {
    // Matcha bowl pouring from rim
    ctx.beginPath();
    ctx.arc(0, 0, 15, Math.PI, 0, true);
    ctx.closePath();
    ctx.fillStyle = '#FFFDF9';
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, -1, 14, 4.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = liquidColor;
    ctx.fill();
    ctx.stroke();
  } else if (toolType === 'soda_pour') {
    // Glass soda/syrup bottle with mouth at (0, -29)
    roundedRectPath(ctx, -9.5, -18, 19, 34, 6);
    ctx.fillStyle = liquidColor;
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();

    roundedRectPath(ctx, -6, -12, 12, 16, 3);
    ctx.fillStyle = '#FFFDF9';
    ctx.fill();

    roundedRectPath(ctx, -5, -29, 10, 12, 3);
    ctx.fillStyle = '#E8F7FA';
    ctx.fill();
    ctx.stroke();
  } else if (toolType === 'shaker') {
    // Open-mouth stainless/clear shaker pouring smooth milk tea stream from top mouth (0, -29)
    roundedRectPath(ctx, -11, -18, 22, 36, 6);
    ctx.fillStyle = '#F5EFE8';
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();

    roundedRectPath(ctx, -8.5, -14, 17, 22, 4);
    ctx.fillStyle = liquidColor;
    ctx.fill();

    // Open silver pouring collar (cap removed!)
    roundedRectPath(ctx, -9.5, -24, 19, 7, 3);
    ctx.fillStyle = '#E0D7CD';
    ctx.fill();
    ctx.stroke();

    roundedRectPath(ctx, -5.5, -29, 11, 6, 2.5);
    ctx.fillStyle = liquidColor;
    ctx.fill();
    ctx.stroke();
  } else {
    // Coffee carafe / Juice pitcher with spout at (0, -29)
    roundedRectPath(ctx, -10.5, -18, 21, 35, 6);
    ctx.fillStyle = '#FFFDF9';
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.stroke();

    roundedRectPath(ctx, -8.5, -8, 17, 15, 3);
    ctx.fillStyle = liquidColor;
    ctx.fill();

    roundedRectPath(ctx, -5.5, -29, 11, 12, 3);
    ctx.fillStyle = '#D89B63';
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function drawSurfaceSplashAndFizz(
  ctx: CanvasRenderingContext2D,
  impactX: number,
  surfaceY: number,
  cupCx: number,
  accentColor: string,
  isSodaFizz: boolean,
  elapsedSec: number
): void {
  const minX = cupCx - CUP_BOTTOM_HALF_W + 6;
  const maxX = cupCx + CUP_BOTTOM_HALF_W - 6;
  const clampX = (x: number) => Math.max(minX, Math.min(maxX, x));

  // Concentric ripple ring on surface
  const rippleR = 6 + ((elapsedSec * 14) % 9);
  ctx.beginPath();
  ctx.ellipse(impactX, surfaceY, rippleR, 2.8, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // 4 micro splash droplets bounded inside cup width
  const count = isSodaFizz ? 6 : 4;
  for (let i = 0; i < count; i += 1) {
    const phase = (elapsedSec * 4.5 + i * 0.27) % 1;
    const spread = ((i % 2 === 0 ? -1 : 1) * (4 + i * 2.8)) * phase;
    const arcY = surfaceY - Math.sin(phase * Math.PI) * (isSodaFizz ? 14 : 9);
    ctx.beginPath();
    ctx.arc(clampX(impactX + spread), arcY, isSodaFizz ? 2.4 : 2.0, 0, Math.PI * 2);
    ctx.fillStyle = isSodaFizz ? '#E8F7FA' : accentColor;
    ctx.fill();
  }
}

export function drawMotionArcs(
  ctx: CanvasRenderingContext2D,
  radiusX: number,
  radiusY: number
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineCap = 'round';
  ctx.lineWidth = 2.6;

  // Inner + outer pair of crisp motion arcs on each side
  ctx.beginPath();
  ctx.arc(-radiusX, 0, radiusY, Math.PI * 0.72, Math.PI * 1.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-radiusX - 6, 0, radiusY + 4, Math.PI * 0.8, Math.PI * 1.2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(radiusX, 0, radiusY, -Math.PI * 0.28, Math.PI * 0.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(radiusX + 6, 0, radiusY + 4, -Math.PI * 0.2, Math.PI * 0.2);
  ctx.stroke();
  ctx.restore();
}

export function drawRisingSteamWisps(
  ctx: CanvasRenderingContext2D,
  originX: number,
  originY: number,
  elapsedSec: number
): void {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i += 1) {
    const cycle = (elapsedSec * 0.75 + i * 0.33) % 1;
    const alpha = Math.sin(cycle * Math.PI) * 0.72;
    const xBase = originX + (i - 1) * 7;
    const yStart = originY - cycle * 14;
    const yEnd = yStart - 16;
    const sway = Math.sin(elapsedSec * 4 + i * 1.7) * 3.5;

    ctx.strokeStyle = `rgba(255, 253, 249, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(xBase, yStart);
    ctx.quadraticCurveTo(xBase + sway, (yStart + yEnd) * 0.5, xBase - sway * 0.5, yEnd);
    ctx.stroke();
  }
  ctx.restore();
}
