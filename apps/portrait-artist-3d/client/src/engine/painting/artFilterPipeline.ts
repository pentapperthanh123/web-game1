import { STUDIO_LIMITS } from '../../../../shared/constants/studioConfig';
import { STUDIO_STRINGS } from '../../../../shared/constants/i18nStrings';
import type { PortraitStyle, StudioLocale } from '../../../../shared/types/studio';
import { clampValue, createSeededRandom, hashString, pickFromList } from '../../utils/hashString';

const SIZE = STUDIO_LIMITS.CANVAS_RESOLUTION;

export interface FilteredPortraitAssets {
  /** Phase 1 (0% - 25%): Artistic graphite & warm charcoal sketch with soft tonal shading on woven paper. */
  sketchLineCanvas: HTMLCanvasElement;
  /** Phase 2 (25% - 75%): Smooth warm watercolor/gouache underpainting wash blended with sketch contours. */
  baseColorCanvas: HTMLCanvasElement;
  /** Phase 3 (75% - 100%): Crisp high-clarity finished portrait with natural specular depth & rim lighting. */
  finishedArtCanvas: HTMLCanvasElement;
}

let cachedWeavePatternCanvas: HTMLCanvasElement | null = null;

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  return canvas;
}

/**
 * Generates a reusable 64x64 woven linen artist canvas texture tile for authentic paper depth.
 */
export function getCanvasWeaveTile(): HTMLCanvasElement {
  if (cachedWeavePatternCanvas) return cachedWeavePatternCanvas;
  const tile = document.createElement('canvas');
  tile.width = 64;
  tile.height = 64;
  const ctx = tile.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fbf5e6';
    ctx.fillRect(0, 0, 64, 64);

    for (let y = 0; y < 64; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? 'rgba(168, 138, 102, 0.10)' : 'rgba(255, 252, 244, 0.32)';
      ctx.fillRect(0, y, 64, 2);
    }
    for (let x = 0; x < 64; x += 4) {
      ctx.fillStyle = x % 8 === 0 ? 'rgba(168, 138, 102, 0.08)' : 'rgba(255, 252, 244, 0.26)';
      ctx.fillRect(x, 0, 2, 64);
    }

    ctx.fillStyle = 'rgba(142, 110, 76, 0.06)';
    for (let i = 0; i < 64; i += 8) {
      ctx.fillRect(i, (i * 3) % 64, 2, 2);
    }
  }
  cachedWeavePatternCanvas = tile;
  return tile;
}

export function overlayCanvasWeaveTexture(
  ctx: CanvasRenderingContext2D,
  alpha = 0.22
): void {
  const tile = getCanvasWeaveTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  if (!pattern) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();
}

/**
 * Phase 1 (0% - 25%): Natural hand-drawn graphite & sepia charcoal sketch.
 * Combines fine Sobel contours with soft diagonal pencil shading in dark hair/eye/shadow regions
 * (zero artificial dashed grid lines!).
 */
function buildSketchLineCanvas(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const out = createCanvas();
  const ctx = out.getContext('2d');
  const srcCtx = sourceCanvas.getContext('2d');
  if (!ctx || !srcCtx) return out;

  const srcData = srcCtx.getImageData(0, 0, SIZE, SIZE).data;
  const lum = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < SIZE * SIZE; i++) {
    const idx = i * 4;
    lum[i] = 0.299 * srcData[idx] + 0.587 * srcData[idx + 1] + 0.114 * srcData[idx + 2];
  }

  const edgeMag = new Float32Array(SIZE * SIZE);
  for (let y = 1; y < SIZE - 1; y++) {
    for (let x = 1; x < SIZE - 1; x++) {
      const i = y * SIZE + x;
      const gx =
        -lum[i - SIZE - 1] +
        lum[i - SIZE + 1] -
        2 * lum[i - 1] +
        2 * lum[i + 1] -
        lum[i + SIZE - 1] +
        lum[i + SIZE + 1];
      const gy =
        -lum[i - SIZE - 1] -
        2 * lum[i - SIZE] -
        lum[i - SIZE + 1] +
        lum[i + SIZE - 1] +
        2 * lum[i + SIZE] +
        lum[i + SIZE + 1];
      edgeMag[i] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  const outImg = ctx.createImageData(SIZE, SIZE);
  const dst = outImg.data;

  for (let y = 1; y < SIZE - 1; y++) {
    for (let x = 1; x < SIZE - 1; x++) {
      const i = y * SIZE + x;
      const idx = i * 4;

      // Soft warm cream paper base (#fbf5e6) with subtle tonal charcoal shading
      const pixelLum = lum[i];
      const darkTone = clampValue((165 - pixelLum) / 165, 0, 1);
      // Diagonal pencil hatch modulation so dark areas look hand-shaded with graphite
      const hatchWave = 0.82 + 0.18 * Math.sin((x + y) * 0.85);
      const shadeStrength = darkTone * darkTone * 0.42 * hatchWave;

      const edgeStrength = clampValue((edgeMag[i] - 16) / 98, 0, 1);
      const totalGraphite = clampValue(edgeStrength * 0.85 + shadeStrength, 0, 0.92);

      // Warm sepia-graphite pencil color rgb(72, 56, 46) over paper rgb(251, 245, 230)
      dst[idx] = Math.round(251 * (1 - totalGraphite) + 72 * totalGraphite);
      dst[idx + 1] = Math.round(245 * (1 - totalGraphite) + 56 * totalGraphite);
      dst[idx + 2] = Math.round(230 * (1 - totalGraphite) + 46 * totalGraphite);
      dst[idx + 3] = 255;
    }
  }

  ctx.putImageData(outImg, 0, 0);
  overlayCanvasWeaveTexture(ctx, 0.25);
  return out;
}

/**
 * Phase 2 (25% - 75%): Rich, smooth artistic underpainting wash (watercolor/gouache block-in)
 * without low-res pixelation, blending warm mid-tones with the pencil sketch contours.
 */
function buildBaseColorCanvas(
  sourceCanvas: HTMLCanvasElement,
  sketchCanvas: HTMLCanvasElement,
  style: PortraitStyle
): HTMLCanvasElement {
  const out = createCanvas();
  const ctx = out.getContext('2d');
  if (!ctx) return out;

  // Use a smooth 256x256 intermediate wash so colors are soft & painterly without blocky artifacts
  const medium = document.createElement('canvas');
  medium.width = 256;
  medium.height = 256;
  const mCtx = medium.getContext('2d');
  if (mCtx) {
    mCtx.imageSmoothingEnabled = true;
    mCtx.imageSmoothingQuality = 'high';
    mCtx.drawImage(sourceCanvas, 0, 0, 256, 256);
  }

  ctx.fillStyle = '#fbf5e6';
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.globalAlpha = style === 'sketch' ? 0.58 : 0.84;
  ctx.drawImage(medium, 0, 0, SIZE, SIZE);
  ctx.restore();

  // Warm golden-hour studio glaze
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(253, 230, 138, 0.22)';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();

  // Blend the pencil sketch contours softly through the underpainting
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.46;
  ctx.drawImage(sketchCanvas, 0, 0);
  ctx.restore();

  overlayCanvasWeaveTexture(ctx, 0.22);
  return out;
}

function drawGoldInnerFrame(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  const frameGrad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  frameGrad.addColorStop(0, '#fde68a');
  frameGrad.addColorStop(0.5, '#d97706');
  frameGrad.addColorStop(1, '#fef08a');

  ctx.strokeStyle = frameGrad;
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, SIZE - 22, SIZE - 22);

  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, SIZE - 48, SIZE - 48);

  const corners: ReadonlyArray<[number, number]> = [
    [28, 28],
    [SIZE - 28, 28],
    [28, SIZE - 28],
    [SIZE - 28, SIZE - 28],
  ];
  ctx.fillStyle = '#fef3c7';
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Phase 3 Natural Specular Depth & Golden-Hour Lighting (75% - 100%):
 * Enhances real portrait clarity, eye/hair luminance peaks, and warm studio rim glow
 * without placing artificial cartoon star stickers on the face.
 */
function applySpecularHighlights(
  ctx: CanvasRenderingContext2D,
  sourceCanvas: HTMLCanvasElement
): void {
  const srcCtx = sourceCanvas.getContext('2d');
  if (!srcCtx) return;

  const srcData = srcCtx.getImageData(0, 0, SIZE, SIZE).data;
  const highlightImg = ctx.getImageData(0, 0, SIZE, SIZE);
  const dst = highlightImg.data;

  for (let i = 0; i < dst.length; i += 4) {
    const r = srcData[i];
    const g = srcData[i + 1];
    const b = srcData[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    if (lum > 198) {
      const boost = (lum - 198) * 0.55;
      dst[i] = clampValue(Math.round(dst[i] + boost + 6), 0, 255);
      dst[i + 1] = clampValue(Math.round(dst[i + 1] + boost + 4), 0, 255);
      dst[i + 2] = clampValue(Math.round(dst[i + 2] + boost * 0.8), 0, 255);
    } else if (lum < 55) {
      dst[i] = clampValue(Math.round(dst[i] * 0.88), 0, 255);
      dst[i + 1] = clampValue(Math.round(dst[i + 1] * 0.86), 0, 255);
      dst[i + 2] = clampValue(Math.round(dst[i + 2] * 0.86), 0, 255);
    }
  }
  ctx.putImageData(highlightImg, 0, 0);

  // Soft golden-hour top-left sunlight bloom & warm rim vignette
  ctx.save();
  const sunGlow = ctx.createRadialGradient(130, 110, 10, 220, 180, 280);
  sunGlow.addColorStop(0, 'rgba(255, 251, 225, 0.22)');
  sunGlow.addColorStop(1, 'rgba(255, 251, 225, 0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const rimGrad = ctx.createRadialGradient(256, 256, 175, 256, 256, 265);
  rimGrad.addColorStop(0, 'rgba(255, 248, 225, 0)');
  rimGrad.addColorStop(1, 'rgba(217, 119, 6, 0.16)');
  ctx.fillStyle = rimGrad;
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.restore();
}

/**
 * Bold, hilarious Troll Doodle Caricature Overlays:
 * Combines cool shades / goofy glasses, curly mustache + clown nose / whiskers, rosy cheek swirls,
 * giant bow / crown doodle, comic symbols, and a high-visibility humorous banner stamp.
 */
function drawTrollDoodles(
  ctx: CanvasRenderingContext2D,
  seed: number,
  locale: StudioLocale
): void {
  const rng = createSeededRandom(seed ^ 0x51a7);
  ctx.save();

  ctx.strokeStyle = 'rgba(244, 63, 94, 0.28)';
  ctx.lineWidth = 5;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
    ctx.beginPath();
    ctx.moveTo(256 + Math.cos(a) * 165, 256 + Math.sin(a) * 165);
    ctx.lineTo(256 + Math.cos(a) * 235, 256 + Math.sin(a) * 235);
    ctx.stroke();
  }

  const useShades = rng() > 0.35;
  if (useShades) {
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.fillRect(142, 212, 102, 46);
    ctx.fillRect(268, 212, 102, 46);
    ctx.fillRect(130, 212, 252, 11);
    ctx.strokeRect(142, 212, 102, 46);
    ctx.strokeRect(268, 212, 102, 46);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(156, 224, 22, 8);
    ctx.fillRect(170, 236, 22, 8);
    ctx.fillRect(282, 224, 22, 8);
    ctx.fillRect(296, 236, 22, 8);
  } else {
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(198, 235, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(314, 235, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(240, 235);
    ctx.lineTo(272, 235);
    ctx.stroke();
  }

  // Handlebar Mustache + Red Clown Nose calibrated to human portrait face proportions
  ctx.fillStyle = '#1c1917';
  ctx.beginPath();
  ctx.moveTo(256, 286);
  ctx.bezierCurveTo(228, 266, 174, 278, 158, 310);
  ctx.bezierCurveTo(146, 314, 142, 298, 154, 292);
  ctx.bezierCurveTo(176, 322, 230, 312, 256, 298);
  ctx.bezierCurveTo(282, 312, 336, 322, 358, 292);
  ctx.bezierCurveTo(370, 298, 366, 314, 354, 310);
  ctx.bezierCurveTo(338, 278, 284, 266, 256, 286);
  ctx.fill();

  ctx.fillStyle = '#ef4444';
  ctx.strokeStyle = '#7f1d1d';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 264, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(250, 258, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 4.5;
  for (const cx of [174, 338]) {
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4.5; a += 0.25) {
      const r = a * 2.1;
      const px = cx + Math.cos(a) * r;
      const py = 274 + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = '#292524';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const dy of [-10, 4, 18]) {
    ctx.beginPath();
    ctx.moveTo(142, 272 + dy);
    ctx.lineTo(96, 266 + dy * 1.3);
    ctx.moveTo(370, 272 + dy);
    ctx.lineTo(416, 266 + dy * 1.3);
    ctx.stroke();
  }

  ctx.fillStyle = '#e11d48';
  ctx.strokeStyle = '#881337';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(208, 78, 46, 26, -0.25, 0, Math.PI * 2);
  ctx.ellipse(304, 78, 46, 26, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fb7185';
  ctx.beginPath();
  ctx.arc(256, 80, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const stampText = pickFromList(STUDIO_STRINGS[locale].trollStamps, rng);
  ctx.save();
  ctx.translate(22, 54);
  ctx.rotate(-0.09);
  ctx.fillStyle = '#fef08a';
  ctx.strokeStyle = '#e11d48';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.roundRect(0, -28, 232, 46, 12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#be123c';
  ctx.font = '900 22px "Segoe UI", sans-serif';
  ctx.fillText(`😜 ${stampText}`, 12, 3);
  ctx.restore();

  ctx.font = 'bold 34px sans-serif';
  ctx.fillText('💢', 392, 136);
  ctx.fillText('✨', 84, 170);

  ctx.restore();
}

function applyPixelFilter(
  sourceCanvas: HTMLCanvasElement,
  style: PortraitStyle
): HTMLCanvasElement {
  const out = createCanvas();
  const ctx = out.getContext('2d');
  const srcCtx = sourceCanvas.getContext('2d');
  if (!ctx || !srcCtx) return out;

  const srcImg = srcCtx.getImageData(0, 0, SIZE, SIZE);
  const data = new Uint8ClampedArray(srcImg.data);

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (style === 'sketch') {
      // Warm tinted pastel-graphite portrait (preserves natural skin & features while looking hand-illustrated)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const warmR = clampValue(Math.round(lum * 0.55 + r * 0.45 + 14), 0, 255);
      const warmG = clampValue(Math.round(lum * 0.55 + g * 0.45 + 8), 0, 255);
      const warmB = clampValue(Math.round(lum * 0.55 + b * 0.45 - 4), 0, 255);
      r = clampValue(Math.round(warmR * 0.88 + 251 * 0.12), 0, 255);
      g = clampValue(Math.round(warmG * 0.88 + 245 * 0.12), 0, 255);
      b = clampValue(Math.round(warmB * 0.88 + 230 * 0.12), 0, 255);
    } else if (style === 'watercolor') {
      // Soft luminous watercolor wash without harsh posterization bands
      r = clampValue(Math.round(Math.floor(r / 12) * 12 * 0.90 + 28), 0, 255);
      g = clampValue(Math.round(Math.floor(g / 12) * 12 * 0.90 + 25), 0, 255);
      b = clampValue(Math.round(Math.floor(b / 12) * 12 * 0.90 + 30), 0, 255);
    } else if (style === 'oil_gold') {
      // Rich golden oil painting contrast
      r = clampValue(Math.round((r - 128) * 1.22 + 142), 0, 255);
      g = clampValue(Math.round((g - 128) * 1.16 + 134), 0, 255);
      b = clampValue(Math.round((b - 128) * 1.08 + 118), 0, 255);
    } else {
      // troll: punchy vivid pop-art contrast
      r = clampValue(Math.round((r - 128) * 1.22 + 136), 0, 255);
      g = clampValue(Math.round((g - 128) * 1.18 + 131), 0, 255);
      b = clampValue(Math.round((b - 128) * 1.18 + 133), 0, 255);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(new ImageData(data, SIZE, SIZE), 0, 0);
  return out;
}

/**
 * Generates all 3 progressive depth layers (Sketch, Base Color, Finished + Specular Highlights)
 * once per turn on 512x512 offscreen canvases.
 */
export function runArtFilterPipeline(
  sourceCanvas: HTMLCanvasElement,
  style: PortraitStyle,
  userId: string,
  locale: StudioLocale
): FilteredPortraitAssets {
  const sketchLineCanvas = buildSketchLineCanvas(sourceCanvas);
  const baseColorCanvas = buildBaseColorCanvas(sourceCanvas, sketchLineCanvas, style);
  const finishedArtCanvas = applyPixelFilter(sourceCanvas, style);
  const ctx = finishedArtCanvas.getContext('2d');

  if (ctx) {
    if (style === 'sketch') {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.72;
      ctx.drawImage(sketchLineCanvas, 0, 0);
      ctx.restore();
      applySpecularHighlights(ctx, sourceCanvas);
      overlayCanvasWeaveTexture(ctx, 0.20);
    } else if (style === 'watercolor') {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.42;
      ctx.drawImage(sketchLineCanvas, 0, 0);
      ctx.restore();

      const bloom = ctx.createRadialGradient(
        SIZE / 2,
        SIZE / 2,
        SIZE * 0.25,
        SIZE / 2,
        SIZE / 2,
        SIZE * 0.56
      );
      bloom.addColorStop(0, 'rgba(255,255,255,0)');
      bloom.addColorStop(1, 'rgba(254, 243, 199, 0.28)');
      ctx.fillStyle = bloom;
      ctx.fillRect(0, 0, SIZE, SIZE);
      applySpecularHighlights(ctx, sourceCanvas);
      overlayCanvasWeaveTexture(ctx, 0.22);
    } else if (style === 'oil_gold') {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.36;
      ctx.drawImage(sketchLineCanvas, 0, 0);
      ctx.restore();

      applySpecularHighlights(ctx, sourceCanvas);
      drawGoldInnerFrame(ctx);
      overlayCanvasWeaveTexture(ctx, 0.16);
    } else {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = 0.45;
      ctx.drawImage(sketchLineCanvas, 0, 0);
      ctx.restore();
      applySpecularHighlights(ctx, sourceCanvas);
      drawTrollDoodles(ctx, hashString(userId), locale);
      overlayCanvasWeaveTexture(ctx, 0.18);
    }
  }

  return { sketchLineCanvas, baseColorCanvas, finishedArtCanvas };
}
