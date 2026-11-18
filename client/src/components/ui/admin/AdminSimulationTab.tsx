import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Clock, Check, Clapperboard, Sparkles } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { ADMIN_CONSTANTS } from '../../../constants/game';
import { gameSocket } from '../../../services/socket';
import { mockLiveSimulator, MockLiveStatus } from '../../../services/mockLiveSimulator';

export const AdminSimulationTab: React.FC = () => {
  const { t } = useTranslation();

  const botSpeedMs = useGameStore((state) => state.botSpeedMs);
  const toggleSimulation = useGameStore((state) => state.toggleSimulation);
  const autoProBattleConfig = useGameStore((state) => state.autoProBattleConfig);
  const setAutoProBattleConfig = useGameStore((state) => state.setAutoProBattleConfig);

  const [simStatus, setSimStatus] = useState<MockLiveStatus>(() => mockLiveSimulator.getStatus());
  const [selectedMode, setSelectedMode] = useState<'natural' | 'highlight'>('natural');
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsub = mockLiveSimulator.subscribe((status) => {
      setSimStatus(status);
      setSelectedMode(status.mode);
    });
    return () => unsub();
  }, []);

  const showFeedback = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => {
      setStatusFeedback((prev) => (prev === msg ? null : prev));
    }, 1500);
  };

  const handleToggleBot = () => {
    const nextState = !simStatus.isActive;
    if (nextState) {
      mockLiveSimulator.start(selectedMode, false);
    } else {
      mockLiveSimulator.stop();
    }
    toggleSimulation(nextState, botSpeedMs);
    gameSocket.toggleAutoLive(nextState, selectedMode, false);
    showFeedback(nextState ? 'Đã Bắt Đầu Giả Lập Live!' : 'Đã dừng Giả lập Live!');
  };

  const handleChangeSimMode = (mode: 'natural' | 'highlight') => {
    setSelectedMode(mode);
    if (simStatus.isActive) {
      mockLiveSimulator.start(mode);
      gameSocket.toggleAutoLive(true, mode);
      showFeedback(`Đã đổi kịch bản: ${mode === 'highlight' ? 'Highlight 60s' : 'Tự Nhiên'}`);
    }
  };

  const handleToggleAutoPro = () => {
    const nextEnabled = !autoProBattleConfig.enabled;
    setAutoProBattleConfig({ enabled: nextEnabled });
    gameSocket.sendAutoProBattle({ enabled: nextEnabled });
    showFeedback(nextEnabled ? 'Đã bật Tự đánh Pro!' : 'Đã tắt Tự đánh Pro!');
  };

  const handleToggleOnlyIdle = () => {
    const nextVal = !autoProBattleConfig.onlyWhenIdle;
    setAutoProBattleConfig({ onlyWhenIdle: nextVal });
    gameSocket.sendAutoProBattle({ onlyWhenIdle: nextVal });
    showFeedback(
      nextVal
        ? 'Chỉ tự đánh khi vắng người xem (Bật)'
        : 'Tự đánh liên tục bất kể có người xem hay không'
    );
  };

  const handleChangeInterval = (intervalMs: number, label: string) => {
    setAutoProBattleConfig({ intervalMs });
    gameSocket.sendAutoProBattle({ intervalMs });
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

      {/* Section 1: Auto Live Stream Simulator */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
            <Clapperboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('Admin.autoLiveTitle', 'Giả Lập Live (Quay Content):')}</span>
          </div>

          <button
            type="button"
            onClick={handleToggleBot}
            className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase transition active:scale-95 ${
              simStatus.isActive
                ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.4)] animate-pulse'
                : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {simStatus.isActive ? '● Đang Phát Live' : 'Đã Dừng'}
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => handleChangeSimMode('natural')}
            className={`p-1.5 rounded-lg border text-left transition ${
              selectedMode === 'natural'
                ? 'bg-purple-950/60 border-purple-400 text-purple-200 shadow'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="font-bold text-[10px]">🎬 Tự Nhiên (2-3p)</div>
            <div className="text-[9px] text-slate-400">Nhịp 1.8s, kéo co sâu</div>
          </button>

          <button
            type="button"
            onClick={() => handleChangeSimMode('highlight')}
            className={`p-1.5 rounded-lg border text-left transition ${
              selectedMode === 'highlight'
                ? 'bg-amber-950/60 border-amber-400 text-amber-200 shadow'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="font-bold text-[10px]">⚡ Highlight 60s</div>
            <div className="text-[9px] text-slate-400">Nhịp 0.9s dồn dập</div>
          </button>
        </div>

        {/* Phase & Stats tracker */}
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 text-[10px] space-y-1">
          <div className="flex items-center justify-between text-slate-300">
            <span className="font-semibold flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-pink-400" />
              <span>Giai đoạn:</span>
            </span>
            <span className="font-bold text-amber-300">{simStatus.phaseLabel}</span>
          </div>
          {simStatus.isActive && (
            <div className="flex items-center justify-between text-[9px] text-slate-400 pt-0.5 border-t border-slate-800/80">
              <div>Lính: {simStatus.summonsCount} | Quà: {simStatus.giftsCount}</div>
              <div className="truncate max-w-[150px] italic text-slate-300">{simStatus.lastAction}</div>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Auto-Pro Battle Config */}
      <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 font-bold text-amber-300">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('Admin.autoProTitle', 'Tự Đánh Tuyển Thủ Pro:')}</span>
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
            {autoProBattleConfig.enabled
              ? t('Admin.autoProRunning', 'Đang Tự Đánh: BẬT')
              : t('Admin.autoProStopped', 'Đã Tắt')}
          </button>
        </div>

        {/* Toggle only when idle */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800">
          <div className="text-[10px] text-slate-300">
            {t('Admin.autoProOnlyIdle', 'Chỉ tự đánh khi vắng người xem (Only When Idle)')}
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
            {autoProBattleConfig.onlyWhenIdle
              ? t('Admin.yes', 'Có')
              : t('Admin.no', 'Không')}
          </button>
        </div>

        {/* Interval Selector */}
        <div className="space-y-1">
          <div className="flex items-center space-x-1 text-[10px] text-slate-400">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{t('Admin.autoProInterval', 'Nhịp xuất chiêu của tuyển thủ:')}</span>
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
