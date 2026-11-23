import * as THREE from 'three';
import type { AttachmentTargetBone, AttachmentType3D } from '@shared/types/prank';
import { PERFORMANCE_3D_LIMITS } from '@shared/constants/prankConfig';

export interface ActiveAttachment3D {
  mesh: THREE.Group;
  type: AttachmentType3D;
  targetBone: AttachmentTargetBone;
  active: boolean;
  createdAt: number;
  durationMs: number;
  initialLocalY: number;
}

export class AttachmentPool3D {
  private readonly pool: ActiveAttachment3D[] = [];
  private readonly maxCount = PERFORMANCE_3D_LIMITS.MAX_ATTACHMENTS;
  public readonly sceneGroup: THREE.Group = new THREE.Group();

  constructor() {
    this.sceneGroup.name = 'AttachmentPool';

    for (let i = 0; i < this.maxCount; i++) {
      const mesh = this.createMultiAttachmentMesh();
      mesh.visible = false;
      this.sceneGroup.add(mesh);

      this.pool.push({
        mesh,
        type: 'EGG_SPLAT',
        targetBone: 'HEAD',
        active: false,
        createdAt: 0,
        durationMs: PERFORMANCE_3D_LIMITS.ATTACHMENT_LIFETIME_MS,
        initialLocalY: 0,
      });
    }
  }

  private createMultiAttachmentMesh(): THREE.Group {
    const group = new THREE.Group();

    // 1. Egg Splat (Convex yolk + runny puddle + cracked egg shell)
    const eggGroup = new THREE.Group();
    eggGroup.name = 'attach_EGG_SPLAT';
    eggGroup.rotation.x = Math.PI * 0.5; // Orient flat against the character
    // Egg white base puddle
    const eggWhiteGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.04, 16);
    const eggWhiteMat = new THREE.MeshToonMaterial({
      color: 0xfffff0,
      transparent: true,
      opacity: 0.85,
    });
    eggGroup.add(new THREE.Mesh(eggWhiteGeo, eggWhiteMat));
    // Rich yellow convex yolk
    const yolkGeo = new THREE.SphereGeometry(0.14, 16, 16);
    yolkGeo.scale(1.2, 0.5, 1.2);
    const yolkMat = new THREE.MeshToonMaterial({ color: 0xffb300 });
    const yolkMesh = new THREE.Mesh(yolkGeo, yolkMat);
    yolkMesh.position.y = 0.04;
    eggGroup.add(yolkMesh);
    // Cracked shell piece
    const shellGeo = new THREE.ConeGeometry(0.1, 0.14, 5);
    const shellMat = new THREE.MeshToonMaterial({ color: 0xf5e6d3 });
    const shellMesh = new THREE.Mesh(shellGeo, shellMat);
    shellMesh.position.set(0.14, 0.08, 0.1);
    shellMesh.rotation.set(0.3, 0.5, 0.8);
    eggGroup.add(shellMesh);
    group.add(eggGroup);

    // 2. Cake Smear
    const cakeGroup = new THREE.Group();
    cakeGroup.name = 'attach_CAKE_SMEAR';
    cakeGroup.rotation.x = Math.PI * 0.5;
    const creamGeo = new THREE.SphereGeometry(0.2, 12, 12);
    creamGeo.scale(1.4, 0.5, 1);
    const creamMat = new THREE.MeshToonMaterial({ color: 0xff80ab });
    cakeGroup.add(new THREE.Mesh(creamGeo, creamMat));
    group.add(cakeGroup);

    // 3. Bump & Stars (Ball bonk head knot)
    const bumpGroup = new THREE.Group();
    bumpGroup.name = 'attach_BUMP_STARS';
    const bumpGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const bumpMat = new THREE.MeshToonMaterial({ color: 0xe53935 });
    const bumpMesh = new THREE.Mesh(bumpGeo, bumpMat);
    bumpGroup.add(bumpMesh);
    // Yellow star
    const starGeo = new THREE.OctahedronGeometry(0.1);
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b });
    const star1 = new THREE.Mesh(starGeo, starMat);
    star1.name = 'orbit_star';
    star1.position.set(0.22, 0.14, 0);
    bumpGroup.add(star1);
    group.add(bumpGroup);

    // 4. Milk Splash
    const milkGroup = new THREE.Group();
    milkGroup.name = 'attach_MILK_SPLASH';
    milkGroup.rotation.x = Math.PI * 0.5;
    const milkGeo = new THREE.CylinderGeometry(0.18, 0.24, 0.03, 12);
    const milkMat = new THREE.MeshToonMaterial({ color: 0xffffff });
    milkGroup.add(new THREE.Mesh(milkGeo, milkMat));
    group.add(milkGroup);

    return group;
  }

  public attach(
    type: AttachmentType3D,
    worldPos: THREE.Vector3,
    targetBone: AttachmentTargetBone = 'HEAD'
  ): ActiveAttachment3D {
    // If full, evict oldest
    let item = this.pool.find((p) => !p.active);
    if (!item) {
      let oldestTime = Infinity;
      let oldestIdx = 0;
      this.pool.forEach((p, idx) => {
        if (p.createdAt < oldestTime) {
          oldestTime = p.createdAt;
          oldestIdx = idx;
        }
      });
      item = this.pool[oldestIdx];
    }

    item.active = true;
    item.type = type;
    item.targetBone = targetBone;
    item.createdAt = Date.now();
    item.durationMs = PERFORMANCE_3D_LIMITS.ATTACHMENT_LIFETIME_MS;
    item.initialLocalY = worldPos.y;

    item.mesh.position.copy(worldPos);
    item.mesh.scale.set(1, 1, 1);
    item.mesh.visible = true;

    // Show only the requested attachment type
    item.mesh.children.forEach((c) => {
      c.visible = c.name === `attach_${type}`;
    });

    return item;
  }

  public update(): void {
    const now = Date.now();

    for (const item of this.pool) {
      if (!item.active) continue;

      const age = now - item.createdAt;

      // Rotate orbit star if bump
      if (item.type === 'BUMP_STARS') {
        const star = item.mesh.getObjectByName('orbit_star');
        if (star) {
          star.position.x = Math.cos(age * 0.005) * 0.18;
          star.position.z = Math.sin(age * 0.005) * 0.18;
        }
      }

      // Slow downward drip effect for egg/milk
      if (item.type === 'EGG_SPLAT' || item.type === 'MILK_SPLASH') {
        item.mesh.position.y -= 0.0003;
      }

      // Fade/scale out in last 2 seconds of life
      if (age > item.durationMs) {
        item.active = false;
        item.mesh.visible = false;
      } else if (age > item.durationMs - 2000) {
        const fadeRatio = (item.durationMs - age) / 2000;
        item.mesh.scale.setScalar(Math.max(0.01, fadeRatio));
      }
    }
  }

  public clearAll(): void {
    for (const item of this.pool) {
      item.active = false;
      item.mesh.visible = false;
    }
  }
}
