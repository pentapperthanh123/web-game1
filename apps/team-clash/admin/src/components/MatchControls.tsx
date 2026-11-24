import React from 'react';
import { ROUND_DURATION_OPTIONS } from '../../../shared/constants/clashConfig';
import { adminEmitter } from '../services/adminEmitter';
import { useAdminStore } from '../store/adminStore';

export const MatchControls: React.FC = () => {
  const {
    roundDurationSeconds,
    pushMultipliers,
    liveState,
    setRoundDurationSeconds,
    setPushMultipliers,
  } = useAdminStore();
  const isPlaying = liveState.roundStatus === 'PLAYING';

  const handleTogglePlay = () => {
    adminEmitter.emitAction(isPlaying ? 'PAUSE_ROUND' : 'START_ROUND');
  };

  const handleResetRound = () => {
    adminEmitter.emitAction('RESET_ROUND');
  };

  const handleResetMatch = () => {
    adminEmitter.emitAction('RESET_MATCH');
    useAdminStore.getState().updateLiveState({
      roundNumber: 1,
      seriesScore: { left: 0, right: 0 },
      roundStatus: 'WAITING',
      roundTimeRemaining: roundDurationSeconds,
      clashPosition: 50.0,
      targetPosition: 50.0,
      leftScore: 0,
      rightScore: 0,
    });
  };

  const handleRebalance = () => {
    adminEmitter.emitAction('REBALANCE_50_50');
  };

  const handleDramaBoost = () => {
    adminEmitter.emitAction('DRAMA_BOOST');
  };

  const handleDurationChange = (seconds: number) => {
    setRoundDurationSeconds(seconds);
    adminEmitter.emitAction('SET_ROUND_DURATION', { durationSeconds: seconds });
  };

  const handleMultiplierChange = (key: keyof typeof pushMultipliers, value: number) => {
    const updated = { [key]: value };
    setPushMultipliers(updated);
    adminEmitter.emitAction('SET_PUSH_MULTIPLIERS', { multipliers: updated });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
      <div>
        <h2 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
          ⚡ ĐIỀU KHIỂN TRẬN ĐẤU & LỰC ĐẨY
        </h2>

        {/* Quick Action Buttons for Host */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
          <button
            onClick={handleTogglePlay}
            className={`px-3 py-2.5 rounded-xl font-black text-xs text-white shadow-md transition-all active:scale-95 text-center border cursor-pointer ${
              isPlaying
                ? 'bg-amber-600 hover:bg-amber-500 border-amber-400'
                : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 animate-pulse'
            }`}
          >
            {isPlaying ? '⏸️ Tạm Dừng' : '▶️ Bắt Đầu Trận'}
          </button>
          <button
            onClick={handleResetRound}
            title="Reset lại hiệp hiện tại (giữ nguyên tỉ số)"
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-sm transition-all active:scale-95 text-center cursor-pointer"
          >
            🔄 Reset Hiệp
          </button>
          <button
            onClick={handleResetMatch}
            title="Xóa toàn bộ điểm số, đưa về Hiệp 1 (0 - 0) mặc định"
            className="px-3 py-2.5 rounded-xl bg-purple-950/70 hover:bg-purple-900 text-purple-300 font-bold text-xs border border-purple-500/40 shadow-sm transition-all active:scale-95 text-center cursor-pointer"
          >
            ♻️ Reset Data
          </button>
          <button
            onClick={handleRebalance}
            className="px-3 py-2.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900 text-cyan-300 font-bold text-xs border border-cyan-500/40 shadow-sm transition-all active:scale-95 text-center cursor-pointer"
          >
            ⚖️ Cân Bằng 50/50
          </button>
          <button
            onClick={handleDramaBoost}
            className="px-3 py-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 font-bold text-xs border border-rose-500/50 shadow-sm transition-all active:scale-95 text-center cursor-pointer"
          >
            🔥 Drama Boost!
          </button>
        </div>

        {/* Round Duration Selector */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-300 block mb-2">
            Thời Lượng Mỗi Hiệp Đấu
          </label>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {ROUND_DURATION_OPTIONS.map((sec) => (
              <button
                key={sec}
                onClick={() => handleDurationChange(sec)}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  roundDurationSeconds === sec
                    ? 'bg-cyan-600 text-white border-cyan-400'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {sec === 300 ? '5 Phút' : `${sec}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Push Multipliers */}
        <div className="space-y-3 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Lực Đẩy Chat (mỗi cmt):</span>
            <span className="font-bold text-yellow-400">+{pushMultipliers.chatPush}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="8.0"
            step="0.5"
            value={pushMultipliers.chatPush}
            onChange={(e) => handleMultiplierChange('chatPush', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Lực Đẩy Thả Tim (mỗi tim):</span>
            <span className="font-bold text-yellow-400">+{pushMultipliers.likePush}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="0.1"
            step="0.01"
            value={pushMultipliers.likePush}
            onChange={(e) => handleMultiplierChange('likePush', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Trần Tim (mỗi người / hiệp):</span>
            <span className="font-bold text-yellow-400">+{pushMultipliers.likePushMaxPerUserPerRound}%</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={pushMultipliers.likePushMaxPerUserPerRound}
            onChange={(e) =>
              handleMultiplierChange('likePushMaxPerUserPerRound', parseFloat(e.target.value))
            }
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Lực Đẩy Quà (mỗi xu):</span>
            <span className="font-bold text-yellow-400">+{pushMultipliers.giftPushPerCoin}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="3"
            step="0.1"
            value={pushMultipliers.giftPushPerCoin}
            onChange={(e) => handleMultiplierChange('giftPushPerCoin', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </div>
    </div>
  );
};
