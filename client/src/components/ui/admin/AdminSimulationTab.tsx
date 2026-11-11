import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Swords, Gauge, Clock, Check } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { ADMIN_CONSTANTS } from '../../../constants/game';

export const AdminSimulationTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const isSimulationActive = useGameStore((state) => state.isSimulationActive);
  const botSpeedMs = useGameStore((state) => state.botSpeedMs);
  const toggleSimulation = useGameStore((state) => state.toggleSimulation);
  const autoProBattleConfig = useGameStore((state) => state.autoProBattleConfig);
  const setAutoProBattleConfig = useGameStore((state) => state.setAutoProBattleConfig);

  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => {
      setStatusFeedback((prev) => (prev === msg ? null : prev));
    }, 1500);
  };

  const handleToggleBot = () => {
    const nextState = !isSimulationActive;
    toggleSimulation(nextState, botSpeedMs);
    showFeedback(nextState ? 'Đã bật Bot giả lập người xem!' : 'Đã dừng Bot giả lập!');
  };

  const handleChangeBotSpeed = (speedMs: number, label: string) => {
    toggleSimulation(isSimulationActive, speedMs);
    showFeedback(`Đã chuyển tốc độ Bot: ${label}`);
  };

  const handleToggleAutoPro = () => {
    const nextEnabled = !autoProBattleConfig.enabled;
    setAutoProBattleConfig({ enabled: nextEnabled });
    showFeedback(nextEnabled ? 'Đã bật Tự đánh Pro!' : 'Đã tắt Tự đánh Pro!');
  };

  const handleToggleOnlyIdle = () => {
    const nextVal = !autoProBattleConfig.onlyWhenIdle;
    setAutoProBattleConfig({ onlyWhenIdle: nextVal });
    showFeedback(
      nextVal
        ? 'Chỉ tự đánh khi vắng người xem (Bật)'
        : 'Tự đánh liên tục bất kể có người xem hay không'
    );
  };

  const handleChangeInterval = (intervalMs: number, label: string) => {
    setAutoProBattleConfig({ intervalMs });
    showFeedback(`Đã đổi nhịp tự đánh: ${label}`);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Feedback Toast */}
      {statusFeedback && (
        <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-semibold text-center flex items-center justify-center space-x-1.5 animate-fadeIn">
          <Check className="w-3.5 h-3.5" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* Section 1: Bot Simulation Control */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('Admin.botTitle', 'Chế độ Bot Giả Lập:')}</span>
          </div>

          <button
            type="button"
            onClick={handleToggleBot}
            className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase transition active:scale-95 ${
              isSimulationActive
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {isSimulationActive
              ? t('Admin.botRunning', 'Đang chạy Bot')
              : t('Admin.botStopped', 'Đã dừng Bot')}
          </button>
        </div>

        {/* Bot Speed Presets */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center space-x-1 text-[10px] text-slate-400">
            <Gauge className="w-3 h-3 text-cyan-400" />
            <span>{t('Admin.botSpeed', 'Tốc độ Bot:')}</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {ADMIN_CONSTANTS.BOT_SPEED_PRESETS.map((preset) => {
              const label = isVi ? preset.labelVi : preset.labelEn;
              const isCurrent = botSpeedMs === preset.speedMs;
              return (
                <button
                  key={preset.speedMs}
                  type="button"
                  onClick={() => handleChangeBotSpeed(preset.speedMs, label)}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold transition active:scale-95 text-center ${
                    isCurrent
                      ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Section 2: Auto-Pro Battle Config */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-bold text-amber-300">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>Tự Đánh Tuyển Thủ Pro:</span>
          </div>

          <button
            type="button"
            onClick={handleToggleAutoPro}
            className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase transition active:scale-95 ${
              autoProBattleConfig.enabled
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {autoProBattleConfig.enabled ? 'BẬT' : 'TẮT'}
          </button>
        </div>

        {/* Toggle only when idle */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] text-slate-300">
            Chỉ đánh khi vắng người xem (Only When Idle)
          </div>
          <button
            type="button"
            onClick={handleToggleOnlyIdle}
            className={`px-2 py-0.5 rounded border text-[9px] font-bold transition active:scale-95 ${
              autoProBattleConfig.onlyWhenIdle
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {autoProBattleConfig.onlyWhenIdle ? 'Có' : 'Không'}
          </button>
        </div>

        {/* Interval Selector */}
        <div className="space-y-1">
          <div className="flex items-center space-x-1 text-[10px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>Nhịp đánh chiêu:</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {ADMIN_CONSTANTS.PRO_INTERVAL_PRESETS.map((preset) => {
              const isCurrent = autoProBattleConfig.intervalMs === preset.intervalMs;
              return (
                <button
                  key={preset.intervalMs}
                  type="button"
                  onClick={() => handleChangeInterval(preset.intervalMs, preset.label)}
                  className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold transition active:scale-95 text-center ${
                    isCurrent
                      ? 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
