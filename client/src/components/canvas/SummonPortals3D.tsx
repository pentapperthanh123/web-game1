import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { getCombatTimeScale } from '../../store/combatMomentStore';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, COMBAT_VFX_CONSTANTS } from '../../constants/game';
import { SCREEN_SHAKE_CONSTANTS } from '../../constants/bossUltimateFeedback';
import {
  liveMinionPositionMap,
  getLiveMinionPosition,
  notifyNameplateSync,
  removeLiveMinionPositions,
} from '../../services/minionPositionRegistry';
import { ChampionAIState, project3DToScreen } from './summon/summonShared';
import { createInitialChampionAI, stepChampionFrame } from './summon/championFrameLogic';
import { SummonGroundPortalsInstanced } from './summon/SummonGroundPortalsInstanced';
import { SquadEntrancePulse3D } from './summon/SquadEntrancePulse3D';
import { ChampionToken } from './summon/ChampionToken';
import { DefeatedChampionToken } from './summon/DefeatedChampionToken';
import { CHAMPION_DEFAULT_MAX_HP } from '../../constants/bossSkills';
import { SessionTier } from '../../constants/sessionLeaderboard';
import { getCanonicalViewerName, useSessionLeaderboardStore } from '../../store/sessionLeaderboardStore';
import { MinionEntity } from '../../types/game';
import { TeamColorThemeId } from '../../types/team';

export { liveMinionPositionMap, getLiveMinionPosition, project3DToScreen };

const activeMinionIdsSet = new Set<string>();

/** Hysteresis so the field does not flip between detail levels around the threshold. */
const useCompactCrowdMode = (championCount: number): boolean => {
  const isCompactRef = useRef(false);
  const lod = COMBAT_VFX_CONSTANTS.CROWD_LOD;
  if (championCount >= lod.COMPACT_ENTER_COUNT) isCompactRef.current = true;
  if (championCount <= lod.COMPACT_EXIT_COUNT) isCompactRef.current = false;
  return isCompactRef.current;
};

interface ChampionGroupSlotProps {
  minion: MinionEntity;
  colorThemeId: TeamColorThemeId | undefined;
  shouldUseUserAvatar: boolean;
  isCompact: boolean;
  sessionTier: SessionTier | undefined;
}

const ChampionGroupSlot = React.memo(
  ({ minion, colorThemeId, shouldUseUserAvatar, isCompact, sessionTier }: ChampionGroupSlotProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const spawnX = minion.spawnPosition[0];
    const spawnY = minion.spawnPosition[1];
    const spawnZ = minion.spawnPosition[2];

    useLayoutEffect(() => {
      groupRef.current?.position.set(spawnX, spawnY, spawnZ);
      // Intentional mount-only initial position; live motion is driven per frame by stepChampionFrame
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <group ref={groupRef} name={minion.id}>
        <ChampionToken
          minion={minion}
          colorThemeId={colorThemeId}
          shouldUseUserAvatar={shouldUseUserAvatar}
          isCompact={isCompact}
          sessionTier={sessionTier}
        />
      </group>
    );
  }
);

ChampionGroupSlot.displayName = 'ChampionGroupSlot';

interface ChampionFieldStepperProps {
  championsGroupRef: React.RefObject<THREE.Group | null>;
  visibleMinions: readonly MinionEntity[];
}

const ChampionFieldStepper = ({ championsGroupRef, visibleMinions }: ChampionFieldStepperProps) => {
  const aiStatesRef = useRef<Map<string, ChampionAIState>>(new Map());
  const visibleMinionById = useMemo(() => {
    const map = new Map<string, MinionEntity>();
    for (let i = 0; i < visibleMinions.length; i += 1) {
      const m = visibleMinions[i];
      map.set(m.id, m);
    }
    return map;
  }, [visibleMinions]);

  useFrame((state, delta) => {
    const championsGroup = championsGroupRef.current;
    if (!championsGroup) return;

    const children = championsGroup.children;
    if (children.length === 0 && aiStatesRef.current.size === 0) return;

    // Sync inverse camera matrix immediately after CameraRig so projections match WebGL in the same frame
    state.camera.updateMatrixWorld();

    const now = Date.now();
    const elapsedTime = state.clock.getElapsedTime();
    const clampedDelta = Math.min(0.1, delta) * getCombatTimeScale(now);
    const {
      bossStatus,
      bossHp,
      isRoundIntermission,
      roundWinner,
      screenShakeTimestamp,
      screenRumbleStartedAt,
      screenRumbleDurationMs,
    } = useGameStore.getState();
    const isBossAlive =
      bossStatus !== BOSS_STATUS.DEFEATED &&
      bossHp > 0 &&
      !isRoundIntermission &&
      roundWinner === null;
    const isCameraStable =
      now - screenShakeTimestamp >= SCREEN_SHAKE_CONSTANTS.DURATION_MS &&
      now - screenRumbleStartedAt >= screenRumbleDurationMs;

    activeMinionIdsSet.clear();

    for (let i = 0; i < children.length; i++) {
      const champGroup = children[i] as THREE.Group;
      const minion = visibleMinionById.get(champGroup.name);
      if (!minion) continue;

      activeMinionIdsSet.add(minion.id);

      let ai = aiStatesRef.current.get(minion.id);
      if (!ai) {
        ai = createInitialChampionAI(minion, elapsedTime);
        aiStatesRef.current.set(minion.id, ai);
      }

      stepChampionFrame(
        champGroup,
        minion,
        ai,
        now,
        elapsedTime,
        clampedDelta,
        state.camera,
        state.size.width,
        state.size.height,
        isBossAlive,
        isCameraStable
      );
    }

    for (const [id] of aiStatesRef.current) {
      if (!activeMinionIdsSet.has(id)) {
        aiStatesRef.current.delete(id);
        removeLiveMinionPositions(id);
      }
    }

    notifyNameplateSync();
  });

  return null;
};

export const SummonPortals3D = () => {
  const championsGroupRef = useRef<THREE.Group>(null);

  const minions = useGameStore((state) => state.minions);
  const activeDefeatedChampions = useGameStore((state) => state.activeDefeatedChampions);
  // One subscription for the whole field; tokens used to subscribe one by one (2 x N listeners per store update)
  const activeTeams = useGameStore((state) => state.activeTeams);
  // Session tiers for the nameplate emblems; the map is replaced only when someone changes tier
  const sessionTierByName = useSessionLeaderboardStore((state) => state.tierByName);
  const shouldUseUserAvatar = useGameStore((state) => state.useUserAvatar);
  // Unlimited floor: all living champions actively fight on the battlefield
  const visibleMinions = useMemo(() => {
    return minions.filter((m) => (m.hp ?? CHAMPION_DEFAULT_MAX_HP) > 0);
  }, [minions]);
  const isCompact = useCompactCrowdMode(visibleMinions.length);

  return (
    <group>
      {/* Stepper runs before portals in the same frame so ground portals track live champion coordinates */}
      <ChampionFieldStepper championsGroupRef={championsGroupRef} visibleMinions={visibleMinions} />
      <SummonGroundPortalsInstanced />
      <SquadEntrancePulse3D />

      <group ref={championsGroupRef}>
        {visibleMinions.map((minion) => (
          <ChampionGroupSlot
            key={minion.id}
            minion={minion}
            colorThemeId={activeTeams[minion.team]?.colorTheme}
            shouldUseUserAvatar={shouldUseUserAvatar}
            isCompact={isCompact}
            sessionTier={sessionTierByName[getCanonicalViewerName(minion.summonerName)]}
          />
        ))}
      </group>

      <group>
        {activeDefeatedChampions.map((item) => (
          <DefeatedChampionToken key={item.id} entity={item} />
        ))}
      </group>
    </group>
  );
};
