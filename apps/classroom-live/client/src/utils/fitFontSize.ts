/**
 * Chọn cỡ chữ lớn nhất (px nguyên) để một dòng chữ vừa `maxWidth`.
 * Đo bằng canvas một lần cho mỗi (chuỗi, giới hạn) rồi cache — không chạy theo từng frame.
 */
const NAME_FONT_WEIGHT = 800;
const FALLBACK_FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const fontSizeCache = new Map<string, number>();
let measureContext: CanvasRenderingContext2D | null = null;
let resolvedFontFamily: string | null = null;

const getMeasureContext = (): CanvasRenderingContext2D | null => {
  if (measureContext) return measureContext;
  measureContext = document.createElement('canvas').getContext('2d');
  return measureContext;
};

const getFontFamily = (): string => {
  if (resolvedFontFamily) return resolvedFontFamily;
  resolvedFontFamily = getComputedStyle(document.body).fontFamily || FALLBACK_FONT_FAMILY;
  return resolvedFontFamily;
};

export const fitFontSize = (text: string, maxWidth: number, maxFont: number, minFont: number): number => {
  const cacheKey = `${maxWidth}|${maxFont}|${minFont}|${text}`;
  const cached = fontSizeCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const context = getMeasureContext();
  if (!context) return minFont;

  const family = getFontFamily();
  let fontSize = maxFont;
  while (fontSize > minFont) {
    context.font = `${NAME_FONT_WEIGHT} ${fontSize}px ${family}`;
    if (context.measureText(text).width <= maxWidth) break;
    fontSize -= 1;
  }

  fontSizeCache.set(cacheKey, fontSize);
  return fontSize;
};
