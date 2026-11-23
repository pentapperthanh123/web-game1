import * as THREE from 'three';

const TEXTURE_SIZE = 256;
const ARM_COUNT = 3;
const DOTS_PER_ARM = 140;
/** Logarithmic spiral r = a·e^(bθ): `b` sets how tightly the arms wind. */
const SPIRAL_GROWTH = 0.24;
const SPIRAL_START_RADIUS = 0.06;
const MAX_TURN_RADIANS = Math.PI * 3.2;
const DOT_MIN_RADIUS = 2.5;
const DOT_RADIUS_GAIN = 9;
const CENTER_FADE_RADIUS = 0.18;
const MAX_DOT_ALPHA = 0.9;

let cachedTexture: THREE.Texture | null = null;

const drawSoftDot = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha: number): void => {
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
};

const drawSpiralArms = (context: CanvasRenderingContext2D): void => {
  const half = TEXTURE_SIZE / 2;
  for (let arm = 0; arm < ARM_COUNT; arm += 1) {
    const armOffset = (arm / ARM_COUNT) * Math.PI * 2;
    for (let dot = 0; dot < DOTS_PER_ARM; dot += 1) {
      const along = dot / DOTS_PER_ARM;
      const theta = along * MAX_TURN_RADIANS;
      const radius = Math.min(1, SPIRAL_START_RADIUS * Math.exp(SPIRAL_GROWTH * theta * Math.PI));
      const centerFade = Math.min(1, radius / CENTER_FADE_RADIUS);
      const alpha = centerFade * (1 - radius) * MAX_DOT_ALPHA;
      if (alpha <= 0) continue;
      const angle = theta + armOffset;
      drawSoftDot(
        context,
        half + Math.cos(angle) * radius * half,
        half + Math.sin(angle) * radius * half,
        DOT_MIN_RADIUS + radius * DOT_RADIUS_GAIN,
        alpha,
      );
    }
  }
};

/** Three soft logarithmic spiral arms on transparent black; created once, shared for the session. */
export const getSpiralArmsTexture = (): THREE.Texture => {
  if (cachedTexture) return cachedTexture;
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (context) drawSpiralArms(context);
  cachedTexture = new THREE.CanvasTexture(canvas);
  cachedTexture.colorSpace = THREE.SRGBColorSpace;
  return cachedTexture;
};
