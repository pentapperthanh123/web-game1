import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, GAME_CONSTANTS, TEAM_KEY } from '../../constants/game';
import {
  liveMinionPositionMap,
  getLiveMinionPosition,
  removeLiveMinionPositions,
} from '../../services/minionPositionRegistry';
import { ChampionAIState, project3DToScreen } from './summon/summonShared';
import { createInitialChampionAI, stepChampionFrame } from './summon/championFrameLogic';
import { SummonGroundPortalsInstanced } from './summon/SummonGroundPortalsInstanced';
import { ChampionToken } from './summon/ChampionToken';
import { allocSlot, freeSlot } from '../../workers/physicsSharedBuffer';
import { DefeatedChampionToken } from './summon/DefeatedChampionToken';

export { liveMinionPositionMap, getLiveMinionPosition, project3DToScreen };

const activeMinionIdsSet = new Set<string>();

export const SummonPortals3D = () => {
  const championsGroupRef = useRef<THREE.Group>(null);
  const aiStatesRef = useRef<Map<string, ChampionAIState>>(new Map());

  const minions = useGameStore((state) => state.minions);
  const maxActivePerTeam = useGameStore(
    (state) => state.participationRuleConfig?.maxActivePerTeam ?? GAME_CONSTANTS.SUMMON_RULES.MAX_ACTIVE_PER_TEAM
  );
  const activeDefeatedChampions = useGameStore((state) => state.activeDefeatedChampions);
  const visibleMinions = useMemo(() => {
    const maxPerSide = maxActivePerTeam;
    const blgMinions = minions.filter((m) => m.team === TEAM_KEY.BLG).slice(-maxPerSide);
    const gengMinions = minions.filter((m) => m.team === TEAM_KEY.GENG).slice(-maxPerSide);
    return [...blgMinions, ...gengMinions];
  }, [minions, maxActivePerTeam]);

  useFrame((state, delta) => {
    const championsGroup = championsGroupRef.current;
    if (!championsGroup) return;

    const children = championsGroup.children;
    if (children.length === 0 && aiStatesRef.current.size === 0) return;

    const now = Date.now();
    const elapsedTime = state.clock.getElapsedTime();
    const clampedDelta = Math.min(0.1, delta);
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
        ai = createInitialChampionAI(minion, i, elapsedTime);
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

      <group ref={championsGroupRef}>
        {visibleMinions.map((minion) => (
          <group key={minion.id} position={minion.spawnPosition}>
            <ChampionToken minion={minion} />
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
