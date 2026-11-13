import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COMBAT_VFX_CONSTANTS } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { useGameStore } from '../../../store/gameStore';
import { DefeatedChampionEntity } from '../../../types/game';
import {
  SHARED_DEFEAT_CROSS_GEO,
  SHARED_DEFEAT_EXPANDING_RING_GEO,
  SHARED_DEFEAT_FLASH_GEO,
  SHARED_DEFEAT_SHARD_GEO,
  SHARED_PORTRAIT_GEO,
  SHARED_SOUL_WISP_GEO,
  getChampionTexture,
} from './summonShared';
import {
  DEFEAT_VFX,
  ShardTrajectory,
  clamp01,
  createShardTrajectories,
  easeOutCubic,
  resolvePortraitColor,
  resolveSlashState,
  setOpacity,
} from './defeatVfxTimeline';

const SLASH_COLOR = '#f43f5e';
const FLASH_COLOR = '#ffffff';
const SLASH_ANGLE = Math.PI / 4;
const SOUL_WISP_POSITION: [number, number, number] = [0, 0.35, -0.02];
const MS_PER_SECOND = 1000;
const SHARD_DEPTH = 0.03;

interface DefeatedChampionTokenProps {
  entity: DefeatedChampionEntity;
}

const GlowMaterial = ({ color }: { color: string }) => (
  <meshBasicMaterial
    color={color}
    transparent
    opacity={0}
    blending={THREE.AdditiveBlending}
    depthWrite={false}
    toneMapped={false}
    side={THREE.DoubleSide}
  />
);

const updateShards = (shards: (THREE.Mesh | null)[], trajectories: ShardTrajectory[], progress: number): void => {
  const timeS = (progress * COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.DEFEAT_DURATION_MS) / MS_PER_SECOND;
  const opacity = (1 - easeOutCubic(progress)) * DEFEAT_VFX.SHARD_PEAK_OPACITY;
  shards.forEach((shard, index) => {
    const trajectory = trajectories[index];
    if (!shard || !trajectory) return;
    shard.position.set(
      trajectory.velocityX * timeS,
      trajectory.velocityY * timeS - 0.5 * DEFEAT_VFX.SHARD_GRAVITY * timeS * timeS,
      SHARD_DEPTH
    );
    shard.rotation.z = trajectory.spinSign * DEFEAT_VFX.SHARD_SPIN * timeS;
    setOpacity(shard, opacity);
  });
};

/** Execution-style death effect: impact flash, double slash, shatter burst and a rising soul. */
export const DefeatedChampionToken = React.memo(({ entity }: DefeatedChampionTokenProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const portraitRef = useRef<THREE.Mesh>(null);
  const flashRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const slashRefs = useRef<(THREE.Mesh | null)[]>([]);
  const shardRefs = useRef<(THREE.Mesh | null)[]>([]);
  const wispRef = useRef<THREE.Mesh>(null);
  const [shardTrajectories] = useState(createShardTrajectories);
  const texture = useMemo(() => getChampionTexture(entity.avatarUrl), [entity.avatarUrl]);
  const teamColorTheme = useGameStore((state) => state.activeTeams[entity.team]?.colorTheme);
  const teamColor = getTeamTheme(teamColorTheme).primaryHex;

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const progress = clamp01((Date.now() - entity.createdAt) / entity.durationMs);
    const shakeFade = 1 - clamp01(progress / DEFEAT_VFX.SHAKE_END);
    const shakeX = Math.sin(progress * DEFEAT_VFX.SHAKE_FREQUENCY) * DEFEAT_VFX.SHAKE_AMPLITUDE * shakeFade;
    const punch = Math.sin(clamp01(progress / DEFEAT_VFX.FLASH_END) * Math.PI) * DEFEAT_VFX.PUNCH_SCALE;

    group.position.set(entity.position[0] + shakeX, entity.position[1], entity.position[2]);
    group.scale.setScalar(
      COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.TOKEN_SCALE * (1 + punch + progress * DEFEAT_VFX.GROW_SCALE)
    );
    group.quaternion.copy(state.camera.quaternion);

    const portrait = portraitRef.current;
    if (portrait?.material instanceof THREE.MeshBasicMaterial) {
      const fadeProgress = clamp01((progress - DEFEAT_VFX.PORTRAIT_FADE_START) / (1 - DEFEAT_VFX.PORTRAIT_FADE_START));
      portrait.position.y = easeOutCubic(progress) * DEFEAT_VFX.PORTRAIT_RISE;
      portrait.rotation.z = easeOutCubic(progress) * DEFEAT_VFX.PORTRAIT_TILT;
      portrait.material.opacity = (1 - fadeProgress) * DEFEAT_VFX.PORTRAIT_PEAK_OPACITY;
      resolvePortraitColor(progress, portrait.material.color);
    }

    const flashProgress = clamp01(progress / DEFEAT_VFX.FLASH_END);
    flashRef.current?.scale.setScalar(
      THREE.MathUtils.lerp(DEFEAT_VFX.FLASH_START_SCALE, DEFEAT_VFX.FLASH_END_SCALE, easeOutCubic(flashProgress))
    );
    setOpacity(flashRef.current, (1 - flashProgress) * DEFEAT_VFX.FLASH_PEAK_OPACITY);

    ringRef.current?.scale.setScalar(
      THREE.MathUtils.lerp(DEFEAT_VFX.RING_START_SCALE, DEFEAT_VFX.RING_END_SCALE, easeOutCubic(progress))
    );
    if (ringRef.current) ringRef.current.rotation.z = progress * DEFEAT_VFX.RING_SPIN;
    setOpacity(ringRef.current, Math.pow(1 - progress, 2) * DEFEAT_VFX.RING_PEAK_OPACITY);

    slashRefs.current.forEach((slash, index) => {
      const slashState = resolveSlashState(progress, index * DEFEAT_VFX.SLASH_SECOND_DELAY);
      slash?.scale.set(Math.max(0.001, slashState.length), 1, 1);
      setOpacity(slash, slashState.opacity);
    });

    updateShards(shardRefs.current, shardTrajectories, progress);

    const wispProgress = clamp01((progress - DEFEAT_VFX.WISP_START) / (1 - DEFEAT_VFX.WISP_START));
    if (wispRef.current) wispRef.current.position.y = SOUL_WISP_POSITION[1] + easeOutCubic(wispProgress) * DEFEAT_VFX.WISP_RISE;
    setOpacity(wispRef.current, Math.sin(wispProgress * Math.PI) * DEFEAT_VFX.WISP_PEAK_OPACITY);
  });

  return (
    <group ref={groupRef} position={entity.position}>
      <mesh ref={flashRef} visible={false} position={[0, 0, -0.02]} geometry={SHARED_DEFEAT_FLASH_GEO}>
        <GlowMaterial color={FLASH_COLOR} />
      </mesh>
      <mesh ref={ringRef} visible={false} position={[0, 0, -0.015]} geometry={SHARED_DEFEAT_EXPANDING_RING_GEO}>
        <GlowMaterial color={teamColor} />
      </mesh>
      <mesh ref={wispRef} visible={false} position={SOUL_WISP_POSITION} geometry={SHARED_SOUL_WISP_GEO}>
        <GlowMaterial color={teamColor} />
      </mesh>
      <mesh ref={portraitRef} geometry={SHARED_PORTRAIT_GEO}>
        <meshBasicMaterial map={texture} transparent opacity={DEFEAT_VFX.PORTRAIT_PEAK_OPACITY} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      {[SLASH_ANGLE, -SLASH_ANGLE].map((angle, index) => (
        <mesh
          key={angle}
          ref={(mesh) => {
            slashRefs.current[index] = mesh;
          }}
          visible={false}
          position={[0, 0, 0.02]}
          rotation={[0, 0, angle]}
          geometry={SHARED_DEFEAT_CROSS_GEO}
        >
          <GlowMaterial color={SLASH_COLOR} />
        </mesh>
      ))}
      {shardTrajectories.map((trajectory, index) => (
        <mesh
          key={`${entity.id}-shard-${index}`}
          ref={(mesh) => {
            shardRefs.current[index] = mesh;
          }}
          visible={false}
          geometry={SHARED_DEFEAT_SHARD_GEO}
        >
          <GlowMaterial color={trajectory.spinSign > 0 ? teamColor : SLASH_COLOR} />
        </mesh>
      ))}
    </group>
  );
});

DefeatedChampionToken.displayName = 'DefeatedChampionToken';
