import { useEffect, useMemo, useState } from 'react';
import { ActiveBossSkillBanner, BossSkillVfxType } from '../../../types/bossSkill';
import { BOSS_SKILL_VFX_DEFAULT_COUNT, BOSS_SKILL_VFX_DURATION_MS } from '../../../constants/bossSkillVfx';
import { TEAM_KEY } from '../../../constants/game';

/** -1 = left side (BLG), 1 = right side (GENG), 0 = both / centre. */
export type SkillDirection = -1 | 0 | 1;

export interface SkillVfx2DProps {
  color: string;
  secondaryColor: string;
  scale: number;
  count: number;
  direction: SkillDirection;
  /** Cast timestamp; used as React key so CSS animations restart per cast. */
  nonce: number;
}

const DEFAULT_SCALE = 1;
const SEED_MULTIPLIER = 9301;
const SEED_INCREMENT = 49297;
const SEED_MODULUS = 233280;

export const resolveSkillDirection = (targetTeam: ActiveBossSkillBanner['targetTeam']): SkillDirection => {
  if (targetTeam === TEAM_KEY.BLG) return -1;
  if (targetTeam === TEAM_KEY.GENG) return 1;
  return 0;
};

export const buildSkillVfxProps = (banner: ActiveBossSkillBanner, vfxType: BossSkillVfxType): SkillVfx2DProps => ({
  color: banner.color,
  secondaryColor: banner.vfxParams?.secondaryColor ?? banner.color,
  scale: banner.vfxParams?.scale ?? DEFAULT_SCALE,
  count: banner.vfxParams?.count ?? BOSS_SKILL_VFX_DEFAULT_COUNT[vfxType],
  direction: resolveSkillDirection(banner.targetTeam),
  nonce: banner.timestamp,
});

/** Deterministic 0..1 values per cast so re-renders never reshuffle positions mid-animation. */
export const useSeededOffsets = (nonce: number, count: number): number[] =>
  useMemo(() => {
    const values: number[] = [];
    let seed = nonce % SEED_MODULUS;
    for (let index = 0; index < count; index += 1) {
      seed = (seed * SEED_MULTIPLIER + SEED_INCREMENT) % SEED_MODULUS;
      values.push(seed / SEED_MODULUS);
    }
    return values;
  }, [nonce, count]);

/** True while the archetype's window after the cast is still open. */
export const useSkillVfxWindow = (banner: ActiveBossSkillBanner | null): boolean => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!banner) {
      setIsActive(false);
      return;
    }
    const remainingMs = BOSS_SKILL_VFX_DURATION_MS[banner.vfxType] - (Date.now() - banner.timestamp);
    if (remainingMs <= 0) {
      setIsActive(false);
      return;
    }
    setIsActive(true);
    const timer = setTimeout(() => setIsActive(false), remainingMs);
    return () => clearTimeout(timer);
  }, [banner]);

  return isActive;
};

/** Horizontal landing spot (percent of container width) for projectile-style effects. */
export const resolveLandingPercent = (direction: SkillDirection, random: number): number => {
  if (direction < 0) return 8 + random * 30;
  if (direction > 0) return 62 + random * 30;
  return 10 + random * 80;
};
