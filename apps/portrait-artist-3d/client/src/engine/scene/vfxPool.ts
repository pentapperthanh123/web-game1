import * as THREE from 'three';
import { getSharedBlobShadowTexture } from './toonMaterials';

const MAX_SHADOWS = 24;
const MAX_PARTICLES = 64;

interface ParticleSlot {
  active: boolean;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  scale: number;
  rotSpeed: number;
}

const HEART_COLORS = [0xf43f5e, 0xfb7185, 0xfda4af, 0xfbbf24] as const;
const CONFETTI_COLORS = [0xf43f5e, 0xfbbf24, 0x34d399, 0x38bdf8, 0xf97316, 0xec4899] as const;

/**
 * InstancedMesh pool:
 * - 1 draw call for up to 24 floor blob shadows at y = 0.01
 * - 1 draw call for 3D floating hearts and confetti
 */
export class StudioVfxPool {
  public readonly root = new THREE.Group();
  private readonly shadowMesh: THREE.InstancedMesh;
  private readonly particleMesh: THREE.InstancedMesh;
  private readonly shadowGeo: THREE.PlaneGeometry;
  private readonly shadowMat: THREE.MeshBasicMaterial;
  private readonly particleGeo: THREE.OctahedronGeometry;
  private readonly particleMat: THREE.MeshBasicMaterial;
  private readonly particles: ParticleSlot[] = [];
  private readonly dummy = new THREE.Object3D();
  private readonly tempColor = new THREE.Color();
  private nextParticleIdx = 0;

  constructor() {
    this.shadowGeo = new THREE.PlaneGeometry(1, 1);
    this.shadowGeo.rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: getSharedBlobShadowTexture(),
      transparent: true,
      depthWrite: false,
    });
    this.shadowMesh = new THREE.InstancedMesh(this.shadowGeo, this.shadowMat, MAX_SHADOWS);
    this.shadowMesh.count = 0;
    this.root.add(this.shadowMesh);

    this.particleGeo = new THREE.OctahedronGeometry(0.055, 0);
    this.particleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleMesh = new THREE.InstancedMesh(this.particleGeo, this.particleMat, MAX_PARTICLES);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.add(this.particleMesh);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        age: 0,
        maxAge: 1,
        scale: 0,
        rotSpeed: 2,
      });
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);
      this.particleMesh.setColorAt(i, this.tempColor.setHex(0xffffff));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
  }

  public setBlobShadows(entries: ReadonlyArray<{ x: number; z: number; radius: number }>): void {
    const count = Math.min(entries.length, MAX_SHADOWS);
    this.shadowMesh.count = count;
    for (let i = 0; i < count; i++) {
      const e = entries[i];
      this.dummy.position.set(e.x, 0.01, e.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(e.radius * 2, 1, e.radius * 2);
      this.dummy.updateMatrix();
      this.shadowMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.shadowMesh.instanceMatrix.needsUpdate = true;
  }

  public spawnHearts(origin: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.nextParticleIdx];
      slot.active = true;
      slot.age = 0;
      slot.maxAge = 1.2 + Math.random() * 0.7;
      slot.scale = 0.8 + Math.random() * 0.55;
      slot.rotSpeed = 2.5 + Math.random() * 2;
      slot.pos.set(
        origin.x + (Math.random() - 0.5) * 0.65,
        origin.y + Math.random() * 0.35,
        origin.z + (Math.random() - 0.5) * 0.35
      );
      slot.vel.set((Math.random() - 0.5) * 0.45, 0.95 + Math.random() * 0.65, (Math.random() - 0.5) * 0.2);

      const hex = HEART_COLORS[this.nextParticleIdx % HEART_COLORS.length];
      this.particleMesh.setColorAt(this.nextParticleIdx, this.tempColor.setHex(hex));
      this.nextParticleIdx = (this.nextParticleIdx + 1) % MAX_PARTICLES;
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  public spawnConfetti(origin: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      const slot = this.particles[this.nextParticleIdx];
      slot.active = true;
      slot.age = 0;
      slot.maxAge = 1.6 + Math.random() * 0.8;
      slot.scale = 0.7 + Math.random() * 0.6;
      slot.rotSpeed = 4.5 + Math.random() * 4;
      slot.pos.set(
        origin.x + (Math.random() - 0.5) * 0.8,
        origin.y + Math.random() * 0.4,
        origin.z + (Math.random() - 0.5) * 0.3
      );
      slot.vel.set(
        (Math.random() - 0.5) * 1.8,
        1.2 + Math.random() * 1.4,
        (Math.random() - 0.5) * 0.7
      );

      const hex = CONFETTI_COLORS[this.nextParticleIdx % CONFETTI_COLORS.length];
      this.particleMesh.setColorAt(this.nextParticleIdx, this.tempColor.setHex(hex));
      this.nextParticleIdx = (this.nextParticleIdx + 1) % MAX_PARTICLES;
    }
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  public update(deltaSec: number): void {
    let dirty = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      dirty = true;
      p.age += deltaSec;
      if (p.age >= p.maxAge) {
        p.active = false;
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.particleMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      p.pos.addScaledVector(p.vel, deltaSec);
      p.vel.y -= 0.75 * deltaSec;
      const lifeRatio = 1 - p.age / p.maxAge;
      const s = p.scale * lifeRatio;

      this.dummy.position.copy(p.pos);
      this.dummy.rotation.set(p.age * p.rotSpeed, p.age * p.rotSpeed * 0.7, 0);
      this.dummy.scale.set(s, s, s);
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);
    }

    if (dirty) {
      this.particleMesh.instanceMatrix.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.shadowGeo.dispose();
    this.shadowMat.dispose();
    this.particleGeo.dispose();
    this.particleMat.dispose();
  }
}
