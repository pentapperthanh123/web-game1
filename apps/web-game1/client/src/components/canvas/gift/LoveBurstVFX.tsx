import React, { useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BACKGROUND_PERF_CONSTANTS } from '../../../constants/game';
import { BOSS_ANCHOR_ELEMENT_ID } from '../../../constants/bossSpriteAnchors';
import { resolveBossAnchorWorld } from '../bossSkill/bossSkill3DShared';
import { COLOR_ONLY_ADDITIVE_PROPS } from '../vfxBlending';
import { clamp01, easeOutCubic } from './giftVfxShared';
import {
  LOVE_AURA_SHADER,
  LOVE_BURST_LAYOUT,
  LOVE_BURST_TIMING,
  LOVE_FLOOR_RING_SHADER,
  LOVE_HEART_SHADER,
  LOVE_SPARKLE_SHADER,
} from './loveBurstConfig';

export interface LoveBurstVfxHandle {
  trigger: () => void;
}

interface OrbitParticleSlot {
  baseAngle: number;
  angle: number;
  radius: number;
  baseScale: number;
  orbitSpeed: number;
  riseSpeed: number;
  initialProgress: number;
  lifeProgress: number;
  tintMix: number;
  phase: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const GOLDEN_HASH_A = 0.61803398875;
const GOLDEN_HASH_B = 0.38196601125;
const FLAT_ON_FLOOR: readonly [number, number, number] = [-Math.PI / 2, 0, 0];

const dummyObj = new THREE.Object3D();

const hashRatio = (index: number, factor: number, offset = 0): number =>
  (index * factor + offset) % 1;

const lerp = (start: number, end: number, t: number): number => start + (end - start) * t;

const buildHeartSlots = (): OrbitParticleSlot[] =>
  Array.from({ length: LOVE_BURST_LAYOUT.HEART_COUNT }, (_, i) => {
    const isHero = i < LOVE_BURST_LAYOUT.HEART_HERO_COUNT;
    const radiusRatio = hashRatio(i, GOLDEN_HASH_A, 0.13);
    const scaleRatio = hashRatio(i, GOLDEN_HASH_B, 0.29);
    const speedRatio = hashRatio(i, 0.73, 0.19);
    const riseRatio = hashRatio(i, 0.41, 0.07);
    const initialProgress = i / LOVE_BURST_LAYOUT.HEART_COUNT;
    const baseAngle = i * GOLDEN_ANGLE;

    const baseScale = isHero
      ? LOVE_BURST_LAYOUT.HEART_HERO_SCALE_MIN + scaleRatio * LOVE_BURST_LAYOUT.HEART_HERO_SCALE_SPREAD
      : LOVE_BURST_LAYOUT.HEART_MINI_SCALE_MIN + scaleRatio * LOVE_BURST_LAYOUT.HEART_MINI_SCALE_SPREAD;

    return {
      baseAngle,
      angle: baseAngle,
      radius: LOVE_BURST_LAYOUT.HEART_RADIUS_MIN + radiusRatio * LOVE_BURST_LAYOUT.HEART_RADIUS_SPREAD,
      baseScale,
      orbitSpeed:
        LOVE_BURST_LAYOUT.HEART_ORBIT_SPEED_MIN + speedRatio * LOVE_BURST_LAYOUT.HEART_ORBIT_SPEED_SPREAD,
      riseSpeed:
        LOVE_BURST_LAYOUT.HEART_RISE_SPEED_MIN + riseRatio * LOVE_BURST_LAYOUT.HEART_RISE_SPEED_SPREAD,
      initialProgress,
      lifeProgress: initialProgress,
      tintMix: hashRatio(i, 0.53, 0.11),
      phase: i * 1.37,
    };
  });

const buildSparkleSlots = (): OrbitParticleSlot[] =>
  Array.from({ length: LOVE_BURST_LAYOUT.SPARKLE_COUNT }, (_, i) => {
    const radiusRatio = hashRatio(i, GOLDEN_HASH_A, 0.37);
    const scaleRatio = hashRatio(i, GOLDEN_HASH_B, 0.17);
    const speedRatio = hashRatio(i, 0.67, 0.31);
    const riseRatio = hashRatio(i, 0.47, 0.23);
    const initialProgress = i / LOVE_BURST_LAYOUT.SPARKLE_COUNT;
    const baseAngle = i * GOLDEN_ANGLE + 0.5;

    return {
      baseAngle,
      angle: baseAngle,
      radius:
        LOVE_BURST_LAYOUT.SPARKLE_RADIUS_MIN + radiusRatio * LOVE_BURST_LAYOUT.SPARKLE_RADIUS_SPREAD,
      baseScale:
        LOVE_BURST_LAYOUT.SPARKLE_SCALE_MIN + scaleRatio * LOVE_BURST_LAYOUT.SPARKLE_SCALE_SPREAD,
      orbitSpeed:
        LOVE_BURST_LAYOUT.SPARKLE_ORBIT_SPEED_MIN +
        speedRatio * LOVE_BURST_LAYOUT.SPARKLE_ORBIT_SPEED_SPREAD,
      riseSpeed:
        LOVE_BURST_LAYOUT.SPARKLE_RISE_SPEED_MIN +
        riseRatio * LOVE_BURST_LAYOUT.SPARKLE_RISE_SPEED_SPREAD,
      initialProgress,
      lifeProgress: initialProgress,
      tintMix: hashRatio(i, 0.71, 0.09),
      phase: i * 1.91,
    };
  });

const resetSlots = (slots: OrbitParticleSlot[]): void => {
  for (let i = 0; i < slots.length; i++) {
    slots[i].angle = slots[i].baseAngle;
    slots[i].lifeProgress = slots[i].initialProgress;
  }
};

const stepHeartInstances = (
  mesh: THREE.InstancedMesh,
  attr: THREE.InstancedBufferAttribute,
  slots: OrbitParticleSlot[],
  cameraQuat: THREE.Quaternion,
  time: number,
  safeDelta: number,
  envelope: number
): void => {
  const dataArray = attr.array as Float32Array;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    slot.lifeProgress = (slot.lifeProgress + safeDelta * slot.riseSpeed) % 1;
    slot.angle += safeDelta * slot.orbitSpeed;

    const p = slot.lifeProgress;
    const y = lerp(LOVE_BURST_LAYOUT.HEART_Y_MIN, LOVE_BURST_LAYOUT.HEART_Y_MAX, p);
    const r = slot.radius * (0.85 + 0.3 * p);
    const enter = clamp01(p / 0.18);
    const exit = clamp01((1 - p) / 0.28);
    const lifeAlpha = enter * exit;

    dummyObj.position.set(Math.cos(slot.angle) * r, y, Math.sin(slot.angle) * r);
    dummyObj.quaternion.copy(cameraQuat);
    dummyObj.rotateZ(
      Math.sin(time * LOVE_BURST_LAYOUT.HEART_SWAY_FREQ + slot.phase) *
        LOVE_BURST_LAYOUT.HEART_SWAY_AMPLITUDE
    );
    const scale = slot.baseScale * (0.45 + 0.55 * enter) * (0.7 + 0.3 * exit);
    dummyObj.scale.setScalar(scale);
    dummyObj.updateMatrix();
    mesh.setMatrixAt(i, dummyObj.matrix);

    const offset = i * 3;
    dataArray[offset] = lifeAlpha * envelope;
    dataArray[offset + 1] = slot.tintMix;
    dataArray[offset + 2] = slot.phase;
  }
  mesh.instanceMatrix.needsUpdate = true;
  attr.needsUpdate = true;
};

const stepSparkleInstances = (
  mesh: THREE.InstancedMesh,
  attr: THREE.InstancedBufferAttribute,
  slots: OrbitParticleSlot[],
  cameraQuat: THREE.Quaternion,
  safeDelta: number,
  envelope: number
): void => {
  const dataArray = attr.array as Float32Array;
  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    slot.lifeProgress = (slot.lifeProgress + safeDelta * slot.riseSpeed) % 1;
    slot.angle += safeDelta * slot.orbitSpeed;

    const p = slot.lifeProgress;
    const y = lerp(LOVE_BURST_LAYOUT.SPARKLE_Y_MIN, LOVE_BURST_LAYOUT.SPARKLE_Y_MAX, p);
    const r = slot.radius * (0.88 + 0.24 * p);
    const enter = clamp01(p / 0.15);
    const exit = clamp01((1 - p) / 0.25);
    const lifeAlpha = enter * exit;

    dummyObj.position.set(Math.cos(slot.angle) * r, y, Math.sin(slot.angle) * r);
    dummyObj.quaternion.copy(cameraQuat);
    const scale = slot.baseScale * (0.5 + 0.5 * enter) * (0.6 + 0.4 * exit);
    dummyObj.scale.setScalar(scale);
    dummyObj.updateMatrix();
    mesh.setMatrixAt(i, dummyObj.matrix);

    const offset = i * 3;
    dataArray[offset] = lifeAlpha * envelope;
    dataArray[offset + 1] = slot.tintMix;
    dataArray[offset + 2] = slot.phase;
  }
  mesh.instanceMatrix.needsUpdate = true;
  attr.needsUpdate = true;
};

/**
 * Rose-Gold Love Burst 3D reaction: swirling Fresnel-softened ribbon aura, ground magic circle,
 * billboarded crystal ruby-rose hearts, and twinkling starlight sparkles.
 */
export const LoveBurstVFX = React.memo(
  React.forwardRef<LoveBurstVfxHandle>((_, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    const floorRingRef = useRef<THREE.Mesh>(null);
    const auraRef = useRef<THREE.Mesh>(null);
    const heartsMeshRef = useRef<THREE.InstancedMesh>(null);
    const sparklesMeshRef = useRef<THREE.InstancedMesh>(null);

    const animRef = useRef({ active: false, timer: 0 });
    const heartSlotsRef = useRef<OrbitParticleSlot[]>(buildHeartSlots());
    const sparkleSlotsRef = useRef<OrbitParticleSlot[]>(buildSparkleSlots());

    const resources = useMemo(() => {
      const auraGeo = new THREE.CylinderGeometry(
        LOVE_BURST_LAYOUT.AURA_TOP_RADIUS,
        LOVE_BURST_LAYOUT.AURA_BOTTOM_RADIUS,
        LOVE_BURST_LAYOUT.AURA_HEIGHT,
        LOVE_BURST_LAYOUT.AURA_RADIAL_SEGMENTS,
        1,
        true
      );
      const floorGeo = new THREE.PlaneGeometry(
        LOVE_BURST_LAYOUT.FLOOR_RING_SIZE,
        LOVE_BURST_LAYOUT.FLOOR_RING_SIZE
      );
      const heartGeo = new THREE.PlaneGeometry(
        LOVE_BURST_LAYOUT.HEART_PLANE_SIZE,
        LOVE_BURST_LAYOUT.HEART_PLANE_SIZE
      );
      const sparkleGeo = new THREE.PlaneGeometry(
        LOVE_BURST_LAYOUT.SPARKLE_PLANE_SIZE,
        LOVE_BURST_LAYOUT.SPARKLE_PLANE_SIZE
      );

      const heartDataAttr = new THREE.InstancedBufferAttribute(
        new Float32Array(LOVE_BURST_LAYOUT.HEART_COUNT * 3),
        3
      );
      heartDataAttr.setUsage(THREE.DynamicDrawUsage);
      heartGeo.setAttribute('aHeartData', heartDataAttr);

      const sparkleDataAttr = new THREE.InstancedBufferAttribute(
        new Float32Array(LOVE_BURST_LAYOUT.SPARKLE_COUNT * 3),
        3
      );
      sparkleDataAttr.setUsage(THREE.DynamicDrawUsage);
      sparkleGeo.setAttribute('aSparkleData', sparkleDataAttr);

      const sharedUniforms = {
        uTime: { value: 0 },
        uEnvelope: { value: 0 },
      };

      const auraMat = new THREE.ShaderMaterial({
        vertexShader: LOVE_AURA_SHADER.vertexShader,
        fragmentShader: LOVE_AURA_SHADER.fragmentShader,
        uniforms: sharedUniforms,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.FrontSide,
        ...COLOR_ONLY_ADDITIVE_PROPS,
      });

      const floorMat = new THREE.ShaderMaterial({
        vertexShader: LOVE_FLOOR_RING_SHADER.vertexShader,
        fragmentShader: LOVE_FLOOR_RING_SHADER.fragmentShader,
        uniforms: sharedUniforms,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.FrontSide,
        ...COLOR_ONLY_ADDITIVE_PROPS,
      });

      const heartMat = new THREE.ShaderMaterial({
        vertexShader: LOVE_HEART_SHADER.vertexShader,
        fragmentShader: LOVE_HEART_SHADER.fragmentShader,
        uniforms: sharedUniforms,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.NormalBlending,
        side: THREE.FrontSide,
      });

      const sparkleMat = new THREE.ShaderMaterial({
        vertexShader: LOVE_SPARKLE_SHADER.vertexShader,
        fragmentShader: LOVE_SPARKLE_SHADER.fragmentShader,
        uniforms: sharedUniforms,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        side: THREE.FrontSide,
        ...COLOR_ONLY_ADDITIVE_PROPS,
      });

      return {
        auraGeo,
        floorGeo,
        heartGeo,
        sparkleGeo,
        heartDataAttr,
        sparkleDataAttr,
        sharedUniforms,
        auraMat,
        floorMat,
        heartMat,
        sparkleMat,
      };
    }, []);

    useEffect(() => {
      return () => {
        resources.auraGeo.dispose();
        resources.floorGeo.dispose();
        resources.heartGeo.dispose();
        resources.sparkleGeo.dispose();
        resources.auraMat.dispose();
        resources.floorMat.dispose();
        resources.heartMat.dispose();
        resources.sparkleMat.dispose();
      };
    }, [resources]);

    useImperativeHandle(
      ref,
      () => ({
        trigger: () => {
          animRef.current.active = true;
          animRef.current.timer = 0;
          resetSlots(heartSlotsRef.current);
          resetSlots(sparkleSlotsRef.current);

          if (groupRef.current) {
            const anchor = resolveBossAnchorWorld(
              BOSS_ANCHOR_ELEMENT_ID.CORE,
              LOVE_BURST_LAYOUT.BOSS_CORE_FALLBACK
            );
            groupRef.current.position.set(anchor[0], 0, anchor[2]);
            groupRef.current.visible = true;
          }
        },
      }),
      []
    );

    useFrame((state, delta) => {
      const anim = animRef.current;
      if (!anim.active) return;

      const safeDelta = Math.min(BACKGROUND_PERF_CONSTANTS.MAX_FRAME_DELTA_S, delta);
      anim.timer += safeDelta;

      if (anim.timer >= LOVE_BURST_TIMING.DURATION_S) {
        anim.active = false;
        resources.sharedUniforms.uEnvelope.value = 0;
        if (groupRef.current) {
          groupRef.current.visible = false;
        }
        return;
      }

      const time = state.clock.getElapsedTime();
      const t = anim.timer / LOVE_BURST_TIMING.DURATION_S;
      const fadeIn = clamp01(t / LOVE_BURST_TIMING.ENVELOPE_FADE_IN_END);
      const fadeOut = clamp01((1 - t) / (1 - LOVE_BURST_TIMING.ENVELOPE_FADE_OUT_START));
      const envelope = easeOutCubic(fadeIn) * fadeOut;

      resources.sharedUniforms.uTime.value = time;
      resources.sharedUniforms.uEnvelope.value = envelope;

      if (floorRingRef.current) {
        floorRingRef.current.scale.setScalar(0.6 + 0.4 * easeOutCubic(fadeIn));
      }
      if (auraRef.current) {
        const auraWidth = 0.8 + 0.2 * easeOutCubic(fadeIn);
        auraRef.current.scale.set(auraWidth, 1, auraWidth);
      }

      if (heartsMeshRef.current) {
        stepHeartInstances(
          heartsMeshRef.current,
          resources.heartDataAttr,
          heartSlotsRef.current,
          state.camera.quaternion,
          time,
          safeDelta,
          envelope
        );
      }

      if (sparklesMeshRef.current) {
        stepSparkleInstances(
          sparklesMeshRef.current,
          resources.sparkleDataAttr,
          sparkleSlotsRef.current,
          state.camera.quaternion,
          safeDelta,
          envelope
        );
      }
    });

    return (
      <group ref={groupRef} visible={false}>
        <mesh
          ref={floorRingRef}
          position={[0, LOVE_BURST_LAYOUT.FLOOR_Y, 0]}
          rotation={FLAT_ON_FLOOR}
          geometry={resources.floorGeo}
          material={resources.floorMat}
        />
        <mesh
          ref={auraRef}
          position={[0, LOVE_BURST_LAYOUT.AURA_CENTER_Y, 0]}
          geometry={resources.auraGeo}
          material={resources.auraMat}
        />
        <instancedMesh
          ref={heartsMeshRef}
          args={[resources.heartGeo, resources.heartMat, LOVE_BURST_LAYOUT.HEART_COUNT]}
          frustumCulled={false}
        />
        <instancedMesh
          ref={sparklesMeshRef}
          args={[resources.sparkleGeo, resources.sparkleMat, LOVE_BURST_LAYOUT.SPARKLE_COUNT]}
          frustumCulled={false}
        />
      </group>
    );
  })
);

LoveBurstVFX.displayName = 'LoveBurstVFX';
