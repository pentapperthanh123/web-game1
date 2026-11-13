import { RefObject, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COMBAT_VFX_CONSTANTS } from '../../../constants/game';
import { BOSS_ANCHOR_ELEMENT_ID } from '../../../constants/bossSpriteAnchors';
import { resolveBossAnchorWorld, Vec3Tuple } from '../bossSkill/bossSkill3DShared';
import { BOSS_PRESENCE_OFFSET, BOSS_SHIELD_FIELD } from './bossShieldConstants';

const [BOSS_X, BOSS_Y, BOSS_Z] = COMBAT_VFX_CONSTANTS.BOSS_TARGET;

/** Where the shield sits when Boss2D's core marker is not on screen (the old fixed position). */
export const SHIELD_FALLBACK_POSITION: Vec3Tuple = [
  BOSS_X,
  BOSS_Y + BOSS_PRESENCE_OFFSET.Y + BOSS_SHIELD_FIELD.OFFSET_Y,
  BOSS_Z + BOSS_PRESENCE_OFFSET.Z + BOSS_SHIELD_FIELD.OFFSET_Z,
];

/**
 * Keeps `groupRef` centred on the boss sprite's real on-screen body: re-resolves the DOM core anchor
 * at most every ANCHOR_RESOLVE_INTERVAL_MS and eases toward it every frame (snaps on the first frame).
 */
export const useBossCoreAnchorFollow = (groupRef: RefObject<THREE.Group | null>): void => {
  const anchorRef = useRef<Vec3Tuple>(SHIELD_FALLBACK_POSITION);
  const lastResolvedAtRef = useRef(Number.NEGATIVE_INFINITY);
  const hasSnappedRef = useRef(false);

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const now = performance.now();
    if (now - lastResolvedAtRef.current >= BOSS_SHIELD_FIELD.ANCHOR_RESOLVE_INTERVAL_MS) {
      lastResolvedAtRef.current = now;
      anchorRef.current = resolveBossAnchorWorld(BOSS_ANCHOR_ELEMENT_ID.CORE, SHIELD_FALLBACK_POSITION);
    }

    const [anchorX, anchorY, anchorZ] = anchorRef.current;
    if (!hasSnappedRef.current) {
      hasSnappedRef.current = true;
      group.position.set(anchorX, anchorY, anchorZ);
      return;
    }
    const blend = 1 - Math.exp(-BOSS_SHIELD_FIELD.ANCHOR_FOLLOW_RATE * delta);
    group.position.x += (anchorX - group.position.x) * blend;
    group.position.y += (anchorY - group.position.y) * blend;
    group.position.z += (anchorZ - group.position.z) * blend;
  });
};
