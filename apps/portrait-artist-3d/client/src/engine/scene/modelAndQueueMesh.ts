import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { QueueEntry, TurnPhase } from '../../../../shared/types/studio';
import { hashString } from '../../utils/hashString';
import {
  cloneCustomerInstance,
  loadCustomerTemplate,
  STANDARD_HEIGHTS,
  type ClonedCustomerRig,
  type LoadedCustomerTemplate,
} from './assetLoader3D';
import { STUDIO_ANCHORS } from './studioEnvironment';

/**
 * Maximum 3-4 waiting queue characters visible in frame with >= 0.95m diagonal spacing
 * so characters and name tags never bunch up or overlap.
 */
const MAX_VISIBLE_QUEUE = 4;

/**
 * Diagonal queue slots receding backward-left from the stool (-0.62, 0, 0.54).
 * Every consecutive pair is separated by >= 0.98m Euclidean distance:
 * - Slot 0 -> Slot 1: sqrt(0.46^2 + 0.88^2) = 0.99m
 * - Slot 1 -> Slot 2: sqrt(0.48^2 + 0.88^2) = 1.00m
 * - Slot 2 -> Slot 3: sqrt(0.46^2 + 0.88^2) = 0.99m
 */
const QUEUE_SLOTS: ReadonlyArray<THREE.Vector3> = [
  new THREE.Vector3(-1.12, 0, -0.18),
  new THREE.Vector3(-1.58, 0, -1.06),
  new THREE.Vector3(-1.10, 0, -1.94),
  new THREE.Vector3(-1.56, 0, -2.82),
];

const OUTFIT_COLORS = [
  0x38bdf8,
  0xfb7185,
  0x34d399,
  0xfbbf24,
  0xf97316,
  0xf472b6,
  0x2dd4bf,
  0x60a5fa,
] as const;

function transformGeo(
  geo: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  rotX = 0,
  rotY = 0,
  rotZ = 0
): THREE.BufferGeometry {
  const mat = new THREE.Matrix4();
  mat.compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ)),
    new THREE.Vector3(1, 1, 1)
  );
  geo.applyMatrix4(mat);
  const out = geo.toNonIndexed();
  geo.dispose();
  return out;
}

function mergeParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/**
 * Large Avatar + Name Card drawn ONLY for the active seated customer on the stool.
 */
function buildSeatedCustomerAvatarCard(
  portraitCanvas: HTMLCanvasElement,
  nickname: string,
  isVip: boolean
): HTMLCanvasElement {
  const card = document.createElement('canvas');
  card.width = 256;
  card.height = 300;
  const ctx = card.getContext('2d');
  if (!ctx) return card;

  ctx.save();
  ctx.beginPath();
  ctx.arc(128, 122, 88, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(portraitCanvas, 36, 30, 184, 184);
  ctx.restore();

  ctx.strokeStyle = isVip ? '#fbbf24' : '#ffffff';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(128, 122, 90, 0, Math.PI * 2);
  ctx.stroke();

  if (isVip) {
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👑', 128, 36);
  }

  const shortName = nickname.length > 13 ? `${nickname.slice(0, 12)}…` : nickname;
  ctx.fillStyle = isVip ? 'rgba(180, 83, 9, 0.95)' : 'rgba(28, 25, 23, 0.92)';
  ctx.beginPath();
  ctx.roundRect(18, 224, 220, 52, 26);
  ctx.fill();
  ctx.strokeStyle = isVip ? '#fde68a' : 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 25px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(shortName, 128, 258);

  return card;
}

/**
 * Compact Mini Name Tag (NO large circular avatar!) for waiting queue characters
 * to completely eliminate overlapping avatar circles on the left side of the screen.
 */
function buildCompactQueueNamePill(nickname: string, isVip: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 68;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const shortName = nickname.length > 12 ? `${nickname.slice(0, 11)}…` : nickname;
  const label = isVip ? `👑 ${shortName}` : shortName;

  ctx.fillStyle = isVip ? 'rgba(180, 83, 9, 0.92)' : 'rgba(41, 37, 36, 0.86)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 224, 52, 26);
  ctx.fill();

  ctx.strokeStyle = isVip ? '#fde047' : 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = isVip ? '#fef9c3' : '#f5f5f4';
  ctx.font = 'bold 24px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 120, 42);

  return canvas;
}

interface QueueSlotNode {
  container: THREE.Group;
  silhouetteMesh: THREE.Mesh;
  silhouetteMat: THREE.MeshStandardMaterial;
  clonedRig: ClonedCustomerRig | null;
  namePillMesh: THREE.Mesh;
  namePillMat: THREE.MeshBasicMaterial;
  namePillTex: THREE.CanvasTexture | null;
  renderedKey: string | null;
}

/**
 * Manages:
 * 1. Seated Customer on the wooden stool with exact `seatTopY = 0.58m` hip locking and feet on the footrest (`y = 0.22m`).
 * 2. Up to 4 Waiting Queue characters spaced >= 0.99m apart diagonally with compact anti-overlap mini name tags.
 * 3. `SkeletonUtils.clone()` instancing of `/assets/customer.glb` (or clean continuous mannequin silhouettes if absent).
 */
export class ModelAndQueueMesh {
  public readonly root = new THREE.Group();

  // Seated Customer
  private readonly seatedContainer = new THREE.Group();
  private readonly seatedSilhouetteMesh: THREE.Mesh;
  private readonly seatedSilhouetteMat: THREE.MeshStandardMaterial;
  private seatedClonedRig: ClonedCustomerRig | null = null;
  private readonly seatedAvatarPlane: THREE.Mesh;
  private seatedAvatarTex: THREE.CanvasTexture | null = null;
  private readonly seatedAvatarMat: THREE.MeshBasicMaterial;
  private walkProgress = 1;
  private hasActiveModel = false;

  // 4 Spaced Waiting Queue Slots
  private readonly queueSlots: QueueSlotNode[] = [];
  private visibleQueue: QueueEntry[] = [];

  private customerTemplate: LoadedCustomerTemplate | null = null;
  private seatTopY: number = STANDARD_HEIGHTS.DEFAULT_SEAT_TOP_Y;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(
    private readonly onCustomerAssetStatus: (missingAsset: string | null) => void
  ) {
    // 1. Build Unified Seated Mannequin Silhouette locked to seatTopY (0.58m) & footrest (0.22m)
    this.seatedSilhouetteMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.55,
      metalness: 0.05,
    });
    this.materials.push(this.seatedSilhouetteMat);

    const seatedSilhouetteGeo = this.buildSeatedSilhouetteGeometry(this.seatTopY);
    this.geometries.push(seatedSilhouetteGeo);
    this.seatedSilhouetteMesh = new THREE.Mesh(seatedSilhouetteGeo, this.seatedSilhouetteMat);
    this.seatedContainer.add(this.seatedSilhouetteMesh);

    // Large Avatar + Name Card ONLY on the active seated customer
    const cardGeo = new THREE.PlaneGeometry(0.52, 0.60);
    this.geometries.push(cardGeo);
    this.seatedAvatarMat = new THREE.MeshBasicMaterial({
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.materials.push(this.seatedAvatarMat);
    this.seatedAvatarPlane = new THREE.Mesh(cardGeo, this.seatedAvatarMat);
    this.seatedAvatarPlane.position.set(0, 1.66, 0.04);
    this.seatedAvatarPlane.visible = false;
    this.seatedContainer.add(this.seatedAvatarPlane);

    this.seatedContainer.position.copy(STUDIO_ANCHORS.STOOL_POS);
    this.seatedContainer.rotation.y = 0.44;
    this.seatedContainer.visible = false;
    this.root.add(this.seatedContainer);

    // 2. Build 4 Waiting Queue Slots (>= 0.99m diagonal spacing + compact mini name pills)
    const standingSilhouetteGeo = this.buildStandingSilhouetteGeometry();
    const pillGeo = new THREE.PlaneGeometry(0.46, 0.13);
    this.geometries.push(standingSilhouetteGeo, pillGeo);

    for (let i = 0; i < MAX_VISIBLE_QUEUE; i++) {
      const container = new THREE.Group();
      container.position.copy(QUEUE_SLOTS[i]);
      container.rotation.y = 0.46;
      container.visible = false;

      const silhouetteMat = new THREE.MeshStandardMaterial({
        color: OUTFIT_COLORS[i % OUTFIT_COLORS.length],
        roughness: 0.55,
        metalness: 0.05,
      });
      this.materials.push(silhouetteMat);
      const silhouetteMesh = new THREE.Mesh(standingSilhouetteGeo, silhouetteMat);
      container.add(silhouetteMesh);

      const namePillMat = new THREE.MeshBasicMaterial({
        transparent: true,
        side: THREE.DoubleSide,
      });
      this.materials.push(namePillMat);
      const namePillMesh = new THREE.Mesh(pillGeo, namePillMat);
      // Stagger tag height slightly by slot index so screen projections never overlap
      namePillMesh.position.set(0, 1.56 + (i % 2) * 0.09, 0.02);
      namePillMesh.rotation.y = -container.rotation.y;
      container.add(namePillMesh);

      this.root.add(container);
      this.queueSlots.push({
        container,
        silhouetteMesh,
        silhouetteMat,
        clonedRig: null,
        namePillMesh,
        namePillMat,
        namePillTex: null,
        renderedKey: null,
      });
    }

    void this.initCustomerAsset();
  }

  /**
   * Builds a single continuous seated mannequin geometry whose pelvis/hips sit exactly on `seatTopY` (0.58m),
   * knees bend at z = +0.16m, and feet rest squarely on the footrest bar at y = 0.22m (zero detached parts!).
   */
  private buildSeatedSilhouetteGeometry(seatTopY: number): THREE.BufferGeometry {
    const footY = STANDARD_HEIGHTS.FOOTREST_TOP_Y;
    const calfLen = Math.max(0.18, seatTopY - footY);
    const parts: THREE.BufferGeometry[] = [
      // Pelvis seated flush on stool top (y = seatTopY + 0.06)
      transformGeo(new THREE.SphereGeometry(0.155, 16, 12), 0, seatTopY + 0.06, 0),
      // Torso rising from pelvis
      transformGeo(new THREE.CylinderGeometry(0.125, 0.148, 0.36, 16), 0, seatTopY + 0.24, 0),
      // Neck & Unified Head
      transformGeo(new THREE.CylinderGeometry(0.055, 0.065, 0.10, 10), 0, seatTopY + 0.45, 0),
      transformGeo(new THREE.SphereGeometry(0.155, 18, 14), 0, seatTopY + 0.61, 0),
      // Left & Right Thighs connected from pelvis to knees
      transformGeo(
        new THREE.CapsuleGeometry(0.052, 0.16, 6, 10),
        -0.085,
        seatTopY + 0.05,
        0.09,
        Math.PI * 0.47
      ),
      transformGeo(
        new THREE.CapsuleGeometry(0.052, 0.16, 6, 10),
        0.085,
        seatTopY + 0.05,
        0.09,
        Math.PI * 0.47
      ),
      // Left & Right Calves connected from knees down to footrest bar (y = 0.22)
      transformGeo(
        new THREE.CapsuleGeometry(0.046, calfLen * 0.55, 6, 10),
        -0.085,
        footY + calfLen * 0.5,
        0.17,
        0.06
      ),
      transformGeo(
        new THREE.CapsuleGeometry(0.046, calfLen * 0.55, 6, 10),
        0.085,
        footY + calfLen * 0.5,
        0.17,
        0.06
      ),
      // Left & Right Feet resting on footrest bar (y = 0.22)
      transformGeo(new THREE.CapsuleGeometry(0.045, 0.07, 6, 10), -0.085, footY + 0.035, 0.20, Math.PI / 2),
      transformGeo(new THREE.CapsuleGeometry(0.045, 0.07, 6, 10), 0.085, footY + 0.035, 0.20, Math.PI / 2),
      // Left & Right Arms connected from shoulders resting on knees
      transformGeo(
        new THREE.CapsuleGeometry(0.04, 0.26, 6, 10),
        -0.155,
        seatTopY + 0.22,
        0.07,
        0.48,
        0,
        0.14
      ),
      transformGeo(
        new THREE.CapsuleGeometry(0.04, 0.26, 6, 10),
        0.155,
        seatTopY + 0.22,
        0.07,
        0.48,
        0,
        -0.14
      ),
    ];
    return mergeParts(parts);
  }

  /**
   * Clean 1.45m standing mannequin silhouette for waiting queue fallback.
   */
  private buildStandingSilhouetteGeometry(): THREE.BufferGeometry {
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.01, 0.0),
      new THREE.Vector2(0.12, 0.0),
      new THREE.Vector2(0.09, 0.08),
      new THREE.Vector2(0.08, 0.52),
      new THREE.Vector2(0.16, 0.58),
      new THREE.Vector2(0.13, 1.02),
      new THREE.Vector2(0.055, 1.12),
    ];
    const body = new THREE.LatheGeometry(profile, 16).toNonIndexed();
    const head = transformGeo(new THREE.SphereGeometry(0.15, 16, 12), 0, 1.28, 0);
    return mergeParts([body, head]);
  }

  private async initCustomerAsset(): Promise<void> {
    const template = await loadCustomerTemplate();
    if (!template) {
      this.onCustomerAssetStatus('/assets/customer.glb');
      return;
    }

    this.customerTemplate = template;
    this.onCustomerAssetStatus(null);

    // Upgrade active seated customer to cloned GLB rig
    const seatedClone = cloneCustomerInstance(template, 0x38bdf8);
    this.alignSeatedRigToStool(seatedClone);
    this.seatedClonedRig = seatedClone;
    this.seatedSilhouetteMesh.visible = false;
    this.seatedContainer.add(seatedClone.root);

    // Upgrade 4 queue slots to cloned GLB rigs via SkeletonUtils.clone()
    for (let i = 0; i < MAX_VISIBLE_QUEUE; i++) {
      const slot = this.queueSlots[i];
      const qClone = cloneCustomerInstance(template, OUTFIT_COLORS[i % OUTFIT_COLORS.length]);
      if (qClone.clips.idle) {
        qClone.mixer.clipAction(qClone.clips.idle).play();
      }
      slot.clonedRig = qClone;
      slot.silhouetteMesh.visible = false;
      slot.container.add(qClone.root);
    }
  }

  /**
   * Aligns the loaded `customer.glb` pelvis/hips bone strictly to `seatTopY` on the wooden stool.
   */
  private alignSeatedRigToStool(rig: ClonedCustomerRig): void {
    if (rig.clips.sitting) {
      const action = rig.mixer.clipAction(rig.clips.sitting);
      action.play();
      rig.mixer.update(0.01);
    } else if (rig.clips.idle) {
      rig.mixer.clipAction(rig.clips.idle).play();
    }

    rig.root.updateMatrixWorld(true);
    if (rig.hipsNode) {
      const hipsWorld = new THREE.Vector3();
      rig.hipsNode.getWorldPosition(hipsWorld);
      const localHipsY = hipsWorld.y - rig.root.getWorldPosition(new THREE.Vector3()).y;
      // Shift root Y so the character's hips rest flush on seatTopY (0.58m)
      rig.root.position.y = this.seatTopY + 0.04 - localHipsY;
    } else {
      rig.root.position.y = 0;
    }
  }

  public setSeatTopY(seatTopY: number): void {
    this.seatTopY = seatTopY;
    if (this.seatedClonedRig) {
      this.alignSeatedRigToStool(this.seatedClonedRig);
    }
  }

  private applyRigTint(rig: ClonedCustomerRig | null, fallbackMat: THREE.MeshStandardMaterial, hex: number): void {
    fallbackMat.color.setHex(hex);
    if (!rig) return;
    for (const mat of rig.tintedMaterials) {
      const std = mat as THREE.MeshStandardMaterial;
      if (std.color) {
        std.color.setHex(hex);
      }
    }
  }

  public setActiveModel(
    entry: QueueEntry | null,
    portraitCanvas: HTMLCanvasElement | null,
    isWalkingIn: boolean
  ): void {
    if (!entry) {
      this.hasActiveModel = false;
      this.seatedContainer.visible = false;
      return;
    }

    this.hasActiveModel = true;
    this.seatedContainer.visible = true;
    const hex = OUTFIT_COLORS[hashString(entry.user.id) % OUTFIT_COLORS.length];
    this.applyRigTint(this.seatedClonedRig, this.seatedSilhouetteMat, hex);

    if (isWalkingIn) {
      this.walkProgress = 0;
    }

    if (portraitCanvas) {
      if (this.seatedAvatarTex) {
        this.seatedAvatarTex.dispose();
      }
      const cardCanvas = buildSeatedCustomerAvatarCard(
        portraitCanvas,
        entry.user.nickname,
        entry.isVip
      );
      this.seatedAvatarTex = new THREE.CanvasTexture(cardCanvas);
      this.seatedAvatarTex.colorSpace = THREE.SRGBColorSpace;
      this.seatedAvatarTex.needsUpdate = true;
      this.seatedAvatarMat.map = this.seatedAvatarTex;
      this.seatedAvatarMat.needsUpdate = true;
      this.seatedAvatarPlane.visible = true;
    }
  }

  public setQueueEntries(vipQueue: QueueEntry[], normalQueue: QueueEntry[]): void {
    this.visibleQueue = [...vipQueue, ...normalQueue].slice(0, MAX_VISIBLE_QUEUE);

    for (let i = 0; i < MAX_VISIBLE_QUEUE; i++) {
      const slot = this.queueSlots[i];
      const entry = this.visibleQueue[i];
      if (!entry) {
        slot.container.visible = false;
        continue;
      }

      slot.container.visible = true;
      const key = `${entry.user.id}_${entry.isVip ? 'vip' : 'n'}`;
      if (slot.renderedKey !== key) {
        slot.renderedKey = key;
        const hex = OUTFIT_COLORS[hashString(entry.user.id) % OUTFIT_COLORS.length];
        this.applyRigTint(slot.clonedRig, slot.silhouetteMat, hex);

        if (slot.namePillTex) {
          slot.namePillTex.dispose();
        }
        const pillCanvas = buildCompactQueueNamePill(entry.user.nickname, entry.isVip);
        const tex = new THREE.CanvasTexture(pillCanvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        slot.namePillTex = tex;
        slot.namePillMat.map = tex;
        slot.namePillMat.needsUpdate = true;
      }
    }
  }

  public triggerBackgroundPasserby(): void {
    // Kept as no-op or lightweight signal so background stays clean
  }

  public getShadowPositions(): Array<{ x: number; z: number; radius: number }> {
    const out: Array<{ x: number; z: number; radius: number }> = [];
    for (let i = 0; i < this.visibleQueue.length; i++) {
      const pos = QUEUE_SLOTS[i];
      out.push({ x: pos.x, z: pos.z, radius: 0.24 });
    }
    return out;
  }

  public update(deltaSec: number, elapsedSec: number, phase: TurnPhase): void {
    if (this.hasActiveModel) {
      if (phase === 'WALK_IN' && this.walkProgress < 1) {
        this.walkProgress = Math.min(1, this.walkProgress + deltaSec / 1.45);
        const startX = QUEUE_SLOTS[0].x;
        const startZ = QUEUE_SLOTS[0].z;
        this.seatedContainer.position.x = THREE.MathUtils.lerp(
          startX,
          STUDIO_ANCHORS.STOOL_POS.x,
          this.walkProgress
        );
        this.seatedContainer.position.z = THREE.MathUtils.lerp(
          startZ,
          STUDIO_ANCHORS.STOOL_POS.z,
          this.walkProgress
        );
        this.seatedContainer.position.y =
          Math.abs(Math.sin(this.walkProgress * Math.PI * 5)) * 0.06;
      } else {
        this.seatedContainer.position.x = STUDIO_ANCHORS.STOOL_POS.x;
        this.seatedContainer.position.z = STUDIO_ANCHORS.STOOL_POS.z;
        this.seatedContainer.position.y = Math.sin(elapsedSec * 2.2) * 0.006;
      }
      this.seatedAvatarPlane.rotation.y = -this.seatedContainer.rotation.y;

      if (this.seatedClonedRig) {
        this.seatedClonedRig.mixer.update(deltaSec);
      }
    }

    for (let i = 0; i < this.visibleQueue.length; i++) {
      const slot = this.queueSlots[i];
      if (slot.clonedRig) {
        slot.clonedRig.mixer.update(deltaSec);
      }
    }
  }

  public dispose(): void {
    if (this.seatedAvatarTex) {
      this.seatedAvatarTex.dispose();
      this.seatedAvatarTex = null;
    }
    if (this.seatedClonedRig) {
      this.seatedClonedRig.mixer.stopAllAction();
      for (const m of this.seatedClonedRig.tintedMaterials) m.dispose();
    }
    for (const slot of this.queueSlots) {
      if (slot.namePillTex) {
        slot.namePillTex.dispose();
        slot.namePillTex = null;
      }
      if (slot.clonedRig) {
        slot.clonedRig.mixer.stopAllAction();
        for (const m of slot.clonedRig.tintedMaterials) m.dispose();
      }
    }
    if (this.customerTemplate) {
      this.customerTemplate = null;
    }
    for (const geo of this.geometries) geo.dispose();
    for (const mat of this.materials) mat.dispose();
  }
}
