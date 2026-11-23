import * as THREE from 'three';

let sharedToonGradient: THREE.DataTexture | null = null;
let sharedBlobShadowTexture: THREE.CanvasTexture | null = null;

/**
 * Shared 4-band warm toon gradient map for rich stylized MeshToonMaterial shading.
 */
export function getSharedToonGradient(): THREE.DataTexture {
  if (sharedToonGradient) return sharedToonGradient;
  const bands = new Uint8Array([
    140, 132, 126, 255,
    188, 182, 176, 255,
    228, 224, 220, 255,
    255, 255, 255, 255,
  ]);
  const tex = new THREE.DataTexture(bands, 4, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  sharedToonGradient = tex;
  return tex;
}

export function createToonMaterial(colorHex: number): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({
    color: colorHex,
    gradientMap: getSharedToonGradient(),
  });
}

/**
 * Radial black gradient blob shadow texture (opacity ~0.25) placed at y=0.01 to ground all objects.
 */
export function getSharedBlobShadowTexture(): THREE.CanvasTexture {
  if (sharedBlobShadowTexture) return sharedBlobShadowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 30);
    grad.addColorStop(0, 'rgba(24, 15, 10, 0.28)');
    grad.addColorStop(0.55, 'rgba(24, 15, 10, 0.15)');
    grad.addColorStop(1, 'rgba(24, 15, 10, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  sharedBlobShadowTexture = tex;
  return tex;
}

export function disposeSharedToonResources(): void {
  if (sharedToonGradient) {
    sharedToonGradient.dispose();
    sharedToonGradient = null;
  }
  if (sharedBlobShadowTexture) {
    sharedBlobShadowTexture.dispose();
    sharedBlobShadowTexture = null;
  }
}
