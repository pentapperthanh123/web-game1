import React from 'react';
import { Lock } from 'lucide-react';
import { BossSkillDefinition } from '../../../types/bossSkill';
import { buildSkillColorVars, getSkillIcon } from './bossSkillStyle';

interface BossSkillChipProps {
  skill: BossSkillDefinition;
  label: string;
  isLocked: boolean;
  /** Timestamp of the cast while this skill is the active one, 0 otherwise. */
  castAt: number;
}

/** One skill of the current boss: icon + name, dimmed while phase-locked, flashes when cast. */
export const BossSkillChip = React.memo(({ skill, label, isLocked, castAt }: BossSkillChipProps) => {
  const SkillIcon = getSkillIcon(skill.iconName);
  const isActive = castAt > 0;
  const stateClass = [isLocked ? 'is-locked' : '', isActive ? 'is-active' : ''].join(' ');

  return (
    <li
      style={buildSkillColorVars(skill.color)}
      className={`boss-skill-glass boss-skill-chip ${stateClass} flex-1 min-w-0 rounded-md px-1 py-[3px]`}
    >
      {isActive && <span key={`sweep-${castAt}`} className="boss-skill-chip-cast" aria-hidden="true" />}
      <div
        key={`body-${castAt}`}
        className={`relative h-full flex items-center justify-center gap-1 ${isActive ? 'boss-skill-chip-pop' : ''}`}
      >
        <SkillIcon className="w-3 h-3 shrink-0" style={{ color: skill.color }} aria-hidden="true" />
        <span
          className={`line-clamp-2 text-center text-[8px] sm:text-[9px] leading-[1.15] font-black uppercase tracking-wide ${
            skill.isUltimate ? 'text-amber-200' : 'text-slate-100'
          }`}
        >
          {label}
        </span>
        {isLocked && <Lock className="w-2.5 h-2.5 shrink-0 text-slate-400" aria-hidden="true" />}
      </div>
    </li>
  );
});

BossSkillChip.displayName = 'BossSkillChip';
