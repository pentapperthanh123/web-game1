import { useMemo, useRef } from 'react';
import { getCombatTimeScale } from '../../store/combatMomentStore';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, COMBAT_VFX_CONSTANTS } from '../../constants/game';
import {
  liveMinionPositionMap,
  getLiveMinionPosition,
  removeLiveMinionPositions,
} from '../../services/minionPositionRegistry';
import { ChampionAIState, project3DToScreen } from './summon/summonShared';
import { createInitialChampionAI, stepChampionFrame } from './summon/championFrameLogic';
import { SummonGroundPortalsInstanced } from './summon/SummonGroundPortalsInstanced';
import { SquadEntrancePulse3D } from './summon/SquadEntrancePulse3D';
import { ChampionToken } from './summon/ChampionToken';
import { allocSlot, freeSlot } from '../../workers/physicsSharedBuffer';
import { DefeatedChampionToken } from './summon/DefeatedChampionToken';
import { CHAMPION_DEFAULT_MAX_HP } from '../../constants/bossSkills';

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

export const SummonPortals3D = () => {
  const championsGroupRef = useRef<THREE.Group>(null);
  const aiStatesRef = useRef<Map<string, ChampionAIState>>(new Map());

  const minions = useGameStore((state) => state.minions);
  const activeDefeatedChampions = useGameStore((state) => state.activeDefeatedChampions);
  // One subscription for the whole field; tokens used to subscribe one by one (2 x N listeners per store update)
  const activeTeams = useGameStore((state) => state.activeTeams);
  const shouldUseUserAvatar = useGameStore((state) => state.useUserAvatar);
  // Unlimited floor: all living champions actively fight on the battlefield
  const visibleMinions = useMemo(() => {
    return minions.filter((m) => (m.hp ?? CHAMPION_DEFAULT_MAX_HP) > 0);
  }, [minions]);
  const isCompact = useCompactCrowdMode(visibleMinions.length);
  const nameplateStartIndex = visibleMinions.length - COMBAT_VFX_CONSTANTS.CROWD_LOD.COMPACT_NAMEPLATE_BUDGET;

  useFrame((state, delta) => {
    const championsGroup = championsGroupRef.current;
    if (!championsGroup) return;

    const children = championsGroup.children;
    if (children.length === 0 && aiStatesRef.current.size === 0) return;

    const now = Date.now();
    const elapsedTime = state.clock.getElapsedTime();
    const clampedDelta = Math.min(0.1, delta) * getCombatTimeScale(Date.now());
    const { bossStatus, bossHp, isRoundIntermission, roundWinner } = useGameStore.getState();
    const isBossAlive =
      bossStatus !== BOSS_STATUS.DEFEATED &&
      bossHp > 0 &&
      !isRoundIntermission &&
      roundWinner === null;

    activeMinionIdsSet.clear();

    for (let i = 0; i < children.length; i++) {
      const champGroup = children[i] as THREE.Group;
      const minion = visibleMinions[i];
      if (!minion) continue;

      activeMinionIdsSet.add(minion.id);
      allocSlot(minion.id);

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
        isBossAlive
      );
    }

    for (const [id] of aiStatesRef.current) {
      if (!activeMinionIdsSet.has(id)) {
        aiStatesRef.current.delete(id);
        removeLiveMinionPositions(id);
        freeSlot(id);
      }
    }
  });

  return (
    <group>
      <SummonGroundPortalsInstanced />
      <SquadEntrancePulse3D />

      <group ref={championsGroupRef}>
        {visibleMinions.map((minion, index) => (
          <group key={`${minion.id}:${isCompact ? 'c' : 'f'}`} position={minion.spawnPosition}>
            <ChampionToken
              minion={minion}
              colorThemeId={activeTeams[minion.team]?.colorTheme}
              shouldUseUserAvatar={shouldUseUserAvatar}
              isCompact={isCompact}
              hasNameplate={!isCompact || index >= nameplateStartIndex}
            />
          </group>
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
