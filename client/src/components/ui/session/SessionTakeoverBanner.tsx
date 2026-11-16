import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SESSION_LEADERBOARD_CONSTANTS, SESSION_TIER } from '../../../constants/sessionLeaderboard';
import { SessionTierEmblem } from './SessionTierBadge';
import { getTeamTheme } from '../../../constants/teams';
import { SFX_EVENT } from '../../../constants/sfx';
import { playSound } from '../../../services/soundManager';
import { dismissSessionTakeover, useSessionLeaderboardStore } from '../../../store/sessionLeaderboardStore';

/** "X soán ngôi Thách Đấu!" — shown when the session #1 changes hands, to fuel the race for the top. */
export const SessionTakeoverBanner = React.memo(() => {
  const { t } = useTranslation();
  const takeover = useSessionLeaderboardStore((state) => state.takeover);

  useEffect(() => {
    if (!takeover) return undefined;
    playSound(SFX_EVENT.COMBO_LEVEL_UP);
    const timer = setTimeout(() => dismissSessionTakeover(takeover.id), SESSION_LEADERBOARD_CONSTANTS.TAKEOVER_BANNER_MS);
    return () => clearTimeout(timer);
  }, [takeover]);

  if (!takeover) return null;
  const teamTheme = getTeamTheme(takeover.colorTheme);

  return (
    <div
      key={takeover.id}
      className="flex items-center gap-2 max-w-[300px] px-2.5 py-1 rounded-xl border border-amber-300/80 bg-gradient-to-r from-amber-950/95 via-slate-950/95 to-amber-950/95 shadow-[0_0_14px_rgba(251,191,36,0.45)] animate-in fade-in zoom-in-95 duration-300"
    >
      <SessionTierEmblem tier={SESSION_TIER.CHALLENGER} className="w-5 h-5 animate-bounce" />
      <div className="min-w-0 leading-tight">
        <p className="text-[11px] font-black text-amber-200 truncate">
          {t('SessionBoard.takeoverTitle', { defaultValue: '{{name}} soán ngôi Thách Đấu!', name: takeover.userName })}
        </p>
        <p className="text-[9px] font-bold text-slate-300 truncate">
          <span className={`mr-1 px-1 rounded text-[8px] font-black ${teamTheme.badgePillClass}`}>{takeover.teamTag}</span>
          {t('SessionBoard.takeoverSubtitle', {
            defaultValue: 'Vượt mặt {{previous}} — ai giành lại ngôi đầu?',
            previous: takeover.previousUserName,
          })}
        </p>
      </div>
    </div>
  );
});

SessionTakeoverBanner.displayName = 'SessionTakeoverBanner';
