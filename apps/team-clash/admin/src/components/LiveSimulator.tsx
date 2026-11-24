import React from 'react';
import { adminEmitter } from '../services/adminEmitter';
import { autoBotService } from '../services/autoBotService';
import { useAdminStore } from '../store/adminStore';

export const LiveSimulator: React.FC = () => {
  const { isAutoBotActive, setAutoBotActive } = useAdminStore();

  const handleToggleAutoBot = () => {
    const nextState = !isAutoBotActive;
    setAutoBotActive(nextState);
    if (nextState) {
      autoBotService.start();
    } else {
      autoBotService.stop();
    }
  };

  const handleSimulateChat = (team: 'LEFT' | 'RIGHT') => {
    const isLeft = team === 'LEFT';
    const text = isLeft ? 'g' : 'b';
    const username = isLeft ? 'GamerGirl_Top1' : 'SuperBoy_99';

    adminEmitter.emitLiveEvent({
      type: 'CHAT',
      timestamp: Date.now(),
      user: {
        id: `sim_${username}`,
        username,
        nickname: username,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      },
      text,
      team,
    });
  };

  const handleSimulateGift = (team: 'LEFT' | 'RIGHT', coins: number, giftName: string) => {
    const isLeft = team === 'LEFT';
    const username = isLeft ? 'TyPhu_GirlTeam' : 'DaiGia_BoyTeam';

    // Direct gift with explicit team assignment
    adminEmitter.emitLiveEvent({
      type: 'GIFT',
      timestamp: Date.now(),
      user: {
        id: `sim_${username}`,
        username,
        nickname: username,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      },
      giftName,
      coinValue: coins,
      repeatCount: 1,
      team,
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            🤖 BỘ GIẢ LẬP TƯƠNG TÁC (LIVE SIMULATOR)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Giả lập sự kiện để kiểm tra FPS 30 và quay clip TikTok LIVE
          </p>
        </div>

        {/* Auto-Bot Switch */}
        <button
          onClick={handleToggleAutoBot}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-black shadow-lg transition-all ${
            isAutoBotActive
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <span>{isAutoBotActive ? '⏹ DỪNG AUTO-BOT' : '▶️ BẬT AUTO-BOT CLASH'}</span>
        </button>
      </div>

      {/* Manual Quick Action Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => handleSimulateChat('LEFT')}
          className="p-3 rounded-xl bg-pink-950/60 hover:bg-pink-900/80 border border-pink-500/40 text-pink-200 text-xs font-bold transition-all active:scale-95 text-center flex flex-col items-center gap-1"
        >
          <span>💬 Chat "G" (Trái)</span>
          <span className="text-[10px] text-pink-400/80">+0.6% Lực Đẩy</span>
        </button>

        <button
          onClick={() => handleSimulateChat('RIGHT')}
          className="p-3 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 text-xs font-bold transition-all active:scale-95 text-center flex flex-col items-center gap-1"
        >
          <span>💬 Chat "B" (Phải)</span>
          <span className="text-[10px] text-cyan-400/80">+0.6% Lực Đẩy</span>
        </button>

        <button
          onClick={() => handleSimulateGift('LEFT', 1, 'Rose')}
          className="p-3 rounded-xl bg-pink-900/40 hover:bg-pink-800/60 border border-pink-400/50 text-white text-xs font-bold transition-all active:scale-95 text-center flex flex-col items-center gap-1"
        >
          <span>🌹 Quà Nhỏ Trái (1 xu)</span>
          <span className="text-[10px] text-pink-300">+9% Lực Đẩy</span>
        </button>

        <button
          onClick={() => handleSimulateGift('RIGHT', 30, 'Galaxy')}
          className="p-3 rounded-xl bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-400/50 text-white text-xs font-bold transition-all active:scale-95 text-center flex flex-col items-center gap-1"
        >
          <span>🌌 Quà Lớn Phải (30 xu)</span>
          <span className="text-[10px] text-yellow-300">💥 +35% Ultimate</span>
        </button>
      </div>
    </div>
  );
};
