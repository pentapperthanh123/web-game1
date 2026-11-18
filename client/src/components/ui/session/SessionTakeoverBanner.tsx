import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';
import { SESSION_LEADERBOARD_CONSTANTS, SESSION_TIER } from '../../../constants/sessionLeaderboard';
import { SessionTierEmblem } from './SessionTierBadge';
import { getTeamTheme } from '../../../constants/teams';
import { SFX_EVENT } from '../../../constants/sfx';
import { playSound } from '../../../services/soundManager';
import {
  dismissSessionTakeover,
  useSessionLeaderboardStore,
} from '../../../store/sessionLeaderboardStore';

/** "X soán ngôi Thách Đấu!" — Hextech Challenger Ribbon shown when Session #1 changes hands. */
export const SessionTakeoverBanner = React.memo(() => {
  const { t } = useTranslation();
  const takeover = useSessionLeaderboardStore((state) => state.takeover);

  useEffect(() => {
    if (!takeover) return undefined;
    playSound(SFX_EVENT.COMBO_LEVEL_UP);
    const timer = setTimeout(
      () => dismissSessionTakeover(takeover.id),
      SESSION_LEADERBOARD_CONSTANTS.TAKEOVER_BANNER_MS
    );
    return () => clearTimeout(timer);
  }, [takeover]);

  if (!takeover) return null;
  const teamTheme = getTeamTheme(takeover.colorTheme);

  return (
    <div
      key={takeover.id}
      className="relative flex items-center justify-center max-w-[348px] w-full animate-in fade-in zoom-in-95 duration-300"
    >
      {/* Left Hextech Gold Accent Fin */}
      <div className="hidden sm:block w-2.5 h-7 -mr-1 bg-amber-400/75 skew-x-[20deg] rounded-l border-l border-amber-200 pointer-events-none" />

      <div
        style={{
          boxShadow: `0 0 22px rgba(251, 191, 36, 0.45), inset 0 0 14px ${teamTheme.primaryHex}35`,
        }}
        className="relative flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-amber-300/85 bg-gradient-to-r from-amber-950/96 via-slate-950/96 to-amber-950/96 backdrop-blur-xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/15 to-transparent animate-gift-shimmer pointer-events-none" />

        <div className="relative shrink-0 w-7 h-7 rounded-lg bg-slate-900/95 border border-amber-300/70 flex items-center justify-center shadow-[0_0_10px_rgba(251,191,36,0.5)]">
          <SessionTierEmblem tier={SESSION_TIER.CHALLENGER} className="w-5 h-5 animate-bounce" />
        </div>

        <div className="flex-1 min-w-0 leading-tight">
          <div className="flex items-center gap-1 min-w-0">
            <Crown className="w-3 h-3 fill-current text-amber-400 shrink-0" />
            <p className="text-[11px] font-black bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-300 bg-clip-text text-transparent truncate">
              {t('SessionBoard.takeoverTitle', {
                defaultValue: '{{name}} soán ngôi Thách Đấu!',
                name: takeover.userName,
              })}
            </p>
          </div>
          <p className="text-[9.5px] font-bold text-slate-300 truncate mt-0.5">
            <span
              className={`mr-1 px-1.5 py-0.2 rounded text-[8px] font-black uppercase ${teamTheme.badgePillClass}`}
            >
              {takeover.teamTag}
            </span>
            {t('SessionBoard.takeoverSubtitle', {
              defaultValue: 'Vượt mặt {{previous}} — ai giành lại ngôi đầu?',
              previous: takeover.previousUserName,
            })}
          </p>
        </div>
      </div>

      {/* Right Hextech Gold Accent Fin */}
      <div className="hidden sm:block w-2.5 h-7 -ml-1 bg-amber-400/75 skew-x-[-20deg] rounded-r border-r border-amber-200 pointer-events-none" />
    </div>
  );
});

SessionTakeoverBanner.displayName = 'SessionTakeoverBanner';
