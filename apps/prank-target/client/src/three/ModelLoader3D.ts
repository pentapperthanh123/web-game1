import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { AttachmentTargetBone, CharacterExpression } from '@shared/types/prank';
import { ProceduralCharacter3D } from './ProceduralCharacter3D';

export class ModelLoader3D {
  public readonly rootGroup: THREE.Group = new THREE.Group();
  private proceduralCharacter: ProceduralCharacter3D;
  private customModelRoot: THREE.Group | null = null;
  private morphMeshes: THREE.Mesh[] = [];
  private isUsingCustomGlb = false;

  constructor() {
    this.rootGroup.name = 'ModelLoader3D_Root';
    this.proceduralCharacter = new ProceduralCharacter3D();
    this.rootGroup.add(this.proceduralCharacter.rootGroup);

    this.tryLoadCustomGlb('/models/character.glb');
  }

  private tryLoadCustomGlb(path: string): void {
    const loader = new GLTFLoader();

    loader.load(
      path,
      (gltf) => {
        console.log('[ModelLoader3D] Custom character.glb successfully loaded!');
        this.customModelRoot = gltf.scene;

        // Collect all meshes having morph targets
        this.morphMeshes = [];
        this.customModelRoot.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
              this.morphMeshes.push(mesh);
            }
          }
        });

        // Hide procedural and show custom GLB
        this.proceduralCharacter.rootGroup.visible = false;
        this.rootGroup.add(this.customModelRoot);
        this.isUsingCustomGlb = true;
      },
      undefined,
      () => {
        // Expected when user has not yet dropped character.glb into /public/models/
        this.isUsingCustomGlb = false;
        this.proceduralCharacter.rootGroup.visible = true;
      }
    );
  }

  public setExpression(expr: CharacterExpression): void {
    this.proceduralCharacter.setExpression(expr);

    if (this.isUsingCustomGlb && this.morphMeshes.length > 0) {
      for (const mesh of this.morphMeshes) {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) continue;
        const dict = mesh.morphTargetDictionary;
        const inf = mesh.morphTargetInfluences;

        // Reset
        Object.values(dict).forEach((idx) => {
          inf[idx] = 0;
        });

        // Apply corresponding morph targets if available in Blender model
        if (expr === 'HIT_IMPACT' && dict['squint'] !== undefined) {
          inf[dict['squint']] = 1.0;
        }
        if ((expr === 'FURIOUS' || expr === 'MELTDOWN') && dict['angry'] !== undefined) {
          inf[dict['angry']] = 1.0;
        }
        if (expr === 'MELTDOWN' && dict['shock'] !== undefined) {
          inf[dict['shock']] = 0.8;
        }
      }
    }
  }

  public applyImpact(impulse = 1.0): void {
    this.proceduralCharacter.applyImpact(impulse);
  }

  public triggerBeanieWindBlow(): void {
    this.proceduralCharacter.triggerBeanieWindBlow();
  }

  public update(deltaSec: number): void {
    this.proceduralCharacter.update(deltaSec);
  }

  public getAnchorWorldPosition(bone: AttachmentTargetBone): THREE.Vector3 {
    return this.proceduralCharacter.getAnchorWorldPosition(bone);
  }
}
