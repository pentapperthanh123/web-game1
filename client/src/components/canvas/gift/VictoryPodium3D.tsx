import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { COLOR_ONLY_ADDITIVE_PROPS } from '../vfxBlending';
import { useGameStore } from '../../../store/gameStore';
import { useGiftVfxStore } from '../../../store/giftVfxStore';
import { getTeamTheme } from '../../../constants/teams';
import { TEAM_KEY, TeamType } from '../../../constants/game';
import { DPSPlayer } from '../../../types/game';
import { TeamProfile } from '../../../types/team';
import { resolveEffectiveWinner } from '../../ui/victory/victoryHelpers';

// ==========================================
// CONFIGS FOR HOLOGRAPHIC DONATOR PEDESTALS
// ==========================================
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

const SHARED_HALO_GEO = new THREE.RingGeometry(0.24, 0.30, 32);
const SHARED_AVATAR_GEO = new THREE.CircleGeometry(0.23, 32);
const SHARED_GROUND_INNER_GEO = new THREE.CircleGeometry(0.38, 32);
const SHARED_GROUND_RING_GEO = new THREE.RingGeometry(0.36, 0.42, 32);

// ==========================================
// SUBCOMPONENT: HOLOGRAPHIC DONOR DISPLAY
// ==========================================
interface HolographicDonorProps {
  config: (typeof HOLOGRAPHIC_PODIUM_CONFIGS)[number];
  player: DPSPlayer;
  riseProgress: number;
  winningTeamColor: string;
}

const HolographicDonorStep: React.FC<HolographicDonorProps> = ({
  config,
  player,
  riseProgress,
  winningTeamColor,
}) => {
  const haloRef = useRef<THREE.Mesh>(null);
  const groundRingRef = useRef<THREE.Mesh>(null);
  const avatarTextureRef = useRef<THREE.Texture | null>(null);

  const teamTheme = useMemo(() => {
    const activeTeams = useGameStore.getState().activeTeams as Record<string, TeamProfile | undefined>;
    const teamProfile = activeTeams[player.team];
    return getTeamTheme(teamProfile?.colorTheme);
  }, [player.team]);

  useMemo(() => {
    if (player.avatarUrl) {
      const loader = new THREE.TextureLoader();
      loader.crossOrigin = 'anonymous';
      loader.load(
        player.avatarUrl,
        (texture) => {
          texture.minFilter = THREE.LinearFilter;
          avatarTextureRef.current = texture;
        },
        undefined,
        () => {
          avatarTextureRef.current = null;
        }
      );
    }
  }, [player.avatarUrl]);

  useFrame((_, delta) => {
    if (haloRef.current) {
      haloRef.current.rotation.z += delta * 1.5;
    }
    if (groundRingRef.current) {
      groundRingRef.current.rotation.z -= delta * 0.8;
    }
  });

  const teamColor = teamTheme?.primaryHex ?? config.accentColor;
  const targetY = config.baseY * riseProgress;

  return (
    <group position={[config.posX, 0, 0]}>
      {/* 1. Luminous Floor Aura Disc (Zero opaque blocks) */}
      <mesh
        position={[0, 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        geometry={SHARED_GROUND_INNER_GEO}
      >
        <meshBasicMaterial
          color={teamColor}
          transparent
          opacity={0.22 * riseProgress}
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
          color={winningTeamColor}
          toneMapped={false}
          transparent
          opacity={0.85 * riseProgress}
          side={THREE.DoubleSide}
          {...COLOR_ONLY_ADDITIVE_PROPS}
          depthWrite={false}
        />
      </mesh>

      {/* 3. Soft Local Illuminating Glow */}
      <pointLight
        position={[0, targetY, 0]}
        color={teamColor}
        intensity={1.8 * riseProgress}
        distance={4.0}
        decay={2}
      />

      {/* 4. Floating Holographic Champion Billboard */}
      {riseProgress > 0.3 && (
        <group position={[0, targetY, 0]}>
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
              {avatarTextureRef.current ? (
                <meshBasicMaterial
                  map={avatarTextureRef.current}
                  transparent
                  side={THREE.DoubleSide}
                />
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
      )}
    </group>
  );
};

// ==========================================
// MAIN COMPONENT: VICTORY PODIUM 3D
// ==========================================
export const VictoryPodium3D: React.FC = React.memo(() => {
  const isPodiumOrbitActive = useGiftVfxStore((s) => s.isPodiumOrbitActive);
  const leaderboard = useGameStore((s) => s.leaderboard);
  const roundWinner = useGameStore((s) => s.roundWinner);
  const seriesWinner = useGameStore((s) => s.seriesWinner);
  const isSeriesEnded = useGameStore((s) => s.isSeriesEnded);
  const bo5Score = useGameStore((s) => s.bo5Score);
  const leftScore = useGameStore((s) => s.teamScores?.[TEAM_KEY.BLG] ?? s.teamScoreBLG);
  const rightScore = useGameStore((s) => s.teamScores?.[TEAM_KEY.GENG] ?? s.teamScoreGENG);
  const activeTeams = useGameStore((s) => s.activeTeams);

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

  // Keep top 3 with actual damage recorded
  const top3Players = useMemo(() => {
    return leaderboard.filter((p) => (p.totalDamage ?? 0) > 0).slice(0, 3);
  }, [leaderboard]);

  const riseProgressRef = useRef<number>(0);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (isPodiumOrbitActive && top3Players.length > 0) {
      groupRef.current.visible = true;
      if (riseProgressRef.current < 1.0) {
        riseProgressRef.current = Math.min(1.0, riseProgressRef.current + delta * 2.0);
      }
    } else {
      if (riseProgressRef.current > 0.0) {
        riseProgressRef.current = Math.max(0.0, riseProgressRef.current - delta * 3.0);
      } else {
        groupRef.current.visible = false;
      }
    }
  });

  // If there are no donors on the leaderboard, render completely nothing
  if (top3Players.length === 0) {
    return null;
  }

  return (
    <group ref={groupRef} position={[0, 0, 0]} visible={false}>
      {top3Players.map((player, index) => {
        const config = HOLOGRAPHIC_PODIUM_CONFIGS[index];
        if (!config) return null;
        return (
          <HolographicDonorStep
            key={`hologram-rank-${config.rank}-${player.userName}`}
            config={config}
            player={player}
            riseProgress={riseProgressRef.current}
            winningTeamColor={winningTeamColor}
          />
        );
      })}
    </group>
  );
});

VictoryPodium3D.displayName = 'VictoryPodium3D';
export default VictoryPodium3D;
