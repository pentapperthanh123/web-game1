import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { buildSkillColorVars } from './bossSkillStyle';
import './bossSkills.css';

/**
 * Full-screen feedback for a boss skill cast (screen shake itself is triggered by `castBossSkill`):
 * every cast pulses the screen edges in the skill colour, ultimates also pop their name in the centre.
 * Re-keyed per cast, so the CSS animations restart without any timer or per-frame JS.
 */
export const BossSkillCastLayer = React.memo(() => {
  const { t, i18n } = useTranslation();
  const activeCast = useGameStore((state) => state.activeBossSkillBanner);
  if (!activeCast) return null;

  const skillName = i18n.language.startsWith('vi') ? activeCast.vietnameseName : activeCast.skillName;

  return (
    <div
      key={activeCast.timestamp}
      style={buildSkillColorVars(activeCast.color)}
      className="absolute inset-0 z-[45] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      <div className={`boss-cast-vignette ${activeCast.isUltimate ? 'is-ultimate' : ''}`} />
      {activeCast.isUltimate && (
        <div className="boss-ultimate-callout w-[92%] max-w-sm flex flex-col items-center gap-1 text-center">
          <span className="px-2 py-0.5 rounded bg-rose-600 text-[9px] font-black tracking-[0.2em] text-white uppercase">
            {t('Combat.ultimateSkill', 'CHIÊU CUỐI!')}
          </span>
          <div className="boss-ultimate-callout-streak w-full" />
          <span className="boss-ultimate-callout-name text-2xl sm:text-3xl font-black uppercase italic tracking-wide text-white leading-tight">
            {skillName}
          </span>
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: activeCast.color }}>
            {activeCast.bossName}
          </span>
          <div className="boss-ultimate-callout-streak w-full" />
        </div>
      )}
    </div>
  );
});

BossSkillCastLayer.displayName = 'BossSkillCastLayer';
