import * as THREE from 'three';
import type { ArtistMood, TurnPhase } from '../../../../shared/types/studio';
import { clampValue } from '../../utils/hashString';
import {
  findClipByPattern,
  loadArtistAsset,
  STANDARD_HEIGHTS,
  type LoadedArtistAsset,
} from './assetLoader3D';
import { STUDIO_ANCHORS } from './studioEnvironment';
import { createToonMaterial } from './toonMaterials';

const RED_BERET_HEX = 0xe11d48;
const ROYAL_BERET_HEX = 0xf59e0b;

/**
 * Female 3D Artist Controller powered by real 3D assets (`/assets/artist.vrm` or `/assets/artist.glb`,
 * normalized to 1.60m height) with 3D paintbrush bound directly to `rightHand` bone.
 * If neither file is present in `public/assets/`, renders a clean minimalist studio mannequin silhouette
 * (zero clipping/disjointed primitives) and notifies the Dev Asset Status banner.
 */
export class ArtistController {
  public readonly root = new THREE.Group();
  private readonly silhouetteGroup = new THREE.Group();
  private readonly silhouetteHead = new THREE.Group();
  private readonly silhouetteRightArm = new THREE.Group();
  private readonly silhouetteHandSocket = new THREE.Group();
  private readonly brushGroup = new THREE.Group();
  private readonly paletteGroup = new THREE.Group();
  private readonly beretMaterial: THREE.MeshToonMaterial;
  private readonly royalStarMesh: THREE.Mesh;

  private loadedAsset: LoadedArtistAsset | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private activeAction: THREE.AnimationAction | null = null;
  private activeClipKind: 'PAINT' | 'IDLE' | 'WAVE' | null = null;

  private blinkTimer = 0;
  private nextBlinkSec = 3.4;
  private isBlinking = false;
  private readonly currentPos = new THREE.Vector3().copy(STUDIO_ANCHORS.ARTIST_PAINT_POS);
  private lastBrushUV = { u: 0.5, v: 0.5 };

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];

  constructor(
    private readonly onAssetStatus: (info: {
      mode: 'VRM' | 'PROCEDURAL_CHIBI';
      missingAsset: string | null;
    }) => void
  ) {
    this.root.position.copy(this.currentPos);
    this.root.rotation.y = -0.48;

    this.beretMaterial = createToonMaterial(RED_BERET_HEX);
    this.materials.push(this.beretMaterial);

    const starGeo = new THREE.OctahedronGeometry(0.055, 0);
    const starMat = createToonMaterial(0xfef08a);
    this.geometries.push(starGeo);
    this.materials.push(starMat);
    this.royalStarMesh = new THREE.Mesh(starGeo, starMat);
    this.royalStarMesh.position.set(0.04, 0.34, 0.14);
    this.royalStarMesh.visible = false;

    this.buildBrushAndPalette();
    this.buildCleanMannequinSilhouette();
    this.root.add(this.silhouetteGroup);

    void this.initRealAsset();
  }

  private trackMesh(geo: THREE.BufferGeometry, mat: THREE.Material): THREE.Mesh {
    this.geometries.push(geo);
    if (!this.materials.includes(mat)) {
      this.materials.push(mat);
    }
    return new THREE.Mesh(geo, mat);
  }

  /**
   * Builds the 3D paintbrush oriented strictly along +Z of the hand socket so it always points
   * forward onto the easel canvas surface (never backward toward the artist's face).
   */
  private buildBrushAndPalette(): void {
    const woodMat = createToonMaterial(0x92400e);
    const ferruleMat = createToonMaterial(0xe4e4e7);
    const tipMat = createToonMaterial(0xf43f5e);

    const handle = this.trackMesh(new THREE.CylinderGeometry(0.01, 0.007, 0.24, 8), woodMat);
    handle.rotation.x = Math.PI / 2;
    handle.position.z = 0.11;

    const ferrule = this.trackMesh(new THREE.CylinderGeometry(0.012, 0.011, 0.032, 8), ferruleMat);
    ferrule.rotation.x = Math.PI / 2;
    ferrule.position.z = 0.24;

    const tip = this.trackMesh(new THREE.ConeGeometry(0.014, 0.044, 8), tipMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.z = 0.278;

    this.brushGroup.add(handle, ferrule, tip);

    const board = this.trackMesh(
      new THREE.CylinderGeometry(0.135, 0.135, 0.016, 16),
      createToonMaterial(0xd6a77a)
    );
    board.scale.set(1.2, 1, 0.86);
    this.paletteGroup.add(board);

    const paintColors = [0xf43f5e, 0xfbbf24, 0x38bdf8, 0x34d399];
    paintColors.forEach((hex, idx) => {
      const dot = this.trackMesh(new THREE.SphereGeometry(0.02, 8, 6), createToonMaterial(hex));
      const angle = (idx / paintColors.length) * Math.PI * 1.4 - 0.5;
      dot.position.set(Math.cos(angle) * 0.085, 0.014, Math.sin(angle) * 0.065);
      dot.scale.y = 0.5;
      this.paletteGroup.add(dot);
    });
  }

  /**
   * Minimalist, unified porcelain/wood-toned artist mannequin silhouette (1.60m tall)
   * displayed only when `/assets/artist.vrm` and `/assets/artist.glb` are absent.
   */
  private buildCleanMannequinSilhouette(): void {
    const silhouetteMat = new THREE.MeshStandardMaterial({
      color: 0xf5ebe0,
      roughness: 0.55,
      metalness: 0.05,
    });
    const apronAccentMat = new THREE.MeshStandardMaterial({
      color: 0xe07a5f,
      roughness: 0.65,
      metalness: 0.02,
    });
    this.materials.push(silhouetteMat, apronAccentMat);

    // Smooth continuous lathe profile from base pedestal/feet up to shoulders (0..1.18m)
    const profilePoints: THREE.Vector2[] = [
      new THREE.Vector2(0.01, 0.0),
      new THREE.Vector2(0.14, 0.0),
      new THREE.Vector2(0.11, 0.08),
      new THREE.Vector2(0.09, 0.42),
      new THREE.Vector2(0.22, 0.48),
      new THREE.Vector2(0.16, 0.82),
      new THREE.Vector2(0.18, 1.06),
      new THREE.Vector2(0.07, 1.16),
      new THREE.Vector2(0.06, 1.24),
    ];
    const bodyLathe = this.trackMesh(new THREE.LatheGeometry(profilePoints, 20), silhouetteMat);

    // Minimalist studio apron wrap (concentric outer shell, zero clipping)
    const apronShell = this.trackMesh(
      new THREE.CylinderGeometry(0.172, 0.232, 0.54, 18, 1, false, -Math.PI * 0.35, Math.PI * 0.7),
      apronAccentMat
    );
    apronShell.position.y = 0.78;

    // Clean mannequin head + minimalist artist beret (top reaches 1.60m)
    this.silhouetteHead.position.set(0, 1.24, 0);
    const headSphere = this.trackMesh(new THREE.SphereGeometry(0.165, 20, 16), silhouetteMat);
    headSphere.scale.set(0.92, 1.08, 0.95);
    headSphere.position.y = 0.16;

    const beretGeo = new THREE.SphereGeometry(0.19, 18, 12);
    beretGeo.scale(1.05, 0.38, 1.05);
    const beretMesh = this.trackMesh(beretGeo, this.beretMaterial);
    beretMesh.position.set(0.02, 0.31, -0.01);
    beretMesh.rotation.z = -0.14;
    this.silhouetteHead.add(headSphere, beretMesh, this.royalStarMesh);

    // Left arm silhouette holding palette at waist
    const leftArm = this.trackMesh(
      new THREE.CapsuleGeometry(0.04, 0.32, 6, 10),
      silhouetteMat
    );
    leftArm.position.set(-0.21, 0.92, 0.08);
    leftArm.rotation.set(-0.55, 0, 0.18);
    this.paletteGroup.position.set(-0.24, 0.78, 0.24);
    this.paletteGroup.rotation.set(0.18, 0.2, -0.1);

    // Right arm + rightHand socket holding 3D paintbrush forward toward easel canvas
    this.silhouetteRightArm.position.set(0.19, 1.04, 0.04);
    const rightArmMesh = this.trackMesh(
      new THREE.CapsuleGeometry(0.04, 0.34, 6, 10),
      silhouetteMat
    );
    rightArmMesh.rotation.x = Math.PI / 2;
    rightArmMesh.position.z = 0.18;

    this.silhouetteHandSocket.position.set(0, 0, 0.36);
    this.silhouetteHandSocket.add(this.brushGroup);
    this.silhouetteRightArm.add(rightArmMesh, this.silhouetteHandSocket);

    this.silhouetteGroup.add(
      bodyLathe,
      apronShell,
      this.silhouetteHead,
      leftArm,
      this.paletteGroup,
      this.silhouetteRightArm
    );
  }

  private async initRealAsset(): Promise<void> {
    const asset = await loadArtistAsset();
    if (!asset) {
      this.onAssetStatus({
        mode: 'PROCEDURAL_CHIBI',
        missingAsset: '/assets/artist.vrm (hoặc /assets/artist.glb)',
      });
      return;
    }

    this.loadedAsset = asset;
    this.silhouetteGroup.visible = false;
    this.root.add(asset.scene);

    // Bind 3D paintbrush directly to rightHand bone so it faces forward toward easel
    if (asset.rightHandNode) {
      this.brushGroup.position.set(0, 0, 0);
      this.brushGroup.rotation.set(0, 0, 0);
      asset.rightHandNode.add(this.brushGroup);
    }
    if (asset.leftHandNode) {
      this.paletteGroup.position.set(0, 0, 0);
      this.paletteGroup.rotation.set(0, 0, 0);
      asset.leftHandNode.add(this.paletteGroup);
    }

    if (asset.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(asset.scene);
      this.switchGlbClip('PAINT');
    }

    this.onAssetStatus({
      mode: 'VRM',
      missingAsset: null,
    });
  }

  private switchGlbClip(kind: 'PAINT' | 'IDLE' | 'WAVE'): void {
    if (!this.mixer || !this.loadedAsset || this.activeClipKind === kind) return;
    const clips = this.loadedAsset.animations;
    let targetClip: THREE.AnimationClip | null = null;

    if (kind === 'PAINT') {
      targetClip =
        findClipByPattern(clips, /paint|draw|brush|work|action/i) ??
        findClipByPattern(clips, /idle|stand/i) ??
        clips[0] ??
        null;
    } else if (kind === 'WAVE') {
      targetClip =
        findClipByPattern(clips, /wave|greet|happy|cheer/i) ??
        findClipByPattern(clips, /idle|stand/i) ??
        clips[0] ??
        null;
    } else {
      targetClip = findClipByPattern(clips, /idle|stand|wait/i) ?? clips[0] ?? null;
    }

    if (!targetClip) return;
    this.activeClipKind = kind;
    const nextAction = this.mixer.clipAction(targetClip);
    if (this.activeAction && this.activeAction !== nextAction) {
      this.activeAction.fadeOut(0.25);
    }
    nextAction.reset().fadeIn(0.25).play();
    this.activeAction = nextAction;
  }

  public setBrushUV(u: number, v: number): void {
    this.lastBrushUV.u = clampValue(u, 0, 1);
    this.lastBrushUV.v = clampValue(v, 0, 1);
  }

  public getFootShadowPositions(): Array<{ x: number; z: number; radius: number }> {
    return [
      { x: this.root.position.x - 0.08, z: this.root.position.z + 0.04, radius: 0.19 },
      { x: this.root.position.x + 0.08, z: this.root.position.z - 0.04, radius: 0.19 },
    ];
  }

  public update(params: {
    deltaSec: number;
    elapsedSec: number;
    phase: TurnPhase;
    mood: ArtistMood;
    speedMultiplier: number;
    hasRoyalHat: boolean;
  }): void {
    const { deltaSec, elapsedSec, phase, mood, speedMultiplier, hasRoyalHat } = params;

    const targetBeretHex = hasRoyalHat ? ROYAL_BERET_HEX : RED_BERET_HEX;
    if (this.beretMaterial.color.getHex() !== targetBeretHex) {
      this.beretMaterial.color.setHex(targetBeretHex);
    }
    this.royalStarMesh.visible = hasRoyalHat;
    if (hasRoyalHat) {
      this.royalStarMesh.rotation.y = elapsedSec * 2.4;
    }

    // Automatic eye blink cycle for VRM models
    this.blinkTimer += deltaSec;
    if (!this.isBlinking && this.blinkTimer >= this.nextBlinkSec) {
      this.isBlinking = true;
      this.blinkTimer = 0;
    } else if (this.isBlinking && this.blinkTimer >= 0.14) {
      this.isBlinking = false;
      this.blinkTimer = 0;
      this.nextBlinkSec = 3.0 + Math.random() * 1.4;
    }

    const isRevealOrVip = phase === 'REVEAL' || mood === 'VIP_WAVE';
    const desiredPos =
      phase === 'REVEAL' ? STUDIO_ANCHORS.ARTIST_REVEAL_POS : STUDIO_ANCHORS.ARTIST_PAINT_POS;
    const moveAlpha = 1 - Math.exp(-5 * deltaSec);
    this.currentPos.lerp(desiredPos, moveAlpha);
    this.root.position.copy(this.currentPos);
    this.root.position.y = Math.sin(elapsedSec * 2.4) * 0.008;

    const desiredRotY = isRevealOrVip ? -0.18 : -0.48;
    this.root.rotation.y += (desiredRotY - this.root.rotation.y) * moveAlpha;

    // 1. Update Real VRM / GLB Model if loaded
    if (this.loadedAsset) {
      if (this.mixer) {
        if (phase === 'PAINTING' && mood !== 'VIP_WAVE') {
          this.switchGlbClip('PAINT');
          this.mixer.timeScale = clampValue(speedMultiplier, 1, 2.6);
        } else if (mood === 'VIP_WAVE' || phase === 'REVEAL') {
          this.switchGlbClip('WAVE');
          this.mixer.timeScale = 1;
        } else {
          this.switchGlbClip('IDLE');
          this.mixer.timeScale = 1;
        }
        this.mixer.update(deltaSec);
      }

      if (this.loadedAsset.vrm) {
        const exprMgr = this.loadedAsset.vrm.expressionManager;
        if (exprMgr) {
          exprMgr.setValue('blink', this.isBlinking ? 1 : 0);
          exprMgr.setValue('happy', isRevealOrVip || mood === 'TROLL_SMIRK' ? 0.9 : 0.3);
        }
        this.loadedAsset.vrm.update(deltaSec);
      }
      return;
    }

    // 2. Update Clean Mannequin Silhouette Fallback (arm always points forward toward easel canvas)
    const uOffset = (this.lastBrushUV.u - 0.5) * 0.42;
    const vOffset = (0.5 - this.lastBrushUV.v) * 0.38;
    const strokeOsc =
      phase === 'PAINTING' ? Math.sin(elapsedSec * (8.0 * speedMultiplier)) * 0.06 : 0;

    const targetYaw = clampValue(-0.36 + uOffset, -0.62, -0.12);
    const targetPitch = clampValue(
      -0.18 - vOffset + strokeOsc,
      -0.48,
      0.12
    );

    this.silhouetteRightArm.rotation.y +=
      (targetYaw - this.silhouetteRightArm.rotation.y) * 0.35;
    this.silhouetteRightArm.rotation.x +=
      (targetPitch - this.silhouetteRightArm.rotation.x) * 0.35;
    this.silhouetteHead.rotation.y =
      Math.sin(elapsedSec * 0.9) > 0.65 ? -0.28 : -0.08;
  }

  public getStandardHeight(): number {
    return STANDARD_HEIGHTS.ARTIST_M;
  }

  public dispose(): void {
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }
    for (const geo of this.geometries) geo.dispose();
    for (const mat of this.materials) mat.dispose();
  }
}
