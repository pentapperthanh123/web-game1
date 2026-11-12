import { Activity, Crown, Play, Square } from 'lucide-react';
import { SeriesFormatConfig } from '../constants/series';
import { TeamColorPalette, TeamProfile } from '../constants/teams';
import { Bo5Score } from '../hooks/useAdminSocketSync';

interface AdminMatchControlSectionProps {
  visible: boolean;
  bossHp: number;
  seriesConfig: SeriesFormatConfig;
  currentRound: number;
  bo5Score: Bo5Score;
  leftTeam: TeamProfile;
  rightTeam: TeamProfile;
  leftTheme: TeamColorPalette;
  rightTheme: TeamColorPalette;
  isBotActive: boolean;
  botSpeed: number;
  onSetBossHp: (hp: number) => void;
  onBo5Control: (
    action: 'reset' | 'nextRound' | 'setScore',
    blg?: number,
    geng?: number,
    round?: number
  ) => void;
  onToggleBot: () => void;
  onBotSpeedChange: (speed: number) => void;
}

/**
 * Column 4 of the interaction grid: Boss HP slider/presets, BO series score controls,
 * and Comment Bot storm simulation toggle.
 */
export function AdminMatchControlSection({
  visible,
  bossHp,
  seriesConfig,
  currentRound,
  bo5Score,
  leftTeam,
  rightTeam,
  leftTheme,
  rightTheme,
  isBotActive,
  botSpeed,
  onSetBossHp,
  onBo5Control,
  onToggleBot,
  onBotSpeedChange,
}: AdminMatchControlSectionProps) {
  return (
    <div
      className={`p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 ${
        visible ? '' : 'hidden'
      }`}
    >
      <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
        <Activity className="w-4 h-4 text-purple-400" />
        <h2 className="text-xs font-black uppercase text-white">4. Máu Boss & Bão Bot</h2>
      </div>

      <div className="space-y-3.5">
        <div>
          <div className="flex justify-between text-[11px] font-semibold mb-1">
            <span className="text-slate-400">Điều chỉnh máu Boss</span>
            <span className="font-mono text-emerald-400 font-bold">
              {bossHp.toLocaleString()} HP
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100000"
            step="5000"
            value={bossHp}
            onChange={(e) => onSetBossHp(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="grid grid-cols-3 gap-1 mt-1.5">
            <button
              type="button"
              onClick={() => onSetBossHp(100000)}
              className="py-1 rounded bg-slate-800 text-[10px] font-bold text-slate-300 hover:text-white"
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => onSetBossHp(30000)}
              className="py-1 rounded bg-purple-950 text-[10px] font-bold text-purple-300 hover:text-white"
            >
              Cuồng Nộ
            </button>
            <button
              type="button"
              onClick={() => onSetBossHp(0)}
              className="py-1 rounded bg-rose-950 text-[10px] font-bold text-rose-300 hover:text-white"
            >
              Hạ Gục
            </button>
          </div>
        </div>

        {/* BO Series Match State & Controls */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center space-x-1">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Trận Đấu {seriesConfig.format} (Ván {currentRound}/{seriesConfig.maxRounds})
              </span>
            </span>
            <span className="font-mono text-xs font-black text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {leftTeam.shortTag} {bo5Score.BLG} - {bo5Score.GENG} {rightTeam.shortTag}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onBo5Control('setScore', bo5Score.BLG + 1, bo5Score.GENG)}
              className={`py-1 px-2 rounded text-[10px] font-bold transition active:scale-95 ${leftTheme.likeBtnClass}`}
            >
              +1 Ván {leftTeam.shortTag}
            </button>
            <button
              type="button"
              onClick={() => onBo5Control('setScore', bo5Score.BLG, bo5Score.GENG + 1)}
              className={`py-1 px-2 rounded text-[10px] font-bold transition active:scale-95 ${rightTheme.likeBtnClass}`}
            >
              +1 Ván {rightTeam.shortTag}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onBo5Control('nextRound')}
              className="py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold transition active:scale-95"
            >
              Ván Kế Tiếp ⏩
            </button>
            <button
              type="button"
              onClick={() => onBo5Control('reset')}
              className="py-1 px-2 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[10px] font-bold transition active:scale-95"
            >
              Reset {seriesConfig.format} (0-0)
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Bão Comment Bot</span>
            <button
              type="button"
              onClick={onToggleBot}
              className={`py-1 px-3 rounded-lg text-xs font-bold flex items-center space-x-1 ${
                isBotActive ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}
            >
              {isBotActive ? (
                <Square className="w-3 h-3 fill-current" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              <span>{isBotActive ? 'Dừng Bot' : 'Chạy Bot'}</span>
            </button>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-semibold text-slate-400 mb-1">
              <span>Tốc độ: {botSpeed} ms / lượt</span>
            </div>
            <input
              type="range"
              min="200"
              max="2000"
              step="100"
              value={botSpeed}
              onChange={(e) => onBotSpeedChange(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
