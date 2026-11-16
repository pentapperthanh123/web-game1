import * as THREE from 'three';
import { ADDITIVE_MATERIAL_PROPS, SHARED_QUAD_GEO, getSoftGlowTexture } from './bossSkill3DShared';

/**
 * Instanced particles fade by darkening their colour (instances have no own opacity). Plain additive
 * blending would still add alpha, and the transparent canvas then shows dim particles as dark smudges
 * over the DOM backdrop: add colour only and leave the canvas alpha untouched.
 */
export const COLOR_ONLY_ADDITIVE_PROPS = {
  blending: THREE.CustomBlending,
  blendEquation: THREE.AddEquation,
  blendSrc: THREE.SrcAlphaFactor,
  blendDst: THREE.OneFactor,
  blendSrcAlpha: THREE.ZeroFactor,
  blendDstAlpha: THREE.OneFactor,
} as const;

export interface GlowParticleMesh {
  mesh: THREE.InstancedMesh;
  material: THREE.MeshBasicMaterial;
}

/**
 * Per-effect scratch objects: set `position` and `color`, then `commitGlowParticle`.
 * Reused every frame so particle loops never allocate.
 */
export interface GlowParticleWriter {
  mesh: THREE.InstancedMesh;
  facing: THREE.Quaternion;
  matrix: THREE.Matrix4;
  position: THREE.Vector3;
  size: THREE.Vector3;
  color: THREE.Color;
}

/** One draw call for every particle of an effect: soft camera-facing glows. */
export const createGlowParticleMesh = (particleCount: number): GlowParticleMesh => {
  const material = new THREE.MeshBasicMaterial({
    ...ADDITIVE_MATERIAL_PROPS,
    ...COLOR_ONLY_ADDITIVE_PROPS,
    opacity: 1,
    map: getSoftGlowTexture(),
  });
  const mesh = new THREE.InstancedMesh(SHARED_QUAD_GEO, material, particleCount);
  // Instances move all over the arena; the default bounds would cull them
  mesh.frustumCulled = false;
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const black = new THREE.Color(0, 0, 0);
  for (let index = 0; index < particleCount; index += 1) {
    mesh.setMatrixAt(index, hidden);
    mesh.setColorAt(index, black);
  }
  return { mesh, material };
};

export const createGlowParticleWriter = (mesh: THREE.InstancedMesh): GlowParticleWriter => ({
  mesh,
  facing: new THREE.Quaternion(),
  matrix: new THREE.Matrix4(),
  position: new THREE.Vector3(),
  size: new THREE.Vector3(),
  color: new THREE.Color(),
});

/** Writes particle `index` at `writer.position` with `writer.color`, facing the camera. */
export const commitGlowParticle = (writer: GlowParticleWriter, index: number, size: number): void => {
  writer.size.set(size, size, size);
  writer.matrix.compose(writer.position, writer.facing, writer.size);
  writer.mesh.setMatrixAt(index, writer.matrix);
  writer.mesh.setColorAt(index, writer.color);
};

export const hideGlowParticle = (writer: GlowParticleWriter, index: number): void => {
  writer.position.set(0, 0, 0);
  writer.color.setRGB(0, 0, 0);
  commitGlowParticle(writer, index, 0);
};

/** Call once per frame after writing the particles. */
export const flushGlowParticles = (mesh: THREE.InstancedMesh): void => {
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
};
