import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useCombatMomentStore, COMBAT_MOMENT_CONSTANTS } from '../../store/combatMomentStore';
import { getTeamTheme } from '../../constants/teams';
import { DefeatedChampionEntity } from '../../types/game';

const KILL_FEED_MAX_ROWS = 3;
const KILL_FEED_VISIBLE_MS = 4000;
const KILL_FEED_TICK_MS = 500;

/** Re-renders on a slow tick so rows drop off after KILL_FEED_VISIBLE_MS without a store update. */
const useNow = (tickMs: number): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(intervalId);
  }, [tickMs]);
  return now;
};

const KillRow = ({ entry }: { entry: DefeatedChampionEntity }) => {
  const { t } = useTranslation();
  const colorTheme = useGameStore((state) => state.activeTeams[entry.team]?.colorTheme);
  const teamTheme = getTeamTheme(colorTheme);
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/95 border border-rose-500/60 text-[11px] sm:text-xs leading-tight animate-in fade-in slide-in-from-right-2 duration-200 max-w-full shadow-lg">
      <span className="shrink-0 text-xs">💀</span>
      <span className={`font-black truncate ${teamTheme.textClass}`}>{entry.championName}</span>
      <span className="text-amber-300 font-bold truncate">@{entry.summonerName}</span>
      <span className="text-rose-200 font-semibold truncate">
        {t('KillFeed.byKiller', { defaultValue: '— {{killer}}', killer: entry.killerName })}
      </span>
    </div>
  );
};

/** Latest champion deaths, newest on top. */
export const KillFeed = React.memo(() => {
  const defeated = useGameStore((state) => state.activeDefeatedChampions);
  const now = useNow(KILL_FEED_TICK_MS);
  const recent = defeated
    .filter((entry) => now - entry.createdAt < KILL_FEED_VISIBLE_MS)
    .slice(-KILL_FEED_MAX_ROWS)
    .reverse();
  if (recent.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-0.5 pointer-events-none select-none">
      {recent.map((entry) => (
        <KillRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
});
KillFeed.displayName = 'KillFeed';

/** "QUÉT SẠCH / ACE" stamp after the arena is cleared of champions or an instant wipe occurs. */
export const WipeStamp = React.memo(() => {
  const { t } = useTranslation();
  const wipeAt = useCombatMomentStore((state) => state.wipeAt);
  const wipeKillCount = useCombatMomentStore((state) => state.wipeKillCount);
  const now = useNow(100);
  const isVisible = wipeAt > 0 && now - wipeAt < COMBAT_MOMENT_CONSTANTS.WIPE_STAMP_MS;
  if (!isVisible) return null;

  return (
    <div key={wipeAt} className="pointer-events-none select-none animate-wipe-stamp text-center my-1 transform-gpu">
      <div className="relative inline-flex flex-col items-center px-6 py-2 rounded-2xl bg-slate-950/95 border-2 border-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.75),inset_0_1px_2px_rgba(255,255,255,0.3)]">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-32 h-0.5 bg-gradient-to-r from-transparent via-rose-300 to-transparent" />
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-black px-2 py-0.5 rounded bg-rose-600 text-white tracking-widest shadow-md">
            ACE
          </span>
          <span className="text-2xl sm:text-3xl font-black tracking-widest text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] [text-shadow:0_0_20px_rgba(244,63,94,1),0_2px_4px_rgba(0,0,0,0.95)]">
            {t('KillFeed.wipeTitle', 'QUÉT SẠCH!')}
          </span>
          <span className="text-[11px] font-black px-2 py-0.5 rounded bg-rose-600 text-white tracking-widest shadow-md">
            ACE
          </span>
        </div>
        <div className="mt-1 text-xs font-bold text-rose-200 drop-shadow-sm flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-400 animate-ping" />
          {wipeKillCount > 0
            ? t('KillFeed.wipeSubtitle', { defaultValue: '{{count}} tướng gục ngã — Sàn đấu trống!', count: wipeKillCount })
            : t('KillFeed.wipeEmptyField', 'Toàn bộ tướng đã gục ngã — Sàn đấu trống!')}
        </div>
      </div>
    </div>
  );
});
WipeStamp.displayName = 'WipeStamp';
