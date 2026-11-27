import { DRINK_BAR_PALETTE } from '@shared/config';
import { RECIPE_BREW_PHASES } from '@shared/recipes';
import type { BrewToolType, RecipeId } from '@shared/types';
import { roundedRectPath } from './drawBarScene';

export const CUP1_CX = 360;
export const CUP2_CX = 360;
export const CUP_BOTTOM_Y = 672; // Coaster center remains anchored on counter
export const CUP_HEIGHT = 68; // Sleek compact cup keeping rim comfortably below barista chest
export const CUP_TOP_Y = CUP_BOTTOM_Y - CUP_HEIGHT; // 604
export const CUP_TOP_HALF_W = 23; // 46px rim width balanced with shorter cup height
export const CUP_BOTTOM_HALF_W = 16.5; // 33px sturdy base width
export const CUP_CORNER_R = 10;

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
  const usableHeight = CUP_HEIGHT - 6; // Fills up to ~90% of interior by end of P4
  const phases = RECIPE_BREW_PHASES[recipeId];
  const pourPhase = phases.find((p) => p.action === 'pour_mix');
  const pourStart = pourPhase?.minProgress ?? 56;
  const pourSpan = Math.max(10, (pourPhase?.maxProgress ?? 84) - pourStart);
  const pourRatio = clamp01((progress - pourStart) / pourSpan);

  if (recipeId === 'matcha') {
    if (progress < pourStart) {
      return {
        surfaceY: CUP_BOTTOM_Y - 6,
        layer1BottomY: CUP_BOTTOM_Y + 4,
        layer1TopY: CUP_BOTTOM_Y,
        layer2TopY: null,
      };
    }
    // Matcha: ~48% Oatside milk / ~42% matcha (pauses smoothly during milk->matcha swap beat!)
    const bottomRatio = clamp01(pourRatio / MATCHA_MILK_SPLIT_RATIO);
    const layer1H = bottomRatio * usableHeight * 0.48;
    const layer1TopY = CUP_BOTTOM_Y - layer1H;

    if (pourRatio > MATCHA_SWAP_END_RATIO) {
      const topRatio = clamp01((pourRatio - MATCHA_SWAP_END_RATIO) / (1 - MATCHA_SWAP_END_RATIO));
      const layer2H = topRatio * usableHeight * 0.42;
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
    if (progress < pourStart) {
      return {
        surfaceY: CUP_BOTTOM_Y - 6,
        layer1BottomY: CUP_BOTTOM_Y + 4,
        layer1TopY: CUP_BOTTOM_Y,
        layer2TopY: null,
      };
    }
    // Soda 2-color pour: Color 1 Berry Syrup (0..0.32) -> Swap vessel (0.32..0.44) -> Color 2 Cyan Soda (0.44..1.0)
    const syrupRatio = clamp01(pourRatio / SODA_SYRUP_SPLIT_RATIO);
    const syrupH = syrupRatio * usableHeight * 0.28;
    const syrupTopY = CUP_BOTTOM_Y - syrupH;

    if (pourRatio > SODA_SWAP_END_RATIO) {
      const sodaRatio = clamp01((pourRatio - SODA_SWAP_END_RATIO) / (1 - SODA_SWAP_END_RATIO));
      const sodaH = sodaRatio * usableHeight * 0.62;
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

  // Uniform blended drinks:
  // - thai_tea: pours from shaker (60..74%), then cream cheese cap added on top (77..84%)
  // - coffee_milk: pours already-whisked coffee+milk blend (56..75%), then salted cream cap added on top (78..84%)
  // - blue_citrus: pours fresh orange juice (56..78%), then orange wheel garnish (78..84%)
  let effectiveStart = pourStart;
  let effectiveEnd = pourPhase?.maxProgress ?? 84;
  let maxFillFrac = 0.90;

  if (recipeId === 'thai_tea') {
    effectiveStart = SHAKER_LIFT_END_PROGRESS;
    effectiveEnd = THAI_TEA_POUR_END_PROGRESS;
    maxFillFrac = 0.84;
  } else if (recipeId === 'peach_tea') {
    effectiveStart = SHAKER_LIFT_END_PROGRESS;
    effectiveEnd = 78;
    maxFillFrac = 0.88;
  } else if (recipeId === 'lime_tea') {
    effectiveEnd = 78;
    maxFillFrac = 0.88;
  } else if (recipeId === 'coffee_milk') {
    effectiveEnd = CAFE_POUR_END_PROGRESS;
    maxFillFrac = 0.84;
  } else if (recipeId === 'blue_citrus') {
    effectiveEnd = 78;
    maxFillFrac = 0.88;
  }

  if (progress < effectiveStart) {
    return {
      surfaceY: CUP_BOTTOM_Y - 6,
      layer1BottomY: CUP_BOTTOM_Y + 4,
      layer1TopY: CUP_BOTTOM_Y,
      layer2TopY: null,
    };
  }
  const effectiveSpan = Math.max(6, effectiveEnd - effectiveStart);
  const effectiveRatio = clamp01((progress - effectiveStart) / effectiveSpan);
  const fillH = effectiveRatio * usableHeight * maxFillFrac;
  const topY = CUP_BOTTOM_Y - fillH;
  return {
    surfaceY: topY,
    layer1BottomY: CUP_BOTTOM_Y + 4,
    layer1TopY: topY,
    layer2TopY: null,
  };
}

export const CUP_PICKUP_END_PROGRESS = 7;
export const TEA_URN_DISPENSE_END_PROGRESS = 11.5;
export const SYRUP_PUMP_END_PROGRESS = 15;
export const MATCHA_MILK_PREP_END_PROGRESS = 10.5;
export const MATCHA_GRAB_END_PROGRESS = 13;
export const MATCHA_SCOOP_END_PROGRESS = 17.5;
export const MATCHA_SHELF_END_PROGRESS = 20;
export const SUGAR_PRESS_START_PROGRESS = 15;
export const DISPENSE_END_PROGRESS = 20;
export const BOBA_SCOOP_START_PROGRESS = 42;
export const BOBA_SCOOP_END_PROGRESS = 49;
export const SHAKER_LIFT_END_PROGRESS = 60;
export const THAI_TEA_POUR_END_PROGRESS = 74;
export const THAI_TEA_CREAM_START_PROGRESS = 77;
export const CAFE_POUR_END_PROGRESS = 75;
export const CAFE_CREAM_START_PROGRESS = 78;
export const LID_PICKUP_END_PROGRESS = 90;
export const LID_SNAP_MOMENT_PROGRESS = 93.5;
export const LID_SNAP_END_PROGRESS = 96;
export const STRAW_INSERT_START_PROGRESS = 96;
export const STRAW_INSERT_END_PROGRESS = 99.5;

export const MATCHA_MILK_SPLIT_RATIO = 0.36;
export const MATCHA_SWAP_END_RATIO = 0.48;
export const SODA_SYRUP_SPLIT_RATIO = 0.32;
export const SODA_SWAP_END_RATIO = 0.44;

export type PourVesselKind =
  | BrewToolType
  | 'oatside_milk'
  | 'measuring_jug'
  | 'steel_pitcher';

export interface PourVesselParams {
  toolType: PourVesselKind;
  handX: number;
  handY: number;
  cupCx: number;
  side: -1 | 1; // -1 = barista hand pouring from left side of cup, +1 = pouring from right side
  liquidColor: string;
  accentColor: string;
  targetSurfaceY: number;
  isFastBoost: boolean;
  isSodaFizz: boolean;
  elapsedSec: number;
  vesselFillRatio?: number; // 0..1 remaining liquid inside tilted vessel (drains smoothly as cup fills!)
}

interface PourVesselGeometry {
  tiltRad: number;
  spoutLocalX: number;
  spoutLocalY: number;
}

const POUR_VESSEL_GEOMETRY: Readonly<Record<PourVesselKind, PourVesselGeometry>> = {
  oatside_milk: { tiltRad: 1.02, spoutLocalX: 12, spoutLocalY: -22 },
  measuring_jug: { tiltRad: 0.90, spoutLocalX: 15, spoutLocalY: -17 },
  steel_pitcher: { tiltRad: 0.90, spoutLocalX: 15, spoutLocalY: -17 },
  chasen: { tiltRad: 0.72, spoutLocalX: 21, spoutLocalY: -2 },
  shaker: { tiltRad: 1.78, spoutLocalX: 0, spoutLocalY: -25 },
  coffee_machine: { tiltRad: 0.90, spoutLocalX: 15, spoutLocalY: -17 },
  juicer: { tiltRad: 0.90, spoutLocalX: 15, spoutLocalY: -17 },
  soda_pour: { tiltRad: 1.82, spoutLocalX: 0, spoutLocalY: -27 },
};

/**
 * Shared physics-accurate pouring renderer:
 * 1. Uses the exact vessel prepared in P1 (chawan bowl, shaker, coffee carafe, juice pitcher, soda bottle).
 * 2. Computes true world spout anchor after rotation + horizontal mirror so stream connects 1:1 to spout lip.
 * 3. Draws downward parabolic liquid stream with #3B2820 (2.5px) outline and inner highlight.
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
    vesselFillRatio = 0.85,
  } = params;

  // Direction toward cup center: left bartender (side = -1) pours right (+1)
  const pourDir = -side;
  const geom = POUR_VESSEL_GEOMETRY[toolType];
  const tiltAngleRad = pourDir * geom.tiltRad;
  const spout = transformRotatedAnchor(
    handX,
    handY,
    tiltAngleRad,
    pourDir * geom.spoutLocalX,
    geom.spoutLocalY
  );

  const clampedTargetY = Math.max(
    CUP_TOP_Y + 9,
    Math.min(CUP_BOTTOM_Y - 6, targetSurfaceY)
  );
  const impactX = cupCx - pourDir * 2;
  // Smooth downward parabolic stream: ctrlY is strictly below spout.y so stream never bends upward
  const ctrlX = spout.x + (impactX - spout.x) * 0.55;
  const ctrlY = spout.y + (clampedTargetY - spout.y) * 0.32;

  // 1. Liquid stream with #3B2820 (2.5px) outline, organic flow wobble, and animated downward sheen
  ctx.save();
  ctx.lineCap = 'round';
  const flowWobble = Math.sin(elapsedSec * (isFastBoost ? 28 : 19)) * 0.45;
  const streamW = (isFastBoost ? 5.6 : 4.6) + flowWobble;

  ctx.beginPath();
  ctx.moveTo(spout.x, spout.y);
  ctx.quadraticCurveTo(ctrlX, ctrlY, impactX, clampedTargetY);

  ctx.lineWidth = streamW + 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = streamW;
  ctx.strokeStyle = liquidColor;
  ctx.stroke();

  // Crisp inner liquid highlight
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.stroke();

  // Animated downward-moving glossy bead dashes along the stream
  ctx.save();
  ctx.setLineDash([5, 9]);
  ctx.lineDashOffset = -(elapsedSec * (isFastBoost ? 110 : 72));
  ctx.lineWidth = 1.9;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.stroke();
  ctx.restore();

  // 2. Dual concentric splash ripples, foam crown & droplets at exact impactY matching active liquidColor
  drawSurfaceSplashAndFizz(
    ctx,
    impactX,
    clampedTargetY,
    cupCx,
    liquidColor,
    isSodaFizz,
    elapsedSec
  );
  ctx.restore();

  // 3. Draw tilted P1-matched vessel in canonical local space (+X always faces toward cup)
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(tiltAngleRad);
  ctx.scale(pourDir, 1);

  drawTiltedPourVessel(ctx, toolType, liquidColor, pourDir, vesselFillRatio);
  ctx.restore();
}

function drawTiltedPourVessel(
  ctx: CanvasRenderingContext2D,
  toolType: PourVesselKind,
  liquidColor: string,
  pourDir: number,
  vesselFillRatio = 0.85
): void {
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  if (toolType === 'oatside_milk') {
    // Iconic cute OATSIDE Barista Blend milk carton (warm oat-cream body, roasted-brown gable top, white spout at (+12, -22))
    // White pouring spout corner on +X top
    roundedRectPath(ctx, 5, -24.5, 8, 5, 2);
    ctx.fillStyle = '#FFFDF9';
    ctx.fill();
    ctx.stroke();

    // Roasted-oat brown gable-top roof
    ctx.beginPath();
    ctx.moveTo(-11, -15);
    ctx.lineTo(-7.5, -22);
    ctx.lineTo(7.5, -22);
    ctx.lineTo(11, -15);
    ctx.closePath();
    ctx.fillStyle = '#6E472B';
    ctx.fill();
    ctx.stroke();

    // Main warm oat-cream Tetra Pak carton body
    roundedRectPath(ctx, -11, -15, 22, 34, 3.5);
    ctx.fillStyle = '#F6EAD7';
    ctx.fill();
    ctx.stroke();

    // Iconic caramel-oat horizontal band across carton
    ctx.fillStyle = '#D49A6A';
    ctx.fillRect(-9.6, -4, 19.2, 12);

    // Cute minimalist OATSIDE bear-ear emblem on upper carton
    ctx.fillStyle = '#5C3A21';
    ctx.beginPath();
    ctx.arc(-4.2, -10.5, 2.2, 0, Math.PI * 2);
    ctx.arc(4.2, -10.5, 2.2, 0, Math.PI * 2);
    ctx.arc(0, -8.5, 4.4, 0, Math.PI * 2);
    ctx.fill();

    // Crisp un-mirrored "OAT" label text on caramel band
    ctx.save();
    ctx.scale(pourDir, 1);
    ctx.font = '900 6.5px "Fredoka", "Nunito", sans-serif';
    ctx.fillStyle = '#3B2820';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OAT', 0, 2.2);
    ctx.restore();

    // Subtle white carton highlight edge
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.fillRect(-8.5, -13, 2.4, 29);
    return;
  }

  if (toolType === 'chasen') {
    // Matcha Ceramic Chawan bowl (matches P1 bowl proportions, +X is pouring lip)
    // Foot ring at bottom of bowl
    roundedRectPath(ctx, -9, 17, 18, 4.5, 2);
    ctx.fillStyle = '#EFE6DC';
    ctx.fill();
    ctx.stroke();

    // Smooth round ceramic bowl belly with gentle pouring lip on +X rim
    ctx.beginPath();
    ctx.moveTo(-19, -1);
    ctx.bezierCurveTo(-19, 15, -10, 19, 0, 19);
    ctx.bezierCurveTo(11, 19, 18, 13, 21, -2);
    ctx.lineTo(-19, -1);
    ctx.closePath();
    ctx.fillStyle = '#FFFDF9';
    ctx.fill();
    ctx.stroke();

    // Whisked liquid surface inside rim ellipse
    ctx.beginPath();
    ctx.ellipse(0.5, -1.5, 19, 5.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = liquidColor;
    ctx.fill();
    ctx.stroke();

    // Soft creamy highlight on liquid surface
    ctx.beginPath();
    ctx.ellipse(-2, -1.5, 11, 2.2, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fill();
    return;
  }

  if (toolType === 'shaker') {
    // Realistic 3-piece tapered 700ml boba shaker (cap removed for pouring, liquid visibly drains 0.94 -> 0.0)
    drawRealisticBobaShaker(ctx, {
      liquidColor,
      fillRatio: vesselFillRatio,
      isCapClosed: false,
      isPouringTilted: true,
      isShaking: false,
      elapsedSec: 0,
    });
    return;
  }

  if (toolType === 'soda_pour') {
    // Glass soda / berry syrup bottle with mouth centered at (0, -27)
    roundedRectPath(ctx, -9.5, -16, 19, 34, 6);
    ctx.fillStyle = liquidColor;
    ctx.fill();
    ctx.stroke();

    // Crisp cream bottle label
    roundedRectPath(ctx, -6.5, -9, 13, 16, 3);
    ctx.fillStyle = '#FFFDF9';
    ctx.fill();

    // Glass bottle neck & mouth at (0, -27)
    roundedRectPath(ctx, -4.8, -28, 9.6, 13, 3);
    ctx.fillStyle = '#E8F7FA';
    ctx.fill();
    ctx.stroke();
    return;
  }

  if (toolType === 'measuring_jug' || toolType === 'juicer') {
    // Clear graduated measuring jug (ca đong có vạch chia) with handle & pouring lip at (+15, -17)
    ctx.beginPath();
    ctx.arc(-11, 2, 7.2, Math.PI * 0.5, Math.PI * 1.5, false);
    ctx.lineWidth = 2.6;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, -16);
    ctx.lineTo(15, -17);
    ctx.lineTo(10.5, -9);
    ctx.lineTo(10.5, 14);
    ctx.quadraticCurveTo(10.5, 19, 5.5, 19);
    ctx.lineTo(-6, 19);
    ctx.quadraticCurveTo(-11, 19, -11, 14);
    ctx.lineTo(-10, -16);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 253, 249, 0.9)';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Liquid inside graduated measuring jug
    roundedRectPath(ctx, -8.5, -8, 16.8, 24, 3.5);
    ctx.fillStyle = liquidColor;
    ctx.fill();

    // Crisp ml graduation lines on measuring jug
    ctx.strokeStyle = 'rgba(59, 40, 32, 0.6)';
    ctx.lineWidth = 1.3;
    for (let tick = 0; tick < 4; tick += 1) {
      const ty = -8 + tick * 6.5;
      const tw = tick % 2 === 0 ? 7.5 : 4.5;
      ctx.beginPath();
      ctx.moveTo(-8, ty);
      ctx.lineTo(-8 + tw, ty);
      ctx.stroke();
    }

    // Glass sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
    ctx.fillRect(3.5, -11, 2.8, 23);
    return;
  }

  // steel_pitcher & coffee_machine: Brushed stainless barista frothing pitcher (ca inox có mỏ rót)
  ctx.beginPath();
  ctx.arc(-11.5, 2, 7.5, Math.PI * 0.5, Math.PI * 1.5, false);
  ctx.lineWidth = 3.0;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  const steelGrad = ctx.createLinearGradient(-11, 0, 12, 0);
  steelGrad.addColorStop(0, '#CBD3DC');
  steelGrad.addColorStop(0.35, '#F5F8FA');
  steelGrad.addColorStop(0.75, '#DCE3EA');
  steelGrad.addColorStop(1, '#B8C2CC');

  ctx.beginPath();
  ctx.moveTo(-10.5, -16);
  ctx.lineTo(15, -17);
  ctx.lineTo(10.5, -9);
  ctx.lineTo(11.5, 14);
  ctx.quadraticCurveTo(11.5, 19, 6, 19);
  ctx.lineTo(-6, 19);
  ctx.quadraticCurveTo(-11.5, 19, -11.5, 14);
  ctx.lineTo(-10.5, -16);
  ctx.closePath();
  ctx.fillStyle = steelGrad;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Visible liquid crest inside stainless pitcher mouth
  ctx.beginPath();
  ctx.ellipse(0, -14.5, 9, 2.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = liquidColor;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.stroke();

  // Metallic vertical specular streak
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillRect(-5.5, -10, 3.2, 24);
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
  const minX = cupCx - CUP_BOTTOM_HALF_W + 3.5;
  const maxX = cupCx + CUP_BOTTOM_HALF_W - 3.5;
  const clampX = (x: number) => Math.max(minX, Math.min(maxX, x));

  // Dual phase-offset concentric expanding ripple rings on liquid meniscus
  for (let r = 0; r < 2; r += 1) {
    const cycle = (elapsedSec * 2.1 + r * 0.5) % 1;
    const rippleR = 3.2 + cycle * 9.5;
    const alpha = (1 - cycle) * 0.78;
    ctx.beginPath();
    ctx.ellipse(impactX, surfaceY, rippleR, 1.8 + cycle * 1.1, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Glossy foam impact crown right where stream meets surface
  const crownPulse = 3.2 + Math.sin(elapsedSec * 16) * 0.7;
  ctx.beginPath();
  ctx.ellipse(impactX, surfaceY, crownPulse + 1.8, 2.0, 0, 0, Math.PI * 2);
  ctx.fillStyle = isSodaFizz ? 'rgba(232, 247, 250, 0.9)' : 'rgba(255, 253, 249, 0.72)';
  ctx.fill();

  // Micro splash droplets arcing & landing cleanly inside cup width
  const count = isSodaFizz ? 6 : 4;
  for (let i = 0; i < count; i += 1) {
    const phase = (elapsedSec * 4.8 + i * 0.24) % 1;
    const dir = i % 2 === 0 ? -1 : 1;
    const spread = dir * (2.6 + i * 1.8) * phase;
    const arcY = surfaceY - Math.sin(phase * Math.PI) * (isSodaFizz ? 11.5 : 7.8);
    const radius = (isSodaFizz ? 2.1 : 1.75) * (1 - phase * 0.35);
    ctx.beginPath();
    ctx.arc(clampX(impactX + spread), arcY, radius, 0, Math.PI * 2);
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

/**
 * Graduated transparent measuring cup (ca đong có vạch chia) resting on counter or held under spigot.
 */
export function drawGraduatedMeasuringCup(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  liquidColor: string,
  fillRatio: number
): void {
  const w = 32;
  const h = 36;
  const leftX = cx - w * 0.5;
  const topY = bottomY - h;

  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Clear plastic side handle on left
  ctx.beginPath();
  ctx.arc(leftX - 1, topY + 18, 7, Math.PI * 0.5, Math.PI * 1.5, false);
  ctx.stroke();

  // Tapered transparent measuring cup body with small pouring lip on right
  ctx.beginPath();
  ctx.moveTo(leftX, topY);
  ctx.lineTo(leftX + w + 4, topY - 1);
  ctx.lineTo(leftX + w - 1, topY + 7);
  ctx.lineTo(leftX + w - 3, bottomY - 4);
  ctx.quadraticCurveTo(leftX + w - 3, bottomY, leftX + w - 7, bottomY);
  ctx.lineTo(leftX + 7, bottomY);
  ctx.quadraticCurveTo(leftX + 3, bottomY, leftX + 3, bottomY - 4);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255, 253, 249, 0.86)';
  ctx.fill();
  ctx.stroke();

  // Rising liquid level inside measuring cup
  const clampedFill = clamp01(fillRatio);
  if (clampedFill > 0.04) {
    const fillH = Math.max(4, (h - 7) * clampedFill);
    roundedRectPath(ctx, leftX + 5, bottomY - 2 - fillH, w - 10, fillH, 2.5);
    ctx.fillStyle = liquidColor;
    ctx.fill();
  }

  // Crisp ml graduation lines on front face
  ctx.strokeStyle = 'rgba(59, 40, 32, 0.65)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 4; i += 1) {
    const ty = topY + 8 + i * 6.5;
    const tw = i % 2 === 0 ? 9 : 5.5;
    ctx.beginPath();
    ctx.moveTo(leftX + 6, ty);
    ctx.lineTo(leftX + 6 + tw, ty);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Brushed stainless barista pitcher (ca inox có mỏ rót) + handheld electric frother wand (máy đánh tơi cầm tay).
 * Returns the world grip point (x, y) for the barista's hand holding the frother handle!
 */
export function drawStainlessPitcherWithFrother(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  liquidColor: string,
  foamColor: string,
  elapsedSec: number,
  isFastBoost: boolean
): Point2D {
  const w = 36;
  const h = 40;
  const leftX = cx - w * 0.5;
  const topY = bottomY - h;

  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Stainless handle on right side of pitcher
  ctx.beginPath();
  ctx.arc(leftX + w + 1, topY + 20, 8, -Math.PI * 0.5, Math.PI * 0.5, false);
  ctx.stroke();

  // Brushed stainless pitcher body with pouring beak on left
  const steelGrad = ctx.createLinearGradient(leftX, topY, leftX + w, topY);
  steelGrad.addColorStop(0, '#CBD3DC');
  steelGrad.addColorStop(0.35, '#F6F8FA');
  steelGrad.addColorStop(0.75, '#DCE3EA');
  steelGrad.addColorStop(1, '#B8C2CC');

  ctx.beginPath();
  ctx.moveTo(leftX - 4, topY - 1);
  ctx.lineTo(leftX + w, topY);
  ctx.lineTo(leftX + w - 2, bottomY - 5);
  ctx.quadraticCurveTo(leftX + w - 2, bottomY, leftX + w - 7, bottomY);
  ctx.lineTo(leftX + 7, bottomY);
  ctx.quadraticCurveTo(leftX + 2, bottomY, leftX + 2, bottomY - 5);
  ctx.lineTo(leftX + 1, topY + 7);
  ctx.closePath();
  ctx.fillStyle = steelGrad;
  ctx.fill();
  ctx.stroke();

  // Liquid & swirling micro-foam at pitcher mouth
  ctx.beginPath();
  ctx.ellipse(cx, topY + 1, 16, 4.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = liquidColor;
  ctx.fill();
  ctx.stroke();

  const spin = elapsedSec * (isFastBoost ? 22 : 15);
  ctx.fillStyle = foamColor;
  ctx.beginPath();
  ctx.arc(cx + Math.cos(spin) * 7, topY + 1 + Math.sin(spin) * 1.8, 3.8, 0, Math.PI * 2);
  ctx.arc(cx + Math.cos(spin + 2.1) * 6, topY + 1 + Math.sin(spin + 2.1) * 1.6, 3.2, 0, Math.PI * 2);
  ctx.arc(cx + Math.sin(spin * 0.8) * 4, topY + 1, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // Handheld electric milk frother (white ergonomic body + terracotta collar + steel shaft & spiral whisk)
  const vibX = Math.sin(spin * 1.6) * 2.2;
  const vibY = Math.cos(spin * 1.6) * 1.4;
  const gripX = cx + 11 + vibX;
  const gripY = topY - 28 + vibY;

  ctx.save();
  ctx.translate(gripX, gripY);
  ctx.rotate(0.28);

  // Stainless steel shaft dipping into pitcher foam
  ctx.strokeStyle = '#9BA7B4';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 14);
  ctx.lineTo(0, 31);
  ctx.stroke();

  // Spinning spiral ring whisk head at shaft tip
  const whiskSquash = 0.65 + Math.abs(Math.cos(spin * 1.8)) * 0.35;
  ctx.strokeStyle = '#7E8C9B';
  ctx.lineWidth = 1.9;
  ctx.beginPath();
  ctx.ellipse(0, 31, 5.2 * whiskSquash, 2.2, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Tapered terracotta/copper neck collar
  ctx.fillStyle = '#D68A6C';
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-4, 10);
  ctx.lineTo(-2.2, 16);
  ctx.lineTo(2.2, 16);
  ctx.lineTo(4, 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White ergonomic handheld frother body (Uniblend-style)
  ctx.beginPath();
  ctx.moveTo(-5.8, -14);
  ctx.quadraticCurveTo(-6.2, -2, -4.5, 11);
  ctx.lineTo(4.5, 11);
  ctx.quadraticCurveTo(6.2, -2, 5.8, -14);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Soft body shading & terracotta top cap
  ctx.fillStyle = '#D68A6C';
  roundedRectPath(ctx, -5.8, -16, 11.6, 4.2, 2);
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Side power switch & brand dot
  ctx.fillStyle = '#E8907C';
  roundedRectPath(ctx, 4.4, -3, 2.8, 6.5, 1.2);
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.fillStyle = '#E8907C';
  ctx.beginPath();
  ctx.arc(0, -5, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Micro vibration arcs near frother whisk head
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(-9, 24, 5, Math.PI * 0.7, Math.PI * 1.3);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(9, 24, 5, -Math.PI * 0.3, Math.PI * 0.3);
  ctx.stroke();

  ctx.restore();
  ctx.restore();

  return { x: gripX, y: gripY };
}

/**
 * Ceramic Matcha Chawan bowl + traditional Japanese bamboo Chasen whisk (chổi tre Chasen).
 * Animates authentic rapid W/M whisking strokes with flared bamboo tines & jade micro-foam.
 */
export function drawMatchaChawanWithFrother(
  ctx: CanvasRenderingContext2D,
  cx: number,
  bottomY: number,
  elapsedSec: number,
  isFastBoost: boolean
): Point2D {
  const topY = bottomY - 26;

  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Ceramic chawan foot ring
  roundedRectPath(ctx, cx - 10, bottomY - 5, 20, 5, 2);
  ctx.fillStyle = '#EFE6DC';
  ctx.fill();
  ctx.stroke();

  // Smooth rounded cream ceramic chawan belly
  ctx.beginPath();
  ctx.moveTo(cx - 21, topY);
  ctx.bezierCurveTo(cx - 21, bottomY - 5, cx - 11, bottomY - 3, cx, bottomY - 3);
  ctx.bezierCurveTo(cx + 11, bottomY - 3, cx + 21, bottomY - 5, cx + 21, topY);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // Vibrant green whisked matcha inside chawan mouth
  ctx.beginPath();
  ctx.ellipse(cx, topY, 21, 5.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#8BC478';
  ctx.fill();
  ctx.stroke();

  // Lush jade micro-foam bubbles swirling with the W/M chasen strokes
  const strokeSpeed = elapsedSec * (isFastBoost ? 24 : 16);
  ctx.fillStyle = '#DCF0CE';
  ctx.beginPath();
  ctx.arc(cx + Math.cos(strokeSpeed) * 8.5, topY + Math.sin(strokeSpeed) * 2.0, 4.1, 0, Math.PI * 2);
  ctx.arc(cx + Math.cos(strokeSpeed + 2.1) * 7.2, topY + Math.sin(strokeSpeed + 2.1) * 1.8, 3.4, 0, Math.PI * 2);
  ctx.arc(cx + Math.sin(strokeSpeed * 0.9) * 5.0, topY, 3.1, 0, Math.PI * 2);
  ctx.fill();

  // Authentic W/M wrist stroke motion for bamboo Chasen whisk
  const whiskX = Math.sin(strokeSpeed) * 7.5;
  const whiskY = Math.sin(strokeSpeed * 2) * 1.8;
  const whiskTilt = Math.cos(strokeSpeed) * 0.14 + 0.08;
  const gripX = cx + whiskX + 2;
  const gripY = topY - 26 + whiskY;

  ctx.save();
  ctx.translate(gripX, gripY);
  ctx.rotate(whiskTilt);

  // 1. Flared bell-shaped cluster of fine curved bamboo tines dipping into matcha foam
  ctx.fillStyle = '#EAD09C';
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(-4.5, 4);
  ctx.quadraticCurveTo(-12.5, 16, -9.5, 27);
  ctx.quadraticCurveTo(0, 30, 9.5, 27);
  ctx.quadraticCurveTo(12.5, 16, 4.5, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Individual fine curved bamboo prongs inside the bell crown
  ctx.strokeStyle = '#9C7338';
  ctx.lineWidth = 1.25;
  for (let i = -3; i <= 3; i += 1) {
    const spread = i * 2.6;
    const midSpread = i * 3.1;
    ctx.beginPath();
    ctx.moveTo(i * 1.1, 5);
    ctx.quadraticCurveTo(midSpread, 17, spread, 27);
    ctx.stroke();
  }

  // Green matcha foam coating on tips of tines
  ctx.fillStyle = 'rgba(167, 211, 151, 0.85)';
  ctx.beginPath();
  ctx.ellipse(0, 26.5, 8.8, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 2. Cylindrical carved golden bamboo handle (with authentic bamboo node joint)
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  roundedRectPath(ctx, -5, -18, 10, 22, 3.8);
  const bambooGrad = ctx.createLinearGradient(-5, 0, 5, 0);
  bambooGrad.addColorStop(0, '#CFA05C');
  bambooGrad.addColorStop(0.42, '#F2DCAA');
  bambooGrad.addColorStop(1, '#C5924C');
  ctx.fillStyle = bambooGrad;
  ctx.fill();
  ctx.stroke();

  // Bamboo node ring & black silk binding thread at waist where tines flare
  ctx.strokeStyle = '#8F622C';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-4.8, -8);
  ctx.lineTo(4.8, -8);
  ctx.stroke();

  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-4.8, 3.5);
  ctx.lineTo(4.8, 3.5);
  ctx.stroke();

  // Crisp white whisking motion arcs beside bamboo tines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(-13, 18, 5, Math.PI * 0.72, Math.PI * 1.28);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(13, 18, 5, -Math.PI * 0.28, Math.PI * 0.28);
  ctx.stroke();

  ctx.restore();
  ctx.restore();

  return { x: gripX, y: gripY - 8 };
}

/**
 * Shared sage-green "MATCHA" ceramic canister with warm bamboo airtight lid.
 * Drawn centered at (cx, cy) with height=50 and width=36 so shelf placement and counter pickup match 1:1.
 */
export function drawMatchaCanister(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  isLidOpen = false
): void {
  const w = 36;
  const h = 50;
  const x = cx - w * 0.5;
  const y = cy - h * 0.5;

  ctx.save();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Sage-green ceramic matcha canister body
  roundedRectPath(ctx, x, y + 9, w, h - 9, 7);
  ctx.fillStyle = '#9FD28B';
  ctx.fill();
  ctx.stroke();

  if (isLidOpen) {
    // Open canister rim revealing vibrant emerald matcha powder inside
    ctx.beginPath();
    ctx.ellipse(cx, y + 10, w * 0.44, 4.4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5F9A49';
    ctx.fill();
    ctx.lineWidth = 2.1;
    ctx.stroke();
  } else {
    // Warm bamboo wooden airtight lid + round knob
    roundedRectPath(ctx, x - 2, y + 3, w + 4, 9, 4);
    ctx.fillStyle = '#E5B887';
    ctx.fill();
    ctx.stroke();

    roundedRectPath(ctx, cx - 5, y, 10, 4.5, 2);
    ctx.fillStyle = '#D49E6A';
    ctx.fill();
    ctx.stroke();
  }

  // Cream front label with green leaf dot & "MATCHA" text
  roundedRectPath(ctx, x + 3.5, y + 19, w - 7, 20, 4);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#5F9A49';
  ctx.beginPath();
  ctx.ellipse(cx, y + 24.5, 4.5, 2.6, -0.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = '900 6.5px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = DRINK_BAR_PALETTE.TEXT_PRIMARY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MATCHA', cx, y + 33.5);

  ctx.restore();
}

export interface RealisticBobaShakerOptions {
  liquidColor: string;
  fillRatio: number; // 0..1
  isCapClosed: boolean;
  isPouringTilted: boolean;
  isShaking: boolean;
  elapsedSec: number;
}

/**
 * Shared realistic 3-piece tapered 700ml boba-shop shaker (PC frosted body, ml ticks, ice/foam slosh, dome strainer lid).
 * Used identically across Shaker Machine (P2), Shaker Lift (P4a), and Tilted Pour (P4b).
 */
export function drawRealisticBobaShaker(
  ctx: CanvasRenderingContext2D,
  opts: RealisticBobaShakerOptions
): void {
  const { liquidColor, fillRatio, isCapClosed, isPouringTilted, isShaking, elapsedSec } = opts;
  const clampedFill = clamp01(fillRatio);

  ctx.save();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Tapered polycarbonate 700ml shaker cup silhouette (wider top rim +-12.5, narrower sturdy base +-8.5)
  const buildBodyPath = () => {
    ctx.beginPath();
    ctx.moveTo(-12.5, -16);
    ctx.lineTo(12.5, -16);
    ctx.lineTo(9.2, 18);
    ctx.quadraticCurveTo(9.0, 21.5, 5.5, 21.5);
    ctx.lineTo(-5.5, 21.5);
    ctx.quadraticCurveTo(-9.0, 21.5, -9.2, 18);
    ctx.closePath();
  };

  // Frosted clear body backdrop
  buildBodyPath();
  const bodyGrad = ctx.createLinearGradient(-12, 0, 12, 0);
  bodyGrad.addColorStop(0, '#E9EEF2');
  bodyGrad.addColorStop(0.35, '#FFFDF9');
  bodyGrad.addColorStop(0.75, '#F2ECE7');
  bodyGrad.addColorStop(1, '#DCE2E8');
  ctx.fillStyle = bodyGrad;
  ctx.fill();

  // 2. Clipped interior liquid, sloshing foam & tumbling ice cubes
  ctx.save();
  buildBodyPath();
  ctx.clip();

  if (clampedFill > 0.03) {
    const innerHeight = 35;
    const fillH = Math.max(4, innerHeight * clampedFill);
    const sloshTilt = isShaking ? Math.sin(elapsedSec * 24) * 3.5 : 0;

    // When tilted pouring, liquid pools toward top mouth (-16); upright pools at bottom (+21)
    const liqTopY = isPouringTilted ? -16 : 21 - fillH;
    const liqBotY = isPouringTilted ? -16 + fillH : 22;

    ctx.beginPath();
    ctx.moveTo(-14, liqTopY + sloshTilt);
    ctx.lineTo(14, liqTopY - sloshTilt);
    ctx.lineTo(14, liqBotY);
    ctx.lineTo(-14, liqBotY);
    ctx.closePath();
    ctx.fillStyle = liquidColor;
    ctx.fill();

    // Creamy milk-tea froth head band
    if (!isPouringTilted) {
      ctx.fillStyle = 'rgba(255, 248, 232, 0.72)';
      ctx.beginPath();
      ctx.moveTo(-14, liqTopY + sloshTilt);
      ctx.lineTo(14, liqTopY - sloshTilt);
      ctx.lineTo(14, liqTopY - sloshTilt + 4.2);
      ctx.lineTo(-14, liqTopY + sloshTilt + 4.2);
      ctx.closePath();
      ctx.fill();
    }

    // Translucent ice cubes tumbling inside shaker
    ctx.fillStyle = 'rgba(232, 248, 255, 0.72)';
    ctx.strokeStyle = 'rgba(59, 40, 32, 0.35)';
    ctx.lineWidth = 1.2;
    const iceBaseY = isPouringTilted ? -10 : liqTopY + 7;
    const iceBounce = isShaking ? Math.cos(elapsedSec * 26) * 3.5 : 0;
    for (let i = 0; i < 2; i += 1) {
      const ix = i === 0 ? -4.5 : 3.5;
      const iy = iceBaseY + i * 4 + (i === 0 ? iceBounce : -iceBounce);
      ctx.save();
      ctx.translate(ix, iy);
      ctx.rotate(i === 0 ? -0.25 : 0.3);
      roundedRectPath(ctx, -3, -3, 6, 6, 1.5);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // Glossy vertical polycarbonate reflection streak
  ctx.fillStyle = 'rgba(255, 255, 255, 0.58)';
  ctx.fillRect(-8.8, -14, 3.2, 33);
  ctx.restore();

  // Crisp outer body outline
  buildBodyPath();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // 3. Authentic printed ml graduation scale ticks on right side of shaker wall
  ctx.strokeStyle = 'rgba(59, 40, 32, 0.58)';
  ctx.lineWidth = 1.25;
  for (let i = 0; i < 4; i += 1) {
    const ty = -9 + i * 6.5;
    const tickW = i % 2 === 0 ? 5.2 : 3.2;
    ctx.beginPath();
    ctx.moveTo(9.4 - i * 0.55, ty);
    ctx.lineTo(9.4 - i * 0.55 - tickW, ty);
    ctx.stroke();
  }

  // 4. Stepped domed strainer shoulder lid (classic Cobbler / boba shaker collar)
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.3;
  const lidGrad = ctx.createLinearGradient(-13, -23, 13, -23);
  lidGrad.addColorStop(0, '#CBD4DD');
  lidGrad.addColorStop(0.4, '#F7F9FB');
  lidGrad.addColorStop(1, '#B8C3CE');

  // Rim snap ring
  roundedRectPath(ctx, -13.5, -18.5, 27, 4.2, 2);
  ctx.fillStyle = lidGrad;
  ctx.fill();
  ctx.stroke();

  // Domed strainer shoulder tapering to pouring spout
  ctx.beginPath();
  ctx.moveTo(-11.5, -18.5);
  ctx.quadraticCurveTo(-10.5, -24.5, -5.5, -25.5);
  ctx.lineTo(5.5, -25.5);
  ctx.quadraticCurveTo(10.5, -24.5, 11.5, -18.5);
  ctx.closePath();
  ctx.fillStyle = lidGrad;
  ctx.fill();
  ctx.stroke();

  // 5. Top jigger cap (closed during shaking/lifting, removed when pouring to expose strainer spout)
  if (isCapClosed) {
    roundedRectPath(ctx, -6.2, -31.5, 12.4, 6.8, 2.8);
    ctx.fillStyle = '#E4E9EE';
    ctx.fill();
    ctx.stroke();
    // Specular highlight on cap
    ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.fillRect(-3.6, -30, 2.2, 4);
  } else {
    // Open strainer pouring spout centered at (0, -25.5)
    roundedRectPath(ctx, -5.2, -27.2, 10.4, 3.2, 1.5);
    ctx.fillStyle = clampedFill > 0.03 ? liquidColor : '#D4DCE3';
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
