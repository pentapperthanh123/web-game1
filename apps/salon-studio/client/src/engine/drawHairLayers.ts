import { COLOR_SWATCHES } from '@shared/constants/presets';
import { SALON_PALETTE } from '@shared/constants/salonConfig';
import type { ActiveCustomerSession, StylistMood } from '@shared/types/salon';
import { drawRoundedRect, HAIR_MIRROR_RECT } from './drawBackground';

interface SyncedToolMotion {
  normX: number;
  normY: number;
  snipPhase: number;
  combOffsetX: number;
  combOffsetY: number;
  hairBounce: number;
}

function computeSyncedToolMotion(
  customer: ActiveCustomerSession | null,
  isFast: boolean,
  timeSec: number
): SyncedToolMotion {
  const freq = isFast ? 11.5 : 5.8;
  const snipPhase = Math.sin(timeSec * freq);
  if (!customer) {
    return {
      normX: 54,
      normY: -22,
      snipPhase,
      combOffsetX: 46,
      combOffsetY: 12,
      hairBounce: 0,
    };
  }

  // Gentle, compact rhythmic trimming right along the outer-right edge of the hair (never plunging deep into the head!)
  const progressAngle = (customer.progress / 100) * Math.PI * 2;
  const trimOscX = Math.sin(timeSec * 2.4 + progressAngle * 0.3) * 5;
  const trimOscY = Math.cos(timeSec * 2.8 + progressAngle * 0.3) * 5.5;

  return {
    normX: 54 + trimOscX + snipPhase * 3.5,
    normY: -26 + trimOscY + Math.cos(timeSec * freq * 0.8) * 3.5,
    snipPhase,
    combOffsetX: 46 + Math.cos(timeSec * 2.2) * 3.5,
    combOffsetY: 12 + Math.sin(timeSec * 2.5) * 3.5,
    hairBounce: Math.abs(snipPhase) * (isFast ? 2.4 : 1.2),
  };
}

export function drawHairStation(
  ctx: CanvasRenderingContext2D,
  customer: ActiveCustomerSession | null,
  stylistMood: StylistMood,
  stylistSpeech: string,
  isFast: boolean,
  timeSec: number
): void {
  const cx = 426;
  const cy = 622;
  const stylistX = 562;
  const stylistY = 564;

  // Single source of truth for tool & hand motion shared by Foreground AND Mirror Reflection!
  const toolMotion = computeSyncedToolMotion(customer, isFast, timeSec);

  // 1. Inside the Vanity Mirror: Synchronized live reflection of Customer + Stylist + Active Snipping Arm
  drawMirrorReflection(ctx, customer, stylistMood, isFast, timeSec, toolMotion);

  // 2. Real Foreground Customer seated facing INTO the mirror (seen from the back)
  if (customer) {
    drawCustomerSeatedRearView(ctx, cx, cy, customer, timeSec, toolMotion.hairBounce);
  } else {
    drawEmptyChairHint(ctx, cx, 420);
  }

  // 3. Rear view of the Swivel Barber Chair wrapping the customer's back
  drawBarberChairRearView(ctx, cx, cy);

  // 4. Real Stylist standing beside & slightly behind customer in 3/4 side profile looking into mirror
  drawStylistCharacter(
    ctx,
    stylistX,
    stylistY,
    cx,
    cy,
    customer,
    stylistMood,
    stylistSpeech,
    isFast,
    timeSec,
    toolMotion
  );

  // 5. Customer reaction bubble (when fast / royal / troll / almost done)
  if (customer) {
    drawCustomerSpeechBubble(ctx, cx - 34, cy - 115, customer, isFast);
  }
}

function drawMirrorReflection(
  ctx: CanvasRenderingContext2D,
  customer: ActiveCustomerSession | null,
  stylistMood: StylistMood,
  isFast: boolean,
  timeSec: number,
  toolMotion: SyncedToolMotion
): void {
  const { X: mx, Y: my, W: mw, H: mh } = HAIR_MIRROR_RECT;
  const refCx = 414;
  const refCy = 448;
  const refSx = 516;
  const refSy = 450;

  ctx.save();
  // Clip strictly inside the mirror glass
  drawRoundedRect(ctx, mx + 2, my + 2, mw - 4, mh - 4, 26);
  ctx.clip();

  // Subtle reflected interior wall tone inside mirror
  ctx.fillStyle = 'rgba(244, 250, 255, 0.42)';
  ctx.fillRect(mx, my, mw, mh);

  // Layer A (Back of mirror): Reflected Stylist torso, head & face behind the customer
  drawReflectedStylistBodyInMirror(ctx, refSx, refSy, stylistMood, isFast, timeSec);

  // Layer B (Middle of mirror): Reflected Customer facing straight forward into the mirror
  if (customer) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.translate(refCx, refCy);
    ctx.scale(0.82, 0.82);
    ctx.translate(-refCx, -refCy);

    if (customer.isRoyal) {
      drawRoyalHalo(ctx, refCx, refCy - 82, timeSec);
    }
    drawCustomerFrontReflection(
      ctx,
      refCx,
      refCy,
      customer,
      isFast,
      timeSec,
      toolMotion.hairBounce
    );
    ctx.restore();
  }

  // Layer C (Front of mirror reflection): Reflected Stylist's Working Arm & Tool ON TOP of reflected hair!
  drawReflectedStylistWorkingArmInMirror(
    ctx,
    refSx,
    refSy,
    refCx,
    refCy,
    customer,
    stylistMood,
    isFast,
    timeSec,
    toolMotion
  );

  // Layer D: Soft cool mirror-glass depth wash & diagonal shine streaks
  ctx.fillStyle = 'rgba(232, 248, 255, 0.16)';
  ctx.fillRect(mx, my, mw, mh);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.beginPath();
  ctx.moveTo(mx + 34, my);
  ctx.lineTo(mx + 104, my);
  ctx.lineTo(mx + 12, my + 190);
  ctx.lineTo(mx - 28, my + 190);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.beginPath();
  ctx.moveTo(mx + 128, my);
  ctx.lineTo(mx + 152, my);
  ctx.lineTo(mx + 60, my + 190);
  ctx.lineTo(mx + 36, my + 190);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawReflectedStylistBodyInMirror(
  ctx: CanvasRenderingContext2D,
  rsx: number,
  rsy: number,
  mood: StylistMood,
  isFast: boolean,
  timeSec: number
): void {
  const bob = Math.sin(timeSec * 3.2) * 1.5;
  const headY = rsy - 96 + bob;

  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Reflected torso & mint apron
  drawRoundedRect(ctx, rsx - 34, rsy - 52, 68, 108, 20);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, rsx - 28, rsy - 32, 56, 86, 15);
  ctx.fillStyle = SALON_PALETTE.MINT_PASTEL;
  ctx.fill();
  ctx.stroke();

  // Reflected neck
  drawRoundedRect(ctx, rsx - 9, headY + 30, 18, 18, 6);
  ctx.fillStyle = '#F7D4B8';
  ctx.fill();
  ctx.stroke();

  // Reflected top hair bun
  ctx.fillStyle = '#6B443A';
  ctx.beginPath();
  ctx.arc(rsx + 12, headY - 38, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Reflected head circle
  ctx.beginPath();
  ctx.arc(rsx, headY, 38, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.stroke();

  // Reflected bangs
  ctx.fillStyle = '#6B443A';
  ctx.beginPath();
  ctx.arc(rsx, headY - 3, 38.5, Math.PI * 0.96, Math.PI * 2.04);
  ctx.quadraticCurveTo(rsx + 28, headY - 6, rsx + 35, headY + 8);
  ctx.quadraticCurveTo(rsx + 18, headY - 12, rsx - 8, headY - 8);
  ctx.quadraticCurveTo(rsx - 26, headY - 10, rsx - 36, headY + 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Reflected facial expression synced with foreground stylist mood
  ctx.save();
  ctx.translate(rsx - 3, headY);
  ctx.scale(0.76, 0.76);
  ctx.translate(-(rsx - 3), -headY);
  drawStylistFaceExpression(ctx, rsx - 3, headY, mood, isFast);
  ctx.restore();

  ctx.restore();
}

function drawArticulatedCartoonArm(
  ctx: CanvasRenderingContext2D,
  shX: number,
  shY: number,
  elX: number,
  elY: number,
  wristX: number,
  wristY: number,
  scale: number
): void {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Upper Arm Segment (Shoulder -> Elbow)
  ctx.beginPath();
  ctx.moveTo(shX, shY);
  ctx.lineTo(elX, elY);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 17 * scale;
  ctx.stroke();
  ctx.strokeStyle = '#FFE4CE';
  ctx.lineWidth = 10.5 * scale;
  ctx.stroke();

  // 2. Defined Elbow Joint Circle
  ctx.beginPath();
  ctx.arc(elX, elY, 6.2 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.2 * scale;
  ctx.stroke();

  // 3. Forearm Segment (Elbow -> Wrist)
  ctx.beginPath();
  ctx.moveTo(elX, elY);
  ctx.lineTo(wristX, wristY);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 15.5 * scale;
  ctx.stroke();
  ctx.strokeStyle = '#FFE4CE';
  ctx.lineWidth = 9.5 * scale;
  ctx.stroke();

  // 4. Short Uniform Sleeve Cap with Mint Cuff Trim at Shoulder
  const sleeveAngle = Math.atan2(elY - shY, elX - shX) - Math.PI / 2;
  ctx.save();
  ctx.translate(shX, shY);
  ctx.rotate(sleeveAngle * 0.45);
  drawRoundedRect(ctx, -12 * scale, -11 * scale, 24 * scale, 24 * scale, 9 * scale);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.6 * scale;
  ctx.stroke();

  // Mint sleeve cuff band
  drawRoundedRect(ctx, -11 * scale, 7 * scale, 22 * scale, 5 * scale, 2.5 * scale);
  ctx.fillStyle = SALON_PALETTE.MINT_PASTEL;
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 5. Defined Wrist & Gripping Hand
  ctx.beginPath();
  ctx.arc(wristX, wristY, 8.2 * scale, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.4 * scale;
  ctx.stroke();

  ctx.restore();
}

function drawReflectedStylistWorkingArmInMirror(
  ctx: CanvasRenderingContext2D,
  rsx: number,
  rsy: number,
  refCx: number,
  refCy: number,
  customer: ActiveCustomerSession | null,
  mood: StylistMood,
  isFast: boolean,
  timeSec: number,
  toolMotion: SyncedToolMotion
): void {
  const bob = Math.sin(timeSec * 3.2) * 1.5;
  const refCustHeadY = refCy - 82 * 0.82 + bob;

  // Compact wrist position right beside the outer-right edge of the reflected hair
  const wristX = customer ? refCx + toolMotion.normX * 0.82 : rsx - 36;
  const wristY = customer ? refCustHeadY + toolMotion.normY * 0.82 : rsy - 28;

  const shX = rsx - 16;
  const shY = rsy - 32 + bob * 0.5;
  // Compact V-shaped downward elbow bend matching the foreground arm proportions
  const elX = shX - 20;
  const elY = shY + 24 + toolMotion.snipPhase * 2;

  ctx.save();
  ctx.globalAlpha = 0.84;

  // 1. Compact secondary hand holding the pastel styling comb at the side lock of hair
  if (customer) {
    const combX = refCx + toolMotion.combOffsetX * 0.82;
    const combY = refCustHeadY + toolMotion.combOffsetY * 0.82;
    drawStylingCombTool(ctx, combX, combY, 0.78);
  }

  // 2. Reflected Scissors or Clipper extending from wrist toward hair edge
  ctx.save();
  ctx.translate(wristX, wristY);
  ctx.scale(0.82, 0.82);
  ctx.translate(-wristX, -wristY);
  if (mood === 'OOPS') {
    drawClipperTool(ctx, wristX, wristY, toolMotion.snipPhase);
  } else {
    drawScissorsTool(ctx, wristX, wristY, Math.abs(toolMotion.snipPhase));
  }
  ctx.restore();

  // 3. Reflected Articulated Arm (Shoulder -> Defined Elbow -> Wrist)
  drawArticulatedCartoonArm(ctx, shX, shY, elX, elY, wristX, wristY, 0.8);

  // 4. Reflected snip sparkles & falling hair snipplets at scissor blade tip
  if (customer) {
    drawActiveSnipFeedback(ctx, wristX - 16, wristY, customer, isFast, timeSec, 0.78);
  }

  ctx.restore();
}

function drawCustomerFrontReflection(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  customer: ActiveCustomerSession,
  isFast: boolean,
  timeSec: number,
  hairBounce: number
): void {
  const bob = Math.sin(timeSec * 3.2) * 2;
  const headY = cy - 82 + bob;
  const swatch = COLOR_SWATCHES[customer.colorKey];

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Reflected chair headrest frame behind customer in mirror
  drawRoundedRect(ctx, cx - 72, cy - 64, 144, 130, 30);
  ctx.fillStyle = SALON_PALETTE.CHAIR_LEATHER;
  ctx.fill();
  ctx.stroke();

  // Back hair layer in mirror (bounces slightly with scissor snips)
  if (!customer.trollEffect) {
    drawBackHair(ctx, cx, headY - hairBounce * 0.5, customer.hairStyle, swatch.hex, swatch.shadow);
  }

  // Reflected salon cape draped over customer's chest
  ctx.beginPath();
  ctx.moveTo(cx - 26, headY + 52);
  ctx.quadraticCurveTo(cx - 80, headY + 92, cx - 74, cy + 76);
  ctx.lineTo(cx + 74, cy + 76);
  ctx.quadraticCurveTo(cx + 80, headY + 92, cx + 26, headY + 52);
  ctx.closePath();
  ctx.fillStyle = customer.isRoyal ? '#FFE599' : customer.shirtColor;
  ctx.fill();
  ctx.stroke();

  // Cape collar
  drawRoundedRect(ctx, cx - 22, headY + 46, 44, 14, 7);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // Neck
  drawRoundedRect(ctx, cx - 14, headY + 34, 28, 22, 8);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // Ears
  ctx.beginPath();
  ctx.arc(cx - 50, headY + 5, 11, 0, Math.PI * 2);
  ctx.arc(cx + 50, headY + 5, 11, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // Front-facing Head in Mirror
  ctx.beginPath();
  ctx.arc(cx, headY, 50, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // Rosy cheeks
  ctx.fillStyle = 'rgba(255, 135, 165, 0.45)';
  ctx.beginPath();
  ctx.ellipse(cx - 28, headY + 12, 10, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(cx + 28, headY + 12, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Customer's live facial expression reflected clearly in the mirror
  const currentExpr = isFast && !customer.trollEffect ? 'EXCITED' : customer.expression;
  drawCustomerFace(ctx, cx, headY, currentExpr, timeSec);

  // Front hair OR Troll hair reflected in mirror (reacts with hairBounce as stylist snips!)
  const hairY = headY - hairBounce;
  if (customer.trollEffect === 'BALD_STRIPE') {
    drawTrollBaldStripe(ctx, cx, hairY, swatch.hex, customer.skinTone);
  } else if (customer.trollEffect === 'BURNT_AFRO') {
    drawTrollBurntAfro(ctx, cx, hairY, timeSec);
  } else if (customer.trollEffect === 'BOWL_CUT') {
    drawTrollBowlCut(ctx, cx, hairY, swatch.hex);
  } else {
    drawFrontHair(
      ctx,
      cx,
      hairY,
      customer.hairStyle,
      swatch.hex,
      swatch.highlight,
      customer.hasPastelShimmer,
      timeSec
    );
  }

  // Hair Accessories reflected in mirror
  drawHairAccessory(ctx, cx, hairY, customer.accessory, timeSec);

  ctx.restore();
}

function drawCustomerSeatedRearView(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  customer: ActiveCustomerSession,
  timeSec: number,
  hairBounce: number
): void {
  const bob = Math.sin(timeSec * 3.2) * 2;
  const headY = cy - 88 + bob;
  const swatch = COLOR_SWATCHES[customer.colorKey];

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Customer's shoulders & upper back wrapped in the salon cape (facing into mirror)
  ctx.beginPath();
  ctx.moveTo(cx - 28, headY + 46);
  ctx.quadraticCurveTo(cx - 82, headY + 80, cx - 76, cy + 55);
  ctx.lineTo(cx + 76, cy + 55);
  ctx.quadraticCurveTo(cx + 82, headY + 80, cx + 28, headY + 46);
  ctx.closePath();
  ctx.fillStyle = customer.isRoyal ? '#FFE599' : customer.shirtColor;
  ctx.fill();
  ctx.stroke();

  // 2. Ears seen from behind
  ctx.beginPath();
  ctx.arc(cx - 48, headY + 4, 10.5, 0, Math.PI * 2);
  ctx.arc(cx + 48, headY + 4, 10.5, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // 3. Head base cranium
  ctx.beginPath();
  ctx.arc(cx, headY, 48, 0, Math.PI * 2);
  ctx.fillStyle = customer.skinTone;
  ctx.fill();
  ctx.stroke();

  // 4. Back of Customer's Hair (bounces & reacts in sync with the mirror reflection!)
  drawCustomerRearHair(
    ctx,
    cx,
    headY - hairBounce,
    customer.hairStyle,
    customer.trollEffect,
    swatch.hex,
    swatch.highlight,
    swatch.shadow,
    customer.skinTone,
    customer.hasPastelShimmer,
    timeSec
  );

  // 5. Cape tie bow fastened at the back of the customer's nape
  drawRoundedRect(ctx, cx - 20, headY + 44, 40, 13, 6);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 4, headY + 56);
  ctx.lineTo(cx - 12, headY + 72);
  ctx.moveTo(cx + 4, headY + 56);
  ctx.lineTo(cx + 12, headY + 72);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // 6. Top-visible accessories seen from behind
  if (customer.accessory !== 'SUNGLASSES') {
    drawHairAccessory(ctx, cx, headY - hairBounce, customer.accessory, timeSec);
  }

  ctx.restore();
}

function drawCustomerRearHair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  style: ActiveCustomerSession['hairStyle'],
  trollEffect: ActiveCustomerSession['trollEffect'],
  fill: string,
  highlight: string,
  shadow: string,
  skinTone: string,
  hasShimmer: boolean,
  timeSec: number
): void {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;

  if (trollEffect === 'BURNT_AFRO') {
    drawTrollBurntAfro(ctx, cx, headY, timeSec);
    ctx.beginPath();
    ctx.arc(cx, headY + 2, 50, 0, Math.PI * 2);
    ctx.fillStyle = '#332C30';
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (trollEffect === 'BALD_STRIPE') {
    ctx.beginPath();
    ctx.arc(cx, headY, 50, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();

    drawRoundedRect(ctx, cx - 18, headY - 52, 36, 98, 14);
    ctx.fillStyle = skinTone;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (trollEffect === 'BOWL_CUT') {
    ctx.beginPath();
    ctx.arc(cx, headY - 4, 54, Math.PI * 0.95, Math.PI * 2.05);
    ctx.lineTo(cx + 54, headY + 8);
    ctx.lineTo(cx - 54, headY - 6);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (style === 'curly') {
    const backPuffs = [
      [-40, -34, 24],
      [-12, -46, 26],
      [16, -46, 26],
      [40, -34, 24],
      [-46, 0, 26],
      [46, 0, 26],
      [-36, 30, 24],
      [0, 34, 26],
      [36, 30, 24],
    ];
    for (const [dx, dy, r] of backPuffs) {
      ctx.beginPath();
      ctx.arc(cx + dx, headY + dy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(cx, headY - 2, 46, 0, Math.PI * 2);
    ctx.fill();
  } else if (style === 'long') {
    drawRoundedRect(ctx, cx - 56, headY - 44, 112, 122, 44);
    ctx.fill();
    ctx.stroke();
  } else if (style === 'bob') {
    ctx.beginPath();
    ctx.arc(cx, headY + 4, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (style === 'cool') {
    drawFrontHair(ctx, cx, headY, 'cool', fill, highlight, false, timeSec);
    ctx.beginPath();
    ctx.arc(cx, headY + 2, 49, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(cx, headY - 2, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.strokeStyle = shadow;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, headY - 4, 34, Math.PI * 0.2, Math.PI * 0.8);
  ctx.stroke();

  ctx.strokeStyle = highlight;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx - 10, headY - 26, 20, Math.PI * 1.15, Math.PI * 1.75);
  ctx.stroke();

  if (hasShimmer) {
    const twinkle = 0.6 + Math.sin(timeSec * 7) * 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
    ctx.beginPath();
    ctx.arc(cx - 20, headY - 24, 3.8, 0, Math.PI * 2);
    ctx.arc(cx + 18, headY - 30, 4.2, 0, Math.PI * 2);
    ctx.arc(cx + 6, headY + 8, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBarberChairRearView(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';

  // 1. Chrome hydraulic swivel pedestal column
  ctx.fillStyle = '#D9D3D0';
  ctx.fillRect(cx - 18, cy + 92, 36, 52);
  ctx.strokeRect(cx - 18, cy + 92, 36, 52);

  // 2. Round metallic floor base resting firmly on salon rug
  ctx.beginPath();
  ctx.ellipse(cx, cy + 146, 78, 17, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#E6E1DE';
  ctx.fill();
  ctx.stroke();

  // 3. Side armrests
  drawRoundedRect(ctx, cx - 102, cy + 16, 28, 68, 13);
  ctx.fillStyle = SALON_PALETTE.CHAIR_SHADOW;
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, cx + 74, cy + 16, 28, 68, 13);
  ctx.fill();
  ctx.stroke();

  // 4. Seat base cushion
  drawRoundedRect(ctx, cx - 88, cy + 68, 176, 32, 15);
  ctx.fillStyle = SALON_PALETTE.CHAIR_LEATHER;
  ctx.fill();
  ctx.stroke();

  // 5. Rear Backrest Shell
  drawRoundedRect(ctx, cx - 80, cy - 26, 160, 104, 32);
  ctx.fillStyle = SALON_PALETTE.CHAIR_LEATHER;
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, cx - 64, cy - 12, 128, 76, 22);
  ctx.fillStyle = '#FFC2D3';
  ctx.fill();
  ctx.strokeStyle = 'rgba(58, 40, 37, 0.22)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, cx - 28, cy + 2, 56, 10, 5);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawEmptyChairHint(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
  ctx.save();
  ctx.fillStyle = 'rgba(58, 40, 37, 0.35)';
  ctx.font = '700 20px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NEXT GUEST...', cx, cy);
  ctx.restore();
}

function drawRoyalHalo(ctx: CanvasRenderingContext2D, cx: number, cy: number, timeSec: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(timeSec * 0.45);
  const rays = 12;
  for (let i = 0; i < rays; i += 1) {
    const angle = (i / rays) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 138, angle, angle + 0.22);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255, 213, 107, 0.34)' : 'rgba(255, 240, 180, 0.22)';
    ctx.fill();
  }
  ctx.restore();
}

function drawBackHair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  style: ActiveCustomerSession['hairStyle'],
  fill: string,
  shadow: string
): void {
  ctx.save();
  ctx.fillStyle = shadow;
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;

  if (style === 'long') {
    drawRoundedRect(ctx, cx - 72, headY - 12, 144, 142, 46);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  } else if (style === 'curly') {
    const puffs = [
      [-64, 12, 28],
      [64, 12, 28],
      [-68, 48, 26],
      [68, 48, 26],
      [-48, 74, 24],
      [48, 74, 24],
    ];
    ctx.fillStyle = fill;
    for (const [dx, dy, r] of puffs) {
      ctx.beginPath();
      ctx.arc(cx + dx, headY + dy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (style === 'bob') {
    ctx.beginPath();
    ctx.arc(cx, headY + 14, 72, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawFrontHair(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  style: ActiveCustomerSession['hairStyle'],
  fill: string,
  highlight: string,
  hasShimmer: boolean,
  timeSec: number
): void {
  ctx.save();
  ctx.fillStyle = fill;
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;

  switch (style) {
    case 'cool': {
      ctx.beginPath();
      ctx.moveTo(cx - 58, headY - 8);
      ctx.lineTo(cx - 66, headY - 52);
      ctx.lineTo(cx - 32, headY - 46);
      ctx.lineTo(cx - 18, headY - 86);
      ctx.lineTo(cx + 6, headY - 54);
      ctx.lineTo(cx + 34, headY - 82);
      ctx.lineTo(cx + 42, headY - 44);
      ctx.lineTo(cx + 66, headY - 42);
      ctx.lineTo(cx + 58, headY - 6);
      ctx.quadraticCurveTo(cx, headY - 30, cx - 58, headY - 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'curly': {
      const topPuffs = [
        [-42, -44, 26],
        [-14, -56, 28],
        [18, -56, 28],
        [44, -42, 26],
      ];
      for (const [dx, dy, r] of topPuffs) {
        ctx.beginPath();
        ctx.arc(cx + dx, headY + dy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case 'bob':
    case 'long': {
      ctx.beginPath();
      ctx.arc(cx, headY - 12, 62, Math.PI * 0.96, Math.PI * 2.04);
      ctx.quadraticCurveTo(cx + 28, headY - 14, cx + 6, headY - 22);
      ctx.quadraticCurveTo(cx - 24, headY - 10, cx - 60, headY - 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'short':
    default: {
      ctx.beginPath();
      ctx.arc(cx, headY - 14, 60, Math.PI, Math.PI * 2);
      ctx.lineTo(cx + 56, headY - 14);
      ctx.lineTo(cx + 32, headY - 28);
      ctx.lineTo(cx + 12, headY - 14);
      ctx.lineTo(cx - 10, headY - 30);
      ctx.lineTo(cx - 32, headY - 14);
      ctx.lineTo(cx - 58, headY - 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  ctx.beginPath();
  ctx.arc(cx - 14, headY - 38, 22, Math.PI * 1.15, Math.PI * 1.75);
  ctx.strokeStyle = highlight;
  ctx.lineWidth = 6;
  ctx.stroke();

  if (hasShimmer) {
    const twinkle = 0.6 + Math.sin(timeSec * 7) * 0.4;
    ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
    const dots: Array<[number, number, number]> = [
      [-28, -42, 4],
      [16, -48, 5],
      [34, -30, 3.5],
    ];
    for (const [dx, dy, r] of dots) {
      ctx.beginPath();
      ctx.arc(cx + dx, headY + dy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawTrollBaldStripe(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  hairColor: string,
  skinTone: string
): void {
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.fillStyle = hairColor;

  ctx.beginPath();
  ctx.arc(cx - 46, headY - 24, 24, Math.PI * 0.6, Math.PI * 1.9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx + 46, headY - 24, 24, Math.PI * 1.1, Math.PI * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, cx - 22, headY - 62, 44, 44, 16);
  ctx.fillStyle = skinTone;
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx - 6, headY - 44, 10, Math.PI * 1.1, Math.PI * 1.65);
  ctx.stroke();
  ctx.restore();
}

function drawTrollBurntAfro(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  timeSec: number
): void {
  ctx.save();
  ctx.fillStyle = '#332C30';
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  const wobble = Math.sin(timeSec * 12) * 2;
  const puffs = [
    [-54, -24, 30],
    [-34, -56, 34],
    [0, -68 + wobble, 38],
    [36, -54, 34],
    [54, -22, 30],
  ];
  for (const [dx, dy, r] of puffs) {
    ctx.beginPath();
    ctx.arc(cx + dx, headY + dy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = '#9D9398';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx, headY - 104);
  ctx.quadraticCurveTo(cx + 16, headY - 122, cx - 6, headY - 138);
  ctx.stroke();
  ctx.restore();
}

function drawTrollBowlCut(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  hairColor: string
): void {
  ctx.save();
  ctx.fillStyle = hairColor;
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.arc(cx, headY - 14, 66, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + 66, headY - 4);
  ctx.lineTo(cx - 66, headY - 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCustomerFace(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  expression: ActiveCustomerSession['expression'],
  timeSec: number
): void {
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.fillStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';

  if (expression === 'CRYING_TROLL') {
    const tearOffset = (timeSec * 36) % 14;
    ctx.fillStyle = '#8CD5F7';
    drawRoundedRect(ctx, cx - 28, headY + 6, 12, 32 + tearOffset * 0.4, 6);
    ctx.fill();
    drawRoundedRect(ctx, cx + 16, headY + 6, 12, 32 + tearOffset * 0.4, 6);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx - 32, headY - 14, 4.5, 0, Math.PI * 2);
    ctx.arc(cx + 32, headY - 14, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - 30, headY - 4);
    ctx.lineTo(cx - 16, headY + 2);
    ctx.lineTo(cx - 30, headY + 8);
    ctx.moveTo(cx + 30, headY - 4);
    ctx.lineTo(cx + 16, headY + 2);
    ctx.lineTo(cx + 30, headY + 8);
    ctx.stroke();

    ctx.fillStyle = '#FF8FA8';
    ctx.beginPath();
    ctx.ellipse(cx, headY + 27, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (expression === 'EXCITED' || expression === 'ROYAL_PROUD') {
    ctx.beginPath();
    ctx.arc(cx - 22, headY + 2, 7.5, 0, Math.PI * 2);
    ctx.arc(cx + 22, headY + 2, 7.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx - 24, headY - 1, 3, 0, Math.PI * 2);
    ctx.arc(cx + 20, headY - 1, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx - 22, headY + 2, 5.5, 0, Math.PI * 2);
    ctx.arc(cx + 22, headY + 2, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, headY + 18, 12, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

function drawHairAccessory(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  accessory: ActiveCustomerSession['accessory'],
  timeSec: number
): void {
  if (accessory === 'NONE') return;

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.2;

  switch (accessory) {
    case 'BOW': {
      const bx = cx - 40;
      const by = headY - 56;
      ctx.fillStyle = '#FF7FA5';
      ctx.beginPath();
      ctx.ellipse(bx - 13, by, 14, 10, -0.3, 0, Math.PI * 2);
      ctx.ellipse(bx + 13, by, 14, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD56B';
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'SUNGLASSES': {
      ctx.fillStyle = '#3A2825';
      drawRoundedRect(ctx, cx - 42, headY - 8, 34, 20, 8);
      ctx.fill();
      ctx.stroke();
      drawRoundedRect(ctx, cx + 8, headY - 8, 34, 20, 8);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 8, headY);
      ctx.lineTo(cx + 8, headY);
      ctx.stroke();
      break;
    }
    case 'SPARKLE_CLIP': {
      const sx = cx + 38;
      const sy = headY - 46;
      ctx.fillStyle = '#FFD56B';
      ctx.beginPath();
      ctx.arc(sx, sy, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'ROYAL_CROWN': {
      const floatY = Math.sin(timeSec * 4) * 3;
      const cy = headY - 78 + floatY;
      ctx.fillStyle = '#FFD56B';
      ctx.beginPath();
      ctx.moveTo(cx - 32, cy + 16);
      ctx.lineTo(cx - 38, cy - 16);
      ctx.lineTo(cx - 14, cy - 2);
      ctx.lineTo(cx, cy - 26);
      ctx.lineTo(cx + 14, cy - 2);
      ctx.lineTo(cx + 38, cy - 16);
      ctx.lineTo(cx + 32, cy + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#FF6F91';
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 5.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function drawStylistCharacter(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  cx: number,
  cy: number,
  customer: ActiveCustomerSession | null,
  mood: StylistMood,
  speech: string,
  isFast: boolean,
  timeSec: number,
  toolMotion: SyncedToolMotion
): void {
  const bob = Math.sin(timeSec * 3.2) * 2;
  const headY = sy - 128 + bob;
  const custHeadY = cy - 88 + bob;

  // Synchronized working hand coordinates on the real foreground customer's hair
  const armReachX = customer ? cx + toolMotion.normX : sx - 80;
  const armReachY = customer ? custHeadY + toolMotion.normY : sy - 46;

  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // 1. Soft floor shadow grounding the stylist firmly
  ctx.beginPath();
  ctx.ellipse(sx, sy + 146, 46, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(58, 40, 37, 0.14)';
  ctx.fill();

  // 2. Stylist legs, rolled-cuff trousers & salon sneakers
  ctx.fillStyle = '#5C4945';
  drawRoundedRect(ctx, sx - 26, sy + 66, 21, 68, 9);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, sx + 2, sy + 66, 21, 68, 9);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#E8D5C8';
  drawRoundedRect(ctx, sx - 27, sy + 118, 23, 10, 4);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, sx + 1, sy + 118, 23, 10, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FFFDF9';
  drawRoundedRect(ctx, sx - 32, sy + 130, 27, 17, 8);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, sx - 1, sy + 130, 27, 17, 8);
  ctx.fill();
  ctx.stroke();

  // 3. Compact Far Left Hand holding the pastel styling comb at the lower-right hair lock (no long parallel stick!)
  if (customer) {
    const combWristX = cx + toolMotion.combOffsetX;
    const combWristY = custHeadY + toolMotion.combOffsetY;
    const farShX = sx - 32;
    const farShY = sy - 42 + bob * 0.6;
    const farElX = sx - 48;
    const farElY = sy - 10 + bob * 0.6;

    ctx.beginPath();
    ctx.moveTo(farShX, farShY);
    ctx.lineTo(farElX, farElY);
    ctx.lineTo(combWristX + 8, combWristY);
    ctx.strokeStyle = SALON_PALETTE.OUTLINE;
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.strokeStyle = '#F7D4B8';
    ctx.lineWidth = 8.5;
    ctx.stroke();

    drawStylingCombTool(ctx, combWristX, combWristY, 1);
  }

  // 4. Neck connecting head and torso
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.8;
  drawRoundedRect(ctx, sx - 13, headY + 40, 24, 24, 8);
  ctx.fillStyle = '#F7D4B8';
  ctx.fill();
  ctx.stroke();

  // 5. Stylist 3/4 Profile Torso & Mint Salon Apron
  const torsoY = sy - 70 + bob * 0.5;
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, sx - 44, torsoY, 84, 144, 28);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, sx - 42, torsoY + 24, 68, 114, 20);
  ctx.fillStyle = SALON_PALETTE.MINT_PASTEL;
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, sx + 26, torsoY + 72, 16, 14, 6);
  ctx.fillStyle = SALON_PALETTE.MINT_DEEP;
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, sx - 32, torsoY + 2, 11, 26, 5);
  ctx.fillStyle = SALON_PALETTE.MINT_PASTEL;
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, sx + 8, torsoY + 2, 11, 26, 5);
  ctx.fill();
  ctx.stroke();

  const bowX = sx - 8;
  ctx.fillStyle = '#FF8FA8';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(bowX, torsoY + 8);
  ctx.lineTo(bowX - 11, torsoY + 2);
  ctx.lineTo(bowX - 11, torsoY + 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bowX, torsoY + 8);
  ctx.lineTo(bowX + 11, torsoY + 2);
  ctx.lineTo(bowX + 11, torsoY + 14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  const pocketX = sx - 30;
  const pocketY = torsoY + 72;
  drawRoundedRect(ctx, pocketX + 6, pocketY - 11, 15, 15, 4);
  ctx.fillStyle = '#FF8FA8';
  ctx.fill();
  ctx.stroke();

  ctx.lineWidth = 3.4;
  drawRoundedRect(ctx, pocketX, pocketY, 40, 32, 9);
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.stroke();

  // 6. Stylist Head in 3/4 Side Profile Looking Left Into the Mirror (r = 50)
  ctx.fillStyle = '#6B443A';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(sx + 34, headY - 38, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, sx + 14, headY - 46, 14, 24, 6);
  ctx.fillStyle = '#FF8FA8';
  ctx.fill();
  ctx.lineWidth = 2.8;
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(sx, headY, 50, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#6B443A';
  ctx.beginPath();
  ctx.arc(sx, headY - 2, 50.5, Math.PI * 0.92, Math.PI * 2.25);
  ctx.quadraticCurveTo(sx + 48, headY + 22, sx + 28, headY + 34);
  ctx.quadraticCurveTo(sx + 26, headY + 4, sx + 18, headY - 12);
  ctx.quadraticCurveTo(sx - 6, headY - 24, sx - 24, headY - 12);
  ctx.quadraticCurveTo(sx - 40, headY - 14, sx - 49, headY + 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.lineWidth = 3.6;
  ctx.fillStyle = '#FFE4CE';
  ctx.beginPath();
  ctx.arc(sx + 28, headY + 6, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#C9F2E3';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(sx + 10, headY - 26, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 7. 3/4 Side-Profile Face
  drawStylistFaceExpression(ctx, sx - 10, headY, mood, isFast);

  // 8. Near Working Arm with Defined Shoulder Sleeve, Bent Elbow & Wrist Joints (compact & natural!)
  const shX = sx - 8;
  const shY = sy - 48 + bob * 0.6;
  const elX = shX - 24;
  const elY = shY + 32 + toolMotion.snipPhase * 2.5;

  // 9. Tool in hand extending left from the wrist to the edge of the customer's hair
  if (mood === 'OOPS') {
    drawClipperTool(ctx, armReachX, armReachY, toolMotion.snipPhase);
  } else {
    drawScissorsTool(ctx, armReachX, armReachY, Math.abs(toolMotion.snipPhase));
  }

  // Draw articulated upper arm, elbow joint, forearm, sleeve cuff & gripping hand
  drawArticulatedCartoonArm(ctx, shX, shY, elX, elY, armReachX, armReachY, 1);

  // 10. Synchronized active snip feedback & falling hair snipplets at scissor blade tip
  if (customer) {
    drawActiveSnipFeedback(ctx, armReachX - 20, armReachY, customer, isFast, timeSec, 1);
  }

  // 11. Stylist speech bubble placed in spacious top-right zone with generous edge margin
  if (speech) {
    drawStylistBubble(ctx, sx - 12, 236, speech, mood);
  }
  ctx.restore();
}

function drawStylingCombTool(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(-0.35);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 2.8;

  // Pastel pink styling comb spine
  drawRoundedRect(ctx, -20, -6, 36, 9, 4);
  ctx.fillStyle = '#FF9EB8';
  ctx.fill();
  ctx.stroke();

  // Comb teeth
  ctx.lineWidth = 2;
  for (let tx = -16; tx <= 12; tx += 5) {
    ctx.beginPath();
    ctx.moveTo(tx, 3);
    ctx.lineTo(tx, 10);
    ctx.stroke();
  }

  // Stylist hand gripping comb
  ctx.beginPath();
  ctx.arc(10, -2, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#FFE4CE';
  ctx.fill();
  ctx.lineWidth = 2.8;
  ctx.stroke();

  ctx.restore();
}

function drawActiveSnipFeedback(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  customer: ActiveCustomerSession,
  isFast: boolean,
  timeSec: number,
  scale: number
): void {
  const swatch = COLOR_SWATCHES[customer.colorKey];
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Falling hair snipplets in the customer's dye color right below the scissors
  const dropPhase = (timeSec * (isFast ? 9 : 5)) % 1;
  ctx.strokeStyle = swatch.hex;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(-14, 6 + dropPhase * 16);
  ctx.lineTo(-20, 12 + dropPhase * 16);
  ctx.moveTo(4, 8 + dropPhase * 18);
  ctx.lineTo(11, 14 + dropPhase * 18);
  ctx.stroke();

  // Sparkle or speed burst rays around scissors
  const pulse = Math.abs(Math.sin(timeSec * (isFast ? 14 : 7)));
  if (isFast || pulse > 0.55) {
    ctx.strokeStyle = '#FFE5B4';
    ctx.lineWidth = 2.4;
    const rays = isFast ? 4 : 2;
    for (let i = 0; i < rays; i += 1) {
      const angle = (i * Math.PI) / 2 + timeSec * 8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 14, Math.sin(angle) * 14);
      ctx.lineTo(Math.cos(angle) * 24, Math.sin(angle) * 24);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function drawStylistFaceExpression(
  ctx: CanvasRenderingContext2D,
  sx: number,
  headY: number,
  mood: StylistMood,
  isFast: boolean
): void {
  ctx.save();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.fillStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';

  ctx.fillStyle = 'rgba(255, 140, 160, 0.48)';
  ctx.beginPath();
  ctx.ellipse(sx - 23, headY + 14, 8, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(sx + 17, headY + 14, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  if (mood === 'OOPS') {
    ctx.beginPath();
    ctx.moveTo(sx - 24, headY - 11);
    ctx.lineTo(sx - 12, headY - 15);
    ctx.moveTo(sx + 6, headY - 15);
    ctx.lineTo(sx + 18, headY - 11);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sx - 18, headY + 2, 5.5, 0, Math.PI * 2);
    ctx.arc(sx + 10, headY + 2, 5.5, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sx - 4, headY + 20, 7.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FF8FA8';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8CD5F7';
    ctx.beginPath();
    ctx.moveTo(sx + 34, headY - 22);
    ctx.quadraticCurveTo(sx + 48, headY - 4, sx + 34, headY + 6);
    ctx.quadraticCurveTo(sx + 20, headY - 4, sx + 34, headY - 22);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (mood === 'PROUD' || mood === 'ROYAL') {
    ctx.beginPath();
    ctx.arc(sx - 17, headY - 8, 7, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx + 11, headY - 8, 7, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();

    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(sx - 17, headY + 5, 6.5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx + 11, headY + 5, 6.5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    ctx.fillStyle = '#FF8FA8';
    ctx.beginPath();
    ctx.arc(sx - 3, headY + 15, 10, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(sx - 23, headY - 10);
  ctx.lineTo(sx - 11, headY - 9);
  ctx.moveTo(sx + 5, headY - 9);
  ctx.lineTo(sx + 17, headY - 10);
  ctx.stroke();

  ctx.fillStyle = SALON_PALETTE.OUTLINE;
  ctx.beginPath();
  ctx.arc(sx - 18, headY + 3, 5.5, 0, Math.PI * 2);
  ctx.arc(sx + 9, headY + 3, 5.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(sx - 20, headY + 1, 2, 0, Math.PI * 2);
  ctx.arc(sx + 7, headY + 1, 2, 0, Math.PI * 2);
  ctx.fill();

  if (isFast || mood === 'FAST') {
    ctx.fillStyle = '#FF8FA8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sx - 4, headY + 15, 9, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(sx - 4, headY + 14, 9.5, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
  }

  ctx.restore();
}

function drawScissorsTool(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  openAmount: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;

  const spread = 0.15 + openAmount * 0.45;
  ctx.save();
  ctx.rotate(-spread);
  ctx.fillStyle = '#EAEFF2';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-34, -6);
  ctx.lineTo(-28, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(spread);
  ctx.fillStyle = '#D5DFE5';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-34, 6);
  ctx.lineTo(-28, -3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = '#FF8FA8';
  ctx.beginPath();
  ctx.arc(10, -8, 7, 0, Math.PI * 2);
  ctx.arc(10, 8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawClipperTool(ctx: CanvasRenderingContext2D, x: number, y: number, buzz: number): void {
  ctx.save();
  ctx.translate(x + buzz * 2.5, y);
  ctx.rotate(-0.4);
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.5;

  drawRoundedRect(ctx, -18, -12, 34, 24, 8);
  ctx.fillStyle = '#FF7F6B';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#C9D2D9';
  ctx.fillRect(-26, -10, 10, 20);
  ctx.strokeRect(-26, -10, 10, 20);
  ctx.restore();
}

export function drawStylistBubble(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  topY: number,
  text: string,
  mood: StylistMood
): void {
  ctx.save();
  ctx.font = '800 13px "Nunito", sans-serif';
  const trimmed = text.trim();
  const rawTextW = ctx.measureText(trimmed).width;
  // Compact horizontal padding (18px left + 18px right) so short <=22-char speech bubbles look neat and proportionate
  const bubbleW = Math.max(138, Math.min(256, rawTextW + 36));
  const bx = Math.max(336, Math.min(698 - bubbleW, centerX - bubbleW / 2));
  const by = topY;
  const bh = 36;

  drawRoundedRect(ctx, bx, by, bubbleW, bh, 18);
  ctx.fillStyle = mood === 'OOPS' ? '#FFE1DE' : mood === 'ROYAL' ? '#FFF4CC' : '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3.2;
  ctx.stroke();

  const tailX = Math.max(bx + 24, Math.min(bx + bubbleW - 24, centerX));
  ctx.beginPath();
  ctx.moveTo(tailX - 7, by + bh);
  ctx.lineTo(tailX + 7, by + bh);
  ctx.lineTo(tailX, by + bh + 8);
  ctx.closePath();
  ctx.fillStyle = mood === 'OOPS' ? '#FFE1DE' : mood === 'ROYAL' ? '#FFF4CC' : '#FFFFFF';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = SALON_PALETTE.TEXT_DARK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(trimmed, bx + bubbleW / 2, by + bh / 2 + 1, bubbleW - 24);
  ctx.restore();
}

export function drawCustomerSpeechBubble(
  ctx: CanvasRenderingContext2D,
  cx: number,
  headY: number,
  customer: ActiveCustomerSession,
  isFast: boolean
): void {
  let text = '';
  let bg = '#FFFFFF';
  const isTroll = Boolean(customer.trollEffect);

  if (customer.service === 'NAIL') {
    if (customer.isRoyal) {
      text = 'Móng hoàng gia sang chảnh! 👑✨';
      bg = '#FFF3BF';
    } else if (isFast) {
      text = 'Sơn nhanh lấp lánh xinh quá! ✨';
      bg = '#E8FBF4';
    } else if (customer.progress > 85) {
      text = 'Móng xinh bóng mịn mê ly! 💅💖';
      bg = '#FFF0F5';
    } else {
      return;
    }
  } else {
    if (isTroll) {
      text = 'Ơ kìa đầu em?! 😭';
      bg = '#FFE4DE';
    } else if (customer.isRoyal) {
      text = 'Idol tiệm tóc là đây! 👑✨';
      bg = '#FFF3BF';
    } else if (isFast) {
      text = 'Tim nhiều, cắt bay nóc! ⚡';
      bg = '#E8FBF4';
    } else if (customer.progress > 85) {
      text = 'Sắp xong rồi, hồi hộp quá! 💖';
      bg = '#FFF0F5';
    } else {
      return;
    }
  }

  ctx.save();
  ctx.font = '800 13px "Nunito", sans-serif';
  const textWidth = ctx.measureText(text).width + 24;
  const bw = Math.max(140, textWidth);
  const bh = 34;
  const bx = Math.max(248, cx - bw - 14);
  const by = headY - 55;

  drawRoundedRect(ctx, bx, by, bw, bh, 16);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = SALON_PALETTE.OUTLINE;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bx + bw - 6, by + bh - 6);
  ctx.lineTo(bx + bw + 12, by + bh + 4);
  ctx.lineTo(bx + bw - 14, by + bh);
  ctx.closePath();
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = SALON_PALETTE.TEXT_DARK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + bw / 2, by + bh / 2 + 1);
  ctx.restore();
}
