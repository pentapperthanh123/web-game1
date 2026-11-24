import React from 'react';
import type { TeamPresetConfig } from '../../../shared/types/clash';
import { getEffectivePreset, useClashStore } from '../store/clashStore';
import { useClashText } from '../i18n/clashText';

type TeamConfig = TeamPresetConfig['leftTeam'];

const TEXT_OUTLINE = '0 2px 0 #000, 0 -1px 0 #000, 1px 0 0 #000, -1px 0 0 #000, 0 3px 8px rgba(0,0,0,0.6)';

/** "Gõ [G] theo GIRL": the key sits in a big badge in the team color so it reads at a glance. */
const TeamJoinHint: React.FC<{ team: TeamConfig; typeLabel: string; forLabel: string }> = ({
  team,
  typeLabel,
  forLabel,
}) => {
  const key = team.keywords[0]?.toUpperCase() ?? '?';
  return (
    <span className="flex items-center gap-2 whitespace-nowrap">
      <span>{typeLabel}</span>
      <span
        className="inline-flex items-center justify-center min-w-[52px] h-[52px] px-2 rounded-2xl border-[3px] border-white text-[34px] leading-none font-black text-white shadow-lg"
        style={{ backgroundColor: team.primaryColor, boxShadow: `0 0 18px ${team.primaryColor}` }}
      >
        {key}
      </span>
      <span>{forLabel}</span>
      <span style={{ color: team.primaryColor }}>{team.name}</span>
    </span>
  );
};

export const GuidanceBanner: React.FC = () => {
  const text = useClashText();
  const preset = useClashStore((s) => getEffectivePreset(s.activePresetId, s.customPreset));

  return (
    <div className="absolute top-[920px] inset-x-0 z-30 pointer-events-none flex justify-center px-3">
      <div
        className="bg-black/85 border-2 border-white/40 px-6 py-3 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-4 text-[26px] font-black text-white tracking-wide"
        style={{ textShadow: TEXT_OUTLINE }}
      >
        <TeamJoinHint team={preset.leftTeam} typeLabel={text.guidanceType} forLabel={text.guidanceFor} />
        <span className="text-[28px]">⚔️</span>
        <TeamJoinHint team={preset.rightTeam} typeLabel={text.guidanceType} forLabel={text.guidanceFor} />
      </div>
    </div>
  );
};
