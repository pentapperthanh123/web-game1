import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Crown, Swords, Zap } from 'lucide-react';
import { getChampionAvatarUrl } from '../../../constants/roster';
import { DuelFighter } from '../../../types/game';
import { TeamColorPalette } from '../../../types/team';

const CARD_BORDER_ALPHA = 'aa';
const LEADING_GLOW_ALPHA = '99';
const IDLE_GLOW_ALPHA = '33';
const LEADING_GLOW_PX = 32;
const IDLE_GLOW_PX = 14;

interface DuelFighterCardProps {
  fighter: DuelFighter;
  teamTag: string;
  theme: TeamColorPalette;
  isLeading: boolean;
  /** The duel is over and this side won: the badge reads "winner" instead of "leading". */
  isWinner: boolean;
}

/** One duelist card: stylized portrait with champion badge, team tag, player name, and active status. */
export const DuelFighterCard: React.FC<DuelFighterCardProps> = React.memo(
  ({ fighter, teamTag, theme, isLeading, isWinner }) => {
    const { t } = useTranslation();
    const [hasAvatarFailed, setHasAvatarFailed] = useState(false);
    const championAvatarUrl = getChampionAvatarUrl(fighter.champion, fighter.team);
    const avatarUrl = hasAvatarFailed ? championAvatarUrl : fighter.avatarUrl;
    const isShowingPlayerPhoto = !hasAvatarFailed && fighter.avatarUrl !== championAvatarUrl;
    const accent = theme.primaryHex;

    const renderStatusBadge = () => {
      if (isWinner) {
        return (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.8)]">
            <Crown className="w-3 h-3 shrink-0" />
            {t('SilverScrapes.winnerBadge', 'Chiến thắng')}
          </span>
        );
      }

      if (isLeading) {
        return (
          <span
            style={{ backgroundColor: accent }}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase text-slate-950 shadow-[0_0_14px_rgba(255,255,255,0.7)] animate-pulse"
          >
            <Crown className="w-3 h-3 shrink-0" />
            {t('SilverScrapes.leading', 'Đang áp đảo')}
          </span>
        );
      }

      return (
        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold text-slate-400 bg-slate-950/60 border border-slate-700/50">
          <Swords className="w-2.5 h-2.5 text-slate-500 shrink-0" />
          <span>1V1</span>
        </span>
      );
    };

    return (
      <div
        style={{
          borderColor: `${accent}${CARD_BORDER_ALPHA}`,
          boxShadow: isLeading
            ? `0 0 ${LEADING_GLOW_PX}px ${accent}${LEADING_GLOW_ALPHA}`
            : `0 0 ${IDLE_GLOW_PX}px ${accent}${IDLE_GLOW_ALPHA}`,
        }}
        className={clsx(
          'relative flex-1 min-w-0 flex flex-col items-center gap-2 rounded-2xl border-2 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 px-2 pt-2.5 pb-2.5 backdrop-blur-md transition-all duration-300',
          isLeading && 'scale-[1.03] ring-1 ring-white/30'
        )}
      >
        {/* Top Badges Row: Team Tag & Status */}
        <div className="w-full flex items-center justify-between gap-1 px-1">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-black tracking-wider shadow-sm ${theme.bgBadgeClass}`}>
            {teamTag}
          </span>
          <div className="h-5 flex items-center">{renderStatusBadge()}</div>
        </div>

        {/* Duelist Avatar Frame with Champion Icon Overlay */}
        <div className="relative">
          <div
            style={{ borderColor: accent }}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 bg-slate-950 shadow-inner shrink-0"
          >
            <img
              src={avatarUrl}
              alt={fighter.name}
              className="w-full h-full object-cover"
              onError={() => setHasAvatarFailed(true)}
            />
          </div>

          {/* Sub-badge: Champion Portrait if player photo is showing */}
          {isShowingPlayerPhoto && (
            <div
              style={{ borderColor: accent }}
              className="absolute -bottom-1 -right-1 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 bg-slate-950 overflow-hidden shadow-lg ring-1 ring-black"
              title={fighter.champion}
            >
              <img
                src={championAvatarUrl}
                alt={fighter.champion}
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Player Name & Champion Title */}
        <div className="w-full text-center leading-tight space-y-0.5">
          <div className="text-base sm:text-lg font-black text-white tracking-wide uppercase truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            {fighter.name}
          </div>
          <div
            style={{ color: accent }}
            className="flex items-center justify-center gap-1 text-xs font-bold truncate drop-shadow"
          >
            <Zap className="w-3 h-3 shrink-0" />
            <span className="truncate">{fighter.champion}</span>
          </div>
        </div>
      </div>
    );
  }
);

DuelFighterCard.displayName = 'DuelFighterCard';

