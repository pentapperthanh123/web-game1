export type BossSkillMode = 'RANDOM_WEIGHTED' | 'RANDOM_EQUAL' | 'ROTATION';

export interface BossSkillDefinition {
  id: string;
  name: string;
  vietnameseName: string;
  iconName: string;
  baseDamage: number;
  targetCount: number; // 1, 3, 5, or 999 (all)
  isUltimate: boolean;
  color: string;
  description: string;
}

export interface BossSkillConfig {
  autoAttackEnabled: boolean;
  intervalMs: number;
  damageMultiplier: number;
  mode: BossSkillMode;
  randomIntervalEnabled: boolean;
}

export interface ActiveBossSkillBanner {
  skillId: string;
  skillName: string;
  vietnameseName: string;
  damage: number;
  color: string;
  isUltimate: boolean;
  bossName: string;
  timestamp: number;
  targetTeam?: 'BLG' | 'GENG' | 'ALL';
}
