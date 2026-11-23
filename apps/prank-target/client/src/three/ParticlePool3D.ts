import * as THREE from 'three';
import { PERFORMANCE_3D_LIMITS } from '@shared/constants/prankConfig';

export interface Particle3D {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  gravity: number;
  rotationSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

export class ParticlePool3D {
  private readonly pool: Particle3D[] = [];
  private readonly maxCount = PERFORMANCE_3D_LIMITS.MAX_PARTICLES;
  public readonly sceneGroup: THREE.Group = new THREE.Group();

  constructor() {
    this.sceneGroup.name = 'ParticlePool3D';

    const sharedGeo = new THREE.DodecahedronGeometry(0.06);
    const sharedMat = new THREE.MeshToonMaterial({ color: 0xffb300 });

    for (let i = 0; i < this.maxCount; i++) {
      const mesh = new THREE.Mesh(sharedGeo, sharedMat.clone());
      mesh.visible = false;
      this.sceneGroup.add(mesh);

      this.pool.push({
        mesh,
        velocity: new THREE.Vector3(),
        gravity: -0.008,
        rotationSpeed: new THREE.Vector3(),
        life: 0,
        maxLife: 30,
        active: false,
      });
    }
  }

  public spawn(
    origin: THREE.Vector3,
    count: number,
    colorHex: number,
    baseSpeed = 0.08,
    isSmoke = false
  ): void {
    let spawned = 0;
    for (const p of this.pool) {
      if (spawned >= count) break;
      if (!p.active) {
        p.active = true;
        p.mesh.position.copy(origin);
        p.mesh.visible = true;
        (p.mesh.material as THREE.MeshToonMaterial).color.setHex(colorHex);

        if (isSmoke) {
          // Floats upwards
          p.velocity.set(
            (Math.random() - 0.5) * 0.03,
            Math.random() * 0.04 + 0.02,
            (Math.random() - 0.5) * 0.03
          );
          p.gravity = 0.001; // floats up
          p.maxLife = 45;
          p.mesh.scale.setScalar(Math.random() * 0.6 + 0.8);
        } else {
          // Burst explosion
          p.velocity.set(
            (Math.random() - 0.5) * baseSpeed * 2,
            Math.random() * baseSpeed * 1.5 + 0.02,
            (Math.random() - 0.5) * baseSpeed * 2
          );
          p.gravity = -0.006;
          p.maxLife = 28;
          p.mesh.scale.setScalar(Math.random() * 0.8 + 0.5);
        }

        p.rotationSpeed.set(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );
        p.life = 0;

        spawned++;
      }
    }
  }

  public update(): void {
    for (const p of this.pool) {
      if (!p.active) continue;

      p.mesh.position.add(p.velocity);
      p.velocity.y += p.gravity;
      p.mesh.rotation.x += p.rotationSpeed.x;
      p.mesh.rotation.y += p.rotationSpeed.y;

      p.life++;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
      } else if (p.life > p.maxLife * 0.6) {
        const scale = 1 - (p.life - p.maxLife * 0.6) / (p.maxLife * 0.4);
        p.mesh.scale.setScalar(Math.max(0.01, scale));
      }
    }
  }

  public clear(): void {
    for (const p of this.pool) {
      p.active = false;
      p.mesh.visible = false;
    }
  }
}
