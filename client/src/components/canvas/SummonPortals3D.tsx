import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { COMBAT_VFX_CONSTANTS } from '../../constants/game';

export const SummonPortals3D = () => {
  const portalsGroupRef = useRef<THREE.Group>(null);
  const orbsGroupRef = useRef<THREE.Group>(null);

  const activeSummonPortals = useGameStore((state) => state.activeSummonPortals);
  const minions = useGameStore((state) => state.minions);

  const visiblePortals = activeSummonPortals.filter(
    (portal) => Date.now() - portal.createdAt < COMBAT_VFX_CONSTANTS.SUMMON.PORTAL_DURATION_MS
  );
  const visibleOrbs = minions.slice(-COMBAT_VFX_CONSTANTS.SUMMON.MAX_VISIBLE_ORBS);

  useFrame((state) => {
    const now = Date.now();
    const elapsedTime = state.clock.getElapsedTime();

    if (portalsGroupRef.current) {
      const children = portalsGroupRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const portalGroup = children[i] as THREE.Group;
        const portal = visiblePortals[i];
        if (!portal) continue;

        const ageMs = now - portal.createdAt;
        const progress = Math.min(1, ageMs / COMBAT_VFX_CONSTANTS.SUMMON.PORTAL_DURATION_MS);
        const popScale = progress < 0.2 ? (progress / 0.2) * 1.15 : 1.15 - (progress - 0.2) * 0.25;
        const fade = Math.max(0, 1 - Math.pow(progress, 1.8));

        portalGroup.scale.setScalar(Math.max(0.05, popScale));

        const outerRing = portalGroup.children[0] as THREE.Mesh | undefined;
        const innerRing = portalGroup.children[1] as THREE.Mesh | undefined;
        const pillar = portalGroup.children[2] as THREE.Mesh | undefined;

        if (outerRing) {
          outerRing.rotation.z = elapsedTime * 3.2;
          (outerRing.material as THREE.MeshBasicMaterial).opacity = fade * 0.9;
        }
        if (innerRing) {
          innerRing.rotation.z = -elapsedTime * 5.0;
          (innerRing.material as THREE.MeshBasicMaterial).opacity = fade * 0.95;
        }
        if (pillar) {
          pillar.scale.set(1 - progress * 0.45, 1 + progress * 0.6, 1 - progress * 0.45);
          (pillar.material as THREE.MeshBasicMaterial).opacity = fade * 0.55;
        }
      }
    }

    if (orbsGroupRef.current) {
      const orbChildren = orbsGroupRef.current.children;
      for (let i = 0; i < orbChildren.length; i++) {
        const orbGroup = orbChildren[i] as THREE.Group;
        const minion = visibleOrbs[i];
        if (!minion) continue;

        const [baseX, baseY, baseZ] = minion.spawnPosition;
        const bobOffset = Math.sin(elapsedTime * 3.4 + i * 0.9) * 0.14;
        orbGroup.position.set(baseX, baseY + bobOffset, baseZ);

        const halo = orbGroup.children[1] as THREE.Mesh | undefined;
        if (halo) {
          halo.rotation.z = elapsedTime * 2.8 + i;
          halo.rotation.x = Math.PI / 2.6;
        }
      }
    }
  });

  return (
    <group>
      {/* Runic Summoning Portals */}
      <group ref={portalsGroupRef}>
        {visiblePortals.map((portal) => (
          <group key={portal.id} position={portal.position}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]}>
              <ringGeometry args={[0.52, 0.72, 24]} />
              <meshBasicMaterial
                color={portal.color}
                transparent
                opacity={0.9}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.33, 0]}>
              <ringGeometry args={[0.25, 0.42, 6]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.95}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh position={[0, 0.65, 0]}>
              <cylinderGeometry args={[0.18, 0.48, 2.2, 12, 1, true]} />
              <meshBasicMaterial
                color={portal.color}
                transparent
                opacity={0.5}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Active Summoned Warrior Spirit Guardians */}
      <group ref={orbsGroupRef}>
        {visibleOrbs.map((minion) => {
          const teamColor = COMBAT_VFX_CONSTANTS.TEAM_COLORS[minion.team].primary;
          return (
            <group key={minion.id} position={minion.spawnPosition}>
              <mesh>
                <octahedronGeometry args={[0.16, 0]} />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.92}
                  toneMapped={false}
                />
              </mesh>
              <mesh>
                <torusGeometry args={[0.28, 0.035, 8, 24]} />
                <meshBasicMaterial
                  color={teamColor}
                  transparent
                  opacity={0.85}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
};
