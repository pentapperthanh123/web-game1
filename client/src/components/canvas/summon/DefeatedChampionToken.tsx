import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { COMBAT_VFX_CONSTANTS } from '../../../constants/game';
import { DefeatedChampionEntity } from '../../../types/game';
import {
  SHARED_DEFEAT_CROSS_GEO,
  SHARED_DEFEAT_EXPANDING_RING_GEO,
  SHARED_PORTRAIT_GEO,
  getChampionTexture,
} from './summonShared';

interface DefeatedChampionTokenProps {
  entity: DefeatedChampionEntity;
}

export const DefeatedChampionToken = React.memo(({ entity }: DefeatedChampionTokenProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const crossSlash1Ref = useRef<THREE.Mesh>(null);
  const crossSlash2Ref = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => getChampionTexture(entity.avatarUrl), [entity.avatarUrl]);

  useFrame((state) => {
    const group = groupRef.current;
    if (!group) return;

    const ageMs = Date.now() - entity.createdAt;
    const prog = Math.min(1.0, Math.max(0.0, ageMs / entity.durationMs));
    const riseY = entity.position[1] + prog * 0.32;
    const fade = Math.max(0, 1.0 - prog);

    group.position.set(entity.position[0], riseY, entity.position[2]);
    group.scale.setScalar(COMBAT_VFX_CONSTANTS.CHAMPION_MOVEMENT.TOKEN_SCALE * (1.0 + prog * 0.12));
    group.quaternion.copy(state.camera.quaternion);

    const ghostMesh = group.children[0] as THREE.Mesh | undefined;
    if (ghostMesh?.material instanceof THREE.MeshBasicMaterial) {
      ghostMesh.material.opacity = fade * 0.85;
      const redVal = 0.65 + (1 - prog) * 0.35;
      ghostMesh.material.color.setRGB(redVal, 0.2 * fade, 0.2 * fade);
    }

    if (ringRef.current?.material instanceof THREE.MeshBasicMaterial) {
      ringRef.current.scale.setScalar(0.6 + prog * 1.6);
      ringRef.current.material.opacity = Math.max(0, (1.0 - prog) * 0.85);
      ringRef.current.rotation.z = prog * 2.2;
    }

    const slashFade = Math.max(0, 1.0 - prog * 1.5);
    if (crossSlash1Ref.current?.material instanceof THREE.MeshBasicMaterial) {
      crossSlash1Ref.current.material.opacity = slashFade * 0.9;
    }
    if (crossSlash2Ref.current?.material instanceof THREE.MeshBasicMaterial) {
      crossSlash2Ref.current.material.opacity = slashFade * 0.9;
    }
  });

  return (
    <group ref={groupRef} position={entity.position}>
      <mesh geometry={SHARED_PORTRAIT_GEO}>
        <meshBasicMaterial map={texture} color="#ef4444" transparent opacity={0.85} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0, -0.015]} geometry={SHARED_DEFEAT_EXPANDING_RING_GEO}>
        <meshBasicMaterial color="#ef4444" transparent opacity={0.85} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={crossSlash1Ref} position={[0, 0, 0.02]} rotation={[0, 0, Math.PI / 4]} geometry={SHARED_DEFEAT_CROSS_GEO}>
        <meshBasicMaterial color="#f43f5e" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={crossSlash2Ref} position={[0, 0, 0.02]} rotation={[0, 0, -Math.PI / 4]} geometry={SHARED_DEFEAT_CROSS_GEO}>
        <meshBasicMaterial color="#f43f5e" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
});

DefeatedChampionToken.displayName = 'DefeatedChampionToken';
