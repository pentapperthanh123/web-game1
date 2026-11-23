import {
  PAINT_PROGRESS_THRESHOLDS,
  STUDIO_LIMITS,
} from '../../../../shared/constants/studioConfig';
import type { PortraitStyle, StudioLocale } from '../../../../shared/types/studio';
import { clampValue } from '../../utils/hashString';
import {
  overlayCanvasWeaveTexture,
  runArtFilterPipeline,
  type FilteredPortraitAssets,
} from './artFilterPipeline';

const SIZE = STUDIO_LIMITS.CANVAS_RESOLUTION;
const PAPER_BASE_COLOR = '#fbf5e6';
const GALLERY_CARD_W = 280;
const GALLERY_CARD_H = 490;
const BRUSH_STAMP_CANVAS_SIZE = 240;

export type PaintDepthPhase = 'SKETCH' | 'BASE_COLOR' | 'DETAIL_HIGHLIGHT';

export interface BrushPointUV {
  u: number;
  v: number;
  isSketchPhase: boolean;
  depthPhase: PaintDepthPhase;
}

interface StrokeSample {
  u: number;
  v: number;
  angleRad: number;
  radius: number;
}

function attachStrokeAngles(points: Array<{ u: number; v: number; radius: number }>): StrokeSample[] {
  return points.map((pt, idx) => {
    const next = points[Math.min(points.length - 1, idx + 1)];
    const prev = points[Math.max(0, idx - 1)];
    const angleRad = Math.atan2(next.v - prev.v, next.u - prev.u);
    return { u: pt.u, v: pt.v, angleRad, radius: pt.radius };
  });
}

/**
 * Phase 1 (0% -> 25%): Organic portrait contour sketch path starting around the face/head center
 * and sweeping outward to shoulders with wide overlapping pencil strokes.
 */
function buildPhase1SketchPath(): StrokeSample[] {
  const raw: Array<{ u: number; v: number; radius: number }> = [];
  const steps = 120;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const angle = t * Math.PI * 9.0 + Math.PI * 0.65;
    const radiusNorm = 0.04 + Math.pow(t, 0.82) * 0.43;
    const u = clampValue(0.48 + Math.cos(angle) * radiusNorm, 0.08, 0.92);
    const v = clampValue(0.46 + Math.sin(angle) * radiusNorm, 0.08, 0.92);
    raw.push({ u, v, radius: 74 });
  }
  return attachStrokeAngles(raw);
}

/**
 * Phase 2 (25% -> 75%): Diagonal artistic brushstroke waves (top-left to bottom-right sweeps)
 * with generous brush radius so color washes blend organically without a harsh horizontal cut line.
 */
function buildPhase2ColorPath(startU: number, startV: number): StrokeSample[] {
  const raw: Array<{ u: number; v: number; radius: number }> = [];
  const bridgeSteps = 14;
  const targetStartU = 0.24;
  const targetStartV = 0.20;
  for (let i = 0; i < bridgeSteps; i++) {
    const t = i / bridgeSteps;
    raw.push({
      u: startU + (targetStartU - startU) * t,
      v: startV + (targetStartV - startV) * t,
      radius: 84,
    });
  }

  // Diagonal figure-S sweeps centered on the portrait face & torso first, then expanding outward
  const sweeps = 9;
  const ptsPerSweep = 22;
  for (let s = 0; s < sweeps; s++) {
    const sweepProgress = s / (sweeps - 1);
    const centerV = 0.22 + sweepProgress * 0.62;
    const leftToRight = s % 2 === 0;
    for (let p = 0; p < ptsPerSweep; p++) {
      const t = p / (ptsPerSweep - 1);
      const smoothT = 0.5 - 0.5 * Math.cos(t * Math.PI);
      const u = leftToRight ? 0.14 + smoothT * 0.72 : 0.86 - smoothT * 0.72;
      // Diagonal tilt + gentle organic wrist arc so the paint never forms a flat horizontal line
      const diagonalTilt = (u - 0.5) * 0.16 * (leftToRight ? 1 : -1);
      const wristArc = Math.sin(t * Math.PI) * 0.045;
      const v = clampValue(centerV + diagonalTilt + wristArc, 0.08, 0.92);
      raw.push({
        u: clampValue(u, 0.08, 0.92),
        v,
        radius: 88,
      });
    }
  }
  return attachStrokeAngles(raw);
}

/**
 * Phase 3 (75% -> 100%): Focused facial detail & specular polish loop over eyes, hair, and cheeks.
 */
function buildPhase3DetailPath(startU: number, startV: number): StrokeSample[] {
  const raw: Array<{ u: number; v: number; radius: number }> = [];
  const totalSteps = 120;
  for (let i = 0; i < totalSteps; i++) {
    const t = i / (totalSteps - 1);
    const angle = (1 - t) * Math.PI * 8.0;
    const rx = 0.38 * (1 - t * 0.52);
    const ry = 0.36 * (1 - t * 0.52);
    const curveU = 0.49 + Math.cos(angle) * rx;
    const curveV = 0.45 + Math.sin(angle * 1.5) * ry;

    const blendIn = Math.min(1, t / 0.15);
    const u = startU * (1 - blendIn) + curveU * blendIn;
    const v = startV * (1 - blendIn) + curveV * blendIn;
    raw.push({
      u: clampValue(u, 0.10, 0.90),
      v: clampValue(v, 0.10, 0.90),
      radius: 86,
    });
  }
  return attachStrokeAngles(raw);
}

const PHASE1_SAMPLES = buildPhase1SketchPath();
const p1Last = PHASE1_SAMPLES[PHASE1_SAMPLES.length - 1];
const PHASE2_SAMPLES = buildPhase2ColorPath(p1Last.u, p1Last.v);
const p2Last = PHASE2_SAMPLES[PHASE2_SAMPLES.length - 1];
const PHASE3_SAMPLES = buildPhase3DetailPath(p2Last.u, p2Last.v);

function interpolateCurveUV(
  samples: readonly StrokeSample[],
  normT: number
): { u: number; v: number; index: number } {
  const clampedT = clampValue(normT, 0, 1);
  const exact = clampedT * (samples.length - 1);
  const idx0 = Math.floor(exact);
  const idx1 = Math.min(samples.length - 1, idx0 + 1);
  const frac = exact - idx0;
  const s0 = samples[idx0];
  const s1 = samples[idx1];
  return {
    u: s0.u + (s1.u - s0.u) * frac,
    v: s0.v + (s1.v - s0.v) * frac,
    index: idx0,
  };
}

/**
 * 3-Phase Portrait Painting Engine (0% -> 25% Sketch, 25% -> 75% Base Color, 75% -> 100% Detail & Highlights)
 * with feathered multi-bristle dabs, smooth progressive layer blending, and live active bristle indicator.
 */
export class BrushRevealEngine {
  public readonly displayCanvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly accumCanvas: HTMLCanvasElement;
  private readonly accumCtx: CanvasRenderingContext2D;
  private readonly scratchBrushCanvas: HTMLCanvasElement;
  private readonly scratchBrushCtx: CanvasRenderingContext2D | null;

  private sourceCanvas: HTMLCanvasElement | null = null;
  private assets: FilteredPortraitAssets | null = null;
  private userId = '';
  private isRoyalFrame = false;

  private lastP1Index = -1;
  private lastP2Index = -1;
  private lastP3Index = -1;
  private hasSigned = false;
  private lastBrushUV: BrushPointUV = {
    u: 0.48,
    v: 0.46,
    isSketchPhase: true,
    depthPhase: 'SKETCH',
  };

  constructor() {
    this.displayCanvas = document.createElement('canvas');
    this.displayCanvas.width = SIZE;
    this.displayCanvas.height = SIZE;
    const context = this.displayCanvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to initialize 2D context for BrushRevealEngine');
    }
    this.ctx = context;

    this.accumCanvas = document.createElement('canvas');
    this.accumCanvas.width = SIZE;
    this.accumCanvas.height = SIZE;
    const aCtx = this.accumCanvas.getContext('2d');
    if (!aCtx) {
      throw new Error('Failed to initialize accumCanvas context');
    }
    this.accumCtx = aCtx;

    this.scratchBrushCanvas = document.createElement('canvas');
    this.scratchBrushCanvas.width = BRUSH_STAMP_CANVAS_SIZE;
    this.scratchBrushCanvas.height = BRUSH_STAMP_CANVAS_SIZE;
    this.scratchBrushCtx = this.scratchBrushCanvas.getContext('2d');

    this.clearToBlankPaper();
  }

  public clearToBlankPaper(): void {
    this.accumCtx.fillStyle = PAPER_BASE_COLOR;
    this.accumCtx.fillRect(0, 0, SIZE, SIZE);
    overlayCanvasWeaveTexture(this.accumCtx, 0.26);

    this.accumCtx.strokeStyle = '#d6c4ab';
    this.accumCtx.lineWidth = 10;
    this.accumCtx.strokeRect(5, 5, SIZE - 10, SIZE - 10);

    this.ctx.clearRect(0, 0, SIZE, SIZE);
    this.ctx.drawImage(this.accumCanvas, 0, 0);

    this.lastP1Index = -1;
    this.lastP2Index = -1;
    this.lastP3Index = -1;
    this.hasSigned = false;
  }

  public preparePortrait(
    sourceCanvas: HTMLCanvasElement,
    style: PortraitStyle,
    userId: string,
    isRoyalFrame: boolean,
    locale: StudioLocale
  ): void {
    this.sourceCanvas = sourceCanvas;
    this.userId = userId;
    this.isRoyalFrame = isRoyalFrame;
    this.assets = runArtFilterPipeline(sourceCanvas, style, userId, locale);
    this.clearToBlankPaper();
  }

  public switchStyleLive(
    style: PortraitStyle,
    locale: StudioLocale,
    currentProgress: number
  ): void {
    if (!this.sourceCanvas) return;
    this.assets = runArtFilterPipeline(this.sourceCanvas, style, this.userId, locale);
    const savedProgress = clampValue(currentProgress, 0, 1);
    this.clearToBlankPaper();
    this.updateProgress(savedProgress);
  }

  /**
   * Stamps a richly feathered, multi-bristle painterly dab onto `accumCtx`
   * so consecutive strokes melt together like real watercolor/oil bristles.
   */
  private stampPainterlyDab(
    source: HTMLCanvasElement,
    sample: StrokeSample,
    phase: PaintDepthPhase,
    speedMultiplier: number
  ): void {
    const bCtx = this.scratchBrushCtx;
    const thicknessBoost = 1 + clampValue((speedMultiplier - 1) * 0.22, 0, 0.35);
    const r = Math.min(
      Math.floor(BRUSH_STAMP_CANVAS_SIZE / 2) - 2,
      Math.round(sample.radius * thicknessBoost)
    );
    const cx = Math.round(sample.u * SIZE);
    const cy = Math.round(sample.v * SIZE);

    if (!bCtx) {
      this.accumCtx.save();
      this.accumCtx.beginPath();
      this.accumCtx.arc(cx, cy, r, 0, Math.PI * 2);
      this.accumCtx.clip();
      this.accumCtx.drawImage(source, 0, 0);
      this.accumCtx.restore();
      return;
    }

    const d = r * 2;
    const sx = cx - r;
    const sy = cy - r;

    bCtx.clearRect(0, 0, d, d);
    bCtx.save();
    bCtx.drawImage(source, sx, sy, d, d, 0, 0, d, d);

    // Ultra-soft radial feather mask (`destination-in`) so there are NEVER hard circular seams
    bCtx.globalCompositeOperation = 'destination-in';
    const grad = bCtx.createRadialGradient(r, r, r * 0.12, r, r, r);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.92)');
    grad.addColorStop(0.48, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.78, 'rgba(0, 0, 0, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    bCtx.fillStyle = grad;
    bCtx.fillRect(0, 0, d, d);
    bCtx.restore();

    this.accumCtx.drawImage(this.scratchBrushCanvas, 0, 0, d, d, sx, sy, d, d);

    // Subtle organic bristle texture lines oriented along the stroke tangent
    this.accumCtx.save();
    this.accumCtx.translate(cx, cy);
    this.accumCtx.rotate(sample.angleRad);

    if (phase === 'SKETCH') {
      this.accumCtx.strokeStyle = 'rgba(72, 56, 46, 0.14)';
      this.accumCtx.lineWidth = 1.2;
      this.accumCtx.beginPath();
      this.accumCtx.moveTo(-r * 0.45, -3);
      this.accumCtx.lineTo(r * 0.45, -3);
      this.accumCtx.moveTo(-r * 0.35, 3);
      this.accumCtx.lineTo(r * 0.35, 3);
      this.accumCtx.stroke();
    } else if (phase === 'BASE_COLOR') {
      this.accumCtx.strokeStyle = 'rgba(255, 250, 240, 0.11)';
      this.accumCtx.lineWidth = 1.8;
      this.accumCtx.beginPath();
      this.accumCtx.moveTo(-r * 0.42, -4);
      this.accumCtx.lineTo(r * 0.42, -4);
      this.accumCtx.moveTo(-r * 0.38, 4);
      this.accumCtx.lineTo(r * 0.38, 4);
      this.accumCtx.stroke();
    }
    this.accumCtx.restore();
  }

  /**
   * Renders the accumulated brushstroke canvas onto `displayCanvas` plus a smooth progressive
   * phase under-wash and a subtle wet-paint sheen right under the active brush tip (zero ugly icon!).
   * Guarantees at 0% to ~8% that NO full facial features pre-render globally onto blank paper.
   */
  private composeDisplayFrame(
    activeU: number,
    activeV: number,
    phase: PaintDepthPhase,
    phaseProgress: number,
    overallProgress: number
  ): void {
    if (!this.assets) return;
    this.ctx.clearRect(0, 0, SIZE, SIZE);
    this.ctx.drawImage(this.accumCanvas, 0, 0);

    // Smooth progressive under-wash blend so the portrait materializes harmoniously across the canvas.
    // Strictly zero full-face pre-render at low progress: only pencil dabs touched by brush appear below 8%.
    this.ctx.save();
    if (phase === 'SKETCH') {
      const sketchAlpha = overallProgress < 0.08 ? 0 : clampValue((overallProgress - 0.08) * 0.45, 0, 0.22);
      if (sketchAlpha > 0) {
        this.ctx.globalAlpha = sketchAlpha;
        this.ctx.drawImage(this.assets.sketchLineCanvas, 0, 0);
      }
    } else if (phase === 'BASE_COLOR') {
      this.ctx.globalAlpha = clampValue(phaseProgress * 0.48, 0, 0.48);
      this.ctx.drawImage(this.assets.baseColorCanvas, 0, 0);
    } else {
      this.ctx.globalAlpha = clampValue(phaseProgress * 0.65, 0, 0.65);
      this.ctx.drawImage(this.assets.finishedArtCanvas, 0, 0);
    }
    this.ctx.restore();

    // Subtle wet-paint sheen right on the canvas surface where the brush is actively painting
    if (overallProgress > 0.01 && overallProgress < 0.99) {
      const bx = activeU * SIZE;
      const by = activeV * SIZE;
      this.ctx.save();
      const wetGlow = this.ctx.createRadialGradient(bx, by, 2, bx, by, 34);
      wetGlow.addColorStop(0, 'rgba(255, 252, 235, 0.32)');
      wetGlow.addColorStop(0.5, 'rgba(253, 224, 71, 0.12)');
      wetGlow.addColorStop(1, 'rgba(255, 252, 235, 0)');
      this.ctx.fillStyle = wetGlow;
      this.ctx.beginPath();
      this.ctx.arc(bx, by, 34, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    // Keep paper border frame neat
    this.ctx.strokeStyle = '#d6c4ab';
    this.ctx.lineWidth = 10;
    this.ctx.strokeRect(5, 5, SIZE - 10, SIZE - 10);
  }

  private drawCompletionSignature(): void {
    if (!this.assets) return;
    this.accumCtx.drawImage(this.assets.finishedArtCanvas, 0, 0);
    this.ctx.drawImage(this.assets.finishedArtCanvas, 0, 0);

    if (this.isRoyalFrame) {
      this.ctx.save();
      this.ctx.strokeStyle = '#f59e0b';
      this.ctx.lineWidth = 16;
      this.ctx.strokeRect(8, 8, SIZE - 16, SIZE - 16);
      this.ctx.strokeStyle = '#fef08a';
      this.ctx.lineWidth = 4;
      this.ctx.strokeRect(18, 18, SIZE - 36, SIZE - 36);
      this.ctx.restore();
    }

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 250, 240, 0.88)';
    this.ctx.beginPath();
    this.ctx.roundRect(SIZE - 136, SIZE - 44, 120, 30, 8);
    this.ctx.fill();

    this.ctx.fillStyle = '#9f1239';
    this.ctx.font = 'italic bold 18px Georgia, serif';
    this.ctx.fillText('~ Hana ✦', SIZE - 122, SIZE - 23);
    this.ctx.restore();
  }

  /**
   * Advances the 3-layer painting up to `progress` (0..1), stamps both the full-canvas diagonal sweep
   * and the exact physical brush-tip contact point `physicalTipUV`, and returns the active `(u, v)`.
   */
  public updateProgress(
    progress: number,
    speedMultiplier = 1.0,
    physicalTipUV?: { u: number; v: number }
  ): BrushPointUV {
    if (!this.assets) return this.lastBrushUV;
    const clamped = clampValue(progress, 0, 1);
    if (clamped <= 0.001) {
      this.clearToBlankPaper();
      return this.lastBrushUV;
    }
    const sketchEnd = PAINT_PROGRESS_THRESHOLDS.SKETCH_PHASE_END; // 0.25
    const colorEnd = PAINT_PROGRESS_THRESHOLDS.COLOR_PHASE_END; // 0.75

    // PHASE 1: Soft Graphite & Charcoal Sketch (0% -> 25%)
    if (clamped <= sketchEnd) {
      const p1Norm = clamped / sketchEnd;
      const interp = interpolateCurveUV(PHASE1_SAMPLES, p1Norm);
      for (let i = this.lastP1Index + 1; i <= interp.index; i++) {
        this.stampPainterlyDab(
          this.assets.sketchLineCanvas,
          PHASE1_SAMPLES[i],
          'SKETCH',
          speedMultiplier
        );
      }
      if (physicalTipUV) {
        this.stampPainterlyDab(
          this.assets.sketchLineCanvas,
          { u: physicalTipUV.u, v: physicalTipUV.v, angleRad: -0.45, radius: 68 },
          'SKETCH',
          speedMultiplier
        );
      }
      this.lastP1Index = Math.max(this.lastP1Index, interp.index);
      const sheenU = physicalTipUV ? physicalTipUV.u : interp.u;
      const sheenV = physicalTipUV ? physicalTipUV.v : interp.v;
      this.composeDisplayFrame(sheenU, sheenV, 'SKETCH', p1Norm, clamped);
      this.lastBrushUV = {
        u: interp.u,
        v: interp.v,
        isSketchPhase: true,
        depthPhase: 'SKETCH',
      };
      return this.lastBrushUV;
    }

    if (this.lastP1Index < PHASE1_SAMPLES.length - 1) {
      this.accumCtx.drawImage(this.assets.sketchLineCanvas, 0, 0);
      this.lastP1Index = PHASE1_SAMPLES.length - 1;
    }

    // PHASE 2: Warm Painterly Color Block-In (25% -> 75%)
    if (clamped <= colorEnd) {
      const p2Norm = (clamped - sketchEnd) / (colorEnd - sketchEnd);
      const interp = interpolateCurveUV(PHASE2_SAMPLES, p2Norm);
      for (let i = this.lastP2Index + 1; i <= interp.index; i++) {
        this.stampPainterlyDab(
          this.assets.baseColorCanvas,
          PHASE2_SAMPLES[i],
          'BASE_COLOR',
          speedMultiplier
        );
      }
      if (physicalTipUV) {
        this.stampPainterlyDab(
          this.assets.baseColorCanvas,
          { u: physicalTipUV.u, v: physicalTipUV.v, angleRad: -0.42, radius: 78 },
          'BASE_COLOR',
          speedMultiplier
        );
      }
      this.lastP2Index = Math.max(this.lastP2Index, interp.index);
      const sheenU = physicalTipUV ? physicalTipUV.u : interp.u;
      const sheenV = physicalTipUV ? physicalTipUV.v : interp.v;
      this.composeDisplayFrame(sheenU, sheenV, 'BASE_COLOR', p2Norm, clamped);
      this.lastBrushUV = {
        u: interp.u,
        v: interp.v,
        isSketchPhase: false,
        depthPhase: 'BASE_COLOR',
      };
      return this.lastBrushUV;
    }

    if (this.lastP2Index < PHASE2_SAMPLES.length - 1) {
      this.accumCtx.drawImage(this.assets.baseColorCanvas, 0, 0);
      this.lastP2Index = PHASE2_SAMPLES.length - 1;
    }

    // PHASE 3: Crisp Details & Natural Specular Highlights (75% -> 100%)
    const p3Norm = (clamped - colorEnd) / (1 - colorEnd);
    const interp = interpolateCurveUV(PHASE3_SAMPLES, p3Norm);
    for (let i = this.lastP3Index + 1; i <= interp.index; i++) {
      this.stampPainterlyDab(
        this.assets.finishedArtCanvas,
        PHASE3_SAMPLES[i],
        'DETAIL_HIGHLIGHT',
        speedMultiplier
      );
    }
    if (physicalTipUV) {
      this.stampPainterlyDab(
        this.assets.finishedArtCanvas,
        { u: physicalTipUV.u, v: physicalTipUV.v, angleRad: -0.38, radius: 76 },
        'DETAIL_HIGHLIGHT',
        speedMultiplier
      );
    }
    this.lastP3Index = Math.max(this.lastP3Index, interp.index);
    const sheenU = physicalTipUV ? physicalTipUV.u : interp.u;
    const sheenV = physicalTipUV ? physicalTipUV.v : interp.v;
    this.composeDisplayFrame(sheenU, sheenV, 'DETAIL_HIGHLIGHT', p3Norm, clamped);

    if (clamped >= 0.995 && !this.hasSigned) {
      this.drawCompletionSignature();
      this.hasSigned = true;
    }

    this.lastBrushUV = {
      u: interp.u,
      v: interp.v,
      isSketchPhase: false,
      depthPhase: 'DETAIL_HIGHLIGHT',
    };
    return this.lastBrushUV;
  }

  public createGallerySnapshotCanvas(nickname: string, isRoyalFrame: boolean): HTMLCanvasElement {
    const card = document.createElement('canvas');
    card.width = GALLERY_CARD_W;
    card.height = GALLERY_CARD_H;
    const ctx = card.getContext('2d');
    if (!ctx) return card;

    const w = GALLERY_CARD_W;
    const h = GALLERY_CARD_H;

    ctx.save();

    // 1. Warm luxury art paper / Golden parchment base
    ctx.fillStyle = isRoyalFrame ? '#fef3c7' : '#fffcf5';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 14);
    ctx.fill();

    // 2. Multi-tiered Outer Fine Art / Royal Gold Beveled Frame
    if (isRoyalFrame) {
      const goldGrad = ctx.createLinearGradient(0, 0, w, h);
      goldGrad.addColorStop(0, '#f59e0b');
      goldGrad.addColorStop(0.3, '#fef08a');
      goldGrad.addColorStop(0.6, '#d97706');
      goldGrad.addColorStop(1, '#fbbf24');

      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.strokeStyle = goldGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(3, 3, w - 6, h - 6, 11);
      ctx.stroke();

      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(7, 7, w - 14, h - 14, 8);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#5c2d12';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.strokeStyle = '#e7d8c5';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(3, 3, w - 6, h - 6, 11);
      ctx.stroke();

      ctx.strokeStyle = '#a27b5c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(7, 7, w - 14, h - 14, 8);
      ctx.stroke();
    }

    // 3. Inset Photo Canvas (elongated portrait aspect: 252w x 370h)
    const px = 14;
    const py = 14;
    const pw = w - 28;
    const ph = 370;

    ctx.drawImage(this.displayCanvas, px, py, pw, ph);

    // 4. Photo matting inner border & subtle pinstripe
    ctx.strokeStyle = isRoyalFrame ? '#d97706' : '#78350f';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(px, py, pw, ph);

    ctx.strokeStyle = isRoyalFrame ? 'rgba(254, 240, 138, 0.85)' : 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1;
    ctx.strokeRect(px + 3, py + 3, pw - 6, ph - 6);

    // 5. Four Decorative Photo Corner Brackets
    const cornerSize = 18;
    const cornerColor = isRoyalFrame ? '#f59e0b' : '#92400e';
    ctx.strokeStyle = cornerColor;
    ctx.lineWidth = 2;
    ctx.fillStyle = cornerColor;

    const corners: ReadonlyArray<[number, number, number, number]> = [
      [px, py, 1, 1],
      [px + pw, py, -1, 1],
      [px, py + ph, 1, -1],
      [px + pw, py + ph, -1, -1],
    ];

    for (const [cx, cy, sx, sy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + sy * cornerSize);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + sx * cornerSize, cy);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx + sx * 3.5, cy + sy * 3.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Elegant separator line between photo and caption
    ctx.strokeStyle = isRoyalFrame ? 'rgba(217, 119, 6, 0.45)' : 'rgba(160, 120, 80, 0.38)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 38, 404);
    ctx.lineTo(w / 2 + 38, 404);
    ctx.stroke();

    // 6. Bottom Plaque & Signature
    const safeName = nickname.length > 14 ? `${nickname.slice(0, 13)}…` : nickname;
    ctx.textAlign = 'center';

    // Primary Name
    ctx.font = 'bold 21px "Segoe UI", sans-serif';
    ctx.fillStyle = isRoyalFrame ? '#92400e' : '#292524';
    const titleText = isRoyalFrame ? `👑 VIP • ${safeName}` : safeName;
    ctx.fillText(titleText, w / 2, 428);

    // Secondary Studio Art Seal
    ctx.font = '600 12px "Segoe UI", sans-serif';
    ctx.fillStyle = isRoyalFrame ? '#b45309' : '#854d0e';
    const subText = isRoyalFrame ? '✦ ROYAL EDITION ✦' : '✦ STUDIO PORTRAIT ✦';
    ctx.fillText(subText, w / 2, 458);

    ctx.restore();
    return card;
  }
}
