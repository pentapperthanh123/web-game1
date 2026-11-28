import { DRINK_BAR_PALETTE, STAGE_METRICS } from '@shared/config';
import type { BrewPhaseAction } from '@shared/recipes';
import type { DanceStyle, RecipeId } from '@shared/types';
import { drawMatchaCanister, drawMotionArcs, drawRealisticBobaShaker } from './brewEffects';

const { WIDTH, HEIGHT, COUNTER_TOP_Y, COUNTER_END_Y } = STAGE_METRICS;
const COUNTER_SURFACE_HEIGHT = 48;
const OUTLINE_THICK = 3.0;
const OUTLINE_MEDIUM = 2.5;

// Exported exact station coordinates shared with drawBartender.ts so hands align 1:1 with props
export const BAR_STATION_COORDS = {
  SHAKER_X: 60,
  SHAKER_RIGHT_CLAMP_X: 80,
  SUGAR_JAR_X: 136,
  SUGAR_BTN_X: 136,
  SUGAR_BTN_Y: COUNTER_TOP_Y - 34,
  BOBA_JAR_X: 196,
  ICE_BIN_X: 252,
  MENU_STAND_X: 299,
  CENTER_CUP_X: 360,
  PREP_PAD_X: 420,
  CUP_STACK_X: 502,
  LID_STACK_X: 530,
  ESPRESSO_X: 595,
  FROTHER_STAND_X: 666,
  SHELF_Y: 398,
  TEA_URN_1_SPIGOT_X: 209,
  TEA_URN_2_SPIGOT_X: 291,
  SYRUP_1_X: 357,
  SYRUP_2_X: 393,
  SYRUP_3_X: 429,
  FRUIT_JAR_X: 463,
  MATCHA_TIN_X: 480,
  MATCHA_TIN_Y: 372,
} as const;

const ESPRESSO_MACHINE_X = 554;
const ESPRESSO_MACHINE_W = 82;
const ESPRESSO_MACHINE_H = 98;
const ESPRESSO_MACHINE_TOP_Y = COUNTER_TOP_Y + 16 - ESPRESSO_MACHINE_H;

export const MANEKI_NEKO_ANCHOR = {
  X: ESPRESSO_MACHINE_X + ESPRESSO_MACHINE_W * 0.5,
  BASE_Y: ESPRESSO_MACHINE_TOP_Y,
  BELL_Y: ESPRESSO_MACHINE_TOP_Y - 21,
} as const;

export interface BarEquipmentState {
  activeRecipeId: RecipeId | null;
  activeAction: BrewPhaseAction | null;
  stepProgress: number; // 0..1 within current step
  isFastBoost: boolean;
  isPickingCup: boolean;
  isPickingLid: boolean;
  isTakingMatchaFromShelf: boolean;
  isHoldingOatside: boolean;
  isHoldingSodaBottle: boolean;
  isShakerDetached: boolean;
  shakerFillRatio: number; // 0..1 visible milk tea level inside machine shaker (stays 0 after pouring!)
  isPressingSugarButton: boolean;
  isUsingFrother: boolean;
  isScoopingBoba: boolean;
  isScoopingIce: boolean;
  danceStyle: DanceStyle | null;
  danceBeatPulse: number;
  manekiExcitedProgress: number;
  hasQueuedGuests: boolean;
}

const IDLE_EQUIPMENT_STATE: BarEquipmentState = {
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

export function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.min(radius, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawBarBackdrop(
  ctx: CanvasRenderingContext2D,
  elapsedSec: number,
  equip: BarEquipmentState = IDLE_EQUIPMENT_STATE
): void {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Soft pastel pinkish-cream wall gradient
  const wallGrad = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  wallGrad.addColorStop(0, DRINK_BAR_PALETTE.WALL_TOP);
  wallGrad.addColorStop(0.74, DRINK_BAR_PALETTE.WALL_BOTTOM);
  wallGrad.addColorStop(1, '#F7D5E0');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // 2. Tall, airy panoramic warm pastel café arch alcove (y: 196 -> COUNTER_TOP_Y, centered at x = 360)
  ctx.save();
  const archGrad = ctx.createLinearGradient(360, 196, 360, COUNTER_TOP_Y);
  archGrad.addColorStop(0, '#FFFBF8');
  archGrad.addColorStop(0.58, '#FDEEF3');
  archGrad.addColorStop(1, '#F8DCE6');
  ctx.fillStyle = archGrad;
  ctx.strokeStyle = '#E6BCCB';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(360, 344, 272, 148, 0, Math.PI, 0, false);
  ctx.lineTo(632, COUNTER_TOP_Y);
  ctx.lineTo(88, COUNTER_TOP_Y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Delicate inner cream molding arch (pulses smoothly on beat during TikTok dances, especially Quẩy Nhiệt!)
  const archBeat = equip.danceStyle ? equip.danceBeatPulse : 0;
  let archRimStroke = 'rgba(255, 255, 255, 0.8)';
  if (equip.danceStyle === 'party_hype') {
    archRimStroke = `rgba(247, 201, 91, ${(0.42 + archBeat * 0.45).toFixed(2)})`;
  } else if (equip.danceStyle === 'groove_wave') {
    archRimStroke = `rgba(127, 200, 217, ${(0.4 + archBeat * 0.35).toFixed(2)})`;
  } else if (equip.danceStyle === 'heart_sway') {
    archRimStroke = `rgba(244, 166, 190, ${(0.4 + archBeat * 0.35).toFixed(2)})`;
  }
  ctx.strokeStyle = archRimStroke;
  ctx.lineWidth = equip.danceStyle === 'party_hype' ? 2.4 + archBeat * 2.2 : 2.4;
  ctx.beginPath();
  ctx.ellipse(360, 344, 261, 138, 0, Math.PI, 0, false);
  ctx.lineTo(621, COUNTER_TOP_Y - 2);
  ctx.moveTo(99, COUNTER_TOP_Y - 2);
  ctx.lineTo(99, 344);
  ctx.stroke();

  // Soft warm ambient light halo behind back shelves (syncs gently to beat during Quẩy Nhiệt)
  const haloBoost = equip.danceStyle === 'party_hype' ? archBeat * 0.24 : archBeat * 0.1;
  const archGlow = ctx.createRadialGradient(360, 326, 28, 360, 326, 210);
  if (equip.danceStyle === 'party_hype') {
    archGlow.addColorStop(0, `rgba(255, 234, 175, ${(0.5 + haloBoost).toFixed(2)})`);
    archGlow.addColorStop(0.6, `rgba(244, 166, 190, ${(0.18 + haloBoost * 0.7).toFixed(2)})`);
  } else {
    archGlow.addColorStop(0, `rgba(255, 246, 224, ${(0.52 + haloBoost).toFixed(2)})`);
    archGlow.addColorStop(0.6, 'rgba(255, 236, 240, 0.18)');
  }
  archGlow.addColorStop(1, 'rgba(255, 236, 240, 0)');
  ctx.fillStyle = archGlow;
  ctx.beginPath();
  ctx.arc(360, 326, 210, 0, Math.PI * 2);
  ctx.fill();

  // Gentle twinkling pastel sparkles in upper arch
  const twinkleA = 0.52 + Math.sin(elapsedSec * 2.2) * 0.35;
  const twinkleB = 0.52 + Math.cos(elapsedSec * 2.5 + 1.1) * 0.35;
  drawSoftArchSparkle(ctx, 210, 238, 5.2, twinkleA, '#F7C95B');
  drawSoftArchSparkle(ctx, 510, 238, 4.8, twinkleB, '#F4A6BE');
  drawSoftArchSparkle(ctx, 360, 210, 4.4, twinkleA, '#FFFDF9');

  // 3. Upper Decorative Cafe Shelf (y: 282, x: 222 -> 498): Cute cafe charm props
  drawBackEquipmentShelf(ctx, 222, 282, 276);
  drawUpperShelfDecor(ctx, 236, 282);

  // 4. Lower Reachable Bar Equipment Shelf (y: 398, x: 158 -> 562):
  //    2 Tea Urns (TRÀ SỮA, TRÀ NỀN) + 3 Syrup Pump Bottles + Shelf Matcha Tin + Oatside Carton
  drawBackEquipmentShelf(ctx, 158, BAR_STATION_COORDS.SHELF_Y, 404);

  const isDispensingMilkTea =
    equip.activeRecipeId === 'thai_tea' &&
    equip.activeAction === 'dispense' &&
    !equip.isPickingCup &&
    !equip.isPressingSugarButton;
  const isTeaBaseRecipe =
    equip.activeRecipeId === 'peach_tea' || equip.activeRecipeId === 'lime_tea';
  const isDispensingTeaBase =
    isTeaBaseRecipe &&
    equip.activeAction === 'dispense' &&
    !equip.isPickingCup &&
    !equip.isPressingSugarButton &&
    equip.stepProgress < 0.575;
  const isPumpingBerrySyrup =
    equip.activeRecipeId === 'berry_soda' &&
    equip.activeAction === 'dispense' &&
    !equip.isPickingCup &&
    !equip.isPressingSugarButton;
  const isPumpingPeachSyrup =
    equip.activeRecipeId === 'peach_tea' &&
    equip.activeAction === 'dispense' &&
    !equip.isPickingCup &&
    !equip.isPressingSugarButton &&
    equip.stepProgress >= 0.575;
  const isPumpingLimeSyrup =
    equip.activeRecipeId === 'lime_tea' &&
    equip.activeAction === 'dispense' &&
    !equip.isPickingCup &&
    !equip.isPressingSugarButton &&
    equip.stepProgress >= 0.575;

  drawStainlessTeaUrn(ctx, 174, 320, 'TRÀ SỮA', isDispensingMilkTea, '#D89E68');
  drawStainlessTeaUrn(ctx, 256, 320, 'TRÀ NỀN', isDispensingTeaBase, '#C98A4B');

  // 3 Pastel Syrup Pump Bottles beside the tea urns (Strawberry, Peach/Citrus, Green Lime)
  const berryPump = isPumpingBerrySyrup ? Math.abs(Math.sin(elapsedSec * 8)) * 4 : 0;
  const peachPump = isPumpingPeachSyrup ? Math.abs(Math.sin(elapsedSec * 8)) * 4 : 0;
  const limePump = isPumpingLimeSyrup ? Math.abs(Math.sin(elapsedSec * 8)) * 4 : 0;
  drawSyrupPumpBottle(ctx, 344, 348, '#F9CCD9', '#E04F6D', berryPump);
  drawSyrupPumpBottle(ctx, 380, 352, '#FDE4BA', '#F7B955', peachPump);
  drawSyrupPumpBottle(ctx, 416, 350, '#D9F0C7', '#7FB86B', limePump);

  // Prominent Shelf Matcha Tin ("MATCHA" ceramic canister with bamboo lid — hides while barista lifts it!)
  if (!equip.isTakingMatchaFromShelf) {
    drawShelfMatchaTin(ctx, 450, 348);
  } else {
    // Subtle resting shadow pad where Matcha tin was lifted from
    roundedRectPath(ctx, 454, 394, 28, 4, 2);
    ctx.fillStyle = 'rgba(133, 94, 104, 0.22)';
    ctx.fill();
  }

  // Cute resting OATSIDE milk carton on lower shelf (hides when barista is pouring/holding it!)
  if (!equip.isHoldingOatside) {
    drawShelfOatsideCarton(ctx, 494, 354);
  } else {
    roundedRectPath(ctx, 497, 394, 22, 4, 2);
    ctx.fillStyle = 'rgba(133, 94, 104, 0.22)';
    ctx.fill();
  }

  // Refreshing sparkling SODA bottle on lower shelf (hides when barista is pouring/holding it!)
  if (!equip.isHoldingSodaBottle) {
    drawShelfSodaBottle(ctx, 530, 352, elapsedSec);
  } else {
    roundedRectPath(ctx, 532, 394, 18, 4, 2);
    ctx.fillStyle = 'rgba(133, 94, 104, 0.22)';
    ctx.fill();
  }

  // 5. Two balanced warm pastel pendant lamps centered symmetrically between left/right boards & above shelf
  const glowPulse = 0.92 + Math.sin(elapsedSec * 1.8) * 0.08;
  drawPendantLamp(ctx, 246, 86, 46, glowPulse);
  drawPendantLamp(ctx, 474, 86, 46, glowPulse);

  // Subtle warm pastel wainscot accent near counter top
  const wainscotGrad = ctx.createLinearGradient(0, 558, 0, COUNTER_TOP_Y);
  wainscotGrad.addColorStop(0, 'rgba(217, 155, 156, 0.04)');
  wainscotGrad.addColorStop(1, 'rgba(217, 155, 156, 0.16)');
  ctx.fillStyle = wainscotGrad;
  ctx.fillRect(0, 558, WIDTH, COUNTER_TOP_Y - 558);
  ctx.restore();
}

function drawUpperShelfDecor(
  ctx: CanvasRenderingContext2D,
  x: number,
  shelfY: number
): void {
  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // 1. Mini potted trailing plant on left end
  roundedRectPath(ctx, x, shelfY - 22, 22, 22, 5);
  ctx.fillStyle = '#F4A6BE';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#8BC478';
  ctx.beginPath();
  ctx.ellipse(x + 5, shelfY - 27, 6.5, 4.2, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + 17, shelfY - 27, 6.5, 4.2, 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + 11, shelfY - 32, 5, 6.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#A7D397';
  ctx.fill();
  ctx.stroke();

  // 2. Cute pastel wooden café plaque in center ("♡ SWEET BAR ♡")
  const signX = 304;
  roundedRectPath(ctx, signX, shelfY - 30, 112, 28, 8);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, signX + 4, shelfY - 26, 104, 20, 5);
  ctx.fillStyle = '#FDEBF1';
  ctx.fill();

  ctx.font = '900 10px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = '#9E3A5A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♡ SWEET BAR ♡', signX + 56, shelfY - 15.5);

  // 3. Coffee beans glass canister on right
  const beanX = 434;
  roundedRectPath(ctx, beanX, shelfY - 32, 28, 32, 6);
  ctx.fillStyle = 'rgba(255, 253, 249, 0.9)';
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, beanX + 3, shelfY - 18, 22, 16, 3.5);
  ctx.fillStyle = '#6F4732';
  ctx.fill();
  roundedRectPath(ctx, beanX + 4, shelfY - 37, 20, 6, 3);
  ctx.fillStyle = '#D99B66';
  ctx.fill();
  ctx.stroke();

  // 4. Pastel stacked ceramic cups on far right
  const cupX = 472;
  roundedRectPath(ctx, cupX, shelfY - 14, 18, 14, 4);
  ctx.fillStyle = '#FCE397';
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, cupX + 1, shelfY - 26, 16, 13, 4);
  ctx.fillStyle = '#CBEAD2';
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawShelfMatchaTin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  drawMatchaCanister(ctx, x + 18, y + 25, false);
}

function drawSoftArchSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  alpha: number,
  fill: string
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.quadraticCurveTo(cx + r * 0.18, cy - r * 0.18, cx + r, cy);
  ctx.quadraticCurveTo(cx + r * 0.18, cy + r * 0.18, cx, cy + r);
  ctx.quadraticCurveTo(cx - r * 0.18, cy + r * 0.18, cx - r, cy);
  ctx.quadraticCurveTo(cx - r * 0.18, cy - r * 0.18, cx, cy - r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBackEquipmentShelf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number
): void {
  roundedRectPath(ctx, x + 6, y + 8, w - 12, 9, 4.5);
  ctx.fillStyle = 'rgba(181, 115, 120, 0.16)';
  ctx.fill();

  ctx.fillStyle = '#D99BA7';
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2;
  roundedRectPath(ctx, x + 22, y + 10, 11, 11, 4);
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, x + w - 33, y + 10, 11, 11, 4);
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, x, y, w, 13, 6.5);
  ctx.fillStyle = '#E8B8C2';
  ctx.fill();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.stroke();

  roundedRectPath(ctx, x + 7, y + 2.4, w - 14, 3, 1.5);
  ctx.fillStyle = 'rgba(255, 250, 252, 0.72)';
  ctx.fill();
}

function drawStainlessTeaUrn(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  isDispensing: boolean,
  streamColor: string
): void {
  const w = 70;
  const h = 78;
  const cx = x + w * 0.5;

  ctx.save();
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Black insulated base stand
  roundedRectPath(ctx, x + 6, y + h - 8, w - 12, 10, 3);
  ctx.fillStyle = '#4B3630';
  ctx.fill();
  ctx.stroke();

  // Brushed stainless cylinder body
  const bodyGrad = ctx.createLinearGradient(x, y, x + w, y);
  bodyGrad.addColorStop(0, '#CBD3DC');
  bodyGrad.addColorStop(0.28, '#F6F8FA');
  bodyGrad.addColorStop(0.65, '#DCE3EA');
  bodyGrad.addColorStop(1, '#B8C2CC');
  roundedRectPath(ctx, x, y + 11, w, h - 18, 9);
  ctx.fillStyle = bodyGrad;
  ctx.fill();
  ctx.stroke();

  // Black domed top insulated lid
  roundedRectPath(ctx, x + 3, y + 3, w - 6, 12, 6);
  ctx.fillStyle = '#4B3630';
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, cx - 10, y, 20, 5, 2.5);
  ctx.fillStyle = '#6A5149';
  ctx.fill();
  ctx.stroke();

  // Crisp white tape label strip ("TRÀ SỮA" / "TRÀ NỀN")
  roundedRectPath(ctx, x + 6, y + 21, w - 12, 14, 3);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 1.6;
  ctx.stroke();

  ctx.font = '900 8px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = DRINK_BAR_PALETTE.TEXT_PRIMARY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, cx, y + 28.5);

  // Prominent black spigot housing & lever
  ctx.lineWidth = 2.2;
  roundedRectPath(ctx, cx - 6, y + 46, 12, 13, 3);
  ctx.fillStyle = '#3B2820';
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, cx - 3.5, y + 57, 7, 9, 2);
  ctx.fillStyle = '#2B1B14';
  ctx.fill();
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, y + 48);
  ctx.rotate(isDispensing ? -0.35 : 0);
  roundedRectPath(ctx, -12, -3.5, 16, 5.5, 2.5);
  ctx.fillStyle = '#3B2820';
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (isDispensing) {
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.lineWidth = 6.2;
    ctx.beginPath();
    ctx.moveTo(cx, y + 66);
    ctx.lineTo(cx, y + 90);
    ctx.stroke();

    ctx.strokeStyle = streamColor;
    ctx.lineWidth = 3.8;
    ctx.stroke();
  }

  ctx.restore();
}

function drawSyrupPumpBottle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bodyFill: string,
  syrupFill: string,
  pressOffset: number
): void {
  const w = 26;
  const h = 50;
  const cx = x + w * 0.5;

  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  const headY = y + pressOffset;
  ctx.fillStyle = '#FFFDF9';
  ctx.fillRect(cx - 2, headY + 4, 4, 10 - pressOffset * 0.5);
  ctx.strokeRect(cx - 2, headY + 4, 4, 10 - pressOffset * 0.5);

  roundedRectPath(ctx, cx - 5, headY, 14, 5.5, 2.5);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, x, y + 14, w, h - 14, 6);
  ctx.fillStyle = bodyFill;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, x + 2.5, y + 27, w - 5, h - 29.5, 3.5);
  ctx.fillStyle = syrupFill;
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fillRect(x + 4, y + 17, 2.6, 16);
  ctx.restore();
}

function drawShelfOatsideCarton(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number
): void {
  const w = 28;
  const h = 44;
  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  ctx.beginPath();
  ctx.moveTo(x, y + 8);
  ctx.lineTo(x + 5, y + 1);
  ctx.lineTo(x + w - 5, y + 1);
  ctx.lineTo(x + w, y + 8);
  ctx.closePath();
  ctx.fillStyle = '#6E472B';
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, x, y + 8, w, h - 8, 3.5);
  ctx.fillStyle = '#F6EAD7';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#D49A6A';
  ctx.fillRect(x + 1.5, y + 22, w - 3, 11);

  ctx.font = '900 7px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = DRINK_BAR_PALETTE.TEXT_PRIMARY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('OAT', x + w * 0.5, y + 28);
  ctx.restore();
}

function drawPendantLamp(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  cordLen: number,
  glowPulse: number
): void {
  const lampX = anchorX;
  const domeTopY = anchorY + cordLen;
  const domeRadiusX = 22;
  const domeHeight = 19;
  const rimY = domeTopY + domeHeight;
  const bulbCenterY = rimY + 6;

  const haloRadius = 74 * glowPulse;
  const glow = ctx.createRadialGradient(lampX, bulbCenterY, 5, lampX, bulbCenterY, haloRadius);
  glow.addColorStop(0, 'rgba(255, 245, 206, 0.36)');
  glow.addColorStop(0.45, 'rgba(255, 232, 188, 0.14)');
  glow.addColorStop(1, 'rgba(255, 232, 188, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(lampX, bulbCenterY, haloRadius, 0, Math.PI * 2);
  ctx.fill();

  const coneGrad = ctx.createLinearGradient(lampX, rimY + 2, lampX, rimY + 190);
  coneGrad.addColorStop(0, 'rgba(255, 245, 212, 0.12)');
  coneGrad.addColorStop(1, 'rgba(255, 245, 212, 0)');
  ctx.fillStyle = coneGrad;
  ctx.beginPath();
  ctx.moveTo(lampX - 16, rimY + 2);
  ctx.lineTo(lampX + 16, rimY + 2);
  ctx.lineTo(lampX + 74, rimY + 190);
  ctx.lineTo(lampX - 74, rimY + 190);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.beginPath();
  ctx.moveTo(lampX, anchorY);
  ctx.lineTo(lampX, domeTopY - 4);
  ctx.stroke();

  const bulbGrad = ctx.createRadialGradient(
    lampX - 2,
    bulbCenterY - 1,
    1.5,
    lampX,
    bulbCenterY,
    8.2
  );
  bulbGrad.addColorStop(0, '#FFFDF5');
  bulbGrad.addColorStop(0.65, '#FFF2B2');
  bulbGrad.addColorStop(1, '#FCD97D');
  ctx.beginPath();
  ctx.ellipse(lampX, bulbCenterY, 7.2, 7.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = bulbGrad;
  ctx.fill();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(lampX, rimY - 2, domeRadiusX, domeHeight, 0, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = '#F4A6BE';
  ctx.fill();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(
    lampX,
    rimY - 2,
    domeRadiusX - 5.5,
    domeHeight - 5,
    0,
    Math.PI * 1.12,
    Math.PI * 1.48,
    false
  );
  ctx.strokeStyle = 'rgba(255, 251, 253, 0.72)';
  ctx.lineWidth = 2.4;
  ctx.stroke();

  roundedRectPath(ctx, lampX - domeRadiusX - 0.5, rimY - 4.5, domeRadiusX * 2 + 1, 5.5, 2.75);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.2;
  ctx.stroke();

  roundedRectPath(ctx, lampX - 5.5, domeTopY - 5, 11, 6, 2.5);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.2;
  ctx.stroke();
}

export function drawBarCounter(
  ctx: CanvasRenderingContext2D,
  elapsedSec = 0,
  equip: BarEquipmentState = IDLE_EQUIPMENT_STATE
): void {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const bodyY = COUNTER_TOP_Y + COUNTER_SURFACE_HEIGHT;
  const bodyHeight = COUNTER_END_Y - bodyY;

  // 1. Main counter body
  ctx.fillStyle = DRINK_BAR_PALETTE.COUNTER_BODY;
  ctx.fillRect(0, bodyY, WIDTH, bodyHeight);

  const downlight = ctx.createLinearGradient(0, bodyY, 0, bodyY + 76);
  downlight.addColorStop(0, 'rgba(255, 240, 245, 0.45)');
  downlight.addColorStop(1, 'rgba(255, 240, 245, 0)');
  ctx.fillStyle = downlight;
  ctx.fillRect(0, bodyY, WIDTH, 76);

  // Vertical fluted wood paneling
  const slatSpacing = 16;
  ctx.lineWidth = 1.4;
  for (let sx = 24; sx <= WIDTH - 24; sx += slatSpacing) {
    ctx.strokeStyle = 'rgba(59, 40, 32, 0.22)';
    ctx.beginPath();
    ctx.moveTo(sx, bodyY + 8);
    ctx.lineTo(sx, COUNTER_END_Y - 24);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 242, 246, 0.38)';
    ctx.beginPath();
    ctx.moveTo(sx + 2.5, bodyY + 9);
    ctx.lineTo(sx + 2.5, COUNTER_END_Y - 25);
    ctx.stroke();
  }

  // Cute scalloped pastel trim rủ nhẹ beneath counter top ledge
  drawCounterScallopedTrim(ctx, bodyY);

  // Mid-level horizontal trim rail + centered mini sweet bar plaque
  const trimY = bodyY + 42;
  roundedRectPath(ctx, 18, trimY, WIDTH - 36, 10, 4.5);
  ctx.fillStyle = DRINK_BAR_PALETTE.COUNTER_PANEL;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(24, trimY + 2.5);
  ctx.lineTo(WIDTH - 24, trimY + 2.5);
  ctx.strokeStyle = 'rgba(255, 244, 248, 0.65)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  drawCounterMiniPlaque(ctx, trimY);

  // Bottom kickplate baseboard
  const kickY = COUNTER_END_Y - 18;
  ctx.fillStyle = '#8C5156';
  ctx.fillRect(0, kickY, WIDTH, 18);
  ctx.beginPath();
  ctx.moveTo(0, kickY);
  ctx.lineTo(WIDTH, kickY);
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.stroke();

  ctx.fillStyle = 'rgba(59, 40, 32, 0.16)';
  ctx.fillRect(0, bodyY, WIDTH, 12);

  // 2. Wooden counter top surface
  ctx.fillStyle = DRINK_BAR_PALETTE.COUNTER_TOP;
  ctx.fillRect(0, COUNTER_TOP_Y, WIDTH, COUNTER_SURFACE_HEIGHT);

  ctx.fillStyle = DRINK_BAR_PALETTE.COUNTER_HIGHLIGHT;
  ctx.fillRect(0, COUNTER_TOP_Y + 2, WIDTH, 11);

  // Centered barista rubber mat beneath compact ~70% primary cup (x = 318..402)
  roundedRectPath(ctx, 318, COUNTER_TOP_Y + 7, 84, 20, 7.5);
  ctx.fillStyle = 'rgba(181, 115, 120, 0.34)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(59, 40, 32, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Crisp #3B2820 counter edge lines
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_THICK;
  ctx.beginPath();
  ctx.moveTo(0, COUNTER_TOP_Y);
  ctx.lineTo(WIDTH, COUNTER_TOP_Y);
  ctx.moveTo(0, bodyY);
  ctx.lineTo(WIDTH, bodyY);
  ctx.moveTo(0, COUNTER_END_Y);
  ctx.lineTo(WIDTH, COUNTER_END_Y);
  ctx.stroke();

  // 3. Full-width Balanced Countertop Equipment (zero overlap with center cup/badge x=318..402)
  const isShakingMilkTea =
    (equip.activeRecipeId === 'thai_tea' || equip.activeRecipeId === 'peach_tea') &&
    equip.activeAction === 'tool_prep';
  const isExtractingCoffee =
    equip.activeRecipeId === 'coffee_milk' &&
    equip.activeAction === 'dispense' &&
    !equip.isPickingCup &&
    !equip.isPressingSugarButton;

  const shakerLiquidColor = equip.activeRecipeId === 'peach_tea' ? '#FF9D5C' : '#D89E68';

  // Left Wing: Evenly spaced Shaker (16..104) + Sugar (112..164) + Boba (174..220) + Ice (230..274)
  drawDoubleShakerMachine(
    ctx,
    16,
    COUNTER_TOP_Y + 14,
    isShakingMilkTea,
    equip.isShakerDetached,
    equip.shakerFillRatio,
    shakerLiquidColor,
    equip.isFastBoost,
    elapsedSec
  );
  drawSugarJarAndButton(ctx, 118, COUNTER_TOP_Y + 16, equip.isPressingSugarButton, elapsedSec);
  drawCounterBobaJar(ctx, 174, COUNTER_TOP_Y + 16, equip.isScoopingBoba);
  drawCounterIceBin(ctx, 230, COUNTER_TOP_Y + 16, equip.isScoopingIce);

  // Right Wing: Prep Pad (404..440) + Fresh Fruit Jar (446..480) + Cup/Lid Stacks (486..544) + Espresso (554..636) + Frother (646..704)
  drawCounterFruitJar(ctx, 446, COUNTER_TOP_Y + 16);
  drawCupAndLidStacks(ctx, 486, COUNTER_TOP_Y + 16, equip.isPickingCup, equip.isPickingLid);
  drawCounterEspressoMachine(
    ctx,
    ESPRESSO_MACHINE_X,
    COUNTER_TOP_Y + 16,
    isExtractingCoffee,
    equip.stepProgress,
    elapsedSec
  );
  drawManekiNeko(
    ctx,
    MANEKI_NEKO_ANCHOR.X,
    MANEKI_NEKO_ANCHOR.BASE_Y,
    elapsedSec,
    equip.manekiExcitedProgress,
    equip.danceStyle,
    equip.danceBeatPulse
  );
  drawFrotherStandAndPlant(ctx, 646, COUNTER_TOP_Y + 16, equip.isUsingFrother);

  // 4. Cozy pastel floor welcome mat beneath waiting customer lanes
  drawCustomerFloorMat(ctx, equip.hasQueuedGuests);

  ctx.restore();
}

function drawSugarJarAndButton(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  isPressing: boolean,
  elapsedSec: number
): void {
  const pressDepth = isPressing ? Math.abs(Math.sin(elapsedSec * 12)) * 4.5 : 0;
  const w = 36;
  const h = 40;
  const cx = x + w * 0.5;
  const bodyTopY = baseY - h;

  ctx.save();
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // 1. Sleek 1-piece rounded glass sugar pump dispenser body (zero messy side pedestal!)
  roundedRectPath(ctx, x, bodyTopY, w, h, 8);
  ctx.fillStyle = 'rgba(255, 253, 249, 0.92)';
  ctx.fill();
  ctx.stroke();

  // Warm golden liquid sugar / syrup inside lower 68% of bottle
  roundedRectPath(ctx, x + 2.5, bodyTopY + 13, w - 5, h - 15.5, 5.5);
  ctx.fillStyle = '#FCE397';
  ctx.fill();

  // Subtle amber depth band at bottom
  roundedRectPath(ctx, x + 2.5, baseY - 12, w - 5, 9.5, 4);
  ctx.fillStyle = 'rgba(224, 168, 72, 0.35)';
  ctx.fill();

  // Vertical glass highlight streak
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillRect(x + 5, bodyTopY + 4, 3, h - 9);

  // Crisp centered "ĐƯỜNG" pastel label pill
  roundedRectPath(ctx, x + 3, bodyTopY + 15, w - 6, 11, 3.5);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.font = '900 6px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = DRINK_BAR_PALETTE.TEXT_PRIMARY;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ĐƯỜNG', cx, bodyTopY + 20.8);

  // 2. Integrated metallic screw collar + centered press pump nozzle on top
  ctx.lineWidth = OUTLINE_MEDIUM;
  roundedRectPath(ctx, cx - 10, bodyTopY - 5, 20, 6.5, 3);
  ctx.fillStyle = '#E4E9EE';
  ctx.fill();
  ctx.stroke();

  // Pump stem
  const nozzleY = bodyTopY - 15 + pressDepth;
  ctx.fillStyle = '#FFFDF9';
  ctx.fillRect(cx - 2.4, nozzleY + 4, 4.8, 11 - pressDepth * 0.6);
  ctx.lineWidth = 2.0;
  ctx.strokeRect(cx - 2.4, nozzleY + 4, 4.8, 11 - pressDepth * 0.6);

  // Ergonomic press-pump head & side spout pointing slightly right
  roundedRectPath(ctx, cx - 6, nozzleY, 17, 5.8, 2.8);
  ctx.fillStyle = isPressing ? '#F7C95B' : '#F4A6BE';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.stroke();

  // Subtle golden syrup drop + pulse ring when pressing pump!
  if (isPressing) {
    const pulseR = 6 + ((elapsedSec * 20) % 8);
    const pulseAlpha = Math.max(0, 1 - (pulseR - 6) / 8) * 0.72;
    ctx.beginPath();
    ctx.arc(cx, nozzleY + 2, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(247, 201, 91, ${pulseAlpha.toFixed(2)})`;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    const dropPhase = (elapsedSec * 5.2) % 1;
    const dropY = nozzleY + 7 + dropPhase * 15;
    ctx.fillStyle = '#F4B83E';
    ctx.beginPath();
    ctx.arc(cx + 10, dropY, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

const BOBA_JAR_PEARL_OFFSETS: readonly (readonly [number, number])[] = [
  [9, 22], [17, 23], [26, 22], [35, 23],
  [13, 15], [22, 16], [31, 15],
];

function drawCounterBobaJar(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  isScooping: boolean
): void {
  const w = 44;
  const h = 30;
  const topY = baseY - h;

  ctx.save();
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Resting stainless boba ladle peeking out when barista isn't scooping boba
  if (!isScooping) {
    ctx.save();
    ctx.translate(x + 33, topY - 4);
    ctx.rotate(0.42);
    roundedRectPath(ctx, -2.5, -10, 5, 13, 2);
    ctx.fillStyle = '#D99B66';
    ctx.fill();
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.restore();
  }

  // Warm translucent syrup/boba jar body
  ctx.lineWidth = OUTLINE_MEDIUM;
  roundedRectPath(ctx, x, topY, w, h, 6);
  ctx.fillStyle = '#F6E7D8';
  ctx.fill();
  ctx.stroke();

  // Glossy black boba pearls visible inside jar
  ctx.fillStyle = '#4A2E23';
  for (let i = 0; i < BOBA_JAR_PEARL_OFFSETS.length; i += 1) {
    const [ox, oy] = BOBA_JAR_PEARL_OFFSETS[i];
    ctx.beginPath();
    ctx.arc(x + ox, topY + oy, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rim lid + mini "BOBA" label
  roundedRectPath(ctx, x - 1.5, topY - 1, w + 3, 6.5, 3);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  ctx.font = '900 6px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = '#4A2E23';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TRÂN CHÂU', x + w * 0.5, topY + 9.5);

  ctx.restore();
}

function drawCounterIceBin(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  isScooping: boolean
): void {
  const w = 44;
  const h = 28;
  const topY = baseY - h;

  ctx.save();
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Gleaming ice cubes peeking above insulated bin rim
  ctx.fillStyle = '#FFFFFF';
  roundedRectPath(ctx, x + 5, topY - 7, 9, 9, 2.2);
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, x + 16, topY - 9, 9, 9, 2.2);
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, x + 27, topY - 6, 9, 9, 2.2);
  ctx.fill();
  ctx.stroke();

  // Resting stainless ice scoop handle peeking out when barista isn't holding it
  if (!isScooping) {
    ctx.save();
    ctx.translate(x + 34, topY - 6);
    ctx.rotate(0.45);
    roundedRectPath(ctx, -2.5, -10, 5.5, 13, 2.2);
    ctx.fillStyle = '#CBD3DC';
    ctx.fill();
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.restore();
  }

  // Insulated pastel-ice-blue bin body
  ctx.lineWidth = OUTLINE_MEDIUM;
  roundedRectPath(ctx, x, topY, w, h, 6);
  ctx.fillStyle = '#D9F1F7';
  ctx.fill();
  ctx.stroke();

  // Subtle rim lip & "ĐÁ VIÊN" mini tag
  roundedRectPath(ctx, x - 1.5, topY - 1, w + 3, 6.5, 3);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  ctx.font = '900 6.5px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = '#3B6575';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ĐÁ VIÊN', x + w * 0.5, topY + 17);

  ctx.restore();
}

function drawDoubleShakerMachine(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  isShaking: boolean,
  isShakerDetached: boolean,
  shakerFillRatio: number,
  shakerLiquidColor: string,
  isFastBoost: boolean,
  elapsedSec: number
): void {
  const w = 88;
  const h = 104;
  const topY = baseY - h;

  ctx.save();
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  const metalGrad = ctx.createLinearGradient(x, topY, x + w, topY);
  metalGrad.addColorStop(0, '#D4DCE3');
  metalGrad.addColorStop(0.45, '#F3F6F9');
  metalGrad.addColorStop(1, '#C5CFD8');
  roundedRectPath(ctx, x, topY + 6, w, h - 6, 8);
  ctx.fillStyle = metalGrad;
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, x + 6, topY + 12, 24, 12, 3);
  ctx.fillStyle = '#3B2820';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 13, topY + 18, 3, 0, Math.PI * 2);
  ctx.fillStyle = isShaking ? '#7FD972' : '#F7C95B';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 23, topY + 18, 2.2, 0, Math.PI * 2);
  ctx.fillStyle = '#F4A6BE';
  ctx.fill();

  const leftColX = x + 24;
  const rightColX = x + 64;
  ctx.fillStyle = '#B4C0CB';
  ctx.fillRect(leftColX - 3, topY + 12, 6, h - 22);
  ctx.strokeRect(leftColX - 3, topY + 12, 6, h - 22);
  ctx.fillRect(rightColX - 3, topY + 12, 6, h - 22);
  ctx.strokeRect(rightColX - 3, topY + 12, 6, h - 22);

  roundedRectPath(ctx, leftColX - 12, baseY - 18, 24, 14, 4);
  ctx.fillStyle = '#E4E9EE';
  ctx.fill();
  ctx.stroke();
  roundedRectPath(ctx, leftColX - 9, topY + 34, 18, 7, 3);
  ctx.fillStyle = '#CBD3DC';
  ctx.fill();
  ctx.stroke();

  // Right active shaker arm: empty clamp when barista detaches shaker to pour in P4!
  if (isShakerDetached) {
    roundedRectPath(ctx, rightColX - 12, baseY - 18, 24, 14, 4);
    ctx.fillStyle = '#E4E9EE';
    ctx.fill();
    ctx.stroke();
    roundedRectPath(ctx, rightColX - 9, topY + 34, 18, 7, 3);
    ctx.fillStyle = '#CBD3DC';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  const shakeFreq = isFastBoost ? 28 : 20;
  const shakeDy = isShaking ? Math.sin(elapsedSec * shakeFreq) * 10 : 0;
  const shakeRot = isShaking ? Math.cos(elapsedSec * shakeFreq) * 0.08 : 0;

  ctx.save();
  ctx.translate(rightColX, baseY - 38 + shakeDy);
  ctx.rotate(shakeRot);

  if (isShaking) {
    drawMotionArcs(ctx, 18, 12);
  }

  // Realistic 3-piece tapered 700ml boba shaker clamped in the shaker arm
  drawRealisticBobaShaker(ctx, {
    liquidColor: shakerLiquidColor,
    fillRatio: shakerFillRatio,
    isCapClosed: true,
    isPouringTilted: false,
    isShaking,
    elapsedSec,
  });

  // Top & bottom mechanical stainless shaker machine clamping brackets
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  roundedRectPath(ctx, -12, -35.5, 24, 5.5, 2.5);
  ctx.fillStyle = '#B4C0CB';
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, -12.5, 17, 25, 11, 4);
  ctx.fillStyle = '#E4E9EE';
  ctx.fill();
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

function drawShelfSodaBottle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  elapsedSec: number
): void {
  const w = 22;
  const h = 46;

  ctx.save();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Slender glass bottle neck & lip at top
  roundedRectPath(ctx, x + 6, y + 4, 10, 11, 2.5);
  ctx.fillStyle = '#E8F7FA';
  ctx.fill();
  ctx.stroke();

  // Metallic golden crown cap on bottle mouth
  roundedRectPath(ctx, x + 5, y - 1, 12, 5.5, 2);
  ctx.fillStyle = '#F7C95B';
  ctx.fill();
  ctx.stroke();

  // Main glass bottle body
  roundedRectPath(ctx, x, y + 13, w, h - 13, 5);
  ctx.fillStyle = 'rgba(232, 247, 250, 0.95)';
  ctx.fill();
  ctx.stroke();

  // Refreshing turquoise soda liquid fill inside bottle
  roundedRectPath(ctx, x + 2.2, y + 15, w - 4.4, h - 17.5, 3.5);
  ctx.fillStyle = '#7FC8D9';
  ctx.fill();

  // Sparkling animated effervescent bubbles rising
  const b1Y = y + 38 - ((elapsedSec * 14) % 20);
  const b2Y = y + 36 - (((elapsedSec + 0.45) * 12) % 18);
  const b3Y = y + 34 - (((elapsedSec + 0.9) * 16) % 16);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.beginPath();
  ctx.arc(x + 6, b1Y, 1.2, 0, Math.PI * 2);
  ctx.arc(x + 16, b2Y, 1.0, 0, Math.PI * 2);
  ctx.arc(x + 11, b3Y, 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Vertical glass highlight shine
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.fillRect(x + 3.5, y + 16, 2, 25);

  // Crisp retro soda label pill
  roundedRectPath(ctx, x + 1.8, y + 25, w - 3.6, 12.5, 3);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 1.3;
  ctx.stroke();

  roundedRectPath(ctx, x + 3.2, y + 26.5, w - 6.4, 9.5, 2);
  ctx.fillStyle = '#E2F4F7';
  ctx.fill();

  ctx.font = '900 5.4px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = '#2C6272';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SODA', x + w * 0.5, y + 31.5);

  ctx.restore();
}

function drawCounterFruitJar(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number
): void {
  const w = 34;
  const h = 30;
  const topY = baseY - h;

  ctx.save();
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Glass fruit garnish jar body
  roundedRectPath(ctx, x, topY, w, h, 6);
  ctx.fillStyle = '#FFF5EC';
  ctx.fill();
  ctx.stroke();

  // Bright peach & lime slices visible inside the jar
  ctx.beginPath();
  ctx.arc(x + 11, topY + 20, 5.2, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = '#FF9D5C';
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + 23, topY + 21, 5.0, Math.PI, 0, false);
  ctx.closePath();
  ctx.fillStyle = '#8BD158';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + 17, topY + 15, 4.6, 0, Math.PI, false);
  ctx.closePath();
  ctx.fillStyle = '#FFB347';
  ctx.fill();
  ctx.stroke();

  // Lid + "TRÁI CÂY" label
  ctx.lineWidth = OUTLINE_MEDIUM;
  roundedRectPath(ctx, x - 1.5, topY - 1, w + 3, 6.5, 3);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  ctx.font = '900 5.4px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = '#8A3E1A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TRÁI CÂY', x + w * 0.5, topY + 9);

  ctx.restore();
}

function drawCupAndLidStacks(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  isPickingCup: boolean,
  isPickingLid: boolean
): void {
  ctx.save();
  ctx.lineWidth = 2.3;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Tray beneath cup & dome lid stacks
  roundedRectPath(ctx, x - 2, baseY - 6, 62, 12, 4.5);
  ctx.fillStyle = '#C48285';
  ctx.fill();
  ctx.stroke();

  // 1. Stack of clear takeaway plastic cups (drops from 4 -> 3 while barista lifts top cup!)
  const cupCount = isPickingCup ? 3 : 4;
  for (let c = 0; c < cupCount; c += 1) {
    const cy = baseY - 19 - c * 7.5;
    ctx.beginPath();
    ctx.moveTo(x + 2, cy);
    ctx.lineTo(x + 24, cy);
    ctx.lineTo(x + 21, cy + 16);
    ctx.lineTo(x + 5, cy + 16);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 253, 249, 0.88)';
    ctx.fill();
    ctx.stroke();
  }

  // 2. Stack of dome lids beside cups (drops from 4 -> 3 while barista lifts top lid for P5!)
  const lidCount = isPickingLid ? 3 : 4;
  for (let l = 0; l < lidCount; l += 1) {
    const ly = baseY - 10 - l * 6;
    ctx.beginPath();
    ctx.arc(x + 44, ly, 10, Math.PI, 0, false);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 250, 252, 0.88)';
    ctx.fill();
    ctx.lineWidth = 2.1;
    ctx.stroke();
  }

  ctx.restore();
}

function drawCounterEspressoMachine(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  isExtracting: boolean,
  stepProgress: number,
  elapsedSec: number
): void {
  const w = ESPRESSO_MACHINE_W;
  const h = ESPRESSO_MACHINE_H;
  const topY = baseY - h;
  const cx = x + w * 0.5;

  ctx.save();
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  roundedRectPath(ctx, x, topY, w, h, 9);
  ctx.fillStyle = '#D48F59';
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, x + 6, topY + 6, w - 12, 24, 5);
  ctx.fillStyle = '#FFF9FA';
  ctx.fill();
  ctx.stroke();

  // Pressure gauge + status LED
  ctx.beginPath();
  ctx.arc(x + 22, topY + 18, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FCEBF1';
  ctx.fill();
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + 22, topY + 18);
  ctx.lineTo(x + 25.5, topY + 14);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x + w - 16, topY + 18, 3.8, 0, Math.PI * 2);
  ctx.fillStyle = isExtracting ? '#7FD972' : '#F4A6BE';
  ctx.fill();
  ctx.stroke();

  // Extraction recess bay
  ctx.lineWidth = OUTLINE_MEDIUM;
  roundedRectPath(ctx, x + 10, topY + 36, w - 20, 48, 5);
  ctx.fillStyle = '#4B3227';
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, x + 8, baseY - 12, w - 16, 10, 3);
  ctx.fillStyle = '#E4E7EB';
  ctx.fill();
  ctx.stroke();

  // Grouphead & portafilter
  const spoutX = cx;
  const spoutY = topY + 48;
  roundedRectPath(ctx, cx - 10, topY + 38, 20, 9, 3);
  ctx.fillStyle = '#E4E7EB';
  ctx.fill();
  ctx.stroke();

  roundedRectPath(ctx, cx - 24, topY + 40, 15, 5, 2.5);
  ctx.fillStyle = '#2B1B14';
  ctx.fill();
  ctx.stroke();

  // Graduated measuring cup on drip tray
  const jugW = 24;
  const jugH = 24;
  const jugX = cx - jugW * 0.5;
  const jugY = baseY - 12 - jugH;
  roundedRectPath(ctx, jugX, jugY, jugW, jugH, 4);
  ctx.fillStyle = 'rgba(255, 253, 249, 0.88)';
  ctx.fill();
  ctx.lineWidth = 2.0;
  ctx.stroke();

  const fillFrac = isExtracting ? 0.25 + stepProgress * 0.65 : 0.22;
  const fillH = Math.max(4, (jugH - 4) * fillFrac);
  const liquidTopY = baseY - 14 - fillH;
  roundedRectPath(ctx, jugX + 2, liquidTopY, jugW - 4, fillH, 2);
  ctx.fillStyle = '#5A321C';
  ctx.fill();

  ctx.strokeStyle = 'rgba(59, 40, 32, 0.55)';
  ctx.lineWidth = 1.2;
  for (let tick = 1; tick <= 3; tick += 1) {
    const ty = jugY + tick * 5.5;
    ctx.beginPath();
    ctx.moveTo(jugX + 3, ty);
    ctx.lineTo(jugX + 8.5, ty);
    ctx.stroke();
  }

  if (isExtracting) {
    ctx.strokeStyle = '#5A321C';
    ctx.lineWidth = 3.6;
    ctx.beginPath();
    ctx.moveTo(spoutX, spoutY);
    ctx.lineTo(spoutX, liquidTopY + 1);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 232, 200, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(spoutX - 0.7, spoutY + 1);
    ctx.lineTo(spoutX - 0.7, liquidTopY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 253, 249, 0.72)';
    ctx.lineWidth = 2.0;
    for (let s = 0; s < 2; s += 1) {
      const phase = (elapsedSec * 1.4 + s * 0.5) % 1;
      const sx = cx + (s === 0 ? -28 : 28) + Math.sin(elapsedSec * 3.5 + s) * 3;
      const sy = topY - 4 - phase * 18;
      ctx.globalAlpha = Math.sin(phase * Math.PI) * 0.7;
      ctx.beginPath();
      ctx.moveTo(sx, sy + 6);
      ctx.quadraticCurveTo(sx + 3, sy, sx - 2, sy - 6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawManekiNeko(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  elapsedSec: number,
  excitedProgress: number,
  danceStyle: DanceStyle | null,
  danceBeatPulse: number
): void {
  const isExcited = excitedProgress > 0.01;
  const isDancing = danceStyle !== null;

  // Smooth squash & bounce: excited bounce for ~1.5s on order/donate, gentle beat bounce during barista dance
  let bounceY = 0;
  let scaleX = 1;
  let scaleY = 1;
  if (isExcited) {
    const hop = Math.abs(Math.sin(elapsedSec * 14)) * excitedProgress;
    bounceY = -hop * 5.2;
    scaleX = 1 + hop * 0.08;
    scaleY = 1 - hop * 0.06;
  } else if (isDancing) {
    bounceY = -danceBeatPulse * 3.2;
    scaleX = 1 + danceBeatPulse * 0.05;
    scaleY = 1 - danceBeatPulse * 0.04;
  }

  let waveSpeed = 3.6;
  let waveAmp = 0.34;
  if (isExcited) {
    waveSpeed = 12.2;
    waveAmp = 0.52;
  } else if (isDancing) {
    waveSpeed = 6.8;
    waveAmp = 0.42;
  }
  const waveAngle = -0.35 + Math.sin(elapsedSec * waveSpeed) * waveAmp;
  const isBlinking = !isExcited && elapsedSec % 4.4 > 4.22;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_MEDIUM;

  // 1. Cozy pastel silk cushion sitting flush on top of espresso machine
  roundedRectPath(ctx, cx - 18, baseY - 5, 36, 6, 3);
  ctx.fillStyle = '#F0788C';
  ctx.fill();
  ctx.stroke();

  ctx.translate(cx, baseY - 3 + bounceY);
  ctx.scale(scaleX, scaleY);

  // 2. Cute curved cream tail peeking from right side
  const tailWag = Math.sin(elapsedSec * (isExcited ? 10 : 2.6)) * 2.2;
  ctx.beginPath();
  ctx.moveTo(11, -5);
  ctx.quadraticCurveTo(21, -8 + tailWag, 19, -17 + tailWag);
  ctx.lineWidth = 6.5;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  ctx.lineWidth = 3.2;
  ctx.strokeStyle = '#FFFDF9';
  ctx.stroke();
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_MEDIUM;

  // 3. Plump chibi cream body
  ctx.beginPath();
  ctx.moveTo(-12, -21);
  ctx.quadraticCurveTo(-16, -8, -14, -1);
  ctx.quadraticCurveTo(0, 2, 14, -1);
  ctx.quadraticCurveTo(16, -8, 12, -21);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // Soft warm belly tint
  ctx.beginPath();
  ctx.ellipse(0, -10, 9.5, 8.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFF2EC';
  ctx.fill();

  // Cute sitting feet/paws at bottom edge
  ctx.fillStyle = '#FFFDF9';
  ctx.beginPath();
  ctx.ellipse(-8.5, -1.5, 4.8, 3.0, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(8.5, -1.5, 4.8, 3.0, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 4. Beckoning raised arm (left side, smoothly pivoted at shoulder)
  ctx.save();
  ctx.translate(-11.5, -16.5);
  ctx.rotate(waveAngle);
  roundedRectPath(ctx, -4, -15, 8, 16, 4);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -11.5, 2.1, 0, Math.PI * 2);
  ctx.fillStyle = '#F4A6BE';
  ctx.fill();
  ctx.restore();

  // 5. Right arm hugging a mini gold Koban lucky coin / plaque
  roundedRectPath(ctx, 5.5, -18, 10.5, 14.5, 4.5);
  ctx.fillStyle = DRINK_BAR_PALETTE.VIP_GOLD;
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#9E6610';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(10.8, -14.5);
  ctx.lineTo(10.8, -7.2);
  ctx.moveTo(8.5, -11);
  ctx.lineTo(13.1, -11);
  ctx.stroke();

  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.beginPath();
  ctx.ellipse(12, -10.5, 4.2, 3.4, -0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // 6. Red collar ribbon + small golden bell
  ctx.beginPath();
  ctx.moveTo(-11.5, -21);
  ctx.quadraticCurveTo(0, -17.5, 11.5, -21);
  ctx.lineWidth = 4.6;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();
  ctx.lineWidth = 2.6;
  ctx.strokeStyle = '#E85D75';
  ctx.stroke();

  ctx.lineWidth = 2.0;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.beginPath();
  ctx.arc(0, -18, 3.8, 0, Math.PI * 2);
  ctx.fillStyle = DRINK_BAR_PALETTE.VIP_GOLD;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.beginPath();
  ctx.arc(0, -17.3, 1.0, 0, Math.PI * 2);
  ctx.fill();

  // 7. Chibi round cat head + light pink inner ears
  ctx.lineWidth = OUTLINE_MEDIUM;
  drawManekiNekoEar(ctx, -1);
  drawManekiNekoEar(ctx, 1);

  ctx.beginPath();
  ctx.ellipse(0, -31.5, 15.5, 12.8, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // Soft pastel rosy cheeks
  ctx.fillStyle = 'rgba(244, 139, 163, 0.58)';
  ctx.beginPath();
  ctx.ellipse(-9.2, -28.5, 3.1, 1.9, 0, 0, Math.PI * 2);
  ctx.ellipse(9.2, -28.5, 3.1, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes (happy crescents when excited, occasional blink in idle, bright glossy dots otherwise)
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.fillStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 2.0;
  if (isExcited) {
    ctx.beginPath();
    ctx.arc(-6, -32.2, 2.7, Math.PI * 1.12, Math.PI * 1.88, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(6, -32.2, 2.7, Math.PI * 1.12, Math.PI * 1.88, false);
    ctx.stroke();
  } else if (isBlinking) {
    ctx.beginPath();
    ctx.moveTo(-8.4, -32.5);
    ctx.lineTo(-3.6, -32.5);
    ctx.moveTo(3.6, -32.5);
    ctx.lineTo(8.4, -32.5);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-6, -32.5, 2.2, 0, Math.PI * 2);
    ctx.arc(6, -32.5, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-6.7, -33.2, 0.85, 0, Math.PI * 2);
    ctx.arc(5.3, -33.2, 0.85, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cute pink kitty nose & ω smile
  ctx.fillStyle = '#F48BA3';
  ctx.beginPath();
  ctx.ellipse(0, -29.5, 1.8, 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(-2.1, -27.2, 2.0, 0.1 * Math.PI, 0.9 * Math.PI, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(2.1, -27.2, 2.0, 0.1 * Math.PI, 0.9 * Math.PI, false);
  ctx.stroke();

  // Delicate whisker lines
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-12.5, -31.5);
  ctx.lineTo(-16.5, -32.2);
  ctx.moveTo(-12.5, -28.8);
  ctx.lineTo(-16.5, -28.5);
  ctx.moveTo(12.5, -31.5);
  ctx.lineTo(16.5, -32.2);
  ctx.moveTo(12.5, -28.8);
  ctx.lineTo(16.5, -28.5);
  ctx.stroke();

  ctx.restore();
}

function drawManekiNekoEar(ctx: CanvasRenderingContext2D, side: -1 | 1): void {
  ctx.beginPath();
  ctx.moveTo(side * 5, -40);
  ctx.quadraticCurveTo(side * 12, -49, side * 14.5, -36);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(side * 7.2, -39.2);
  ctx.quadraticCurveTo(side * 11.2, -44.2, side * 12.6, -37.2);
  ctx.closePath();
  ctx.fillStyle = '#F4A6BE';
  ctx.fill();
}

function drawFrotherStandAndPlant(
  ctx: CanvasRenderingContext2D,
  x: number,
  baseY: number,
  isUsingFrother: boolean
): void {
  ctx.save();
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;

  // Slim minimalist coaster strip (keeps right wing airy & showcases mini vending machine behind)
  roundedRectPath(ctx, x, baseY - 4, 58, 9, 4);
  ctx.fillStyle = '#D99B9C';
  ctx.fill();
  ctx.stroke();

  // Resting brushed stainless frothing pitcher + handheld electric frother on stand (hides when in use!)
  if (!isUsingFrother) {
    const pX = x + 6;
    const pY = baseY - 31;

    // Pitcher handle
    ctx.beginPath();
    ctx.arc(pX + 20, pY + 14, 5, -Math.PI * 0.5, Math.PI * 0.5, false);
    ctx.lineWidth = 2.1;
    ctx.stroke();

    // Brushed stainless pitcher
    roundedRectPath(ctx, pX, pY, 20, 26, 4.5);
    ctx.fillStyle = '#E4E9EE';
    ctx.fill();
    ctx.lineWidth = 2.3;
    ctx.stroke();

    // Handheld white electric frother resting on stand beside pitcher
    const fX = x + 39;
    ctx.strokeStyle = '#9BA7B4';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(fX + 4.5, baseY - 20);
    ctx.lineTo(fX + 4.5, baseY - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(fX + 4.5, baseY - 6, 4.2, 1.6, 0, 0, Math.PI * 2);
    ctx.stroke();

    roundedRectPath(ctx, fX, baseY - 40, 9, 20, 4);
    ctx.fillStyle = '#FFFDF9';
    ctx.fill();
    ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    ctx.fillStyle = '#D68A6C';
    roundedRectPath(ctx, fX + 1.5, baseY - 22, 6, 3.5, 1.5);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fX + 4.5, baseY - 32, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCounterScallopedTrim(ctx: CanvasRenderingContext2D, bodyY: number): void {
  const scallopW = 24;
  const scallopH = 7.5;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, bodyY);
  for (let sx = 0; sx < WIDTH; sx += scallopW) {
    ctx.quadraticCurveTo(sx + scallopW * 0.5, bodyY + scallopH, sx + scallopW, bodyY);
  }
  ctx.lineTo(WIDTH, bodyY);
  ctx.closePath();
  ctx.fillStyle = '#FFF8FA';
  ctx.fill();
  ctx.lineWidth = OUTLINE_MEDIUM;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Subtle soft pink accent line along the counter ledge
  ctx.beginPath();
  ctx.moveTo(0, bodyY + 1.5);
  ctx.lineTo(WIDTH, bodyY + 1.5);
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#F4A6BE';
  ctx.stroke();
  ctx.restore();
}

function drawCounterMiniPlaque(ctx: CanvasRenderingContext2D, trimY: number): void {
  const plaqueW = 92;
  const plaqueH = 22;
  const plaqueX = 360 - plaqueW * 0.5;
  const plaqueY = trimY + 5 - plaqueH * 0.5;

  ctx.save();

  // Subtle drop shadow
  roundedRectPath(ctx, plaqueX + 1, plaqueY + 2, plaqueW, plaqueH, 6.5);
  ctx.fillStyle = 'rgba(59, 40, 32, 0.2)';
  ctx.fill();

  // Outer wooden plaque body
  roundedRectPath(ctx, plaqueX, plaqueY, plaqueW, plaqueH, 6.5);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = DRINK_BAR_PALETTE.OUTLINE;
  ctx.stroke();

  // Inner pastel pink inset band
  roundedRectPath(ctx, plaqueX + 3.5, plaqueY + 3, plaqueW - 7, plaqueH - 6, 4);
  ctx.fillStyle = '#FDEBF1';
  ctx.fill();

  // Tiny corner brass screw accents
  ctx.fillStyle = '#D99B66';
  ctx.beginPath();
  ctx.arc(plaqueX + 6.5, plaqueY + plaqueH * 0.5, 1.6, 0, Math.PI * 2);
  ctx.arc(plaqueX + plaqueW - 6.5, plaqueY + plaqueH * 0.5, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // Crisp centered brand text "♡ SWEET BAR ♡"
  ctx.font = '900 8.5px "Fredoka", "Nunito", sans-serif';
  ctx.fillStyle = '#9E3A5A';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♡ SWEET BAR ♡', 360, plaqueY + plaqueH * 0.5 + 0.6);

  ctx.restore();
}

const CUSTOMER_LANE_CENTERS: readonly number[] = [232, 488];

function drawCustomerFloorMat(ctx: CanvasRenderingContext2D, hasQueuedGuests = true): void {
  // Soft warm ambient floor shadow cast beneath the bar kickplate
  const floorShadow = ctx.createLinearGradient(0, COUNTER_END_Y, 0, COUNTER_END_Y + 32);
  floorShadow.addColorStop(0, 'rgba(59, 40, 32, 0.16)');
  floorShadow.addColorStop(1, 'rgba(59, 40, 32, 0)');
  ctx.fillStyle = floorShadow;
  ctx.fillRect(0, COUNTER_END_Y + 1, WIDTH, 32);

  // Full-width cozy pastel floor runner framing dynamic guest queue cleanly across lower floor
  const matX = 22;
  const matY = COUNTER_END_Y + 4;
  const matW = 676;
  const matH = 184;

  // Ground drop shadow
  roundedRectPath(ctx, matX + 2, matY + 4, matW, matH, 24);
  ctx.fillStyle = 'rgba(181, 115, 120, 0.13)';
  ctx.fill();

  // Soft pastel cream-rose runner body
  const matGrad = ctx.createLinearGradient(matX, matY, matX, matY + matH);
  matGrad.addColorStop(0, '#FFF9FB');
  matGrad.addColorStop(0.55, '#FDF0F5');
  matGrad.addColorStop(1, '#F9E1EA');
  roundedRectPath(ctx, matX, matY, matW, matH, 24);
  ctx.fillStyle = matGrad;
  ctx.fill();
  ctx.lineWidth = 2.0;
  ctx.strokeStyle = 'rgba(196, 130, 133, 0.55)';
  ctx.stroke();

  // Inner stitched border
  ctx.save();
  ctx.setLineDash([6, 5]);
  roundedRectPath(ctx, matX + 9, matY + 9, matW - 18, matH - 18, 17);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(212, 146, 157, 0.48)';
  ctx.stroke();
  ctx.restore();

  // Dual symmetric pastel lane guides (Lane 0 x=248, Lane 1 x=472): only drawn when guests exist!
  if (hasQueuedGuests) {
    for (let i = 0; i < CUSTOMER_LANE_CENTERS.length; i += 1) {
      const lx = CUSTOMER_LANE_CENTERS[i];
      roundedRectPath(ctx, lx - 58, matY + 15, 116, matH - 30, 16);
      ctx.fillStyle = 'rgba(244, 166, 190, 0.12)';
      ctx.fill();

      // Subtle upward chevron hinting queue direction toward counter
      ctx.strokeStyle = 'rgba(196, 130, 133, 0.36)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(lx - 8, matY + 32);
      ctx.lineTo(lx, matY + 25);
      ctx.lineTo(lx + 8, matY + 32);
      ctx.stroke();

      // Soft standing-spot pad for back guest
      ctx.fillStyle = 'rgba(217, 155, 156, 0.22)';
      ctx.beginPath();
      ctx.ellipse(lx, matY + matH - 22, 44, 9.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Gentle floor-to-chat transition tint below y=956 so bottom TikTok chat zone stays open & balanced
  const chatFloorFade = ctx.createLinearGradient(0, 956, 0, 1020);
  chatFloorFade.addColorStop(0, 'rgba(247, 213, 224, 0)');
  chatFloorFade.addColorStop(1, 'rgba(244, 198, 214, 0.22)');
  ctx.fillStyle = chatFloorFade;
  ctx.fillRect(0, 956, WIDTH, 64);
}
