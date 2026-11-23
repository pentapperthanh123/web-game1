import * as THREE from 'three';
import { STUDIO_LIMITS } from '../../../../shared/constants/studioConfig';
import { STUDIO_ANCHORS } from './studioEnvironment';
import { createToonMaterial } from './toonMaterials';

// ~1.3x larger frames (0.39 x 0.46) with 6 visible gallery slots across the rope
const MAX_FRAMES = Math.min(6, STUDIO_LIMITS.MAX_GALLERY_FRAMES);
const FRAME_WIDTH = 0.38;
const FRAME_HEIGHT = 0.45;
const SLOT_SPACING = 0.455;
const RIGHTMOST_X = ((MAX_FRAMES - 1) * SLOT_SPACING) / 2;

interface HangingFrameEntry {
  group: THREE.Group;
  artworkTexture: THREE.CanvasTexture;
  artworkMaterial: THREE.MeshBasicMaterial;
  frameMaterial: THREE.MeshToonMaterial;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  flightT: number;
  isFlying: boolean;
  swayOffset: number;
}

/**
 * Manages the back-wall hanging gallery rope with 1.3x larger portrait frames,
 * 3D wooden clothespin clips on top of each frame, and strict GPU VRAM disposal.
 */
export class GalleryWallManager {
  public readonly root = new THREE.Group();
  private readonly frames: HangingFrameEntry[] = [];
  private readonly sharedBackingGeo: THREE.BoxGeometry;
  private readonly sharedArtGeo: THREE.PlaneGeometry;
  private readonly sharedClipWoodGeo: THREE.BoxGeometry;
  private readonly sharedClipPinGeo: THREE.BoxGeometry;
  private readonly sharedClipWoodMat: THREE.MeshToonMaterial;
  private readonly sharedClipMetalMat: THREE.MeshToonMaterial;
  private readonly wireGeo: THREE.TubeGeometry;
  private readonly wireMat: THREE.MeshToonMaterial;

  constructor() {
    // 3D curved twine rope stretched across the gallery wall
    const ropePoints: THREE.Vector3[] = [];
    const segs = 16;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = -1.6 + t * 3.2;
      const norm = (t - 0.5) * 2;
      const sag = (1 - norm * norm) * 0.065;
      ropePoints.push(
        new THREE.Vector3(x, STUDIO_ANCHORS.GALLERY_Y + 0.23 - sag, STUDIO_ANCHORS.GALLERY_Z)
      );
    }
    const curve = new THREE.CatmullRomCurve3(ropePoints);
    this.wireGeo = new THREE.TubeGeometry(curve, 20, 0.014, 6, false);
    this.wireMat = createToonMaterial(0x92400e);
    const ropeMesh = new THREE.Mesh(this.wireGeo, this.wireMat);
    this.root.add(ropeMesh);

    this.sharedBackingGeo = new THREE.BoxGeometry(
      FRAME_WIDTH + 0.04,
      FRAME_HEIGHT + 0.04,
      0.026
    );
    this.sharedArtGeo = new THREE.PlaneGeometry(FRAME_WIDTH, FRAME_HEIGHT);
    this.sharedClipWoodGeo = new THREE.BoxGeometry(0.036, 0.095, 0.038);
    this.sharedClipPinGeo = new THREE.BoxGeometry(0.042, 0.022, 0.044);
    this.sharedClipWoodMat = createToonMaterial(0xd97706);
    this.sharedClipMetalMat = createToonMaterial(0xe4e4e7);
  }

  private computeSlotPosition(indexFromRight: number): THREE.Vector3 {
    const x = RIGHTMOST_X - indexFromRight * SLOT_SPACING;
    const normX = x / 1.6;
    const sag = (1 - normX * normX) * 0.065;
    return new THREE.Vector3(x, STUDIO_ANCHORS.GALLERY_Y - sag, STUDIO_ANCHORS.GALLERY_Z + 0.025);
  }

  private disposeFrame(entry: HangingFrameEntry): void {
    this.root.remove(entry.group);
    entry.artworkTexture.dispose();
    entry.artworkMaterial.dispose();
    entry.frameMaterial.dispose();
  }

  public addCompletedPortrait(
    snapshotCanvas: HTMLCanvasElement,
    isRoyalFrame: boolean,
    launchFromWorld: THREE.Vector3,
    skipFlight = false
  ): void {
    if (this.frames.length >= MAX_FRAMES) {
      const oldest = this.frames.pop();
      if (oldest) {
        this.disposeFrame(oldest);
      }
    }

    const artworkTexture = new THREE.CanvasTexture(snapshotCanvas);
    artworkTexture.colorSpace = THREE.SRGBColorSpace;
    artworkTexture.needsUpdate = true;

    const artworkMaterial = new THREE.MeshBasicMaterial({ map: artworkTexture });
    const frameMaterial = createToonMaterial(isRoyalFrame ? 0xf59e0b : 0x78350f);

    const group = new THREE.Group();
    const backing = new THREE.Mesh(this.sharedBackingGeo, frameMaterial);
    const artPlane = new THREE.Mesh(this.sharedArtGeo, artworkMaterial);
    artPlane.position.z = 0.015;

    // 3D Wooden Clothespin Clip perched on top of the frame
    const clipWood = new THREE.Mesh(this.sharedClipWoodGeo, this.sharedClipWoodMat);
    clipWood.position.set(0, FRAME_HEIGHT / 2 + 0.03, 0.01);
    const clipSpring = new THREE.Mesh(this.sharedClipPinGeo, this.sharedClipMetalMat);
    clipSpring.position.set(0, FRAME_HEIGHT / 2 + 0.03, 0.01);

    group.add(backing, artPlane, clipWood, clipSpring);

    const targetPos = this.computeSlotPosition(0);
    group.position.copy(skipFlight ? targetPos : launchFromWorld);
    this.root.add(group);

    const newEntry: HangingFrameEntry = {
      group,
      artworkTexture,
      artworkMaterial,
      frameMaterial,
      startPos: launchFromWorld.clone(),
      targetPos,
      flightT: skipFlight ? 1 : 0,
      isFlying: !skipFlight,
      swayOffset: Math.random() * Math.PI * 2,
    };

    this.frames.unshift(newEntry);
    for (let i = 1; i < this.frames.length; i++) {
      this.frames[i].targetPos.copy(this.computeSlotPosition(i));
      if (skipFlight) {
        this.frames[i].group.position.copy(this.frames[i].targetPos);
      }
    }
  }

  public clearAll(): void {
    while (this.frames.length > 0) {
      const item = this.frames.pop();
      if (item) this.disposeFrame(item);
    }
  }

  public update(deltaSec: number, elapsedSec: number): void {
    const slideAlpha = 1 - Math.exp(-5.5 * deltaSec);

    for (let i = 0; i < this.frames.length; i++) {
      const entry = this.frames[i];
      if (entry.isFlying) {
        entry.flightT = Math.min(1, entry.flightT + deltaSec * 1.15);
        const t = entry.flightT;
        const ease = 1 - Math.pow(1 - t, 3);
        entry.group.position.lerpVectors(entry.startPos, entry.targetPos, ease);
        entry.group.position.y += Math.sin(t * Math.PI) * 0.55;
        const scale = 1.45 - ease * 0.45;
        entry.group.scale.setScalar(scale);
        entry.group.rotation.z = Math.sin(t * Math.PI) * 0.18;

        if (entry.flightT >= 1) {
          entry.isFlying = false;
          entry.group.scale.setScalar(1);
        }
      } else {
        entry.group.position.lerp(entry.targetPos, slideAlpha);
        entry.group.rotation.z = Math.sin(elapsedSec * 1.4 + entry.swayOffset) * 0.022;
      }
    }
  }

  public dispose(): void {
    this.clearAll();
    this.sharedBackingGeo.dispose();
    this.sharedArtGeo.dispose();
    this.sharedClipWoodGeo.dispose();
    this.sharedClipPinGeo.dispose();
    this.sharedClipWoodMat.dispose();
    this.sharedClipMetalMat.dispose();
    this.wireGeo.dispose();
    this.wireMat.dispose();
  }
}
