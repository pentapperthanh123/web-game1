import * as THREE from 'three';
import type { CameraPreset } from '../../../../shared/types/studio';

interface CameraShot {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

/**
 * Curated 9:16 vertical camera presets.
 * WIDE_STUDIO is pulled back ~18% (z = 6.78 vs 5.72) so the Female Artist, Easel,
 * Seated Customer, and the 0.99m-spaced diagonal Waiting Queue fit with zero edge clipping
 * and leave open floor space below the stool legs for the Gift Perks bar (y >= 1040px).
 */
const CAMERA_SHOTS: Record<CameraPreset, CameraShot> = {
  WIDE_STUDIO: {
    position: new THREE.Vector3(-0.14, 1.94, 6.78),
    lookAt: new THREE.Vector3(-0.14, 1.16, -0.24),
  },
  OVER_SHOULDER: {
    position: new THREE.Vector3(0.56, 1.66, 3.65),
    lookAt: new THREE.Vector3(0.24, 1.40, 0.22),
  },
  VIP_SPOTLIGHT: {
    position: new THREE.Vector3(0.84, 1.56, 3.30),
    lookAt: new THREE.Vector3(0.76, 1.26, 0.48),
  },
  REVEAL_CLOSEUP: {
    position: new THREE.Vector3(0.42, 1.54, 3.35),
    lookAt: new THREE.Vector3(0.42, 1.40, 0.24),
  },
};

const CAMERA_LERP_SPEED = 4.2;

export class CameraDirector {
  private readonly currentLookAt = new THREE.Vector3().copy(CAMERA_SHOTS.WIDE_STUDIO.lookAt);
  private targetPreset: CameraPreset = 'WIDE_STUDIO';

  constructor(private readonly camera: THREE.PerspectiveCamera) {
    this.camera.position.copy(CAMERA_SHOTS.WIDE_STUDIO.position);
    this.camera.lookAt(this.currentLookAt);
  }

  public setPreset(preset: CameraPreset, dynamicEnabled: boolean): void {
    this.targetPreset = dynamicEnabled ? preset : 'WIDE_STUDIO';
  }

  public update(deltaSec: number): void {
    const shot = CAMERA_SHOTS[this.targetPreset];
    const alpha = 1 - Math.exp(-CAMERA_LERP_SPEED * deltaSec);
    this.camera.position.lerp(shot.position, alpha);
    this.currentLookAt.lerp(shot.lookAt, alpha);
    this.camera.lookAt(this.currentLookAt);
  }
}
