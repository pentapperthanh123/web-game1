import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { VRMLoaderPlugin, type VRM } from '@pixiv/three-vrm';

export const ASSET_PATHS = {
  ARTIST_VRM: '/assets/artist.vrm',
  ARTIST_GLB: '/assets/artist.glb',
  CUSTOMER_GLB: '/assets/customer.glb',
  PROPS_GLB: '/assets/props.glb',
} as const;

export const STANDARD_HEIGHTS = {
  ARTIST_M: 1.60,
  CUSTOMER_M: 1.45,
  DEFAULT_SEAT_TOP_Y: 0.58,
  FOOTREST_TOP_Y: 0.22,
} as const;

export interface LoadedArtistAsset {
  kind: 'VRM' | 'GLB';
  scene: THREE.Group;
  vrm: VRM | null;
  animations: THREE.AnimationClip[];
  rightHandNode: THREE.Object3D | null;
  leftHandNode: THREE.Object3D | null;
  headNode: THREE.Object3D | null;
}

export interface LoadedCustomerTemplate {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export interface ClonedCustomerRig {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  clips: {
    sitting: THREE.AnimationClip | null;
    idle: THREE.AnimationClip | null;
    walk: THREE.AnimationClip | null;
  };
  hipsNode: THREE.Object3D | null;
  headNode: THREE.Object3D | null;
  tintedMaterials: THREE.Material[];
}

export async function probeAssetExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    const contentType = res.headers.get('content-type') || '';
    return res.ok && !contentType.includes('text/html');
  } catch {
    return false;
  }
}

/**
 * Uniformly scales a loaded 3D model so its bounding-box height matches `targetHeightM`
 * and shifts its Y origin so its lowest point (feet soles) rests at y = 0.
 */
export function normalizeModelToHeight(model: THREE.Object3D, targetHeightM: number): THREE.Box3 {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.y > 0.001) {
    const scale = targetHeightM / size.y;
    model.scale.multiplyScalar(scale);
    model.updateMatrixWorld(true);
  }

  const normalizedBox = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  normalizedBox.getCenter(center);

  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= normalizedBox.min.y;
  model.updateMatrixWorld(true);

  return new THREE.Box3().setFromObject(model);
}

export function findBoneByPattern(root: THREE.Object3D, pattern: RegExp): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root.traverse((child) => {
    if (found) return;
    if (pattern.test(child.name)) {
      found = child;
    }
  });
  return found;
}

export function findClipByPattern(
  clips: readonly THREE.AnimationClip[],
  pattern: RegExp
): THREE.AnimationClip | null {
  for (const clip of clips) {
    if (pattern.test(clip.name)) {
      return clip;
    }
  }
  return null;
}

/**
 * Attempts to load `/assets/artist.vrm` first, then `/assets/artist.glb`.
 * Normalizes height to 1.60m and locates `rightHand`, `leftHand`, and `head` bones.
 */
export async function loadArtistAsset(): Promise<LoadedArtistAsset | null> {
  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));

  if (await probeAssetExists(ASSET_PATHS.ARTIST_VRM)) {
    try {
      const gltf = await loader.loadAsync(ASSET_PATHS.ARTIST_VRM);
      const vrm = (gltf.userData.vrm as VRM | undefined) ?? null;
      const wrapper = new THREE.Group();
      const targetScene = vrm ? vrm.scene : gltf.scene;
      wrapper.add(targetScene);
      normalizeModelToHeight(targetScene, STANDARD_HEIGHTS.ARTIST_M);

      const rightHandNode =
        vrm?.humanoid?.getNormalizedBoneNode('rightHand') ??
        findBoneByPattern(targetScene, /righthand|hand_r|hand\.r|r_hand/i);
      const leftHandNode =
        vrm?.humanoid?.getNormalizedBoneNode('leftHand') ??
        findBoneByPattern(targetScene, /lefthand|hand_l|hand\.l|l_hand/i);
      const headNode =
        vrm?.humanoid?.getNormalizedBoneNode('head') ??
        findBoneByPattern(targetScene, /head/i);

      return {
        kind: 'VRM',
        scene: wrapper,
        vrm,
        animations: gltf.animations ?? [],
        rightHandNode,
        leftHandNode,
        headNode,
      };
    } catch (err) {
      console.warn('[AssetLoader3D] Failed to parse artist.vrm:', err);
    }
  }

  if (await probeAssetExists(ASSET_PATHS.ARTIST_GLB)) {
    try {
      const gltf: GLTF = await loader.loadAsync(ASSET_PATHS.ARTIST_GLB);
      const wrapper = new THREE.Group();
      wrapper.add(gltf.scene);
      normalizeModelToHeight(gltf.scene, STANDARD_HEIGHTS.ARTIST_M);

      return {
        kind: 'GLB',
        scene: wrapper,
        vrm: null,
        animations: gltf.animations ?? [],
        rightHandNode: findBoneByPattern(gltf.scene, /righthand|hand_r|hand\.r|r_hand/i),
        leftHandNode: findBoneByPattern(gltf.scene, /lefthand|hand_l|hand\.l|l_hand/i),
        headNode: findBoneByPattern(gltf.scene, /head/i),
      };
    } catch (err) {
      console.warn('[AssetLoader3D] Failed to parse artist.glb:', err);
    }
  }

  return null;
}

/**
 * Loads `/assets/customer.glb` template and normalizes its standing height to 1.45m.
 */
export async function loadCustomerTemplate(): Promise<LoadedCustomerTemplate | null> {
  if (!(await probeAssetExists(ASSET_PATHS.CUSTOMER_GLB))) {
    return null;
  }
  try {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(ASSET_PATHS.CUSTOMER_GLB);
    normalizeModelToHeight(gltf.scene, STANDARD_HEIGHTS.CUSTOMER_M);
    return {
      scene: gltf.scene,
      animations: gltf.animations ?? [],
    };
  } catch (err) {
    console.warn('[AssetLoader3D] Failed to load customer.glb:', err);
    return null;
  }
}

/**
 * Clones a customer character via `SkeletonUtils.clone()` and clones ONLY primary shirt/outfit materials
 * so each viewer gets a distinct outfit color by `userId` with minimal VRAM overhead.
 */
export function cloneCustomerInstance(
  template: LoadedCustomerTemplate,
  tintHex: number
): ClonedCustomerRig {
  const clonedScene = SkeletonUtils.clone(template.scene);
  const root = new THREE.Group();
  root.add(clonedScene);

  const tintedMaterials: THREE.Material[] = [];
  clonedScene.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const matName = Array.isArray(mesh.material)
      ? mesh.material[0]?.name || ''
      : mesh.material.name || '';
    const shouldTint =
      /shirt|top|cloth|outfit|coat|dress|body|jacket/i.test(matName) ||
      /shirt|top|cloth|outfit|torso/i.test(mesh.name) ||
      tintedMaterials.length === 0;

    if (shouldTint && !Array.isArray(mesh.material)) {
      const clonedMat = mesh.material.clone() as THREE.MeshStandardMaterial;
      if ('color' in clonedMat && clonedMat.color instanceof THREE.Color) {
        clonedMat.color.setHex(tintHex);
      }
      mesh.material = clonedMat;
      tintedMaterials.push(clonedMat);
    }
  });

  const mixer = new THREE.AnimationMixer(clonedScene);
  const sitting = findClipByPattern(template.animations, /sit|seated|chair|stool/i);
  const idle = findClipByPattern(template.animations, /idle|stand|wait|breath/i);
  const walk = findClipByPattern(template.animations, /walk|run|move|step/i);

  return {
    root,
    mixer,
    clips: { sitting, idle, walk },
    hipsNode: findBoneByPattern(clonedScene, /hips|pelvis|root/i),
    headNode: findBoneByPattern(clonedScene, /head/i),
    tintedMaterials,
  };
}
