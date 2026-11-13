import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { usePlayerLeaderboardStore } from '../../../store/playerLeaderboardStore';

const WEEKLY_ROWS_SHOWN = 5;
const COMPACT_NUMBER = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });

/** Persistent weekly viewer ranking (from the server); hidden until the server has data. */
export const VictoryWeeklyBoardCard = () => {
  const { t } = useTranslation();
  const weekly = usePlayerLeaderboardStore((state) => state.weekly);
  if (weekly.length === 0) return null;

  return (
    <div className="p-2.5 rounded-xl bg-slate-900/75 border border-slate-800/90 shadow-lg space-y-1">
      <div className="flex items-center justify-center gap-1 text-[10px] font-black text-cyan-300 uppercase tracking-wider">
        <Trophy className="w-3 h-3 text-cyan-400" />
        <span>{t('LiveHud.weeklyBoardTitle', 'BẢNG XẾP HẠNG TUẦN')}</span>
      </div>
      <ol className="space-y-0.5">
        {weekly.slice(0, WEEKLY_ROWS_SHOWN).map((entry, index) => (
          <li key={entry.userName} className="flex items-center gap-1.5 text-[10px]">
            <span className="w-4 text-right font-mono font-black text-slate-400">{index + 1}</span>
            <span className="flex-1 min-w-0 truncate font-bold text-slate-100">{entry.userName}</span>
            <span className="font-mono text-emerald-300">{COMPACT_NUMBER.format(entry.totalDamage)}</span>
            <span className="font-mono text-amber-300 w-8 text-right">
              {t('LiveHud.mvpCount', { defaultValue: '{{count}} MVP', count: entry.mvpCount })}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};
