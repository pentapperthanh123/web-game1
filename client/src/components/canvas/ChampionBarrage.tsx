import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY } from '../../constants/game';

const BLG_WING_ORIGIN: [number, number, number] = [-3.8, -0.9, 2.0];
const GENG_WING_ORIGIN: [number, number, number] = [3.8, -0.9, 2.0];

export const ChampionBarrage = () => {
  const minions = useGameStore((state) => state.minions);
  const damageBoss = useGameStore((state) => state.damageBoss);
  const pruneEntities = useGameStore((state) => state.pruneEntities);
  const spawnProjectile = useGameStore((state) => state.spawnProjectile);

  const lastDamageTimeRef = useRef(0);
  const lastPruneTimeRef = useRef(0);
  const lastProjectileTimeRef = useRef(0);

  useFrame((state) => {
    const currentTime = state.clock.getElapsedTime();

    // 1. Periodically prune expired entities every 0.5s
    if (currentTime - lastPruneTimeRef.current > 0.5) {
      lastPruneTimeRef.current = currentTime;
      pruneEntities();
    }

    // 2. Periodic DPS tick every 1.0s
    if (currentTime - lastDamageTimeRef.current > 1.0 && minions.length > 0) {
      lastDamageTimeRef.current = currentTime;
      let totalTickBLG = 0;
      let totalTickGEN = 0;

      for (const minion of minions) {
        if (minion.team === TEAM_KEY.BLG) {
          totalTickBLG += minion.dps;
        } else {
          totalTickGEN += minion.dps;
        }
      }

      if (totalTickBLG > 0) {
        damageBoss(totalTickBLG, TEAM_KEY.BLG, 'BLG Chiến Binh');
      }
      if (totalTickGEN > 0) {
        damageBoss(totalTickGEN, TEAM_KEY.GENG, 'GEN.G Chiến Binh');
      }
    }

    // 3. Periodic continuous plasma volleys from Left (BLG) and Right (GEN.G) wings
    if (currentTime - lastProjectileTimeRef.current > 0.28 && minions.length > 0) {
      lastProjectileTimeRef.current = currentTime;

      const blgMinions = minions.filter((m) => m.team === TEAM_KEY.BLG);
      const gengMinions = minions.filter((m) => m.team === TEAM_KEY.GENG);

      // Fire a shot from BLG wing if BLG has active warriors
      if (blgMinions.length > 0) {
        const jitterY = (Math.random() - 0.5) * 0.4;
        const jitterZ = (Math.random() - 0.5) * 0.4;
        spawnProjectile(
          [BLG_WING_ORIGIN[0], BLG_WING_ORIGIN[1] + jitterY, BLG_WING_ORIGIN[2] + jitterZ],
          '#00f2fe'
        );
      }

      // Fire a shot from GEN.G wing if GEN.G has active warriors
      if (gengMinions.length > 0) {
        const jitterY = (Math.random() - 0.5) * 0.4;
        const jitterZ = (Math.random() - 0.5) * 0.4;
        spawnProjectile(
          [GENG_WING_ORIGIN[0], GENG_WING_ORIGIN[1] + jitterY, GENG_WING_ORIGIN[2] + jitterZ],
          '#ffa751'
        );
      }
    }
  });

  return null;
};
