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
  clamp01,
  computeLiquidFillSnapshot,
  CUP1_CX,
  CUP2_CX,
  CUP_TOP_Y,
  drawMotionArcs,
  drawPourLiquidEffect,
  drawRisingSteamWisps,
  transformRotatedAnchor,
} from './brewEffects';
import { roundedRectPath } from './drawBarScene';

const BARISTA_LEFT_X = 322;
const BARISTA_LEFT_HEAD_Y = 486;
const BARISTA_LEFT_TORSO_Y = 514;

const BARISTA_RIGHT_X = 630;
const BARISTA_RIGHT_HEAD_Y = 488;
const BARISTA_RIGHT_TORSO_Y = 516;

const STAGE_WORK_CENTER_X = 476;
const OUTLINE_W = 3;

interface DanceMotion {
  isDancing: boolean;
  style: DanceStyle;
  blend: number;
  swayX: number;
  bounceY: number;
  headTiltRad: number;
  beatPhase: number;
  poseIndex: number;
}

function computeDanceMotion(
  isDancing: boolean,
  danceStyle: DanceStyle,
  danceStartedAt: number,
  elapsedSec: number
): DanceMotion {
  if (!isDancing) {
    return {
      isDancing: false,
      style: danceStyle,
      blend: 0,
      swayX: 0,
      bounceY: 0,
      headTiltRad: 0,
      beatPhase: 0,
      poseIndex: 0,
    };
  }

  const blend =
    danceStartedAt > 0
      ? clamp01((Date.now() - danceStartedAt) / GAMEPLAY_LIMITS.DANCE_TRANSITION_MS)
      : 1;

  const freqMap: Record<DanceStyle, number> = {
    heart_sway: 7.4,
    groove_wave: 9.8,
    party_hype: 12.6,
  };
  const ampMap: Record<DanceStyle, number> = {
    heart_sway: 0.9,
    groove_wave: 1.2,
    party_hype: 1.5,
  };

  const freq = freqMap[danceStyle];
  const amp = ampMap[danceStyle] * blend;
  const beatPhase = elapsedSec * freq;

  return {
    isDancing: true,
    style: danceStyle,
    blend,
    swayX: Math.sin(beatPhase * 0.5) * 11 * amp,
    bounceY: -Math.abs(Math.sin(beatPhase)) * 8.5 * amp,
    headTiltRad: Math.sin(beatPhase * 0.5) * 0.12 * amp,
    beatPhase,
    poseIndex: Math.floor(elapsedSec * 1.4) % 2,
  };
}

function computeCharacterBob(
  dance: DanceMotion,
  isWorking: boolean,
  elapsedSec: number,
  rhythmFreq: number,
  phaseOffset: number,
  ampWork: number,
  ampIdle: number
): number {
  if (dance.isDancing) {
    return dance.bounceY;
  }
  if (isWorking) {
    return Math.sin(elapsedSec * rhythmFreq + phaseOffset) * ampWork;
  }
  return Math.sin(elapsedSec * 2.05 + phaseOffset) * ampIdle;
}

function resolveActivePourColor(drink: ActiveDrink): string {
  const recipe = RECIPE_MAP[drink.recipeId];
  const pourPhase = RECIPE_BREW_PHASES[drink.recipeId].find((p) => p.action === 'pour_mix');
  const pourStart = pourPhase?.minProgress ?? 45;
  const pourSpan = Math.max(10, (pourPhase?.maxProgress ?? 75) - pourStart);
  const pourRatio = clamp01((drink.progress - pourStart) / pourSpan);

  if (drink.recipeId === 'matcha') {
    return pourRatio > 0.32 ? '#A7D397' : '#FFFDF7';
  }
  if (drink.recipeId === 'coffee_milk') {
    return pourRatio > 0.32 ? '#6F4732' : '#F7E8D4';
  }
  if (drink.recipeId === 'berry_soda') {
    return drink.progress < pourStart ? '#E04F6D' : '#7FC8D9';
  }
  return recipe.baseColor;
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
  secondaryDrink: ActiveDrink | null,
  isFastBoost: boolean,
  isWaving: boolean,
  isDancing: boolean,
  danceTier: GiftTier,
  danceStyle: DanceStyle,
  danceStartedAt: number,
  elapsedSec: number
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const dance = computeDanceMotion(isDancing, danceStyle, danceStartedAt, elapsedSec);
  const isStaff1Working = !isDancing && Boolean(activeDrink && activeDrink.phase === 'BREWING');
  const isStaff2Working = !isDancing && Boolean(secondaryDrink && secondaryDrink.phase === 'BREWING');
  const isStaff1Celebrating =
    isWaving ||
    Boolean(activeDrink && (activeDrink.phase === 'SHOWCASE' || activeDrink.progress >= 94));
  const isStaff2Celebrating =
    isWaving ||
    Boolean(secondaryDrink && (secondaryDrink.phase === 'SHOWCASE' || secondaryDrink.progress >= 94));
  const rhythmFreq = isFastBoost ? 9.5 : 5.2;

  const staff1Bob = computeCharacterBob(dance, isStaff1Working, elapsedSec, rhythmFreq, 0.9, 3.8, 2.2);
  const staff2Bob = computeCharacterBob(dance, isStaff2Working, elapsedSec, rhythmFreq, 0, 3.8, 2.2);
  const effectiveMood: BartenderMood = dance.isDancing ? 'TIKTOK_DANCE' : mood;
  const staff1Tilt = dance.isDancing ? dance.headTiltRad : Math.sin(elapsedSec * 1.45 + 0.5) * 0.025;
  const staff2Tilt = dance.isDancing ? -dance.headTiltRad : Math.sin(elapsedSec * 1.45 + 2.1) * 0.025;

  if (dance.isDancing) {
    if (dance.style === 'party_hype') {
      drawPartyHypeSpotlights(ctx, dance.blend, elapsedSec);
    }
    drawDanceBackAura(ctx, BARISTA_LEFT_X + dance.swayX, BARISTA_LEFT_HEAD_Y + 26, danceTier, dance.style, elapsedSec);
    drawDanceBackAura(ctx, BARISTA_RIGHT_X + dance.swayX, BARISTA_RIGHT_HEAD_Y + 26, danceTier, dance.style, elapsedSec);
  }

  drawLeftFemaleBartenderTorsoAndHead(
    ctx,
    effectiveMood,
    isStaff1Celebrating,
    BARISTA_LEFT_X + dance.swayX,
    staff1Bob,
    staff1Tilt,
    elapsedSec
  );

  drawRightFemaleBartenderTorsoAndHead(
    ctx,
    effectiveMood,
    isStaff2Celebrating,
    BARISTA_RIGHT_X + dance.swayX,
    staff2Bob,
    staff2Tilt,
    elapsedSec
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
  const sway = Math.sin(elapsedSec * 3.5) * 18;

  const leftGrad = ctx.createLinearGradient(BARISTA_LEFT_X, 240, BARISTA_LEFT_X + sway, 660);
  leftGrad.addColorStop(0, 'rgba(255, 214, 138, 0.75)');
  leftGrad.addColorStop(1, 'rgba(255, 214, 138, 0)');
  ctx.fillStyle = leftGrad;
  ctx.beginPath();
  ctx.moveTo(BARISTA_LEFT_X - 18, 240);
  ctx.lineTo(BARISTA_LEFT_X + 18, 240);
  ctx.lineTo(BARISTA_LEFT_X + 75 + sway, 660);
  ctx.lineTo(BARISTA_LEFT_X - 75 + sway, 660);
  ctx.closePath();
  ctx.fill();

  const rightGrad = ctx.createLinearGradient(BARISTA_RIGHT_X, 240, BARISTA_RIGHT_X - sway, 660);
  rightGrad.addColorStop(0, 'rgba(174, 226, 244, 0.75)');
  rightGrad.addColorStop(1, 'rgba(174, 226, 244, 0)');
  ctx.fillStyle = rightGrad;
  ctx.beginPath();
  ctx.moveTo(BARISTA_RIGHT_X - 18, 240);
  ctx.lineTo(BARISTA_RIGHT_X + 18, 240);
  ctx.lineTo(BARISTA_RIGHT_X + 75 - sway, 660);
  ctx.lineTo(BARISTA_RIGHT_X - 75 - sway, 660);
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
  const radius = (tier === 'LARGE' ? 84 : 70) * pulse;
  const grad = ctx.createRadialGradient(cx, cy, 12, cx, cy, radius);
  if (style === 'party_hype') {
    grad.addColorStop(0, 'rgba(247, 201, 91, 0.45)');
    grad.addColorStop(1, 'rgba(247, 201, 91, 0)');
  } else if (style === 'groove_wave') {
    grad.addColorStop(0, 'rgba(127, 200, 217, 0.36)');
    grad.addColorStop(1, 'rgba(127, 200, 217, 0)');
  } else {
    grad.addColorStop(0, 'rgba(240, 120, 140, 0.34)');
    grad.addColorStop(1, 'rgba(240, 120, 140, 0)');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  if (style === 'groove_wave') {
    const waveR = 46 + ((elapsedSec * 28) % 30);
    const waveAlpha = Math.max(0, 1 - (waveR - 46) / 30) * 0.45;
    ctx.beginPath();
    ctx.arc(cx, cy, waveR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(127, 200, 217, ${waveAlpha.toFixed(2)})`;
    ctx.lineWidth = 2.4;
    ctx.stroke();
  }
}

const BARISTA_SKIN = '#FDE0C2';

function drawRoundedRaglanTorsoPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  topY: number
): void {
  ctx.beginPath();
  ctx.moveTo(cx - 24, topY);
  ctx.quadraticCurveTo(cx - 43, topY + 6, cx - 41, topY + 34);
  ctx.lineTo(cx - 38, topY + 132);
  ctx.quadraticCurveTo(cx - 36, topY + 148, cx - 18, topY + 148);
  ctx.lineTo(cx + 18, topY + 148);
  ctx.quadraticCurveTo(cx + 36, topY + 148, cx + 38, topY + 132);
  ctx.lineTo(cx + 41, topY + 34);
  ctx.quadraticCurveTo(cx + 43, topY + 6, cx + 24, topY);
  ctx.closePath();
}

function drawApronStrapWithOutline(
  ctx: CanvasRenderingContext2D,
  xTop: number,
  yTop: number,
  xBot: number,
  yBot: number,
  apronColor: string
): void {
  ctx.beginPath();
  ctx.moveTo(xTop, yTop);
  ctx.lineTo(xBot, yBot);
  ctx.lineWidth = 9.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 5.2;
  ctx.strokeStyle = apronColor;
  ctx.stroke();
}

function drawApronPocketWithStitch(
  ctx: CanvasRenderingContext2D,
  cx: number,
  y: number,
  pocketColor: string
): void {
  roundedRectPath(ctx, cx - 15, y, 30, 21, 7);
  ctx.fillStyle = pocketColor;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Subtle cream stitch ticks along pocket opening
  ctx.strokeStyle = 'rgba(255, 245, 230, 0.7)';
  ctx.lineWidth = 1.6;
  for (let i = -9; i <= 9; i += 6) {
    ctx.beginPath();
    ctx.moveTo(cx + i - 1.5, y + 4.5);
    ctx.lineTo(cx + i + 1.5, y + 4.5);
    ctx.stroke();
  }
}

function drawLeftFemaleBartenderTorsoAndHead(
  ctx: CanvasRenderingContext2D,
  mood: BartenderMood,
  isCelebrating: boolean,
  cx: number,
  bob: number,
  headTiltRad: number,
  elapsedSec: number
): void {
  const headY = BARISTA_LEFT_HEAD_Y + bob;
  const torsoY = BARISTA_LEFT_TORSO_Y + bob;

  // 1. Soft low twin side-tails behind shoulders (Back hair)
  ctx.save();
  ctx.translate(cx, headY);
  ctx.rotate(headTiltRad * 0.7);

  // Left low side-tail behind shoulder
  ctx.beginPath();
  ctx.moveTo(-28, 5);
  ctx.quadraticCurveTo(-48, 22, -42, 58);
  ctx.quadraticCurveTo(-34, 62, -31, 48);
  ctx.quadraticCurveTo(-24, 28, -20, 15);
  ctx.closePath();
  ctx.fillStyle = '#4A2E20';
  ctx.fill();
  ctx.lineWidth = OUTLINE_W;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Right low side-tail behind shoulder
  ctx.beginPath();
  ctx.moveTo(28, 5);
  ctx.quadraticCurveTo(48, 22, 42, 58);
  ctx.quadraticCurveTo(34, 62, 31, 48);
  ctx.quadraticCurveTo(24, 28, 20, 15);
  ctx.closePath();
  ctx.fillStyle = '#4A2E20';
  ctx.fill();
  ctx.stroke();

  // Adorable pastel-pink hair ribbon ties at side-tail roots
  [-1, 1].forEach((side) => {
    const rx = side * 33;
    const ry = 18;
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(side * 0.3);
    ctx.fillStyle = '#FCE7EE';
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.ellipse(-4.5, 0, 4.8, 3.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(4.5, 0, 4.8, 3.2, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = '#F4A6BE';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  });
  ctx.restore();

  // 2. Soft curved shirt silhouette + cute strawberry-pink #E58FA8 barista apron
  drawRoundedRaglanTorsoPath(ctx, cx, torsoY);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.lineWidth = OUTLINE_W;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  roundedRectPath(ctx, cx - 29, torsoY + 15, 58, 133, 15);
  ctx.fillStyle = '#E58FA8';
  ctx.fill();
  ctx.stroke();

  drawApronStrapWithOutline(ctx, cx - 20, torsoY + 2, cx - 18, torsoY + 20, '#E58FA8');
  drawApronStrapWithOutline(ctx, cx + 20, torsoY + 2, cx + 18, torsoY + 20, '#E58FA8');
  drawApronPocketWithStitch(ctx, cx, torsoY + 42, '#CD758F');

  // Cute matcha leaf & coffee-bean badge pin on apron chest
  ctx.save();
  ctx.translate(cx - 17, torsoY + 31);
  ctx.rotate(-0.35);
  ctx.beginPath();
  ctx.ellipse(0, 0, 6.2, 3.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#A7D397';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-3.5, 0);
  ctx.lineTo(3.5, 0);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  // Snug short neck (2.5px outline) tucked directly between chin and shirt collar
  roundedRectPath(ctx, cx - 10, headY + 23, 20, 14, 6);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Crisp shirt collar flaps anchoring neck cleanly to torso
  ctx.fillStyle = '#FFFDF9';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - 16, torsoY + 2);
  ctx.lineTo(cx, torsoY + 11);
  ctx.lineTo(cx + 16, torsoY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cute coral-pink barista bow-tie right under chin
  ctx.fillStyle = '#E5738E';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.moveTo(cx, headY + 35);
  ctx.lineTo(cx - 10.5, headY + 30);
  ctx.lineTo(cx - 10.5, headY + 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx, headY + 35);
  ctx.lineTo(cx + 10.5, headY + 30);
  ctx.lineTo(cx + 10.5, headY + 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, headY + 35, 3.3, 0, Math.PI * 2);
  ctx.fillStyle = '#F7C95B';
  ctx.fill();
  ctx.stroke();

  // 3. Head + Soft Front Hair with Neat Blunt Bangs + Cute Hair Clip
  ctx.save();
  ctx.translate(cx, headY);
  ctx.rotate(headTiltRad);

  // Main hair back mass
  ctx.beginPath();
  ctx.ellipse(0, -6, 40, 39, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#4A2E20';
  ctx.fill();
  ctx.lineWidth = OUTLINE_W;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Chibi round face
  ctx.beginPath();
  ctx.ellipse(0, 0, 34.5, 33, 0, 0, Math.PI * 2);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.stroke();

  // Neat blunt bangs with soft curves & subtle hair separation slits + side tendrils
  ctx.beginPath();
  ctx.arc(0, -5, 35, Math.PI * 1.04, Math.PI * 1.96);
  ctx.lineTo(33, -7);
  // Right side tendril curving down alongside cheek
  ctx.quadraticCurveTo(34, 10, 31, 20);
  ctx.quadraticCurveTo(27, 21, 28, 6);
  // Blunt bangs across forehead with cute separation notches
  ctx.quadraticCurveTo(20, -5, 14, -6);
  ctx.quadraticCurveTo(10, 0, 6, -6);
  ctx.quadraticCurveTo(0, -4, -6, -6);
  ctx.quadraticCurveTo(-10, 0, -14, -6);
  ctx.quadraticCurveTo(-20, -5, -28, 6);
  // Left side tendril curving down alongside cheek
  ctx.quadraticCurveTo(-27, 21, -31, 20);
  ctx.quadraticCurveTo(-34, 10, -33, -7);
  ctx.closePath();
  ctx.fillStyle = '#4A2E20';
  ctx.fill();
  ctx.stroke();

  // Cute hair clip (pink-cream bow with pearl center) on upper left side of bangs
  ctx.save();
  ctx.translate(-22, -24);
  ctx.rotate(-0.25);
  ctx.fillStyle = '#FCE7EE';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(-6, 0, 6.5, 4.2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(6, 0, 6.5, 4.2, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = '#F4A6BE';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 1.4, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.restore();

  drawCharacterFace(ctx, 0, 0, mood, isCelebrating, elapsedSec, false, 1);
  ctx.restore();
}

function drawRightFemaleBartenderTorsoAndHead(
  ctx: CanvasRenderingContext2D,
  mood: BartenderMood,
  isCelebrating: boolean,
  cx: number,
  bob: number,
  headTiltRad: number,
  elapsedSec: number
): void {
  const headY = BARISTA_RIGHT_HEAD_Y + bob;
  const torsoY = BARISTA_RIGHT_TORSO_Y + bob;

  // Soft curved cream shirt + dusty-pink #D47896 apron
  drawRoundedRaglanTorsoPath(ctx, cx, torsoY);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = OUTLINE_W;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  roundedRectPath(ctx, cx - 29, torsoY + 15, 58, 133, 15);
  ctx.fillStyle = '#D47896';
  ctx.fill();
  ctx.stroke();

  drawApronStrapWithOutline(ctx, cx - 20, torsoY + 2, cx - 18, torsoY + 20, '#D47896');
  drawApronStrapWithOutline(ctx, cx + 20, torsoY + 2, cx + 18, torsoY + 20, '#D47896');
  drawApronPocketWithStitch(ctx, cx, torsoY + 42, '#BC5E7D');

  // Cute golden star pin on apron chest
  drawDanceSparkleStar(ctx, cx + 17, torsoY + 31, 5.4, '#F7C95B');

  // Snug short neck (2.5px outline) cleanly hugging chin & collar
  roundedRectPath(ctx, cx - 9.5, headY + 23, 19, 14, 6);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Delicate two-petal rounded light collar hugging neck
  ctx.fillStyle = '#FFFDF9';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.ellipse(cx - 8, torsoY + 4, 8.5, 4.8, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx + 8, torsoY + 4, 8.5, 4.8, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Head + Neat High Bun + Pastel Hair Band & Bow + Soft Wispy Bangs
  ctx.save();
  ctx.translate(cx, headY);
  ctx.rotate(headTiltRad);

  // Hair back mass
  ctx.beginPath();
  ctx.ellipse(0, -4, 41, 40, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#33221B';
  ctx.fill();
  ctx.lineWidth = OUTLINE_W;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // High neat bun
  ctx.beginPath();
  ctx.arc(6, -44, 15, 0, Math.PI * 2);
  ctx.fillStyle = '#33221B';
  ctx.fill();
  ctx.stroke();

  // Cute pastel-pink hair ribbon scrunchie at bun base
  ctx.save();
  ctx.translate(3, -31);
  ctx.rotate(-0.15);
  ctx.fillStyle = '#F7C6D7';
  ctx.lineWidth = 2.1;
  ctx.beginPath();
  ctx.ellipse(-6.5, 0, 6.2, 3.8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(6.5, 0, 6.2, 3.8, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 2.8, 0, Math.PI * 2);
  ctx.fillStyle = '#FFF1C2';
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Soft curved face contour
  ctx.beginPath();
  ctx.ellipse(0, 0, 34.5, 33, 0, 0, Math.PI * 2);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.stroke();

  // Cute pastel headband (băng đô hồng kem) across head
  ctx.beginPath();
  ctx.arc(0, -4, 34.5, Math.PI * 1.14, Math.PI * 1.86);
  ctx.lineWidth = 4.2;
  ctx.strokeStyle = '#FCE7EE';
  ctx.stroke();
  ctx.lineWidth = OUTLINE_W;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Hairline & wispy see-through bangs with curved side locks
  ctx.beginPath();
  ctx.arc(0, -5, 35, Math.PI * 1.05, Math.PI * 1.98);
  ctx.lineTo(33, -7);
  ctx.quadraticCurveTo(34, 8, 30, 18);
  ctx.quadraticCurveTo(27, 19, 28, 4);
  // Airy see-through bangs
  ctx.quadraticCurveTo(18, -10, 10, -7);
  ctx.quadraticCurveTo(4, -14, -2, -8);
  ctx.quadraticCurveTo(-10, -14, -18, -7);
  ctx.quadraticCurveTo(-26, -11, -28, 4);
  ctx.quadraticCurveTo(-27, 19, -30, 18);
  ctx.quadraticCurveTo(-34, 8, -33, -7);
  ctx.closePath();
  ctx.fillStyle = '#33221B';
  ctx.fill();
  ctx.stroke();

  // Small cute star clip on headband (right side)
  drawDanceSparkleStar(ctx, 22, -26, 4.2, '#FFF1C2');

  drawCharacterFace(ctx, 0, 0, mood, isCelebrating, elapsedSec, false, 2);
  ctx.restore();
}

function drawCharacterFace(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  mood: BartenderMood,
  isCelebrating: boolean,
  elapsedSec: number,
  _isMaleUnused: boolean,
  staffIndex: 1 | 2 = 1
): void {
  const isBeaming =
    isCelebrating ||
    mood === 'HAPPY' ||
    mood === 'CHEERING' ||
    mood === 'TIKTOK_DANCE';

  // Soft pastel rosy cheeks with cute blush stripes
  ctx.fillStyle = isBeaming
    ? 'rgba(240, 120, 140, 0.55)'
    : 'rgba(240, 120, 140, 0.38)';
  ctx.beginPath();
  ctx.ellipse(cx - 18.5, cy + 7.5, 6.8, 4.2, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 18.5, cy + 7.5, 6.8, 4.2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Delicate white blush shine dots on cheeks
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.beginPath();
  ctx.arc(cx - 19.5, cy + 6.5, 1.4, 0, Math.PI * 2);
  ctx.arc(cx + 17.5, cy + 6.5, 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.fillStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.2;

  // Soft delicate feminine curved eyebrows
  ctx.beginPath();
  ctx.arc(cx - 12.5, cy - 6.5, 5.8, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + 12.5, cy - 6.5, 5.8, Math.PI * 1.15, Math.PI * 1.85);
  ctx.stroke();

  // Natural periodic blink (~3.4s cycle with distinct phase offset so both girls don't blink in unison)
  const blinkOffset = staffIndex === 1 ? 0.6 : 2.2;
  const blinkPhase = (elapsedSec + blinkOffset) % 3.4;
  const isBlinking = !isBeaming && blinkPhase < 0.14;

  if (isBeaming) {
    // Excited sweet ^ ^ curved happy anime eyes
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(cx - 12, cy + 3.2, 5.8, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    // Tiny cute corner lash flick
    ctx.beginPath();
    ctx.moveTo(cx - 17, cy + 1.8);
    ctx.lineTo(cx - 19.5, cy + 0.2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx + 12, cy + 3.2, 5.8, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 17, cy + 1.8);
    ctx.lineTo(cx + 19.5, cy + 0.2);
    ctx.stroke();

    // Joyful open smiling mouth with pink tongue
    ctx.beginPath();
    ctx.arc(cx, cy + 9.8, 8.5, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = '#E06B74';
    ctx.fill();
    ctx.stroke();

    // Tongue
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy + 9.8, 8.5, 0.08 * Math.PI, 0.92 * Math.PI);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(cx, cy + 15, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#F7A8B8';
    ctx.fill();
    ctx.restore();
    return;
  }

  if (isBlinking) {
    // Soft sweet closed eyelash line
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx - 12, cy + 2, 5.4, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 16.5, cy + 4);
    ctx.lineTo(cx - 19, cy + 3);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx + 12, cy + 2, 5.4, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 16.5, cy + 4);
    ctx.lineTo(cx + 19, cy + 3);
    ctx.stroke();
  } else {
    // Big sparkling cute anime eyes with dual glints & corner lash flick
    ctx.fillStyle = '#3B2820';
    ctx.beginPath();
    ctx.ellipse(cx - 12, cy + 1.5, 4.2, 4.8, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 12, cy + 1.5, 4.2, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper corner eyelash flick
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy - 1);
    ctx.lineTo(cx - 18, cy - 2.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 15, cy - 1);
    ctx.lineTo(cx + 18, cy - 2.5);
    ctx.stroke();

    // Main sparkle glint (upper left)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 13.5, cy - 0.2, 1.8, 0, Math.PI * 2);
    ctx.arc(cx + 10.5, cy - 0.2, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Secondary twinkle glint (lower right)
    ctx.beginPath();
    ctx.arc(cx - 10.5, cy + 3.2, 1.0, 0, Math.PI * 2);
    ctx.arc(cx + 13.5, cy + 3.2, 1.0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sweet gentle smile
  ctx.lineWidth = 2.3;
  ctx.beginPath();
  ctx.arc(cx, cy + 9.5, 6.2, 0.14 * Math.PI, 0.86 * Math.PI);
  ctx.stroke();
}

export function drawBartenderForegroundArmsAndSpeech(
  ctx: CanvasRenderingContext2D,
  activeDrink: ActiveDrink | null,
  secondaryDrink: ActiveDrink | null,
  speech: BartenderSpeech | null,
  isFastBoost: boolean,
  isWaving: boolean,
  isDancing: boolean,
  danceTier: GiftTier,
  danceStyle: DanceStyle,
  danceStartedAt: number,
  elapsedSec: number
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const dance = computeDanceMotion(isDancing, danceStyle, danceStartedAt, elapsedSec);

  if (dance.isDancing) {
    drawSynchronizedTikTokDanceArms(
      ctx,
      BARISTA_LEFT_X + dance.swayX,
      BARISTA_LEFT_HEAD_Y + dance.bounceY,
      BARISTA_LEFT_TORSO_Y + dance.bounceY,
      dance,
      true
    );
    drawSynchronizedTikTokDanceArms(
      ctx,
      BARISTA_RIGHT_X + dance.swayX,
      BARISTA_RIGHT_HEAD_Y + dance.bounceY,
      BARISTA_RIGHT_TORSO_Y + dance.bounceY,
      dance,
      false
    );
    drawTikTokDanceMusicNotesAndSparkles(ctx, dance, danceTier, elapsedSec);

    if (speech && speech.text.trim()) {
      drawCelebrationSpeechBanner(ctx, speech.text, danceTier);
    }
    ctx.restore();
    return;
  }

  const freq = isFastBoost ? 9.5 : 5.2;
  const staff1Working = Boolean(activeDrink && activeDrink.phase === 'BREWING');
  const staff2Working = Boolean(secondaryDrink && secondaryDrink.phase === 'BREWING');

  const staff1Bob = computeCharacterBob(dance, staff1Working, elapsedSec, freq, 0.9, 3.8, 2.2);
  const staff2Bob = computeCharacterBob(dance, staff2Working, elapsedSec, freq, 0, 3.8, 2.2);

  // Station 1: Female Bartender 1 (Left, side = -1) works on Cup 1 (x = 408)
  drawStationBartenderArms(
    ctx,
    BARISTA_LEFT_X,
    BARISTA_LEFT_HEAD_Y,
    BARISTA_LEFT_TORSO_Y,
    CUP1_CX,
    -1,
    activeDrink,
    staff1Bob,
    isFastBoost,
    isWaving,
    freq,
    elapsedSec
  );

  // Station 2: Female Bartender 2 (Right, side = +1) works on Cup 2 (x = 544) when 2nd order present
  drawStationBartenderArms(
    ctx,
    BARISTA_RIGHT_X,
    BARISTA_RIGHT_HEAD_Y,
    BARISTA_RIGHT_TORSO_Y,
    CUP2_CX,
    1,
    secondaryDrink,
    staff2Bob,
    isFastBoost,
    isWaving,
    freq,
    elapsedSec
  );

  if (speech && speech.text.trim()) {
    drawCelebrationSpeechBanner(ctx, speech.text, 'SMALL');
  }

  ctx.restore();
}

function drawStationBartenderArms(
  ctx: CanvasRenderingContext2D,
  baristaX: number,
  headY: number,
  torsoY: number,
  cupCx: number,
  side: -1 | 1,
  drink: ActiveDrink | null,
  bob: number,
  isFastBoost: boolean,
  isWaving: boolean,
  freq: number,
  elapsedSec: number
): void {
  const outerShoulderX = baristaX + side * 34;
  const outerShoulderY = torsoY + 24 + bob;
  const innerShoulderX = baristaX - side * 34;
  const innerShoulderY = torsoY + 24 + bob;
  const innerSide: -1 | 1 = side === -1 ? 1 : -1;
  const toolStationX = cupCx + side * 66;
  const action = resolveBrewAction(drink);

  if (!action || !drink) {
    // Idle or supporting gently when this station has no active drink
    const waveOffset = Math.sin(elapsedSec * 5.2) * 10;
    const outerHandX = baristaX + side * 48 + (isWaving ? waveOffset : 0);
    const outerHandY = isWaving ? headY + 6 : STAGE_METRICS.COUNTER_TOP_Y - 8;
    drawCartoonArm(ctx, outerShoulderX, outerShoulderY, outerHandX, outerHandY, side);
    drawHandCircle(ctx, outerHandX, outerHandY);

    const idleWave = Math.sin(elapsedSec * 2.2) * 4;
    const innerHandX = baristaX - side * 40 + idleWave;
    const innerHandY = STAGE_METRICS.COUNTER_TOP_Y - 8;
    drawCartoonArm(ctx, innerShoulderX, innerShoulderY, innerHandX, innerHandY, innerSide);
    drawHandCircle(ctx, innerHandX, innerHandY);
    return;
  }

  const recipe = RECIPE_MAP[drink.recipeId];
  const toolType = recipe.toolType;

  if (action === 'tool_prep') {
    drawStage1ToolAction(
      ctx,
      drink,
      baristaX,
      cupCx,
      toolStationX,
      side,
      outerShoulderX,
      outerShoulderY,
      innerShoulderX,
      innerShoulderY,
      bob,
      isFastBoost,
      freq,
      elapsedSec
    );
    return;
  }

  if (action === 'add_ice') {
    // Ice bucket on counter + bartender scooping ice cubes over cup rim
    drawIceBucketOnCounter(ctx, toolStationX, STAGE_METRICS.COUNTER_TOP_Y + 6);
    const outerHandX = toolStationX + side * 8;
    const outerHandY = STAGE_METRICS.COUNTER_TOP_Y - 12;
    drawCartoonArm(ctx, outerShoulderX, outerShoulderY, outerHandX, outerHandY, side);
    drawHandCircle(ctx, outerHandX, outerHandY);

    const scoopSwing = Math.sin(elapsedSec * 7.2) * 5;
    const scoopX = cupCx + side * 16 + scoopSwing;
    const scoopY = CUP_TOP_Y - 34 + Math.abs(Math.cos(elapsedSec * 7.2)) * 5;
    drawCartoonArm(ctx, innerShoulderX, innerShoulderY, scoopX, scoopY, innerSide);
    drawIceScoopAndCubes(ctx, scoopX, scoopY, side, drink.iceLevel !== 'NONE');
    return;
  }

  if (action === 'pour_mix') {
    // Pour vibrant drink stream smoothly from rotated spout down to actual liquidSurfaceY
    const outerHandX = baristaX + side * 42;
    const outerHandY = STAGE_METRICS.COUNTER_TOP_Y - 8;
    drawCartoonArm(ctx, outerShoulderX, outerShoulderY, outerHandX, outerHandY, side);
    drawHandCircle(ctx, outerHandX, outerHandY);

    const pourBob = Math.sin(elapsedSec * freq) * 3.5;
    const handX = cupCx + side * 26 + pourBob * 0.4;
    const handY = CUP_TOP_Y - 52 + Math.cos(elapsedSec * freq) * 3.5;
    const surfaceY = computeLiquidFillSnapshot(drink.recipeId, drink.progress).surfaceY;
    const pourColor = resolveActivePourColor(drink);

    drawCartoonArm(ctx, innerShoulderX, innerShoulderY, handX, handY, innerSide);
    drawPourLiquidEffect(ctx, {
      toolType,
      handX,
      handY,
      cupCx,
      side,
      liquidColor: pourColor,
      accentColor: recipe.accentColor,
      targetSurfaceY: surfaceY,
      isFastBoost,
      isSodaFizz: toolType === 'soda_pour',
      elapsedSec,
    });
    drawHandCircle(ctx, handX, handY);
    return;
  }

  if (action === 'topping') {
    const outerHandX = baristaX + side * 42;
    const outerHandY = STAGE_METRICS.COUNTER_TOP_Y - 8;
    drawCartoonArm(ctx, outerShoulderX, outerShoulderY, outerHandX, outerHandY, side);
    drawHandCircle(ctx, outerHandX, outerHandY);

    if (drink.recipeId === 'coffee_milk') {
      // Cafe P4: Smooth salted cream / light coffee foam ribbon swirled onto coffee surface (NO spotted dots)
      const swirlX = cupCx + side * 20 + Math.sin(elapsedSec * 5.8) * 7;
      const swirlY = CUP_TOP_Y - 36 + Math.cos(elapsedSec * 5.8) * 4;
      drawCartoonArm(ctx, innerShoulderX, innerShoulderY, swirlX, swirlY, innerSide);
      drawSaltedCreamSwirlAction(ctx, swirlX, swirlY, cupCx, side, elapsedSec);
      return;
    }

    const scoopSwing = Math.sin(elapsedSec * 6.5) * 6;
    const scoopX = cupCx + side * 14 + scoopSwing;
    const scoopY = CUP_TOP_Y - 30 + Math.abs(Math.cos(elapsedSec * 6.5)) * 4;
    drawCartoonArm(ctx, innerShoulderX, innerShoulderY, scoopX, scoopY, innerSide);
    drawToppingSpoonAndDrops(
      ctx,
      scoopX,
      scoopY,
      cupCx,
      side,
      drink.recipeId === 'matcha' ? '#7FB86B' : recipe.accentColor,
      drink.recipeId === 'matcha',
      elapsedSec
    );
    return;
  }

  // action === 'seal': Seal & Ta-Da presentation
  const waveSwing = Math.sin(elapsedSec * 8) * 10;
  const outerX = baristaX + side * 48 + waveSwing;
  const outerY = headY + 12;
  drawCartoonArm(ctx, outerShoulderX, outerShoulderY, outerX, outerY, side);
  drawHandCircle(ctx, outerX, outerY);

  const innerX = cupCx + side * 38;
  const innerY = CUP_TOP_Y + 12;
  drawCartoonArm(ctx, innerShoulderX, innerShoulderY, innerX, innerY, innerSide);
  drawHandCircle(ctx, innerX, innerY);
}

function drawIceBucketOnCounter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number
): void {
  ctx.save();
  roundedRectPath(ctx, cx - 18, baseY - 26, 36, 26, 7);
  ctx.fillStyle = '#D9F0F6';
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Ice cubes peeking out of bucket
  for (let i = -1; i <= 1; i += 1) {
    roundedRectPath(ctx, cx + i * 8 - 5, baseY - 31, 10, 9, 2.5);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

function drawIceScoopAndCubes(
  ctx: CanvasRenderingContext2D,
  handX: number,
  handY: number,
  side: -1 | 1,
  hasIce: boolean
): void {
  drawHandCircle(ctx, handX, handY);
  ctx.save();
  ctx.translate(handX - side * 12, handY + 4);
  ctx.rotate(side * -0.45);
  roundedRectPath(ctx, -12, -5, 22, 10, 4);
  ctx.fillStyle = '#D7E4E8';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  if (hasIce) {
    roundedRectPath(ctx, -8, -11, 9, 9, 2.5);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
  ctx.restore();
}

function drawStage1ToolAction(
  ctx: CanvasRenderingContext2D,
  drink: ActiveDrink,
  baristaX: number,
  cupCx: number,
  toolStationX: number,
  side: -1 | 1,
  outerShoulderX: number,
  outerShoulderY: number,
  innerShoulderX: number,
  innerShoulderY: number,
  bob: number,
  isFastBoost: boolean,
  freq: number,
  elapsedSec: number
): void {
  const innerSide: -1 | 1 = side === -1 ? 1 : -1;
  const recipe = RECIPE_MAP[drink.recipeId];
  const toolType = recipe.toolType;
  const baseColor = recipe.baseColor;
  const secondaryColor = recipe.secondaryColor;
  const accentColor = recipe.accentColor;

  if (toolType === 'chasen') {
    // Matcha: Ceramic Chawan bowl on counter + Bamboo Chasen whisk swirling figure-8 inside bowl
    const bowlCx = toolStationX;
    const bowlCy = STAGE_METRICS.COUNTER_TOP_Y + 6;
    drawMatchaBowlOnCounter(ctx, bowlCx, bowlCy, baseColor, secondaryColor, elapsedSec);

    const steadyingX = bowlCx + side * 24;
    const steadyingY = STAGE_METRICS.COUNTER_TOP_Y - 2;
    drawCartoonArm(ctx, outerShoulderX, outerShoulderY, steadyingX, steadyingY, side);
    drawHandCircle(ctx, steadyingX, steadyingY);

    const swirlRate = isFastBoost ? 14 : 9.5;
    const whiskPhase = elapsedSec * swirlRate;
    const whiskX = bowlCx + Math.sin(whiskPhase) * 9;
    const whiskY = bowlCy - 24 + Math.sin(whiskPhase * 2) * 3;
    drawCartoonArm(ctx, innerShoulderX, innerShoulderY, whiskX, whiskY, innerSide);
    drawBambooChasenInHand(ctx, whiskX, whiskY, Math.sin(whiskPhase) * 0.12);
    return;
  }

  if (toolType === 'shaker') {
    // Milk Tea P2 (25%-50%): 2-handed clear/stainless cocktail shaker held forward at chest/shoulder height, smooth diagonal oscillation + tilt
    const shakeRate = isFastBoost ? 14.5 : 9.8;
    const phase = elapsedSec * shakeRate;
    const shakerX = baristaX - side * 26 + Math.sin(phase) * 9;
    const shakerY = 536 + bob - Math.cos(phase) * 10;
    const rotRad = Math.sin(phase) * 0.36;

    const handOuterX = shakerX + side * 13;
    const handInnerX = shakerX - side * 13;
    drawCartoonArm(ctx, outerShoulderX, outerShoulderY, handOuterX, shakerY + 5, side);
    drawHandCircle(ctx, handOuterX, shakerY + 5);
    drawCartoonArm(ctx, innerShoulderX, innerShoulderY, handInnerX, shakerY - 5, innerSide);
    drawHandCircle(ctx, handInnerX, shakerY - 5);
    drawShakerShakingInHands(ctx, shakerX, shakerY, rotRad, baseColor, elapsedSec);
    return;
  }

  if (toolType === 'coffee_machine') {
    // Cafe: Espresso/Phin brewer extracting espresso stream straight onto rising surface + steam wisps
    drawEspressoMachineOnCounter(ctx, toolStationX, STAGE_METRICS.COUNTER_TOP_Y + 6, baseColor, elapsedSec);
    const leverX = toolStationX + side * 14;
    const leverY = STAGE_METRICS.COUNTER_TOP_Y - 28;
    drawCartoonArm(ctx, outerShoulderX, outerShoulderY, leverX, leverY, side);
    drawHandCircle(ctx, leverX, leverY);

    const holdX = toolStationX - side * 14;
    const holdY = STAGE_METRICS.COUNTER_TOP_Y - 4;
    drawCartoonArm(ctx, innerShoulderX, innerShoulderY, holdX, holdY, innerSide);
    drawHandCircle(ctx, holdX, holdY);
    return;
  }

  if (toolType === 'juicer') {
    // Fruit Juice: Citrus juicer machine squeezing citrus dome + connected juice stream from spout to pitcher
    drawCitrusJuicerOnCounter(ctx, toolStationX, STAGE_METRICS.COUNTER_TOP_Y + 6, side, baseColor, elapsedSec);
    const pressBob = Math.abs(Math.sin(elapsedSec * freq)) * 5;
    const pressX = toolStationX;
    const pressY = STAGE_METRICS.COUNTER_TOP_Y - 34 + pressBob;
    drawCartoonArm(ctx, outerShoulderX, outerShoulderY, pressX, pressY, side);
    drawHandCircle(ctx, pressX, pressY);

    const holdX = toolStationX - side * 20;
    const holdY = STAGE_METRICS.COUNTER_TOP_Y - 4;
    drawCartoonArm(ctx, innerShoulderX, innerShoulderY, holdX, holdY, innerSide);
    drawHandCircle(ctx, holdX, holdY);
    return;
  }

  // Soda ('soda_pour'): Pouring berry syrup cleanly from tilted bottle mouth down to surfaceY
  const outerX = baristaX + side * 42;
  const outerY = STAGE_METRICS.COUNTER_TOP_Y - 8;
  drawCartoonArm(ctx, outerShoulderX, outerShoulderY, outerX, outerY, side);
  drawHandCircle(ctx, outerX, outerY);

  const handX = cupCx + side * 26;
  const handY = CUP_TOP_Y - 52 + Math.sin(elapsedSec * 4) * 3;
  const surfaceY = computeLiquidFillSnapshot(drink.recipeId, drink.progress).surfaceY;
  const pourColor = resolveActivePourColor(drink);

  drawCartoonArm(ctx, innerShoulderX, innerShoulderY, handX, handY, innerSide);
  drawPourLiquidEffect(ctx, {
    toolType: 'soda_pour',
    handX,
    handY,
    cupCx,
    side,
    liquidColor: pourColor,
    accentColor,
    targetSurfaceY: surfaceY,
    isFastBoost,
    isSodaFizz: false,
    elapsedSec,
  });
  drawHandCircle(ctx, handX, handY);
}

function drawMatchaBowlOnCounter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  baseColor: string,
  foamColor: string,
  elapsedSec: number
): void {
  ctx.save();
  // Ceramic Chawan bowl
  ctx.beginPath();
  ctx.arc(cx, cy - 12, 23, 0, Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Rim ellipse filled with whisked matcha & creamy foam swirl clipped inside bowl
  ctx.beginPath();
  ctx.ellipse(cx, cy - 12, 23, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = baseColor;
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy - 12, 20, 5.5, 0, 0, Math.PI * 2);
  ctx.clip();

  const a = elapsedSec * 9;
  ctx.fillStyle = foamColor;
  ctx.beginPath();
  ctx.arc(cx + Math.cos(a) * 10, cy - 12 + Math.sin(a) * 2.2, 4.5, 0, Math.PI * 2);
  ctx.arc(cx + Math.cos(a + 2.2) * 8, cy - 12 + Math.sin(a + 2.2) * 2.0, 3.6, 0, Math.PI * 2);
  ctx.arc(cx + Math.sin(a * 0.7) * 5, cy - 12, 3.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function drawBambooChasenInHand(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  tiltRad: number
): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tiltRad);

  // Bamboo whisk prongs fanning down into bowl
  ctx.beginPath();
  ctx.moveTo(-5, 4);
  ctx.quadraticCurveTo(-11, 18, -7, 25);
  ctx.lineTo(7, 25);
  ctx.quadraticCurveTo(11, 18, 5, 4);
  ctx.closePath();
  ctx.fillStyle = '#E6BD74';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Whisk tine lines
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-3, 8);
  ctx.lineTo(-4, 23);
  ctx.moveTo(0, 8);
  ctx.lineTo(0, 24);
  ctx.moveTo(3, 8);
  ctx.lineTo(4, 23);
  ctx.stroke();

  // Bamboo handle
  roundedRectPath(ctx, -4.5, -14, 9, 20, 4);
  ctx.fillStyle = '#D89B54';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();

  drawHandCircle(ctx, hx, hy);
}

function drawShakerShakingInHands(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rotRad: number,
  drinkColor: string,
  elapsedSec: number
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotRad);

  // Dual motion arcs hugging both sides of shaker
  drawMotionArcs(ctx, 22, 15);

  // Translucent/stainless shaker cup showing milk tea + ice shaking inside
  roundedRectPath(ctx, -14, -24, 28, 48, 8);
  ctx.fillStyle = '#F6F0E9';
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Sloshing milk tea & ice inside clear window
  roundedRectPath(ctx, -11.5, -10, 23, 30, 5.5);
  ctx.fillStyle = drinkColor;
  ctx.fill();

  const iceSlosh = Math.sin(elapsedSec * 14) * 2.5;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillRect(-7 + iceSlosh, -4, 6, 6);
  ctx.fillRect(2 - iceSlosh, 4, 6, 6);

  // Sealed stainless/copper cap firmly closed during P2 shake
  roundedRectPath(ctx, -11, -30, 22, 8, 3.5);
  ctx.fillStyle = '#E0D7CD';
  ctx.fill();
  ctx.lineWidth = 2.3;
  ctx.stroke();

  roundedRectPath(ctx, -7, -37, 14, 8, 3.5);
  ctx.fillStyle = '#C5834B';
  ctx.fill();
  ctx.stroke();

  const pulse = Math.sin(elapsedSec * 16);
  ctx.fillStyle = '#FFFDF9';
  ctx.beginPath();
  ctx.arc(-11 + pulse * 2, -39, 2.3, 0, Math.PI * 2);
  ctx.arc(11 - pulse * 2, -41, 2.0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEspressoMachineOnCounter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  coffeeColor: string,
  elapsedSec: number
): void {
  ctx.save();
  // Machine body
  roundedRectPath(ctx, cx - 20, cy - 52, 40, 52, 8);
  ctx.fillStyle = '#C5834B';
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Inner dark recess for espresso carafe
  roundedRectPath(ctx, cx - 14, cy - 30, 28, 28, 4);
  ctx.fillStyle = '#4B3227';
  ctx.fill();

  // Portafilter spout aligned directly over carafe center
  const spoutX = cx;
  const spoutY = cy - 28;
  roundedRectPath(ctx, cx - 7, cy - 34, 14, 6, 2);
  ctx.fillStyle = '#E8E1D9';
  ctx.fill();
  ctx.stroke();

  // Glass coffee carafe catching espresso stream
  roundedRectPath(ctx, cx - 10, cy - 18, 20, 17, 4);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  const fillH = 6 + Math.abs(Math.sin(elapsedSec * 1.4)) * 7;
  const liquidSurfaceY = cy - 2 - fillH;
  roundedRectPath(ctx, cx - 8, liquidSurfaceY, 16, fillH, 2);
  ctx.fillStyle = coffeeColor;
  ctx.fill();

  // Rich espresso stream connected seamlessly from portafilter spout straight to carafe surface
  ctx.strokeStyle = coffeeColor;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(spoutX, spoutY);
  ctx.lineTo(spoutX, liquidSurfaceY + 1);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(spoutX - 0.6, spoutY + 1);
  ctx.lineTo(spoutX - 0.6, liquidSurfaceY);
  ctx.stroke();

  // Thin rising warm steam wisps above machine
  drawRisingSteamWisps(ctx, cx, cy - 56, elapsedSec);
  ctx.restore();
}

function drawCitrusJuicerOnCounter(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  side: -1 | 1,
  juiceColor: string,
  elapsedSec: number
): void {
  const dirToCup = -side; // Pitcher faces inward toward open counter between tool & cup
  const pitcherCx = cx + dirToCup * 24;
  const spoutStartX = cx + dirToCup * 18;
  const spoutStartY = cy - 16;
  const fillH = 6 + Math.abs(Math.sin(elapsedSec * 1.6)) * 6;
  const pitcherSurfaceY = cy - 2 - fillH;

  ctx.save();
  // Juicer base
  roundedRectPath(ctx, cx - 18, cy - 28, 36, 28, 8);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Fresh citrus half squeezing smoothly down onto reamer
  const squeeze = Math.abs(Math.sin(elapsedSec * 5.2)) * 4;
  ctx.beginPath();
  ctx.arc(cx, cy - 28 + squeeze, 13, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = juiceColor;
  ctx.fill();
  ctx.stroke();

  // Small metal spout tip extending from base toward pitcher
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(spoutStartX, spoutStartY);
  ctx.lineTo(spoutStartX + dirToCup * 4, spoutStartY + 1);
  ctx.stroke();

  // Glass pitcher catching juice
  roundedRectPath(ctx, pitcherCx - 8, cy - 15, 16, 15, 4);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  roundedRectPath(ctx, pitcherCx - 6.5, pitcherSurfaceY, 13, fillH, 2.5);
  ctx.fillStyle = juiceColor;
  ctx.fill();

  // Continuous juice stream from exact spout tip straight down to pitcher liquidSurfaceY
  const tipX = spoutStartX + dirToCup * 4;
  const tipY = spoutStartY + 1;
  ctx.strokeStyle = juiceColor;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.quadraticCurveTo(pitcherCx, tipY + 1, pitcherCx, pitcherSurfaceY + 1);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ctx.restore();
}

function drawSaltedCreamSwirlAction(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  cupCx: number,
  side: -1 | 1,
  elapsedSec: number
): void {
  const pourDir = -side;
  const tilt = pourDir * 1.25;
  const spout = transformRotatedAnchor(hx, hy, tilt, pourDir * 13, -3);
  const surfaceY = CUP_TOP_Y + 14;
  const ribbonEndX = cupCx + Math.sin(elapsedSec * 7) * 8;

  // Smooth velvety salted cream ribbon onto coffee surface
  ctx.save();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(spout.x, spout.y);
  ctx.quadraticCurveTo((spout.x + ribbonEndX) * 0.5, spout.y + 10, ribbonEndX, surfaceY);
  ctx.lineWidth = 6.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.lineWidth = 4.2;
  ctx.strokeStyle = '#FFF6E8';
  ctx.stroke();
  ctx.restore();

  // Cute small cream pitcher in hand
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt);
  roundedRectPath(ctx, -9, -11, 18, 20, 5);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  roundedRectPath(ctx, -7, -8, 14, 7, 3);
  ctx.fillStyle = '#FFF6E8';
  ctx.fill();
  ctx.restore();

  drawHandCircle(ctx, hx, hy);
}

function drawToppingSpoonAndDrops(
  ctx: CanvasRenderingContext2D,
  hx: number,
  hy: number,
  cupCx: number,
  side: -1 | 1,
  accentColor: string,
  isPowderDust: boolean,
  elapsedSec: number
): void {
  const spoonAngle = side * -0.35;
  const spoonBowl = transformRotatedAnchor(hx, hy, spoonAngle, -side * 16, 10);
  const minX = cupCx - 30;
  const maxX = cupCx + 30;
  const clampX = (x: number) => Math.max(minX, Math.min(maxX, x));

  // Falling topping drops/powder spawned strictly from true rotated spoonBowl anchor!
  const drop = (elapsedSec * 4.2) % 1;
  ctx.save();
  ctx.fillStyle = accentColor;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = isPowderDust ? 0.8 : 1.6;

  if (isPowderDust) {
    for (let i = 0; i < 5; i += 1) {
      const cycle = (drop + i * 0.2) % 1;
      const dx = (i - 2) * 5 + Math.sin(elapsedSec * 5 + i) * 2;
      const py = spoonBowl.y + 4 + cycle * 24;
      ctx.beginPath();
      ctx.arc(clampX(spoonBowl.x + dx), py, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.arc(clampX(spoonBowl.x - side * 3), spoonBowl.y + 4 + drop * 20, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(clampX(spoonBowl.x + side * 4), spoonBowl.y + 3 + ((drop + 0.5) % 1) * 20, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(spoonAngle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-side * 14, 9);
  ctx.lineWidth = 4;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-side * 16, 10, 5, 0, Math.PI * 2);
  ctx.fillStyle = isPowderDust ? '#A7D397' : '#F7C95B';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  drawHandCircle(ctx, hx, hy);
}

function drawSynchronizedTikTokDanceArms(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  torsoY: number,
  dance: DanceMotion,
  isLeftBarista: boolean
): void {
  const leftShoulderX = cx - 34;
  const leftShoulderY = torsoY + 22;
  const rightShoulderX = cx + 34;
  const rightShoulderY = torsoY + 22;

  const beatSin = Math.sin(dance.beatPhase);
  const beatCos = Math.cos(dance.beatPhase);

  let leftHandX = cx - 44;
  let leftHandY = headY - 8;
  let rightHandX = cx + 44;
  let rightHandY = headY - 8;

  if (dance.style === 'heart_sway') {
    // Style 1 (heart_sway): Gentle wave alternating with cute chest/overhead finger-heart pose
    if (dance.poseIndex === 0) {
      leftHandX = cx - 18 + beatSin * 4;
      leftHandY = torsoY + 4 + Math.abs(beatCos) * 4;
      rightHandX = cx + 18 - beatSin * 4;
      rightHandY = torsoY + 4 + Math.abs(beatCos) * 4;
      drawFloatingHeart(ctx, cx, torsoY - 12 + beatSin * 4, 9);
    } else {
      const waveAlt = isLeftBarista ? beatSin : -beatSin;
      leftHandX = cx - 46 + waveAlt * 6;
      leftHandY = headY - 12 + beatCos * 6;
      rightHandX = cx + 46 + waveAlt * 6;
      rightHandY = headY - 12 - beatCos * 6;
    }
  } else if (dance.style === 'groove_wave') {
    // Style 2 (groove_wave): Symmetric mirrored TikTok hand-wave (Left sweeps left while Right sweeps right, alternating!)
    const dir = isLeftBarista ? 1 : -1;
    const sweepX = Math.sin(dance.beatPhase * 0.5) * 24 * dir;
    const sweepY = Math.abs(beatSin) * 11;
    leftHandX = cx - 32 + sweepX;
    leftHandY = headY - 14 + sweepY;
    rightHandX = cx + 32 + sweepX;
    rightHandY = headY - 22 + sweepY;
  } else {
    // Style 3 (party_hype): Energetic overhead beat pump alternating with shoulder twist
    if (dance.poseIndex === 0) {
      leftHandX = cx - 28 + beatSin * 10;
      leftHandY = headY - 46 + Math.abs(beatCos) * 8;
      rightHandX = cx + 28 - beatSin * 10;
      rightHandY = headY - 46 + Math.abs(beatCos) * 8;
    } else {
      const twist = isLeftBarista ? beatSin : -beatSin;
      leftHandX = cx - 48 + twist * 10;
      leftHandY = headY - 10 + twist * 22;
      rightHandX = cx + 48 + twist * 10;
      rightHandY = headY - 10 - twist * 22;
    }
  }

  drawCartoonArm(ctx, leftShoulderX, leftShoulderY, leftHandX, leftHandY, -1);
  drawHandCircle(ctx, leftHandX, leftHandY);

  drawCartoonArm(ctx, rightShoulderX, rightShoulderY, rightHandX, rightHandY, 1);
  drawHandCircle(ctx, rightHandX, rightHandY);
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
    // Rising pastel hearts & subtle sparkles around both bartenders
    const hearts: readonly [number, number, number][] = [
      [BARISTA_LEFT_X - 46, 408 + floatA, 8],
      [BARISTA_LEFT_X + 42, 396 - floatB, 7],
      [BARISTA_RIGHT_X - 42, 398 + floatB, 7],
      [BARISTA_RIGHT_X + 46, 408 - floatA, 8],
    ];
    for (const [hx, hy, size] of hearts) {
      drawFloatingHeart(ctx, hx + dance.swayX * 0.4, hy + dance.bounceY * 0.4, size);
    }
    drawDanceSparkleStar(ctx, BARISTA_LEFT_X, 386, 5.5 + Math.sin(elapsedSec * 7) * 1.6, '#F7C95B');
    drawDanceSparkleStar(ctx, BARISTA_RIGHT_X, 386, 5.5 + Math.cos(elapsedSec * 7) * 1.6, '#F7C95B');
    ctx.restore();
    return;
  }

  const notes: readonly { x: number; y: number; symbol: string; color: string }[] = [
    { x: BARISTA_LEFT_X - 54, y: 404 + floatA, symbol: '♪', color: '#F0788C' },
    { x: BARISTA_LEFT_X + 50, y: 392 - floatB, symbol: '♫', color: '#F7C95B' },
    { x: BARISTA_RIGHT_X - 50, y: 394 + floatB, symbol: '♫', color: '#7FC8D9' },
    { x: BARISTA_RIGHT_X + 54, y: 404 - floatA, symbol: '♪', color: '#A7D397' },
  ];

  ctx.font = '900 22px "Fredoka", "Nunito", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < notes.length; i += 1) {
    const n = notes[i];
    const nx = n.x + dance.swayX * 0.45;
    const ny = n.y + dance.bounceY * 0.45;
    ctx.lineWidth = 4;
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.strokeText(n.symbol, nx, ny);
    ctx.fillStyle = n.color;
    ctx.fillText(n.symbol, nx, ny);
  }

  const starCoords: readonly [number, number][] =
    dance.style === 'party_hype' || tier === 'LARGE'
      ? [
          [BARISTA_LEFT_X - 44, 382],
          [BARISTA_LEFT_X + 42, 378],
          [STAGE_WORK_CENTER_X, 394],
          [BARISTA_RIGHT_X - 42, 380],
          [BARISTA_RIGHT_X + 44, 382],
        ]
      : [
          [BARISTA_LEFT_X - 40, 386],
          [BARISTA_RIGHT_X + 40, 386],
        ];

  for (let i = 0; i < starCoords.length; i += 1) {
    const [sx, sy] = starCoords[i];
    const pulse = 5.4 + Math.sin(elapsedSec * 8 + i) * 2.2;
    drawDanceSparkleStar(ctx, sx + dance.swayX * 0.3, sy, pulse, '#F7C95B');
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
  ctx.bezierCurveTo(-size, -size * 0.4, -size * 0.55, -size * 1.1, 0, -size * 0.45);
  ctx.bezierCurveTo(size * 0.55, -size * 1.1, size, -size * 0.4, 0, size * 0.35);
  ctx.closePath();
  ctx.fillStyle = '#F0788C';
  ctx.fill();
  ctx.lineWidth = 2.1;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  ctx.restore();
}

function drawDanceSparkleStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string
): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.36;
    const a = (Math.PI / 4) * i;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
}

function drawCartoonArm(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  hx: number,
  hy: number,
  outwardSide: -1 | 1
): void {
  const isHandHigh = hy < sy;
  const elbowX = (sx + hx) * 0.5 + outwardSide * (isHandHigh ? 12 : 7);
  const elbowY = isHandHigh
    ? (sy + hy) * 0.5 + 14
    : Math.max(sy, hy) + 11;

  // 1. Forearm curve (warm peach skin running smoothly from shoulder cuff to wrist)
  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(elbowX, elbowY, hx, hy);
  ctx.lineWidth = 15.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(elbowX, elbowY, hx, hy);
  ctx.lineWidth = 10.5;
  ctx.strokeStyle = BARISTA_SKIN;
  ctx.stroke();

  // 2. Soft short rolled sleeve segment via De Casteljau split at t = 0.42
  const sleeveT = 0.42;
  const ctrlSleeveX = sx + (elbowX - sx) * sleeveT;
  const ctrlSleeveY = sy + (elbowY - sy) * sleeveT;
  const midSleeveX = elbowX + (hx - elbowX) * sleeveT;
  const midSleeveY = elbowY + (hy - elbowY) * sleeveT;
  const cuffX = ctrlSleeveX + (midSleeveX - ctrlSleeveX) * sleeveT;
  const cuffY = ctrlSleeveY + (midSleeveY - ctrlSleeveY) * sleeveT;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(ctrlSleeveX, ctrlSleeveY, cuffX, cuffY);
  ctx.lineWidth = 19.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.quadraticCurveTo(ctrlSleeveX, ctrlSleeveY, cuffX, cuffY);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#FFF5E6';
  ctx.stroke();
}

function drawHandCircle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.beginPath();
  ctx.arc(x, y, 8.4, 0, Math.PI * 2);
  ctx.fillStyle = BARISTA_SKIN;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Subtle soft finger highlight
  ctx.beginPath();
  ctx.arc(x - 2, y - 2, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.fill();
}

function drawCelebrationSpeechBanner(
  ctx: CanvasRenderingContext2D,
  rawText: string,
  tier: GiftTier
): void {
  const text = rawText.slice(0, GAMEPLAY_LIMITS.SPEECH_MAX_CHARS);
  ctx.font = '900 13.5px "Nunito", sans-serif';
  const measured = ctx.measureText(text).width;
  const bubbleW = Math.min(238, Math.max(128, measured + 28));
  const bubbleH = 34;
  const bx = STAGE_WORK_CENTER_X - bubbleW * 0.5;
  const by = 376;

  roundedRectPath(ctx, bx, by, bubbleW, bubbleH, 17);
  ctx.fillStyle = tier === 'LARGE' ? '#FFF1C2' : '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.fillStyle = DRINK_BAR_PALETTE.TEXT_PRIMARY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, STAGE_WORK_CENTER_X, by + bubbleH * 0.5 + 1);
}
