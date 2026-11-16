import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Crown, Zap } from 'lucide-react';
import { getChampionAvatarUrl } from '../../../constants/roster';
import { DuelFighter } from '../../../types/game';
import { TeamColorPalette } from '../../../types/team';

const CARD_BORDER_ALPHA = '99';
const LEADING_GLOW_ALPHA = '88';
const IDLE_GLOW_ALPHA = '33';
const LEADING_GLOW_PX = 30;
const IDLE_GLOW_PX = 14;

interface DuelFighterCardProps {
  fighter: DuelFighter;
  teamTag: string;
  theme: TeamColorPalette;
  isLeading: boolean;
  /** The duel is over and this side won: the badge reads "winner" instead of "leading". */
  isWinner: boolean;
}

/** One duelist: big portrait, name, team tag and champion; glows while its side is ahead. */
export const DuelFighterCard = ({ fighter, teamTag, theme, isLeading, isWinner }: DuelFighterCardProps) => {
  const { t } = useTranslation();
  const [hasAvatarFailed, setHasAvatarFailed] = useState(false);
  const avatarUrl = hasAvatarFailed ? getChampionAvatarUrl(fighter.champion, fighter.team) : fighter.avatarUrl;
  const accent = theme.primaryHex;

  return (
    <div
      style={{
        borderColor: `${accent}${CARD_BORDER_ALPHA}`,
        boxShadow: isLeading
          ? `0 0 ${LEADING_GLOW_PX}px ${accent}${LEADING_GLOW_ALPHA}`
          : `0 0 ${IDLE_GLOW_PX}px ${accent}${IDLE_GLOW_ALPHA}`,
      }}
      className={clsx(
        'relative flex-1 min-w-0 flex flex-col items-center gap-2 rounded-2xl border-2 bg-slate-900/75 px-2 pt-3 pb-2.5 transition-transform duration-300',
        isLeading && 'scale-[1.04]'
      )}
    >
      <div style={{ borderColor: accent }} className="w-20 h-20 rounded-2xl overflow-hidden border-2 bg-slate-950 shrink-0">
        <img
          src={avatarUrl}
          alt={fighter.name}
          className="w-full h-full object-cover"
          onError={() => setHasAvatarFailed(true)}
        />
      </div>

      <div className="w-full text-center leading-tight">
        <div className="text-base font-black text-white truncate">{fighter.name}</div>
        <div className="mt-1 flex items-center justify-center gap-1.5 min-w-0">
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-black shrink-0 ${theme.bgBadgeClass}`}>{teamTag}</span>
          <span style={{ color: accent }} className="flex items-center gap-0.5 text-xs font-bold truncate min-w-0">
            <Zap className="w-3 h-3 shrink-0" />
            <span className="truncate">{fighter.champion}</span>
          </span>
        </div>
      </div>

      {/* Fixed-height slot so the cards do not jump when the lead changes */}
      <div className="h-5 flex items-center">
        <span
          style={{ backgroundColor: accent }}
          className={clsx(
            'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black text-slate-950 uppercase transition-opacity duration-300',
            isLeading ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Crown className="w-3 h-3 shrink-0" />
          {isWinner ? t('SilverScrapes.winnerBadge', 'Chiến thắng') : t('SilverScrapes.leading', 'Đang áp đảo')}
        </span>
      </div>
    </div>
  );
};
