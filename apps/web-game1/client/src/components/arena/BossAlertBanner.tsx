import React from 'react';
import { ActiveBossSkillBanner } from '../../types/bossSkill';
import { BossThemeConfig } from '../../constants/game';

interface BossAlertBannerProps {
  isRoarActive: boolean;
  themeConfig: BossThemeConfig;
  activeBossSkillBanner: ActiveBossSkillBanner | null;
  gameTheme: string;
  defaultRoarTextVi: string;
  /** The boss HP bar is shown right above the boss: sit above it. */
  isAboveHealthBar: boolean;
}

/**
 * BossAlertBanner is disabled to eliminate redundant visual clutter,
 * keeping the boss model, combat animations, and arena clear.
 */
export const BossAlertBanner: React.FC<BossAlertBannerProps> = React.memo(() => null);

BossAlertBanner.displayName = 'BossAlertBanner';
