import React, { useEffect, useState } from 'react';
import { Bot, Crown, Gift, Heart, Sparkles, UserPlus } from 'lucide-react';
import { AUTOBOT_PACE_PRESETS } from '@shared/constants/salonConfig';
import type { AutoBotPace } from '@shared/types/salon';
import {
  simulateLargeRoyalGift,
  simulateLikeBurst,
  simulateMediumTrollGift,
  simulateQueueCustomer,
  simulateSmallGiftVip,
} from '../services/adminEmitter';
import { salonAutoBot } from '../services/autoBotService';
import { tiktokServerBridge } from '../services/tiktokApi';

export const LiveSimulatorPanel: React.FC = () => {
  const [autoBotEnabled, setAutoBotEnabled] = useState<boolean>(false);
  const [pace, setPace] = useState<AutoBotPace>('NORMAL');
  const [autoPauseOnReal, setAutoPauseOnReal] = useState<boolean>(true);
  const [pausedNotice, setPausedNotice] = useState<string>('');

  useEffect(() => {
    const offReal = tiktokServerBridge.onRealTikTokEvent(() => {
      if (autoPauseOnReal && salonAutoBot.isRunning()) {
        salonAutoBot.stop();
        setAutoBotEnabled(false);
        setPausedNotice('Đã tự tắt Auto-Bot vì nhận được sự kiện thật từ TikTok LIVE!');
      }
    });
    return offReal;
  }, [autoPauseOnReal]);

  useEffect(() => {
    return () => {
      salonAutoBot.stop();
    };
  }, []);

  const handleToggleBot = () => {
    if (autoBotEnabled) {
      salonAutoBot.stop();
      setAutoBotEnabled(false);
    } else {
      setPausedNotice('');
      salonAutoBot.start(pace);
      setAutoBotEnabled(true);
    }
  };

  const handlePaceChange = (nextPace: AutoBotPace) => {
    setPace(nextPace);
    salonAutoBot.setPace(nextPace);
  };

  return (
    <section className="admin-card p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#FFE5B4] border-2 border-[#3A2825] flex items-center justify-center">
            <Bot className="w-5 h-5 text-[#3A2825]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-[17px] leading-tight">
              Live Simulator & Auto-Bot Salon
            </h2>
            <p className="text-xs font-bold text-[#7D6059]">
              Giả lập hàng chờ, quà tặng và tự chạy demo test 30 FPS
            </p>
          </div>
        </div>
      </div>

      {/* Quick Test Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <button
          type="button"
          onClick={() => simulateQueueCustomer('SIMULATOR')}
          className="admin-btn bg-[#FFF7EE] hover:bg-[#FFEFE3] text-xs font-black py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-[#42B38B]" />
          <span>Thêm Khách</span>
        </button>

        <button
          type="button"
          onClick={() => simulateLikeBurst(12, 'SIMULATOR')}
          className="admin-btn bg-[#FFE8EF] hover:bg-[#FFD6E2] text-xs font-black py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 cursor-pointer"
        >
          <Heart className="w-4 h-4 text-[#E85D82] fill-[#E85D82]" />
          <span>Thả Tim +12</span>
        </button>

        <button
          type="button"
          onClick={() => simulateSmallGiftVip('SIMULATOR')}
          className="admin-btn bg-[#D5F7EA] hover:bg-[#B8F0DB] text-xs font-black py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#1E8E66]" />
          <span>Quà Nhỏ VIP</span>
        </button>

        <button
          type="button"
          onClick={() => simulateMediumTrollGift('SIMULATOR')}
          className="admin-btn bg-[#FFD8D2] hover:bg-[#FFC0B7] text-xs font-black py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 cursor-pointer"
        >
          <Gift className="w-4 h-4 text-[#D94B4B]" />
          <span>Quà Vừa Troll</span>
        </button>

        <button
          type="button"
          onClick={() => simulateLargeRoyalGift('SIMULATOR')}
          className="admin-btn bg-[#FFF0A6] hover:bg-[#FFE475] text-xs font-black py-2.5 px-2 rounded-xl flex flex-col items-center gap-1 cursor-pointer col-span-2 sm:col-span-1"
        >
          <Crown className="w-4 h-4 text-[#C27D00] fill-[#FFD56B]" />
          <span>Quà Lớn Royal</span>
        </button>
      </div>

      {/* Auto-Bot Salon Controls */}
      <div className="bg-[#FFF7EE] border-2 border-[#3A2825] rounded-2xl p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full border border-[#3A2825] ${
                autoBotEnabled ? 'bg-[#2BB673] animate-pulse' : 'bg-[#B5A29C]'
              }`}
            />
            <span className="font-display font-bold text-sm">Auto-Bot Salon</span>
          </div>

          <button
            type="button"
            onClick={handleToggleBot}
            className={`admin-btn px-4 py-1.5 rounded-xl text-xs font-black cursor-pointer ${
              autoBotEnabled ? 'bg-[#FFD1CE]' : 'bg-[#86E3C3]'
            }`}
          >
            {autoBotEnabled ? 'Dừng Auto-Bot' : 'Bật Auto-Bot Salon'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['SLOW', 'NORMAL', 'BURST'] as const).map((paceKey) => (
            <button
              key={paceKey}
              type="button"
              onClick={() => handlePaceChange(paceKey)}
              className={`py-1.5 px-2 rounded-xl border-2 border-[#3A2825] text-xs font-black cursor-pointer ${
                pace === paceKey ? 'bg-[#FFD56B]' : 'bg-white text-[#7D6059]'
              }`}
            >
              {AUTOBOT_PACE_PRESETS[paceKey].labelEn} · {AUTOBOT_PACE_PRESETS[paceKey].labelVi.split(' ')[0]}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs font-extrabold text-[#3A2825] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoPauseOnReal}
            onChange={(e) => setAutoPauseOnReal(e.target.checked)}
            className="w-4 h-4 accent-[#42B38B]"
          />
          Tự tắt Auto-Bot ngay khi nhận sự kiện thật từ TikTok LIVE
        </label>

        {pausedNotice && (
          <div className="text-xs font-bold text-[#175B43] bg-[#C9F2E3] border-2 border-[#3A2825] rounded-xl px-3 py-1.5">
            {pausedNotice}
          </div>
        )}
      </div>
    </section>
  );
};
