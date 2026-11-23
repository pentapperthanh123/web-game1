import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SESSION_TIER_STYLE, SESSION_TIER_UP_CONSTANTS } from '../../../constants/sessionLeaderboard';
import { SFX_EVENT } from '../../../constants/sfx';
import { playSound } from '../../../services/soundManager';
import { dismissSessionTierUp, useSessionLeaderboardStore } from '../../../store/sessionLeaderboardStore';
import { SessionTierEmblem } from './SessionTierBadge';

/** One-line "X thăng hạng Kim Cương!" for promotions to Diamond and up (Challenger uses the takeover banner). */
export const SessionTierUpBanner = React.memo(() => {
  const { t } = useTranslation();
  const tierUp = useSessionLeaderboardStore((state) => state.tierUp);

  useEffect(() => {
    if (!tierUp) return undefined;
    playSound(SFX_EVENT.SCORE_UP);
    const timer = setTimeout(() => dismissSessionTierUp(tierUp.id), SESSION_TIER_UP_CONSTANTS.BANNER_MS);
    return () => clearTimeout(timer);
  }, [tierUp]);

  if (!tierUp) return null;
  const style = SESSION_TIER_STYLE[tierUp.tier];
  const tierLabel = t(style.labelKey, style.fallbackLabel);

  return (
    <div
      key={tierUp.id}
      className="flex items-center gap-1.5 max-w-[300px] px-2.5 py-0.5 rounded-full border bg-slate-950/90 text-[10.5px] font-black whitespace-nowrap animate-in fade-in zoom-in-95 duration-300"
      style={{ borderColor: style.light, boxShadow: `0 0 10px ${style.dark}` }}
    >
      <SessionTierEmblem tier={tierUp.tier} className="w-4 h-4" />
      <span className="truncate text-slate-100">
        {t('SessionBoard.tierUpTitle', { defaultValue: '{{name}} thăng hạng', name: tierUp.userName })}
      </span>
      <span className="uppercase shrink-0" style={{ color: style.light }}>
        {tierLabel}
      </span>
    </div>
  );
});

SessionTierUpBanner.displayName = 'SessionTierUpBanner';
