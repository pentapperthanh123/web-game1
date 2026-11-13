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
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-950/80 border border-rose-500/30 text-[9px] leading-none animate-in fade-in slide-in-from-right-2 duration-200 max-w-full">
      <span className="shrink-0">💀</span>
      <span className={`font-black truncate ${teamTheme.textClass}`}>{entry.championName}</span>
      <span className="text-slate-400 truncate">@{entry.summonerName}</span>
      <span className="text-rose-300/90 truncate">
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

/** "QUÉT SẠCH" stamp after a boss action kills several champions at once. */
export const WipeStamp = React.memo(() => {
  const { t } = useTranslation();
  const wipeAt = useCombatMomentStore((state) => state.wipeAt);
  const wipeKillCount = useCombatMomentStore((state) => state.wipeKillCount);
  const now = useNow(KILL_FEED_TICK_MS);
  const isVisible = wipeAt > 0 && now - wipeAt < COMBAT_MOMENT_CONSTANTS.WIPE_STAMP_MS;
  if (!isVisible) return null;

  return (
    <div key={wipeAt} className="pointer-events-none select-none animate-wipe-stamp text-center">
      <div className="text-2xl font-black tracking-widest text-rose-400 drop-shadow-[0_0_14px_rgba(244,63,94,0.85)] [-webkit-text-stroke:1px_#fff1f2]">
        {t('KillFeed.wipeTitle', 'QUÉT SẠCH!')}
      </div>
      <div className="text-[11px] font-bold text-rose-100">
        {t('KillFeed.wipeSubtitle', { defaultValue: '{{count}} tướng gục ngã', count: wipeKillCount })}
      </div>
    </div>
  );
});
WipeStamp.displayName = 'WipeStamp';
