import * as THREE from 'three';
import type { AttachmentTargetBone, CharacterExpression } from '@shared/types/prank';

export class ProceduralCharacter3D {
  public readonly rootGroup: THREE.Group = new THREE.Group();

  // Subgroups
  private bodySpringGroup: THREE.Group = new THREE.Group();
  private characterPlane: THREE.Mesh | null = null;
  private faceOverlayGroup: THREE.Group = new THREE.Group();
  private angryMarkMesh: THREE.Mesh | null = null;
  private leftImpactEye: THREE.LineSegments | null = null;
  private rightImpactEye: THREE.LineSegments | null = null;

  // Spring Physics state for body recoil
  private recoilZ = 0;
  private recoilVelocityZ = 0;
  private recoilPitchX = 0;
  private recoilRollZ = 0;

  // Texture loading
  private textureLoaded = false;

  constructor() {
    this.rootGroup.name = 'HighResCharacter3D';
    this.buildCharacterMesh();
    this.buildFaceOverlays();
  }

  /**
   * Builds the central 3D character using the High-Res CGI clean asset
   * mapped onto a dynamic 3D plane with depth & spring physics.
   */
  private buildCharacterMesh(): void {
    this.bodySpringGroup.name = 'BodySpringGroup';

    // Texture loader with sRGB encoding for vibrant colors
    const loader = new THREE.TextureLoader();
    const assetCandidates = [
      '/assets/charater.png',
      '/assets/character-clean.png',
      '/assets/target_clean.jpg',
      '/assets/reference_target.jpg',
    ];

    const tryLoad = (index: number) => {
      if (index >= assetCandidates.length) return;
      loader.load(
        assetCandidates[index],
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          this.textureLoaded = true;

          if (this.characterPlane) {
            const mat = this.characterPlane.material as THREE.MeshBasicMaterial;
            mat.map = texture;
            mat.color.setHex(0xffffff);
            mat.needsUpdate = true;
          }
        },
        undefined,
        () => {
          tryLoad(index + 1);
        }
      );
    };

    tryLoad(0);

    // Plane geometry matching 9:16 vertical ratio (width: 3.6, height: 6.4)
    const geo = new THREE.PlaneGeometry(3.6, 6.4, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: false,
      side: THREE.DoubleSide,
    });

    this.characterPlane = new THREE.Mesh(geo, mat);
    this.characterPlane.position.set(0, 1.45, 0);
    this.bodySpringGroup.add(this.characterPlane);

    this.rootGroup.add(this.bodySpringGroup);
  }

  /**
   * Dynamic 3D face reaction overlays (Cartoon impact squint eyes, angry vein marks)
   */
  private buildFaceOverlays(): void {
    this.faceOverlayGroup.position.set(0, 2.38, 0.05);

    // 1. Angry vein mark (💢)
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ff1744';
      ctx.font = 'bold 96px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💢', 64, 64);
    }
    const veinTex = new THREE.CanvasTexture(canvas);
    const veinMat = new THREE.MeshBasicMaterial({
      map: veinTex,
      transparent: true,
      opacity: 0,
    });
    const veinGeo = new THREE.PlaneGeometry(0.35, 0.35);
    this.angryMarkMesh = new THREE.Mesh(veinGeo, veinMat);
    this.angryMarkMesh.position.set(-0.35, 0.28, 0.06);
    this.faceOverlayGroup.add(this.angryMarkMesh);

    // 2. Impact cartoon squint lines (> <) for eyes
    const eyeMat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 3 });

    // Left eye '>'
    const leftEyeGeo = new THREE.BufferGeometry();
    const lPoints = new Float32Array([
      -0.22, 0.12, 0.06,  -0.12, 0.06, 0.06,
      -0.12, 0.06, 0.06,  -0.22, 0.0, 0.06
    ]);
    leftEyeGeo.setAttribute('position', new THREE.BufferAttribute(lPoints, 3));
    this.leftImpactEye = new THREE.LineSegments(leftEyeGeo, eyeMat);
    this.leftImpactEye.visible = false;

    // Right eye '<'
    const rightEyeGeo = new THREE.BufferGeometry();
    const rPoints = new Float32Array([
      0.22, 0.12, 0.06,   0.12, 0.06, 0.06,
      0.12, 0.06, 0.06,   0.22, 0.0, 0.06
    ]);
    rightEyeGeo.setAttribute('position', new THREE.BufferAttribute(rPoints, 3));
    this.rightImpactEye = new THREE.LineSegments(rightEyeGeo, eyeMat);
    this.rightImpactEye.visible = false;

    this.faceOverlayGroup.add(this.leftImpactEye, this.rightImpactEye);
    this.bodySpringGroup.add(this.faceOverlayGroup);
  }

  /** Apply physical recoil impulse when hit */
  public applyImpact(impulse = 1.0): void {
    // Recoil backward along Z
    this.recoilVelocityZ -= impulse * 0.45;
    // Pitch head/body back
    this.recoilPitchX -= impulse * 0.14;
    // Slight random sideways tilt
    this.recoilRollZ += (Math.random() - 0.5) * impulse * 0.08;
  }

  public triggerBeanieWindBlow(): void {
    // Shake body laterally
    this.recoilRollZ = 0.2;
    this.recoilVelocityZ -= 0.3;
  }

  public setExpression(expr: CharacterExpression): void {
    const isImpact = expr === 'HIT_IMPACT';
    const isAngry = expr === 'FURIOUS' || expr === 'MELTDOWN';

    // Show/hide eye squint lines
    if (this.leftImpactEye && this.rightImpactEye) {
      this.leftImpactEye.visible = isImpact;
      this.rightImpactEye.visible = isImpact;
    }

    // Show angry vein mark
    if (this.angryMarkMesh) {
      const mat = this.angryMarkMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = isAngry ? 1 : 0;
    }
  }

  public update(deltaSec: number): void {
    // Spring physics update for recoil
    const springK = 38;
    const damping = 7.2;

    const springForceZ = -springK * this.recoilZ - damping * this.recoilVelocityZ;
    this.recoilVelocityZ += springForceZ * deltaSec;
    this.recoilZ += this.recoilVelocityZ * deltaSec;

    // Damped return of pitch and roll
    this.recoilPitchX = THREE.MathUtils.lerp(this.recoilPitchX, 0, deltaSec * 8);
    this.recoilRollZ = THREE.MathUtils.lerp(this.recoilRollZ, 0, deltaSec * 8);

    // Apply to group
    this.bodySpringGroup.position.z = this.recoilZ;
    this.bodySpringGroup.rotation.x = this.recoilPitchX;
    this.bodySpringGroup.rotation.z = this.recoilRollZ;

    // Subtle idle breathing motion
    const time = performance.now() * 0.0015;
    this.bodySpringGroup.position.y = Math.sin(time) * 0.012;
  }

  /** Retrieve World Anchor position for 3D Decal Attachment */
  public getAnchorWorldPosition(targetBone: AttachmentTargetBone): THREE.Vector3 {
    const target = new THREE.Vector3();

    switch (targetBone) {
      case 'HEAD':
        target.set((Math.random() - 0.5) * 0.2, 2.5, 0.08);
        break;
      case 'NOSE':
        target.set(0, 2.32, 0.1);
        break;
      case 'CHEST':
        target.set((Math.random() - 0.5) * 0.3, 1.7, 0.08);
        break;
      case 'LEFT_KNEE':
        target.set(-0.55, 0.95, 0.1);
        break;
      case 'RIGHT_KNEE':
        target.set(0.55, 0.95, 0.1);
        break;
    }

    return target;
  }

  public getSpringGroup(): THREE.Group {
    return this.bodySpringGroup;
  }
}
