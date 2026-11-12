import { useState, useEffect } from 'react';
import {
  Swords,
  Play,
  Square,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';
import { adminSocket } from '../services/socket';
import {
  SeriesFormat,
  SeriesFormatConfig,
  SilverScrapesDuelState,
  DEFAULT_SERIES_CONFIG,
  DEFAULT_DUEL_STATE,
  DuelLaneKey,
} from '../constants/series';

const LANE_OPTIONS: { key: DuelLaneKey; label: string }[] = [
  { key: 'MID', label: 'Đường Giữa (Mid)' },
  { key: 'TOP', label: 'Đường Trên (Top)' },
  { key: 'JUG', label: 'Đi Rừng (Jungle)' },
  { key: 'ADC', label: 'Xạ Thủ (ADC)' },
  { key: 'SUP', label: 'Hỗ Trợ (Support)' },
];

export function SilverScrapesControls() {
  const [seriesConfig, setSeriesConfig] = useState<SeriesFormatConfig>(DEFAULT_SERIES_CONFIG);
  const [duelState, setDuelState] = useState<SilverScrapesDuelState>(DEFAULT_DUEL_STATE);
  const [resetOnSwitch, setResetOnSwitch] = useState<boolean>(true);

  useEffect(() => {
    const unsubSeries = adminSocket.onSeriesFormat((cfg) => {
      setSeriesConfig(cfg);
    });

    const unsubDuel = adminSocket.onSilverScrapesState((st) => {
      setDuelState(st);
    });

    return () => {
      unsubSeries();
      unsubDuel();
    };
  }, []);

  const handleSelectFormat = (format: SeriesFormat) => {
    adminSocket.setSeriesFormat(format, resetOnSwitch);
  };

  const handleStartDuel = () => {
    adminSocket.setSilverScrapesControl('start', duelState.selectedLane, 60);
  };

  const handleStopDuel = () => {
    adminSocket.setSilverScrapesControl('stop');
  };

  const handleExtendDuel = () => {
    adminSocket.setSilverScrapesControl('extend');
  };

  const handleSelectLane = (lane: DuelLaneKey) => {
    adminSocket.setSilverScrapesControl('setLane', lane);
  };

  const tugPercent = Math.max(0, Math.min(100, duelState.tugOfWarPercent));

  return (
    <section className="p-3.5 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl backdrop-blur-sm space-y-4">
      {/* 1. Header with Title & Live Duel Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-slate-800/80 gap-3">
        <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-amber-950/80 border border-amber-800/80 text-amber-400 shrink-0">
            <Swords className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              <h2 className="text-xs sm:text-base font-bold text-white leading-tight">
                8. Cấu Hình Thể Thức (BO1/BO3/BO5) & Silver Scrapes 1v1
              </h2>
              <span
                className={`shrink-0 whitespace-nowrap text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-mono font-semibold border ${
                  duelState.isActive
                    ? 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {duelState.isActive
                  ? `ĐANG ĐỐI ĐẦU (⏱ 00:${duelState.timeRemaining < 10 ? '0' : ''}${duelState.timeRemaining})`
                  : 'SẴN SÀNG'}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
              Chuyển đổi BO1/BO3/BO5 và kích hoạt trận 1v1 kéo co giành Chiến Công Đầu Ván Quyết Định
            </p>
          </div>
        </div>

        {/* Duel Quick Actions */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {duelState.isActive ? (
            <>
              <button
                type="button"
                onClick={handleExtendDuel}
                className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700 text-xs font-bold text-amber-300 flex items-center space-x-1.5 transition active:scale-95"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>+30s Bù Giờ</span>
              </button>
              <button
                type="button"
                onClick={handleStopDuel}
                className="flex-1 sm:flex-initial justify-center px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white flex items-center space-x-1.5 transition active:scale-95"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Dừng Ngay</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartDuel}
              className="flex-1 sm:flex-initial justify-center px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center space-x-1.5 transition active:scale-95 shadow-md shadow-emerald-950"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Bắt Đầu 1v1 (60s)</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Format Selector (BO1 / BO3 / BO5) */}
      <div className="p-3 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Thể Thức Loạt Trận Hiện Tại:</span>
          </div>

          <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={resetOnSwitch}
              onChange={(e) => setResetOnSwitch(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span>Reset điểm về 0 - 0 khi đổi thể thức</span>
          </label>
        </div>

        {/* Format Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {(['BO1', 'BO3', 'BO5'] as SeriesFormat[]).map((fmt) => {
            const isSelected = seriesConfig.format === fmt;
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => handleSelectFormat(fmt)}
                className={`py-2 px-3 rounded-xl border text-center transition active:scale-95 ${
                  isSelected
                    ? 'bg-cyan-950/90 border-cyan-500 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.3)] font-black'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 font-bold'
                }`}
              >
                <div className="text-sm sm:text-base">{fmt}</div>
                <div className="text-[10px] text-slate-400">
                  {fmt === 'BO1' && '1 ván duy nhất'}
                  {fmt === 'BO3' && 'Thắng 2 (Hòa 1-1 Solo)'}
                  {fmt === 'BO5' && 'Thắng 3 (Hòa 2-2 Solo)'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 1v1 Duel Fighter & Lane Selection */}
      <div className="p-3 sm:p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Cặp Tuyển Thủ So Tài (Theo Vị Trí):</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {LANE_OPTIONS.map((lane) => {
              const isSelected = duelState.selectedLane === lane.key;
              return (
                <button
                  key={lane.key}
                  type="button"
                  onClick={() => handleSelectLane(lane.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                    isSelected
                      ? 'bg-amber-950 text-amber-300 border-amber-600 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {lane.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Realtime Tug of War Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-cyan-400">
              {duelState.leftFighter.name} ({duelState.leftFighter.champion}): {tugPercent.toFixed(1)}%
            </span>
            <span className="text-amber-400">
              {(100 - tugPercent).toFixed(1)}% : {duelState.rightFighter.name} ({duelState.rightFighter.champion})
            </span>
          </div>

          <div className="relative w-full h-4 rounded-full bg-slate-900 border border-slate-700 overflow-hidden flex">
            <div
              style={{ width: `${tugPercent}%` }}
              className="bg-cyan-500 shadow-[0_0_10px_#06b6d4] transition-all duration-200"
            />
            <div
              style={{ width: `${100 - tugPercent}%` }}
              className="bg-amber-500 shadow-[0_0_10px_#f59e0b] transition-all duration-200"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
