import React, { useEffect, useRef, useState } from 'react';
import { useAdminStore } from '../store/adminStore';
import { emitLiveEvent } from '../services/adminEmitter';
import type { NormalizedLiveEvent } from '@shared/types/events';
import { Bot, Play, Square, MessageSquare, Gift, Heart, Activity } from 'lucide-react';

const MOCK_VIEWERS = [
  { id: 'u1', username: 'hoang_troll_99', nickname: 'Hoàng Troll 🥚' },
  { id: 'u2', username: 'minh_beo_live', nickname: 'Minh Béo 🎂' },
  { id: 'u3', username: 'linh_cute_2k', nickname: 'Linh Cute 🌸' },
  { id: 'u4', username: 'troll_master_vn', nickname: 'Master Troll 🤡' },
  { id: 'u5', username: 'hai_tac_pro', nickname: 'Hải Tặc 🏀' },
];

const CHAT_PHRASES = ['egg', 'trung', 'gio', 'wind', 'cake', 'banh', 'milk', 'sua', 'wtf', 'haha', 'bong'];

export const LiveSimulator: React.FC = () => {
  const {
    isAutoBotActive,
    setAutoBotActive,
    botIntervalMs,
    setBotIntervalMs,
    botStats,
    recordBotSent,
    language,
  } = useAdminStore();

  const [logs, setLogs] = useState<Array<{ id: string; text: string; time: string }>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isVi = language === 'VI';

  const addLog = (text: string) => {
    const time = new Date().toLocaleTimeString('vi-VN');
    setLogs((prev) => [{ id: Math.random().toString(), text, time }, ...prev.slice(0, 15)]);
  };

  // Helper to send simulated chat
  const sendSimulatedChat = (text: string) => {
    const viewer = MOCK_VIEWERS[Math.floor(Math.random() * MOCK_VIEWERS.length)];
    const event: NormalizedLiveEvent = {
      type: 'CHAT',
      timestamp: Date.now(),
      user: viewer,
      text,
    };
    emitLiveEvent(event);
    recordBotSent(`Chat: "${text}" by ${viewer.nickname}`);
    addLog(`💬 [CHAT] ${viewer.nickname}: "${text}"`);
  };

  // Helper to send simulated gift
  const sendSimulatedGift = (coins: number, giftName: string) => {
    const viewer = MOCK_VIEWERS[Math.floor(Math.random() * MOCK_VIEWERS.length)];
    const event: NormalizedLiveEvent = {
      type: 'GIFT',
      timestamp: Date.now(),
      user: viewer,
      giftName,
      coinValue: coins,
      repeatCount: 1,
    };
    emitLiveEvent(event);
    recordBotSent(`Gift: ${giftName} (${coins} xu) by ${viewer.nickname}`);
    addLog(`🎁 [GIFT] ${viewer.nickname} gửi ${giftName} (${coins} xu)`);
  };

  // Helper to send simulated likes
  const sendSimulatedLikes = (count = 10) => {
    const viewer = MOCK_VIEWERS[Math.floor(Math.random() * MOCK_VIEWERS.length)];
    const event: NormalizedLiveEvent = {
      type: 'LIKE',
      timestamp: Date.now(),
      user: viewer,
      count,
    };
    emitLiveEvent(event);
    recordBotSent(`Likes: +${count} tim`);
    addLog(`❤️ [LIKE] +${count} tim từ ${viewer.nickname}`);
  };

  // Quick Action Buttons
  const handleSpamChat = () => {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const phrase = CHAT_PHRASES[Math.floor(Math.random() * CHAT_PHRASES.length)];
        sendSimulatedChat(phrase);
      }, i * 250);
    }
  };

  const handleSmallGift = () => {
    sendSimulatedGift(1, 'Hoa hồng / Trứng (1 xu)');
  };

  const handleMediumGift = () => {
    sendSimulatedGift(10, 'Combo Bựa (10 xu)');
  };

  const handleBigGift = () => {
    sendSimulatedGift(50, 'Mưa Quà Meltdown (50 xu)');
  };

  // Auto-Bot Prank Loop
  useEffect(() => {
    if (isAutoBotActive) {
      timerRef.current = setInterval(() => {
        const rand = Math.random();
        if (rand < 0.55) {
          // Chat keyword
          const phrase = CHAT_PHRASES[Math.floor(Math.random() * CHAT_PHRASES.length)];
          sendSimulatedChat(phrase);
        } else if (rand < 0.8) {
          // Like batch
          sendSimulatedLikes(Math.floor(Math.random() * 8) + 3);
        } else if (rand < 0.95) {
          // Small gift
          sendSimulatedGift(1, 'Hoa hồng (1 xu)');
        } else {
          // Medium Combo
          sendSimulatedGift(10, 'Bánh kem (10 xu)');
        }
      }, botIntervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAutoBotActive, botIntervalMs]);

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold flex items-center gap-2 text-white">
          <Bot className="w-5 h-5 text-purple-400" />
          {isVi ? 'BỘ GIẢ LẬP TƯƠNG TÁC (LIVE SIMULATOR)' : 'LIVE INTERACTION SIMULATOR'}
        </h2>
        <span className="text-xs text-neutral-400">Kiểm thử tải & quay video demo</span>
      </div>

      {/* Auto-Bot Prank Master Switch */}
      <div
        className={`p-4 rounded-xl border mb-4 transition-all ${
          isAutoBotActive
            ? 'bg-purple-950/60 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]'
            : 'bg-neutral-950/70 border-neutral-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                isAutoBotActive
                  ? 'bg-purple-500 text-white animate-pulse'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-black text-white flex items-center gap-2">
                <span>{isVi ? 'AUTO-BOT PRANK (TỰ ĐỘNG CHẠY)' : 'AUTO-BOT PRANK'}</span>
                {isAutoBotActive && (
                  <span className="bg-purple-500/30 text-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-400/40 animate-ping">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isVi
                  ? 'Tự động tạo dòng Chat, Like và Quà liên tục mỗi 1.8s để test độ mượt 30 FPS.'
                  : 'Automatically simulates steady flow of chat, likes, and gifts to test 30 FPS.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setAutoBotActive(!isAutoBotActive)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs transition cursor-pointer active:scale-95 shadow ${
              isAutoBotActive
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-500/40'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/40'
            }`}
          >
            {isAutoBotActive ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>DỪNG BOT</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>BẬT AUTO-BOT</span>
              </>
            )}
          </button>
        </div>

        {/* Bot Speed Slider & Stats */}
        {isAutoBotActive && (
          <div className="mt-3 pt-3 border-t border-purple-500/30 flex items-center justify-between text-xs text-neutral-300">
            <div className="flex items-center gap-2">
              <span>Chu kỳ:</span>
              <input
                type="range"
                min="800"
                max="3500"
                step="200"
                value={botIntervalMs}
                onChange={(e) => setBotIntervalMs(parseInt(e.target.value, 10))}
                className="w-28 accent-purple-500 bg-neutral-800 h-1.5 rounded cursor-pointer"
              />
              <span className="font-mono font-bold text-purple-300">{botIntervalMs}ms</span>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] text-neutral-400">
              <span>Đã bắn:</span>
              <span className="font-bold text-amber-300">{botStats.totalSent} events</span>
            </div>
          </div>
        )}
      </div>

      {/* Manual Test Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <button
          onClick={handleSpamChat}
          className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60 text-neutral-200 text-xs font-bold transition active:scale-95 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span>{isVi ? 'Spam Chat (x4)' : 'Spam Chat (x4)'}</span>
        </button>

        <button
          onClick={handleSmallGift}
          className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60 text-neutral-200 text-xs font-bold transition active:scale-95 cursor-pointer"
        >
          <Gift className="w-4 h-4 text-pink-400" />
          <span>{isVi ? 'Quà Nhỏ (1 xu)' : 'Small Gift (1 coin)'}</span>
        </button>

        <button
          onClick={handleMediumGift}
          className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60 text-neutral-200 text-xs font-bold transition active:scale-95 cursor-pointer"
        >
          <Gift className="w-4 h-4 text-amber-400" />
          <span>{isVi ? 'Quà Vừa (10 xu)' : 'Med Combo (10)'}</span>
        </button>

        <button
          onClick={handleBigGift}
          className="flex items-center justify-center gap-1.5 p-3 rounded-xl bg-neutral-950 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/60 text-neutral-200 text-xs font-bold transition active:scale-95 cursor-pointer"
        >
          <Gift className="w-4 h-4 text-red-500" />
          <span>{isVi ? 'Quà Lớn (50 xu)' : 'Meltdown (50)'}</span>
        </button>
      </div>

      {/* Realtime Event Monitor Box */}
      <div className="bg-black/80 rounded-xl p-3 border border-neutral-800/90 font-mono text-[11px] h-32 overflow-y-auto">
        <div className="text-neutral-500 mb-1 flex items-center justify-between border-b border-neutral-800 pb-1">
          <span>CONSOLE LOG SIMULATOR</span>
          <span>{logs.length} bản ghi</span>
        </div>
        {logs.length === 0 ? (
          <div className="text-neutral-600 text-center py-6">
            Bấm nút phía trên hoặc Bật Auto-Bot để xem nhật ký sự kiện...
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log) => (
              <div key={log.id} className="text-neutral-300 flex items-start gap-2">
                <span className="text-neutral-500 text-[10px] shrink-0">{log.time}</span>
                <span>{log.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
