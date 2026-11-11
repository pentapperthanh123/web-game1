import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY, COMBAT_VFX_CONSTANTS, DAMAGE_TYPE } from '../../constants/game';
import { MinionEntity } from '../../types/game';

const pickRandomOrigin = (teamMinions: MinionEntity[]): [number, number, number] => {
  const chosen = teamMinions[Math.floor(Math.random() * teamMinions.length)];
  const [x, y, z] = chosen.spawnPosition;
  return [
    x + (Math.random() - 0.5) * 0.15,
    y + (Math.random() - 0.5) * 0.15,
    z + (Math.random() - 0.5) * 0.15,
  ];
};

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

    if (currentTime - lastPruneTimeRef.current > 0.3) {
      lastPruneTimeRef.current = currentTime;
      pruneEntities();
    }

    if (minions.length === 0) return;

    if (currentTime - lastDamageTimeRef.current >= COMBAT_VFX_CONSTANTS.DAMAGE.DPS_TICK_INTERVAL_S) {
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
        const isCrit = Math.random() < 0.2;
        damageBoss(
          isCrit ? Math.round(totalTickBLG * 1.4) : totalTickBLG,
          TEAM_KEY.BLG,
          'BLG Chiến Binh',
          isCrit ? DAMAGE_TYPE.CRIT : DAMAGE_TYPE.NORMAL
        );
      }
      if (totalTickGEN > 0) {
        const isCrit = Math.random() < 0.2;
        damageBoss(
          isCrit ? Math.round(totalTickGEN * 1.4) : totalTickGEN,
          TEAM_KEY.GENG,
          'GEN.G Chiến Binh',
          isCrit ? DAMAGE_TYPE.CRIT : DAMAGE_TYPE.NORMAL
        );
      }
    }

    if (currentTime - lastProjectileTimeRef.current >= COMBAT_VFX_CONSTANTS.DAMAGE.BARRAGE_INTERVAL_S) {
      lastProjectileTimeRef.current = currentTime;

      const blgMinions = minions.filter((m) => m.team === TEAM_KEY.BLG);
      const gengMinions = minions.filter((m) => m.team === TEAM_KEY.GENG);

      if (blgMinions.length > 0) {
        const isCrit = Math.random() < 0.22;
        const palette = COMBAT_VFX_CONSTANTS.TEAM_COLORS[TEAM_KEY.BLG];
        spawnProjectile(
          pickRandomOrigin(blgMinions),
          isCrit ? palette.crit : palette.primary,
          isCrit
        );
      }

      if (gengMinions.length > 0) {
        const isCrit = Math.random() < 0.22;
        const palette = COMBAT_VFX_CONSTANTS.TEAM_COLORS[TEAM_KEY.GENG];
        spawnProjectile(
          pickRandomOrigin(gengMinions),
          isCrit ? palette.crit : palette.primary,
          isCrit
        );
      }
    }
  });

  return null;
};
