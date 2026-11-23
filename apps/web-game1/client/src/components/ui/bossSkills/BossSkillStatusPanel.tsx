import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatHpMultiplier } from '../../../constants/bossProfiles';
import { useActiveBossProfile } from '../../../hooks/useActiveBossProfile';
import { getCastableSkillIndexes } from '../../../store/bossSkillResolver';
import { useGameStore } from '../../../store/gameStore';
import { BossSkillChip } from './BossSkillChip';
import { buildSkillColorVars } from './bossSkillStyle';
import './bossSkills.css';

/**
 * Esports-style strip under the boss HP bar: HP scale of the boss + its 4 skills.
 * Follows the boss switch through `useActiveBossProfile`; re-renders only on boss switch,
 * phase change or a skill cast (never per hit).
 */
export const BossSkillStatusPanel = React.memo(() => {
  const { t, i18n } = useTranslation();
  const profile = useActiveBossProfile();
  const bossPhase = useGameStore((state) => state.bossPhase);
  const isPhaseLockEnabled = useGameStore((state) => state.bossSkillConfig.phaseLockEnabled);
  const activeSkillId = useGameStore((state) => state.activeBossSkillBanner?.skillId ?? null);
  const activeCastAt = useGameStore((state) => state.activeBossSkillBanner?.timestamp ?? 0);

  const castableIndexes = useMemo(
    () => new Set(getCastableSkillIndexes([...profile.skills], bossPhase, isPhaseLockEnabled)),
    [profile, bossPhase, isPhaseLockEnabled]
  );
  const isVietnamese = i18n.language.startsWith('vi');

  return (
    <div
      style={buildSkillColorVars(profile.themeColor)}
      aria-label={t('BossSkills.panelLabel', 'Chiêu thức của Boss')}
      className="w-full max-w-lg mx-auto px-2 sm:px-3 pt-1 flex items-stretch gap-1 select-none"
    >
      <div className="boss-skill-glass shrink-0 rounded-md px-1.5 flex items-center">
        <span className="text-[8px] sm:text-[9px] font-black tracking-wider" style={{ color: profile.themeColor }}>
          {t('BossSkills.hpMultiplier', 'HP ×{{value}}', { value: formatHpMultiplier(profile.hpMultiplier) })}
        </span>
      </div>
      <ul className="flex-1 min-w-0 flex items-stretch gap-1">
        {profile.skills.map((skill, index) => (
          <BossSkillChip
            key={skill.id}
            skill={skill}
            label={isVietnamese ? skill.vietnameseName : skill.name}
            isLocked={!castableIndexes.has(index)}
            castAt={skill.id === activeSkillId ? activeCastAt : 0}
          />
        ))}
      </ul>
    </div>
  );
});

BossSkillStatusPanel.displayName = 'BossSkillStatusPanel';
