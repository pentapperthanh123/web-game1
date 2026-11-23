import * as THREE from 'three';
import type { PrankActionType } from '@shared/types/prank';
import { PERFORMANCE_3D_LIMITS } from '@shared/constants/prankConfig';

export interface ActiveProjectile3D {
  mesh: THREE.Group;
  action: PrankActionType;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  progress: number;
  speed: number;
  active: boolean;
  initiatorName: string;
  avatarUrl?: string;
  arcHeight: number;
}

export class ProjectilePool3D {
  private readonly pool: ActiveProjectile3D[] = [];
  private readonly maxCount = PERFORMANCE_3D_LIMITS.MAX_PROJECTILES;
  public readonly sceneGroup: THREE.Group = new THREE.Group();

  constructor() {
    this.sceneGroup.name = 'ProjectilePool';

    for (let i = 0; i < this.maxCount; i++) {
      const mesh = this.createMultiProjectileMesh();
      mesh.visible = false;
      this.sceneGroup.add(mesh);

      this.pool.push({
        mesh,
        action: 'EGG',
        startPos: new THREE.Vector3(),
        targetPos: new THREE.Vector3(),
        progress: 0,
        speed: 0.045,
        active: false,
        initiatorName: '',
        arcHeight: 0.8,
      });
    }
  }

  private createMultiProjectileMesh(): THREE.Group {
    const group = new THREE.Group();

    // 1. Egg Mesh
    const eggGeo = new THREE.SphereGeometry(0.18, 16, 16);
    eggGeo.scale(1, 1.35, 1);
    const eggMat = new THREE.MeshToonMaterial({ color: 0xfae1c3 });
    const eggMesh = new THREE.Mesh(eggGeo, eggMat);
    eggMesh.name = 'mesh_EGG';
    group.add(eggMesh);

    // 2. Cake Mesh
    const cakeGroup = new THREE.Group();
    cakeGroup.name = 'mesh_CAKE';
    const plateGeo = new THREE.CylinderGeometry(0.28, 0.22, 0.04, 16);
    const plateMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    cakeGroup.add(new THREE.Mesh(plateGeo, plateMat));

    const cakeSliceGeo = new THREE.ConeGeometry(0.22, 0.25, 8);
    const cakeSliceMat = new THREE.MeshToonMaterial({ color: 0xff80ab });
    const cakeSlice = new THREE.Mesh(cakeSliceGeo, cakeSliceMat);
    cakeSlice.position.y = 0.12;
    cakeGroup.add(cakeSlice);
    group.add(cakeGroup);

    // 3. Ball Mesh (Basketball)
    const ballGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const ballMat = new THREE.MeshToonMaterial({ color: 0xff6f00 });
    const ballMesh = new THREE.Mesh(ballGeo, ballMat);
    ballMesh.name = 'mesh_BALL';
    group.add(ballMesh);

    // 4. Wind Mesh (Vortex tornado ribbons)
    const windGroup = new THREE.Group();
    windGroup.name = 'mesh_WIND';
    const windMat = new THREE.MeshBasicMaterial({
      color: 0xe0f7fa,
      transparent: true,
      opacity: 0.75,
      wireframe: true,
    });
    const windGeo = new THREE.TorusGeometry(0.24, 0.06, 8, 16);
    const w1 = new THREE.Mesh(windGeo, windMat);
    const w2 = new THREE.Mesh(windGeo, windMat);
    w2.scale.set(0.65, 0.65, 0.65);
    w2.position.z = 0.15;
    windGroup.add(w1, w2);
    group.add(windGroup);

    // 5. Milk Mesh (Splash blob)
    const milkGeo = new THREE.SphereGeometry(0.18, 12, 12);
    milkGeo.scale(1.2, 0.7, 0.9);
    const milkMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    const milkMesh = new THREE.Mesh(milkGeo, milkMat);
    milkMesh.name = 'mesh_MILK';
    group.add(milkMesh);

    // 6. Surprise Gift Box
    const giftGroup = new THREE.Group();
    giftGroup.name = 'mesh_SURPRISE';
    const boxGeo = new THREE.BoxGeometry(0.28, 0.28, 0.28);
    const boxMat = new THREE.MeshToonMaterial({ color: 0xab47bc });
    giftGroup.add(new THREE.Mesh(boxGeo, boxMat));
    group.add(giftGroup);

    return group;
  }

  public spawn(
    action: PrankActionType,
    initiatorName: string,
    avatarUrl?: string
  ): ActiveProjectile3D | null {
    const item = this.pool.find((p) => !p.active);
    if (!item) return null;

    item.active = true;
    item.action = action;
    item.initiatorName = initiatorName;
    item.avatarUrl = avatarUrl;
    item.progress = 0;
    item.speed = action === 'BALL' ? 0.06 : action === 'WIND' ? 0.07 : 0.045;
    item.arcHeight = 0.6 + Math.random() * 0.4;

    // Spawn from left or right outside frustum
    const fromLeft = Math.random() > 0.5;
    item.startPos.set(fromLeft ? -2.6 : 2.6, 2.0 + Math.random() * 0.6, 1.8);
    // Target matches character head/chest area (y: 1.7 -> 2.45)
    const targetY =
      action === 'BALL' || action === 'WIND' || action === 'CAKE'
        ? 2.45
        : action === 'EGG'
        ? 2.32
        : 1.75 + (Math.random() - 0.5) * 0.2;

    item.targetPos.set((Math.random() - 0.5) * 0.15, targetY, 0.08);

    // Show only the relevant mesh
    item.mesh.children.forEach((child) => {
      child.visible = child.name === `mesh_${action}`;
    });
    item.mesh.position.copy(item.startPos);
    item.mesh.visible = true;

    return item;
  }

  public update(onImpact: (proj: ActiveProjectile3D) => void): void {
    for (const p of this.pool) {
      if (!p.active) continue;

      p.progress += p.speed;

      // Parabolic flight
      const t = p.progress;
      p.mesh.position.lerpVectors(p.startPos, p.targetPos, t);
      // Parabolic arc in Y
      p.mesh.position.y += Math.sin(t * Math.PI) * p.arcHeight;

      // Spin rotation
      p.mesh.rotation.x += 0.15;
      p.mesh.rotation.y += 0.2;

      if (p.progress >= 1) {
        p.active = false;
        p.mesh.visible = false;
        onImpact(p);
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
