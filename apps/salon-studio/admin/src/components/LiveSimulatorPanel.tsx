import React, { useEffect, useState } from 'react';
import { Bot, Crown, Gift, Heart, MessageSquare, Sparkles, UserPlus } from 'lucide-react';
import { AUTOBOT_PACE_PRESETS } from '@shared/constants/salonConfig';
import type { AutoBotPace } from '@shared/types/salon';
import {
  simulateLargeRoyalGift,
  simulateLikeBurst,
  simulateMediumTrollGift,
  simulateQueueCustomer,
  simulateSmallGiftVip,
  simulateStyleChat,
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
    <section className="admin-card p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-[#3A2825]/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FFE5B4] border-2 border-[#3A2825] flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-[#3A2825]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base leading-tight">
              Giả Lập Sự Kiện & Auto-Bot Salon
            </h2>
            <p className="text-[11px] font-bold text-[#7D6059]">
              Test từng sự kiện hoặc bật Auto-Bot tự chạy demo 30 FPS
            </p>
          </div>
        </div>

        {/* Status pill */}
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border-2 border-[#3A2825] text-[11px] font-black ${
            autoBotEnabled ? 'bg-[#C9F2E3] text-[#175B43]' : 'bg-white text-[#7D6059]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              autoBotEnabled ? 'bg-[#2BB673] animate-pulse' : 'bg-[#B5A29C]'
            }`}
          />
          {autoBotEnabled ? 'Auto-Bot: ON' : 'Auto-Bot: OFF'}
        </span>
      </div>

      {/* 6 Quick Simulator Buttons */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        <button
          type="button"
          onClick={() => simulateQueueCustomer('SIMULATOR')}
          className="admin-btn bg-[#FFF7EE] hover:bg-[#FFEFE3] text-xs font-black py-2 px-1.5 rounded-xl flex flex-col items-center gap-0.5 cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-[#42B38B]" />
          <span className="truncate">+ Xếp Hàng</span>
        </button>

        <button
          type="button"
          onClick={() => simulateLikeBurst(12, 'SIMULATOR')}
          className="admin-btn bg-[#FFE8EF] hover:bg-[#FFD6E2] text-xs font-black py-2 px-1.5 rounded-xl flex flex-col items-center gap-0.5 cursor-pointer"
        >
          <Heart className="w-4 h-4 text-[#E85D82] fill-[#E85D82]" />
          <span className="truncate">Thả Tim (+12)</span>
        </button>

        <button
          type="button"
          onClick={() => simulateStyleChat(undefined, 'SIMULATOR')}
          className="admin-btn bg-[#E8F4FD] hover:bg-[#D5EBFA] text-xs font-black py-2 px-1.5 rounded-xl flex flex-col items-center gap-0.5 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-[#2B7AB8]" />
          <span className="truncate">Chat Đổi Kiểu</span>
        </button>

        <button
          type="button"
          onClick={() => simulateSmallGiftVip('SIMULATOR')}
          className="admin-btn bg-[#D5F7EA] hover:bg-[#B8F0DB] text-xs font-black py-2 px-1.5 rounded-xl flex flex-col items-center gap-0.5 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#1E8E66]" />
          <span className="truncate">Quà 1đ (VIP)</span>
        </button>

        <button
          type="button"
          onClick={() => simulateMediumTrollGift('SIMULATOR')}
          className="admin-btn bg-[#FFD8D2] hover:bg-[#FFC0B7] text-xs font-black py-2 px-1.5 rounded-xl flex flex-col items-center gap-0.5 cursor-pointer"
        >
          <Gift className="w-4 h-4 text-[#D94B4B]" />
          <span className="truncate">Quà 10đ (Troll)</span>
        </button>

        <button
          type="button"
          onClick={() => simulateLargeRoyalGift('SIMULATOR')}
          className="admin-btn bg-[#FFF0A6] hover:bg-[#FFE475] text-xs font-black py-2 px-1.5 rounded-xl flex flex-col items-center gap-0.5 cursor-pointer"
        >
          <Crown className="w-4 h-4 text-[#C27D00] fill-[#FFD56B]" />
          <span className="truncate">Quà 50đ (Idol)</span>
        </button>
      </div>

      {/* Auto-Bot Salon Control Bento */}
      <div className="bg-[#FFF7EE] border-2 border-[#3A2825]/30 rounded-2xl p-2.5 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-black">Nhịp độ chạy Auto-Bot:</div>

          <div className="flex items-center gap-1.5">
            {(['SLOW', 'NORMAL', 'BURST'] as const).map((paceKey) => (
              <button
                key={paceKey}
                type="button"
                onClick={() => handlePaceChange(paceKey)}
                className={`py-1 px-2.5 rounded-xl border-2 border-[#3A2825] text-xs font-black cursor-pointer transition ${
                  pace === paceKey ? 'bg-[#FFD56B]' : 'bg-white text-[#7D6059]'
                }`}
              >
                {AUTOBOT_PACE_PRESETS[paceKey].labelEn}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleToggleBot}
            className={`admin-btn px-4 py-1.5 rounded-xl text-xs font-black cursor-pointer shrink-0 ${
              autoBotEnabled ? 'bg-[#FFD1CE] text-[#8F2121]' : 'bg-[#86E3C3] text-[#175B43]'
            }`}
          >
            {autoBotEnabled ? 'Dừng Bot' : 'Bật Auto-Bot'}
          </button>
        </div>

        <label className="flex items-center gap-2 text-[11px] font-extrabold text-[#3A2825] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoPauseOnReal}
            onChange={(e) => setAutoPauseOnReal(e.target.checked)}
            className="w-4 h-4 accent-[#42B38B]"
          />
          Tự động tắt Auto-Bot ngay khi nhận sự kiện thật từ TikTok LIVE
        </label>

        {pausedNotice && (
          <div className="text-xs font-bold text-[#175B43] bg-[#C9F2E3] border-2 border-[#3A2825] rounded-xl px-3 py-1">
            {pausedNotice}
          </div>
        )}
      </div>
    </section>
  );
};
