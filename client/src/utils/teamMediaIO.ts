export const TEAM_MEDIA_CONSTANTS = {
  MAX_RAW_FILE_BYTES: 8 * 1024 * 1024,
  MAX_IMAGE_DIMENSION_PX: 256,
  MAX_SVG_BYTES: 180 * 1024,
  MAX_DATA_URI_CHARS: 350_000,
  WEBP_QUALITY: 0.86,
} as const;

export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsText(file);
  });

const readFileAsDataUrlRaw = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });

const loadHtmlImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('IMAGE_DECODE_FAILED'));
    img.src = src;
  });

export const compressTeamImageFile = async (file: File): Promise<string> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('INVALID_IMAGE_TYPE');
  }
  if (file.size > TEAM_MEDIA_CONSTANTS.MAX_RAW_FILE_BYTES) {
    throw new Error('IMAGE_FILE_TOO_LARGE');
  }

  const rawDataUrl = await readFileAsDataUrlRaw(file);
  if (file.type === 'image/svg+xml' && rawDataUrl.length <= TEAM_MEDIA_CONSTANTS.MAX_SVG_BYTES) {
    return rawDataUrl;
  }

  const img = await loadHtmlImage(rawDataUrl);
  const maxDim = TEAM_MEDIA_CONSTANTS.MAX_IMAGE_DIMENSION_PX;
  const largestEdge = Math.max(img.width || maxDim, img.height || maxDim, 1);
  const scale = largestEdge > maxDim ? maxDim / largestEdge : 1;
  const targetWidth = Math.max(1, Math.round((img.width || maxDim) * scale));
  const targetHeight = Math.max(1, Math.round((img.height || maxDim) * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('CANVAS_UNAVAILABLE');
  }

  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  const webpData = canvas.toDataURL('image/webp', TEAM_MEDIA_CONSTANTS.WEBP_QUALITY);
  const finalDataUrl = webpData.startsWith('data:image/webp')
    ? webpData
    : canvas.toDataURL('image/png');

  if (finalDataUrl.length > TEAM_MEDIA_CONSTANTS.MAX_DATA_URI_CHARS) {
    throw new Error('COMPRESSED_IMAGE_TOO_LARGE');
  }
  return finalDataUrl;
};

export const downloadJsonPayload = (filename: string, payload: unknown): void => {
  const jsonText = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};
