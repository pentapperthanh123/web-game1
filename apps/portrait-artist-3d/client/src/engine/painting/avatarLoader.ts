import { STUDIO_LIMITS } from '../../../../shared/constants/studioConfig';
import { createSeededRandom, hashString, pickFromList } from '../../utils/hashString';

const AVATAR_SIZE = STUDIO_LIMITS.CANVAS_RESOLUTION;
const PROBE_SIZE = 32;
const FLAT_AVATAR_STDDEV_THRESHOLD = 16;
const FLAT_AVATAR_BUCKET_THRESHOLD = 6;
const IMAGE_LOAD_TIMEOUT_MS = 3200;

export const DEMO_USER_AVATAR_URLS = [
  '/assets/avatars/user-1.png',
  '/assets/avatars/user-2.png',
  '/assets/avatars/user-3.png',
  '/assets/avatars/user-4.png',
  '/assets/avatars/user-5.png',
  '/assets/avatars/user-6.png',
  '/assets/avatars/user-7.png',
  '/assets/avatars/user-8.png',
] as const;

export function getDemoUserAvatarUrl(userId: string): string {
  const idx = hashString(userId || 'guest') % DEMO_USER_AVATAR_URLS.length;
  return DEMO_USER_AVATAR_URLS[idx];
}

const BG_PALETTES = [
  ['#fde68a', '#fed7aa'],
  ['#bae6fd', '#ddd6fe'],
  ['#fbcfe8', '#fecdd3'],
  ['#bbf7d0', '#a7f3d0'],
  ['#fde2e4', '#e2ece9'],
  ['#e0e7ff', '#fce7f3'],
] as const;

const SKIN_TONES = ['#ffe0c2', '#ffd1ad', '#f7c59f', '#eac096', '#d8a47f'] as const;
const HAIR_COLORS = ['#2b2118', '#4a3222', '#7c3f1d', '#b45309', '#1e293b', '#9d174d', '#3b82f6', '#d97706'] as const;
const SHIRT_COLORS = ['#fb7185', '#38bdf8', '#34d399', '#fbbf24', '#f97316', '#f472b6', '#2dd4bf'] as const;
const HAIR_STYLES = ['bob', 'pigtails', 'short', 'curly', 'bun'] as const;
const ACCESSORIES = ['none', 'glasses', 'beret', 'star_clip', 'blush_band'] as const;

export interface LoadedPortraitSource {
  canvas: HTMLCanvasElement;
  usedChibiFallback: boolean;
}

const avatarCache = new Map<string, LoadedPortraitSource>();

function trimCacheIfNeeded(): void {
  if (avatarCache.size < STUDIO_LIMITS.AVATAR_CACHE_MAX) return;
  const oldestKey = avatarCache.keys().next().value;
  if (oldestKey !== undefined) {
    avatarCache.delete(oldestKey);
  }
}

function buildResolvedUrl(rawUrl: string, proxyUrl: string): string {
  const cleanProxy = proxyUrl.trim();
  if (!cleanProxy) return rawUrl;
  const separator = cleanProxy.includes('?') ? '&' : '?';
  return `${cleanProxy}${separator}url=${encodeURIComponent(rawUrl)}`;
}

function loadImageWithCors(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = window.setTimeout(() => {
      reject(new Error('Avatar load timeout'));
    }, IMAGE_LOAD_TIMEOUT_MS);

    img.onload = () => {
      window.clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('Avatar load failed'));
    };
    img.src = url;
  });
}

/**
 * Inspects a small 32x32 sample to detect empty, solid-color, or simple letter default avatars.
 */
function isLowDetailDefaultAvatar(sourceCanvas: HTMLCanvasElement): boolean {
  const probe = document.createElement('canvas');
  probe.width = PROBE_SIZE;
  probe.height = PROBE_SIZE;
  const ctx = probe.getContext('2d');
  if (!ctx) return true;

  ctx.drawImage(sourceCanvas, 0, 0, PROBE_SIZE, PROBE_SIZE);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, PROBE_SIZE, PROBE_SIZE).data;
  } catch {
    return true;
  }

  let sumLum = 0;
  let sumLumSq = 0;
  let visiblePixels = 0;
  const colorBuckets = new Set<number>();

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 20) continue;
    visiblePixels += 1;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sumLum += lum;
    sumLumSq += lum * lum;
    const bucket = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
    colorBuckets.add(bucket);
  }

  if (visiblePixels < PROBE_SIZE * PROBE_SIZE * 0.2) return true;

  const mean = sumLum / visiblePixels;
  const variance = Math.max(0, sumLumSq / visiblePixels - mean * mean);
  const stdDev = Math.sqrt(variance);
  return stdDev < FLAT_AVATAR_STDDEV_THRESHOLD || colorBuckets.size <= FLAT_AVATAR_BUCKET_THRESHOLD;
}

function drawHairBack(
  ctx: CanvasRenderingContext2D,
  style: (typeof HAIR_STYLES)[number],
  hairColor: string
): void {
  ctx.fillStyle = hairColor;
  if (style === 'bob') {
    ctx.beginPath();
    ctx.ellipse(256, 250, 148, 155, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (style === 'pigtails') {
    ctx.beginPath();
    ctx.ellipse(112, 285, 56, 86, -0.22, 0, Math.PI * 2);
    ctx.ellipse(400, 285, 56, 86, 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(256, 224, 134, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (style === 'bun') {
    ctx.beginPath();
    ctx.arc(256, 102, 54, 0, Math.PI * 2);
    ctx.arc(256, 226, 134, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (style === 'curly') {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const cx = 256 + Math.cos(angle) * 116;
      const cy = 228 + Math.sin(angle) * 108;
      ctx.beginPath();
      ctx.arc(cx, cy, 52, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  // short
  ctx.beginPath();
  ctx.arc(256, 220, 134, 0, Math.PI * 2);
  ctx.fill();
}

function drawAccessory(
  ctx: CanvasRenderingContext2D,
  accessory: (typeof ACCESSORIES)[number],
  shirtColor: string
): void {
  if (accessory === 'glasses') {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(204, 260, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(308, 260, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(238, 260);
    ctx.lineTo(274, 260);
    ctx.stroke();
    return;
  }
  if (accessory === 'beret') {
    ctx.fillStyle = shirtColor;
    ctx.beginPath();
    ctx.ellipse(268, 128, 124, 52, -0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(260, 82);
    ctx.lineTo(276, 62);
    ctx.stroke();
    return;
  }
  if (accessory === 'star_clip') {
    ctx.fillStyle = '#fbbf24';
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(348, 178, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Generates a vibrant, expressive 512x512 procedural Chibi portrait from a deterministic user hash.
 */
export function drawProceduralChibiPortrait(userId: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const rng = createSeededRandom(hashString(userId || 'guest'));
  const bgPair = pickFromList(BG_PALETTES, rng);
  const skinColor = pickFromList(SKIN_TONES, rng);
  const hairColor = pickFromList(HAIR_COLORS, rng);
  const shirtColor = pickFromList(SHIRT_COLORS, rng);
  const hairStyle = pickFromList(HAIR_STYLES, rng);
  const accessory = pickFromList(ACCESSORIES, rng);

  // Warm pastel radial backdrop
  const grad = ctx.createLinearGradient(0, 0, AVATAR_SIZE, AVATAR_SIZE);
  grad.addColorStop(0, bgPair[0]);
  grad.addColorStop(1, bgPair[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);

  // Soft decorative bokeh circles
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(rng() * AVATAR_SIZE, rng() * AVATAR_SIZE, 20 + rng() * 38, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hair back layer
  drawHairBack(ctx, hairStyle, hairColor);

  // Shoulders & sweater
  ctx.fillStyle = shirtColor;
  ctx.beginPath();
  ctx.ellipse(256, 488, 152, 118, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 6;
  ctx.stroke();

  // White collar
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.ellipse(256, 392, 54, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  // Neck
  ctx.fillStyle = skinColor;
  ctx.fillRect(232, 344, 48, 52);

  // Ears
  ctx.beginPath();
  ctx.arc(140, 266, 26, 0, Math.PI * 2);
  ctx.arc(372, 266, 26, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.fillStyle = skinColor;
  ctx.beginPath();
  ctx.ellipse(256, 256, 118, 114, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Front hair bangs
  ctx.fillStyle = hairColor;
  ctx.beginPath();
  ctx.ellipse(256, 174, 126, 68, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(148, 180);
  ctx.quadraticCurveTo(194, 232, 230, 184);
  ctx.quadraticCurveTo(258, 236, 294, 182);
  ctx.quadraticCurveTo(334, 226, 366, 180);
  ctx.lineTo(366, 150);
  ctx.lineTo(148, 150);
  ctx.closePath();
  ctx.fill();

  // Hair shine arc
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(256, 210, 92, -Math.PI * 0.72, -Math.PI * 0.28);
  ctx.stroke();

  // Cheeks blush
  ctx.fillStyle = 'rgba(251, 113, 133, 0.36)';
  ctx.beginPath();
  ctx.ellipse(186, 294, 24, 13, 0, 0, Math.PI * 2);
  ctx.ellipse(326, 294, 24, 13, 0, 0, Math.PI * 2);
  ctx.fill();

  // Big anime eyes
  const eyeXPositions = [204, 308];
  for (const ex of eyeXPositions) {
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.ellipse(ex, 260, 19, 24, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eye catchlights
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 6, 252, 7, 0, Math.PI * 2);
    ctx.arc(ex + 6, 266, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cute smile
  ctx.strokeStyle = '#7c2d12';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(256, 298, 22, 0.18 * Math.PI, 0.82 * Math.PI);
  ctx.stroke();

  // Optional accessory
  drawAccessory(ctx, accessory, shirtColor);

  return canvas;
}

/**
 * Loads a viewer's avatar into a 512x512 canvas with caching and smart default-avatar replacement.
 */
export async function loadPortraitSource(
  userId: string,
  avatarUrl: string | undefined,
  options: { autoChibiFallback: boolean; avatarProxyUrl: string }
): Promise<LoadedPortraitSource> {
  const effectiveUrl =
    avatarUrl && avatarUrl.trim().length > 0 ? avatarUrl.trim() : getDemoUserAvatarUrl(userId);
  const cacheKey = `${userId}|${effectiveUrl}|${options.autoChibiFallback ? '1' : '0'}`;
  const cached = avatarCache.get(cacheKey);
  if (cached) return cached;

  let result: LoadedPortraitSource | null = null;

  const candidateUrls =
    effectiveUrl !== getDemoUserAvatarUrl(userId)
      ? [effectiveUrl, getDemoUserAvatarUrl(userId)]
      : [effectiveUrl];

  for (const candidateUrl of candidateUrls) {
    try {
      const isLocalAsset = candidateUrl.startsWith('/');
      const targetUrl = isLocalAsset
        ? candidateUrl
        : buildResolvedUrl(candidateUrl, options.avatarProxyUrl);
      const image = await loadImageWithCors(targetUrl);

      const canvas = document.createElement('canvas');
      canvas.width = AVATAR_SIZE;
      canvas.height = AVATAR_SIZE;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Fill warm studio backdrop before drawing in case the image has transparent areas
        const bgGrad = ctx.createLinearGradient(0, 0, 0, AVATAR_SIZE);
        bgGrad.addColorStop(0, '#f5e6d3');
        bgGrad.addColorStop(1, '#dfc3a3');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE);

        // Center-crop square cover
        const side = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
        const sx = ((image.naturalWidth || image.width) - side) / 2;
        const sy = ((image.naturalHeight || image.height) - side) / 2;
        ctx.drawImage(image, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

        const isDefaultFlat =
          !isLocalAsset && options.autoChibiFallback && isLowDetailDefaultAvatar(canvas);
        if (!isDefaultFlat) {
          result = { canvas, usedChibiFallback: false };
          break;
        }
      }
    } catch {
      // Try next candidate or fall through to procedural chibi portrait
    }
  }

  if (!result) {
    result = {
      canvas: drawProceduralChibiPortrait(userId),
      usedChibiFallback: true,
    };
  }

  trimCacheIfNeeded();
  avatarCache.set(cacheKey, result);
  return result;
}
