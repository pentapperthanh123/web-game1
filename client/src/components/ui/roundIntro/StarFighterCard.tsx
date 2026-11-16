import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flame } from 'lucide-react';
import { TeamProfile } from '../../../types/team';
import { TeamType } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { getChampionAvatarUrl } from '../../../constants/roster';
import { TeamLogo } from '../../icons/TeamLogos';
import { IntroStar } from '../../../utils/introStar';

export const STAR_CARD_SIDE = {
  LEFT: 'left',
  RIGHT: 'right',
} as const;
export type StarCardSide = (typeof STAR_CARD_SIDE)[keyof typeof STAR_CARD_SIDE];

/** Everything that mirrors between the two cards, so both sides stay identical apart from direction. */
const SIDE_LAYOUT: Readonly<
  Record<StarCardSide, { wrapperClass: string; gradientAngle: string; watermarkClass: string }>
> = {
  [STAR_CARD_SIDE.LEFT]: {
    wrapperClass: 'justify-end animate-card-slam-left',
    gradientAngle: '135deg',
    watermarkClass: '-right-4 -bottom-6',
  },
  [STAR_CARD_SIDE.RIGHT]: {
    wrapperClass: 'justify-start animate-card-slam-right',
    gradientAngle: '225deg',
    watermarkClass: '-left-4 -bottom-6',
  },
};

interface StarFighterCardProps {
  team: TeamProfile;
  teamKey: TeamType;
  star: IntroStar;
  side: StarCardSide;
}

/**
 * Star player card of the pre-round cinematic. Stacked vertically and centred: on the 9:16 overlay
 * each card is ~200 px wide, too narrow for avatar + text side by side (team names wrapped).
 */
export const StarFighterCard: React.FC<StarFighterCardProps> = ({ team, teamKey, star, side }) => {
  const { t } = useTranslation();
  const theme = getTeamTheme(team.colorTheme);
  const layout = SIDE_LAYOUT[side];
  const fallbackAvatarUrl = getChampionAvatarUrl(star.signatureChampion, teamKey);

  return (
    <div className={`flex-1 flex z-20 min-w-0 ${layout.wrapperClass}`}>
      <div
        className="relative overflow-hidden w-full max-w-[220px] sm:max-w-xs rounded-3xl border-2 px-2.5 py-3 sm:p-5 shadow-2xl backdrop-blur-xl"
        style={{
          borderColor: `${theme.primaryHex}ee`,
          background: `linear-gradient(${layout.gradientAngle}, ${theme.primaryHex}45 0%, rgba(2, 6, 23, 0.94) 75%)`,
          boxShadow: `0 0 45px ${theme.primaryHex}60, inset 0 0 20px ${theme.primaryHex}30`,
        }}
      >
        {/* Team crest watermark */}
        <div className={`absolute w-28 h-28 opacity-15 pointer-events-none ${layout.watermarkClass}`}>
          <TeamLogo teamProfile={team} className="w-full h-full object-contain filter drop-shadow" />
        </div>

        {/* Light ray shimmer */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-25deg] animate-gold-shimmer" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center gap-1.5 min-w-0">
          {/* Avatar with the team badge on its corner */}
          <div className="relative shrink-0">
            <div
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 overflow-hidden shadow-xl"
              style={{ borderColor: theme.primaryHex }}
            >
              <img
                src={star.avatarUrl || fallbackAvatarUrl}
                alt={star.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = fallbackAvatarUrl;
                }}
              />
            </div>
            <div
              className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 border-2 shadow-md"
              style={{ borderColor: theme.primaryHex }}
            >
              <TeamLogo teamProfile={team} className="w-4 h-4 object-contain" />
            </div>
          </div>

          {/* Short team tag (full names like "GEN.G ESPORTS" wrapped) + role label, one line */}
          <div className="flex items-center justify-center gap-1 max-w-full whitespace-nowrap">
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] sm:text-[11px] font-black uppercase tracking-wider font-mono truncate"
              style={{
                backgroundColor: `${theme.primaryHex}35`,
                color: theme.primaryHex,
                border: `1px solid ${theme.primaryHex}80`,
              }}
              title={team.name}
            >
              {team.shortTag}
            </span>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-slate-400 shrink-0">
              {t('RoundIntro.starPlayer', 'NGÔI SAO')}
            </span>
          </div>

          <p className="max-w-full truncate text-lg sm:text-2xl font-black uppercase tracking-wider leading-tight drop-shadow-md text-white">
            {star.name}
          </p>

          <div className="flex items-center justify-center gap-1 max-w-full">
            <div className="p-0.5 rounded bg-amber-500/20 border border-amber-400/50 shrink-0">
              <Flame className="w-3 h-3 text-amber-400" />
            </div>
            <span className="text-xs sm:text-sm text-amber-200 font-extrabold truncate">{star.signatureChampion}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
