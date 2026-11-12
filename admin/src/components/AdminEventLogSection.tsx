import { MessageSquare, Trash2 } from 'lucide-react';
import { LogItem } from '../constants/adminPortal';
import { TeamColorPalette, TeamProfile } from '../constants/teams';

const LOG_TYPE_BADGE_MAP: Record<string, string> = {
  GIFT: 'bg-amber-950 text-amber-300 border border-amber-800',
  SUMMON: 'bg-cyan-950 text-cyan-300 border border-cyan-800',
  LIKE: 'bg-rose-950 text-rose-300 border border-rose-800',
};

const DEFAULT_LOG_BADGE = 'bg-slate-800 text-slate-300';

interface AdminEventLogSectionProps {
  visible: boolean;
  logs: LogItem[];
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
  leftTheme: TeamColorPalette;
  rightTheme: TeamColorPalette;
  onClearLogs: () => void;
}

/**
 * Displays the live feed of admin actions, summon/gift/like events, and system logs.
 */
export function AdminEventLogSection({
  visible,
  logs,
  leftTeam,
  rightTeam,
  leftTheme,
  rightTheme,
  onClearLogs,
}: AdminEventLogSectionProps) {
  return (
    <section
      id="section-logs"
      className={`scroll-mt-24 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 ${
        visible ? '' : 'hidden'
      }`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-bold uppercase text-white">
          <MessageSquare className="w-4 h-4 text-cyan-400" />
          <span>Nhật Ký Tương Tác Trực Tiếp (Live Feed)</span>
          <span className="text-[10px] font-mono text-slate-400">({logs.length} mục)</span>
        </div>
        <button
          type="button"
          onClick={onClearLogs}
          className="text-xs text-slate-400 hover:text-rose-400 flex items-center space-x-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa Log</span>
        </button>
      </div>

      <div className="h-44 overflow-y-auto space-y-1 font-mono text-xs pr-1">
        {logs.length === 0 ? (
          <p className="text-slate-500 italic py-4 text-center">
            Chưa có sự kiện nào. Hãy click vào các panel phía trên để gửi lệnh thử nghiệm!
          </p>
        ) : (
          logs.map((item) => {
            const badgeClass = LOG_TYPE_BADGE_MAP[item.type] || DEFAULT_LOG_BADGE;
            return (
              <div
                key={item.id}
                className="flex items-center space-x-2 py-1 px-2 rounded bg-slate-950/70 border border-slate-800/60"
              >
                <span className="text-[10px] text-slate-500">{item.time}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${badgeClass}`}>
                  {item.type}
                </span>
                {item.team && (
                  <span
                    className={`text-[9px] font-black ${
                      item.team === 'BLG'
                        ? leftTheme.textStrongClass
                        : rightTheme.textStrongClass
                    }`}
                  >
                    [{item.team === 'BLG' ? leftTeam.shortTag : rightTeam.shortTag}]
                  </span>
                )}
                <span className="text-slate-200 truncate">{item.message}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
