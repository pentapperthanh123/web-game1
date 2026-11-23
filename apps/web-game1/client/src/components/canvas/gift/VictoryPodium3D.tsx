import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { COLOR_ONLY_ADDITIVE_PROPS } from '../vfxBlending';
import { useGameStore } from '../../../store/gameStore';
import { useGiftVfxStore } from '../../../store/giftVfxStore';
import { getTeamTheme } from '../../../constants/teams';
import { BACKGROUND_PERF_CONSTANTS, TEAM_KEY, TeamType } from '../../../constants/game';
import { DPSPlayer } from '../../../types/game';
import { TeamProfile } from '../../../types/team';
import { resolveEffectiveWinner } from '../../ui/victory/victoryHelpers';

const HOLOGRAPHIC_PODIUM_CONFIGS = [
  {
    rank: 0,
    medal: '🥇',
    title: 'VUA SÁT THƯƠNG',
    accentColor: '#fbbf24',
    posX: 0,
    baseY: 0.65,
    nameColor: '#fef08a',
  },
  {
    rank: 1,
    medal: '🥈',
    title: 'CHIẾN THẦN',
    accentColor: '#94a3b8',
    posX: -1.35,
    baseY: 0.48,
    nameColor: '#f1f5f9',
  },
  {
    rank: 2,
    medal: '🥉',
    title: 'DŨNG SĨ',
    accentColor: '#d97706',
    posX: 1.35,
    baseY: 0.38,
    nameColor: '#fed7aa',
  },
] as const;

const PODIUM_RISE_SPEED = 2.0;
const PODIUM_LIGHT_INTENSITY = 1.8;

const SHARED_HALO_GEO = new THREE.RingGeometry(0.24, 0.3, 32);
const SHARED_AVATAR_GEO = new THREE.CircleGeometry(0.23, 32);
const SHARED_GROUND_INNER_GEO = new THREE.CircleGeometry(0.38, 32);
const SHARED_GROUND_RING_GEO = new THREE.RingGeometry(0.36, 0.42, 32);

interface HolographicDonorProps {
  config: (typeof HOLOGRAPHIC_PODIUM_CONFIGS)[number];
  player: DPSPlayer;
  winningTeamColor: string;
}

const HolographicDonorStep: React.FC<HolographicDonorProps> = ({
  config,
  player,
  winningTeamColor,
}) => {
  const haloRef = useRef<THREE.Mesh>(null);
  const groundRingRef = useRef<THREE.Mesh>(null);
  const groundInnerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const groundRingMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const billboardGroupRef = useRef<THREE.Group>(null);
  const riseProgressRef = useRef(0);
  const [avatarTexture, setAvatarTexture] = useState<THREE.Texture | null>(null);

  const teamTheme = useMemo(() => {
    const activeTeams = useGameStore.getState().activeTeams as Record<string, TeamProfile | undefined>;
    const teamProfile = activeTeams[player.team];
    return getTeamTheme(teamProfile?.colorTheme);
  }, [player.team]);

  useEffect(() => {
    if (!player.avatarUrl) {
      setAvatarTexture(null);
      return;
    }

    let isCancelled = false;
    let loadedTexture: THREE.Texture | null = null;
    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    loader.load(
      player.avatarUrl,
      (texture) => {
        if (isCancelled) {
          texture.dispose();
          return;
        }
        texture.minFilter = THREE.LinearFilter;
        loadedTexture = texture;
        setAvatarTexture(texture);
      },
      undefined,
      () => {
        if (!isCancelled) {
          setAvatarTexture(null);
        }
      }
    );

    return () => {
      isCancelled = true;
      if (loadedTexture) {
        loadedTexture.dispose();
      }
    };
  }, [player.avatarUrl]);

  useFrame((_, delta) => {
    const safeDelta = Math.min(BACKGROUND_PERF_CONSTANTS.MAX_FRAME_DELTA_S, delta);
    if (riseProgressRef.current < 1.0) {
      riseProgressRef.current = Math.min(1.0, riseProgressRef.current + safeDelta * PODIUM_RISE_SPEED);
    }

    const progress = riseProgressRef.current;
    const targetY = config.baseY * progress;

    if (haloRef.current) {
      haloRef.current.rotation.z += safeDelta * 1.5;
    }
    if (groundRingRef.current) {
      groundRingRef.current.rotation.z -= safeDelta * 0.8;
    }
    if (groundInnerMatRef.current) {
      groundInnerMatRef.current.opacity = 0.22 * progress;
    }
    if (groundRingMatRef.current) {
      groundRingMatRef.current.opacity = 0.85 * progress;
    }
    if (lightRef.current) {
      lightRef.current.position.y = targetY;
      lightRef.current.intensity = PODIUM_LIGHT_INTENSITY * progress;
    }
    if (billboardGroupRef.current) {
      billboardGroupRef.current.visible = progress > 0.3;
      billboardGroupRef.current.position.y = targetY;
    }
  });

  const teamColor = teamTheme?.primaryHex ?? config.accentColor;

  return (
    <group position={[config.posX, 0, 0]}>
      {/* 1. Luminous Floor Aura Disc */}
      <mesh
        position={[0, 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={SHARED_GROUND_INNER_GEO}
      >
        <meshBasicMaterial
          ref={groundInnerMatRef}
          color={teamColor}
          transparent
          opacity={0}
          {...COLOR_ONLY_ADDITIVE_PROPS}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* 2. Emissive Outer Rotating Ring */}
      <mesh
        ref={groundRingRef}
        position={[0, 0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={SHARED_GROUND_RING_GEO}
      >
        <meshBasicMaterial
          ref={groundRingMatRef}
          color={winningTeamColor}
          toneMapped={false}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Soft Local Illuminating Glow */}
      <pointLight
        ref={lightRef}
        position={[0, 0, 0]}
        color={teamColor}
        intensity={0}
        distance={4.0}
        decay={2}
      />

      {/* 4. Floating Holographic Champion Billboard */}
      <group ref={billboardGroupRef} position={[0, 0, 0]} visible={false}>
        <Billboard follow lockX={false} lockY={false} lockZ={false}>
          {/* Rotating Team Halo Ring */}
          <mesh ref={haloRef} position={[0, 0, -0.01]} geometry={SHARED_HALO_GEO}>
            <meshBasicMaterial
              color={teamColor}
              transparent
              opacity={0.9}
              {...COLOR_ONLY_ADDITIVE_PROPS}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>

          {/* Donor Avatar Circle */}
          <mesh position={[0, 0, 0]} geometry={SHARED_AVATAR_GEO}>
            {avatarTexture ? (
              <meshBasicMaterial map={avatarTexture} transparent side={THREE.DoubleSide} />
            ) : (
              <meshStandardMaterial
                color={teamColor}
                metalness={0.4}
                roughness={0.3}
                side={THREE.DoubleSide}
              />
            )}
          </mesh>

          {/* Rank Crown / Medal */}
          <group position={[0, 0.38, 0]}>
            <Text fontSize={0.24} anchorX="center" anchorY="middle">
              {config.medal}
            </Text>
          </group>

          {/* Floating Donor Name */}
          <group position={[0, 0.66, 0]}>
            <Text
              fontSize={0.19}
              color={config.nameColor}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.022}
              outlineColor="#020617"
            >
              {player.userName}
            </Text>
          </group>

          {/* Damage Record Number */}
          <group position={[0, 0.88, 0]}>
            <Text
              fontSize={0.16}
              color="#34d399"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.018}
              outlineColor="#064e3b"
            >
              {`+${player.totalDamage.toLocaleString()} ST`}
            </Text>
          </group>

          {/* Team Tag */}
          <group position={[0, 1.06, 0]}>
            <Text
              fontSize={0.13}
              color={teamColor}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.016}
              outlineColor="#020617"
            >
              {`[${player.team}]`}
            </Text>
          </group>
        </Billboard>
      </group>
    </group>
  );
};

const VictoryPodiumContent: React.FC = () => {
  const leaderboard = useGameStore((state) => state.leaderboard);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const seriesWinner = useGameStore((state) => state.seriesWinner);
  const isSeriesEnded = useGameStore((state) => state.isSeriesEnded);
  const bo5Score = useGameStore((state) => state.bo5Score);
  const leftScore = useGameStore((state) => state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG);
  const rightScore = useGameStore((state) => state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG);
  const activeTeams = useGameStore((state) => state.activeTeams);

  const winningTeamColor = useMemo(() => {
    const winnerSlot = resolveEffectiveWinner(
      isSeriesEnded,
      seriesWinner,
      roundWinner,
      bo5Score,
      leftScore,
      rightScore
    );
    const winnerProfile = activeTeams[winnerSlot as TeamType];
    const theme = getTeamTheme(winnerProfile?.colorTheme);
    return theme?.primaryHex ?? '#06b6d4';
  }, [isSeriesEnded, seriesWinner, roundWinner, bo5Score, leftScore, rightScore, activeTeams]);

  const top3Players = useMemo(() => {
    return leaderboard.filter((p) => (p.totalDamage ?? 0) > 0).slice(0, 3);
  }, [leaderboard]);

  if (top3Players.length === 0) {
    return null;
  }

  return (
    <group position={[0, 0, 0]}>
      {top3Players.map((player, index) => {
        const config = HOLOGRAPHIC_PODIUM_CONFIGS[index];
        if (!config) return null;
        return (
          <HolographicDonorStep
            key={`hologram-rank-${config.rank}-${player.userName}`}
            config={config}
            player={player}
            winningTeamColor={winningTeamColor}
          />
        );
      })}
    </group>
  );
};

/**
 * Only mounts podium meshes, troika SDF text, and local pointLights during Victory orbit
 * so normal combat incurs zero store subscriptions, shader recompiles, or light uniforms.
 */
export const VictoryPodium3D: React.FC = React.memo(() => {
  const isPodiumOrbitActive = useGiftVfxStore((s) => s.isPodiumOrbitActive);
  if (!isPodiumOrbitActive) return null;
  return <VictoryPodiumContent />;
});

VictoryPodium3D.displayName = 'VictoryPodium3D';
export default VictoryPodium3D;
