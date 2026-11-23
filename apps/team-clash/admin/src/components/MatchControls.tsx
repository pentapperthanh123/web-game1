import React from 'react';
import { adminEmitter } from '../services/adminEmitter';
import { useAdminStore } from '../store/adminStore';

export const MatchControls: React.FC = () => {
  const { roundDurationSeconds, pushMultipliers, setRoundDurationSeconds, setPushMultipliers } =
    useAdminStore();

  const handleResetRound = () => {
    adminEmitter.emitAction('RESET_ROUND');
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
        <div className="grid grid-cols-3 gap-2.5 mb-5">
          <button
            onClick={handleResetRound}
            className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 shadow-sm transition-all active:scale-95 text-center"
          >
            🔄 Reset Hiệp
          </button>
          <button
            onClick={handleRebalance}
            className="px-3 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 font-bold text-xs border border-amber-500/40 shadow-sm transition-all active:scale-95 text-center"
          >
            ⚖️ Cân Bằng 50/50
          </button>
          <button
            onClick={handleDramaBoost}
            className="px-3 py-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 font-bold text-xs border border-rose-500/50 shadow-sm transition-all active:scale-95 text-center"
          >
            🔥 Drama Boost!
          </button>
        </div>

        {/* Round Duration Selector */}
        <div className="mb-4">
          <label className="text-xs font-bold text-slate-300 block mb-2">
            Thời Lượng Mỗi Hiệp Đấu
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[45, 60, 90, 120].map((sec) => (
              <button
                key={sec}
                onClick={() => handleDurationChange(sec)}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                  roundDurationSeconds === sec
                    ? 'bg-cyan-600 text-white border-cyan-400'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                }`}
              >
                {sec}s
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
            max="2.0"
            step="0.1"
            value={pushMultipliers.chatPush}
            onChange={(e) => handleMultiplierChange('chatPush', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
          />

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Lực Đẩy Quà Nhỏ (1-4 xu):</span>
            <span className="font-bold text-yellow-400">+{pushMultipliers.smallGiftPush}%</span>
          </div>
          <input
            type="range"
            min="4"
            max="18"
            step="1"
            value={pushMultipliers.smallGiftPush}
            onChange={(e) => handleMultiplierChange('smallGiftPush', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>
      </div>
    </div>
  );
};
