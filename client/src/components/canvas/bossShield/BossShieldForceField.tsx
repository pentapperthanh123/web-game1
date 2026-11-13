import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../../store/gameStore';
import { BOSS_SHIELD_FIELD } from './bossShieldConstants';
import { createForceFieldMaterial } from './forceFieldShader';
import {
  computeShieldBreathScale,
  computeShieldIntroScale,
  computeShieldOpacity,
  computeShieldStrength,
  createRippleTracker,
  ShieldRippleState,
  updateShieldRipple,
} from './shieldAnimation';
import { getSoftGlowTexture, getSoftRingTexture } from '../bossSkill/bossSkill3DShared';
import { SHIELD_FALLBACK_POSITION, useBossCoreAnchorFollow } from './useBossCoreAnchorFollow';

const FIELD_SPHERE_GEO = new THREE.SphereGeometry(
  BOSS_SHIELD_FIELD.RADIUS,
  BOSS_SHIELD_FIELD.SPHERE_WIDTH_SEGMENTS,
  BOSS_SHIELD_FIELD.SPHERE_HEIGHT_SEGMENTS,
);
const GROUND_QUAD_GEO = new THREE.PlaneGeometry(1, 1);
const FLAT_ON_GROUND_X = -Math.PI / 2;

/**
 * Premium energy-shield sphere: fresnel rim, faint hex lattice, strength-based flicker and hit ripples.
 * Positioned in world space on the boss sprite's on-screen core (render it outside any offset group).
 */
export const BossShieldForceField = () => {
  const anchorGroupRef = useRef<THREE.Group>(null);
  const fieldRef = useRef<THREE.Mesh>(null);
  const groundRingRef = useRef<THREE.Mesh>(null);
  const groundRingMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const groundGlowMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const rippleTrackerRef = useRef(createRippleTracker());
  const rippleStateRef = useRef<ShieldRippleState>({ progress: 0, strength: 0 });

  const fieldBundle = useMemo(
    () => createForceFieldMaterial(BOSS_SHIELD_FIELD.BASE_COLOR, BOSS_SHIELD_FIELD.RIM_COLOR),
    [],
  );
  const ringTexture = useMemo(() => getSoftRingTexture(), []);
  const glowTexture = useMemo(() => getSoftGlowTexture(), []);

  useEffect(() => () => fieldBundle.material.dispose(), [fieldBundle]);
  useBossCoreAnchorFollow(anchorGroupRef);

  useFrame(({ clock }) => {
    const { bossShield, bossHitTimestamp } = useGameStore.getState();
    const field = fieldRef.current;
    if (!bossShield || !field) return;

    const time = clock.getElapsedTime();
    const now = Date.now();
    const strength = computeShieldStrength(bossShield.hp, bossShield.maxHp);
    const opacity = computeShieldOpacity(strength, time);
    const ripple = rippleStateRef.current;
    updateShieldRipple(rippleTrackerRef.current, bossHitTimestamp, now, ripple);

    const { uniforms } = fieldBundle;
    uniforms.uTime.value = time;
    uniforms.uOpacity.value = opacity;
    uniforms.uStrength.value = strength;
    uniforms.uHitProgress.value = ripple.progress;
    uniforms.uHitStrength.value = ripple.strength;

    const introScale = computeShieldIntroScale(bossShield.createdAt, now);
    const hitPop = ripple.strength * BOSS_SHIELD_FIELD.HIT_POP_SCALE;
    const breathScale = computeShieldBreathScale(time);
    field.scale.setScalar(introScale * (breathScale + hitPop));
    field.rotation.y = time * BOSS_SHIELD_FIELD.ROTATION_SPEED;
    field.rotation.x = Math.sin(time * BOSS_SHIELD_FIELD.TILT_SPEED) * BOSS_SHIELD_FIELD.TILT_AMPLITUDE;

    const groundBoost = 1 + ripple.strength * BOSS_SHIELD_FIELD.GROUND_RING_HIT_BOOST;
    const ringBreath = 1 + (breathScale - 1) * BOSS_SHIELD_FIELD.GROUND_RING_BREATH_GAIN;
    groundRingRef.current?.scale.setScalar(BOSS_SHIELD_FIELD.GROUND_RING_DIAMETER * introScale * ringBreath);
    if (groundRingMaterialRef.current) {
      groundRingMaterialRef.current.opacity = BOSS_SHIELD_FIELD.GROUND_RING_OPACITY * opacity * groundBoost;
    }
    if (groundGlowMaterialRef.current) {
      groundGlowMaterialRef.current.opacity = BOSS_SHIELD_FIELD.GROUND_GLOW_OPACITY * opacity * groundBoost;
    }
  });

  return (
    <group ref={anchorGroupRef} position={SHIELD_FALLBACK_POSITION}>
      <mesh ref={fieldRef} geometry={FIELD_SPHERE_GEO} material={fieldBundle.material} renderOrder={1} />
      <group position={[0, BOSS_SHIELD_FIELD.GROUND_RING_OFFSET_Y, 0]} rotation={[FLAT_ON_GROUND_X, 0, 0]}>
        <mesh geometry={GROUND_QUAD_GEO} scale={BOSS_SHIELD_FIELD.GROUND_GLOW_DIAMETER}>
          <meshBasicMaterial
            ref={groundGlowMaterialRef}
            map={glowTexture}
            color={BOSS_SHIELD_FIELD.BASE_COLOR}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh ref={groundRingRef} geometry={GROUND_QUAD_GEO}>
          <meshBasicMaterial
            ref={groundRingMaterialRef}
            map={ringTexture}
            color={BOSS_SHIELD_FIELD.RIM_COLOR}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
};
