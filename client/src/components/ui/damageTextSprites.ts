import { DAMAGE_TYPE, DamageType } from '../../constants/game';

/**
 * Damage numbers are rasterised once into a small sprite and then only blitted each frame.
 * Drawing them with strokeText/fillText every frame (with emoji glyphs) was the main cost of
 * the floating-damage canvas while a crowd of champions keeps hitting the boss.
 */
export interface DamageTextSprite {
  image: HTMLCanvasElement;
  /** Size in CSS pixels (the bitmap itself is SPRITE_PIXEL_RATIO times larger). */
  width: number;
  height: number;
}

interface DamageTextStyle {
  fontSize: number;
  prefix: string;
}

const SPRITE_PIXEL_RATIO = 1.5;
const STROKE_WIDTH = 3;
const LINE_HEIGHT_FACTOR = 1.45;
const STROKE_COLOR = 'rgba(2, 6, 23, 0.95)';
const FONT_FAMILY = 'system-ui, -apple-system, sans-serif';
const FONT_WEIGHT = 900;
const MAX_CACHED_SPRITES = 96;

const DEFAULT_STYLE: DamageTextStyle = { fontSize: 12.5, prefix: '' };
const STYLE_BY_DAMAGE_TYPE: Partial<Record<DamageType, DamageTextStyle>> = {
  [DAMAGE_TYPE.ULTIMATE]: { fontSize: 17.5, prefix: '💥 ' },
  [DAMAGE_TYPE.CRIT]: { fontSize: 15, prefix: '⚡ ' },
};

const spriteCache = new Map<string, DamageTextSprite>();

const buildFont = (fontSize: number): string => `${FONT_WEIGHT} ${fontSize}px ${FONT_FAMILY}`;

const rasterizeSprite = (label: string, style: DamageTextStyle, color: string): DamageTextSprite | null => {
  const image = document.createElement('canvas');
  const ctx = image.getContext('2d');
  if (!ctx) return null;

  ctx.font = buildFont(style.fontSize);
  const width = Math.ceil(ctx.measureText(label).width + STROKE_WIDTH * 2 + 2);
  const height = Math.ceil(style.fontSize * LINE_HEIGHT_FACTOR + STROKE_WIDTH * 2);
  image.width = width * SPRITE_PIXEL_RATIO;
  image.height = height * SPRITE_PIXEL_RATIO;

  // Resizing the canvas resets its state, so the text style is applied again
  ctx.scale(SPRITE_PIXEL_RATIO, SPRITE_PIXEL_RATIO);
  ctx.font = buildFont(style.fontSize);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = STROKE_WIDTH;
  ctx.strokeStyle = STROKE_COLOR;
  ctx.strokeText(label, width / 2, height / 2);
  ctx.fillStyle = color;
  ctx.fillText(label, width / 2, height / 2);

  return { image, width, height };
};

export const getDamageTextSprite = (
  text: string,
  damageType: DamageType,
  color: string
): DamageTextSprite | null => {
  const style = STYLE_BY_DAMAGE_TYPE[damageType] ?? DEFAULT_STYLE;
  const label = `${style.prefix}${text}`;
  const cacheKey = `${label}|${color}|${style.fontSize}`;
  const cached = spriteCache.get(cacheKey);
  if (cached) return cached;

  if (spriteCache.size >= MAX_CACHED_SPRITES) {
    const oldestKey = spriteCache.keys().next().value;
    if (oldestKey !== undefined) spriteCache.delete(oldestKey);
  }
  const sprite = rasterizeSprite(label, style, color);
  if (sprite) spriteCache.set(cacheKey, sprite);
  return sprite;
};
