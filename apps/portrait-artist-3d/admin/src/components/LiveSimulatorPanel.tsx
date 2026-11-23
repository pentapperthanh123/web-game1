import React, { useEffect, useRef } from 'react';
import {
  Bot,
  Crown,
  Flower2,
  Footprints,
  Heart,
  MessageSquare,
  Play,
  Smile,
  Square,
  UserPlus,
} from 'lucide-react';
import type { ViewerProfile } from '../../../shared/types/studio';
import { emitLiveEvent } from '../services/adminEmitter';
import { useAdminStore } from '../store/adminStore';

const SAMPLE_NAMES = [
  'Minh Anh',
  'Gia Bảo',
  'Khánh Linh',
  'Tuấn Kiệt',
  'Thảo Vy',
  'Quốc Huy',
  'Ngọc Hân',
  'Hoàng Nam',
  'Phương Nhi',
  'Đức Anh',
  'Yến Nhi',
  'Anh Quân',
] as const;

const MODEL_CHAT_LINES = [
  'Vẽ mình xinh xíu nha chị ơi! 🥰',
  'Hóng bức tranh quá đi!!',
  'Đỉnh thực sự luôn á 😍',
  'Cho mình thêm nơ đỏ với nha!',
] as const;

const DEMO_AVATAR_COUNT = 8;
let simCounter = 1;

function createMockViewer(prefix = 'viewer'): ViewerProfile {
  const idx = simCounter++;
  const name = SAMPLE_NAMES[idx % SAMPLE_NAMES.length];
  const avatarIndex = ((idx - 1) % DEMO_AVATAR_COUNT) + 1;
  return {
    id: `${prefix}_${idx}_${Date.now().toString(36)}`,
    username: `${name.toLowerCase().replace(/\s+/g, '')}${idx}`,
    nickname: `${name} ${idx}`,
    avatarUrl: `/assets/avatars/user-${avatarIndex}.png`,
  };
}

export const LiveSimulatorPanel: React.FC = () => {
  const isAutoBotRunning = useAdminStore((s) => s.isAutoBotRunning);
  const setAutoBotRunning = useAdminStore((s) => s.setAutoBotRunning);
  const pushLog = useAdminStore((s) => s.pushLog);
  const logs = useAdminStore((s) => s.logs);
  const botStepRef = useRef(0);

  const addFiveViewers = () => {
    for (let i = 0; i < 5; i++) {
      const user = createMockViewer('chat');
      emitLiveEvent({
        type: 'CHAT',
        platform: 'mock',
        timestamp: Date.now(),
        user,
        text: 'vẽ',
      });
    }
    pushLog('+5 khách gõ "vẽ" vào hàng chờ');
  };

  const spamLikes = () => {
    const user = createMockViewer('liker');
    emitLiveEvent({
      type: 'LIKE',
      platform: 'mock',
      timestamp: Date.now(),
      user,
      count: 15,
    });
    pushLog('Spam +15 tim tăng tốc độ cọ vẽ');
  };

  const sendRoseVip = () => {
    const user = createMockViewer('rose');
    emitLiveEvent({
      type: 'GIFT',
      platform: 'mock',
      timestamp: Date.now(),
      user,
      giftName: 'Hoa Hồng',
      coinValue: 1,
      repeatCount: 1,
    });
    pushLog(`🌹 ${user.nickname} tặng Hoa Hồng (1 xu) -> VIP Queue`);
  };

  const sendTrollGift = () => {
    const user = createMockViewer('troll');
    emitLiveEvent({
      type: 'GIFT',
      platform: 'mock',
      timestamp: Date.now(),
      user,
      giftName: 'Kính Râm Troll',
      coinValue: 10,
      repeatCount: 1,
    });
    pushLog(`😜 ${user.nickname} tặng quà 10 xu -> Vẽ Troll`);
  };

  const sendRoyalGift = () => {
    const user = createMockViewer('royal');
    emitLiveEvent({
      type: 'GIFT',
      platform: 'mock',
      timestamp: Date.now(),
      user,
      giftName: 'Vương Miện Hoàng Gia',
      coinValue: 50,
      repeatCount: 1,
    });
    pushLog(`👑 ${user.nickname} tặng Quà Lớn (50 xu) -> Royal VIP + Đổi Mũ 3p`);
  };

  const sendModelChat = () => {
    const active = useAdminStore.getState().snapshot?.activeSession;
    if (!active) {
      pushLog('Không có người mẫu đang ngồi để chat');
      return;
    }
    const line = MODEL_CHAT_LINES[Math.floor(Math.random() * MODEL_CHAT_LINES.length)];
    emitLiveEvent({
      type: 'CHAT',
      platform: 'mock',
      timestamp: Date.now(),
      user: active.entry.user,
      text: line,
    });
    pushLog(`💬 Mẫu ${active.entry.user.nickname}: "${line}"`);
  };

  const sendJoinPasserby = () => {
    const user = createMockViewer('join');
    emitLiveEvent({
      type: 'JOIN',
      platform: 'mock',
      timestamp: Date.now(),
      user,
    });
    pushLog(`🚶 ${user.nickname} vừa ghé xưởng`);
  };

  // Continuous Auto-Bot Demo loop for hands-free product showcase & video recording
  useEffect(() => {
    if (!isAutoBotRunning) return;

    // Seed initial queue right away so canvas starts painting immediately
    addFiveViewers();
    botStepRef.current = 0;

    const timer = window.setInterval(() => {
      const step = botStepRef.current++;
      const snap = useAdminStore.getState().snapshot;
      const totalQueue = (snap?.vipQueue.length ?? 0) + (snap?.normalQueue.length ?? 0);

      if (totalQueue < 3) {
        const user = createMockViewer('bot');
        emitLiveEvent({
          type: 'CHAT',
          platform: 'mock',
          timestamp: Date.now(),
          user,
          text: 'me',
        });
      }

      const mod = step % 7;
      if (mod === 1 || mod === 3) {
        spamLikes();
      } else if (mod === 2) {
        sendModelChat();
      } else if (mod === 4) {
        sendRoseVip();
      } else if (mod === 5) {
        sendJoinPasserby();
      } else if (mod === 6) {
        if (step % 14 === 6) sendTrollGift();
        else sendRoyalGift();
      }
    }, 3200);

    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoBotRunning]);

  return (
    <section className="rounded-2xl bg-stone-900/70 border border-stone-800 p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-sky-400" />
          <h2 className="text-base font-black text-stone-100">Bộ Giả Lập Live (Simulator)</h2>
        </div>

        <button
          type="button"
          onClick={() => {
            const next = !isAutoBotRunning;
            setAutoBotRunning(next);
            pushLog(next ? '🤖 Bật Auto-Bot Demo liên hoàn' : '⏹ Dừng Auto-Bot Demo');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
            isAutoBotRunning
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40'
              : 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
          }`}
        >
          {isAutoBotRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isAutoBotRunning ? 'Dừng Auto-Bot' : 'Auto-Bot Demo'}
        </button>
      </div>

      {/* Quick Simulation Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={addFiveViewers}
          className="px-3 py-2.5 rounded-xl bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <UserPlus className="w-4 h-4 shrink-0" />
          +5 Khách xếp hàng
        </button>

        <button
          type="button"
          onClick={spamLikes}
          className="px-3 py-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Heart className="w-4 h-4 shrink-0" />
          Spam Tim (Tốc độ)
        </button>

        <button
          type="button"
          onClick={sendRoseVip}
          className="px-3 py-2.5 rounded-xl bg-pink-950/80 hover:bg-pink-900 border border-pink-700/60 text-pink-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Flower2 className="w-4 h-4 shrink-0" />
          Hoa Hồng VIP (1 xu)
        </button>

        <button
          type="button"
          onClick={sendTrollGift}
          className="px-3 py-2.5 rounded-xl bg-orange-950/80 hover:bg-orange-900 border border-orange-700/60 text-orange-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Smile className="w-4 h-4 shrink-0" />
          Vẽ Troll (10 xu)
        </button>

        <button
          type="button"
          onClick={sendRoyalGift}
          className="px-3 py-2.5 rounded-xl bg-amber-950/80 hover:bg-amber-900 border border-amber-600/70 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Crown className="w-4 h-4 shrink-0" />
          Quà Lớn (50 xu)
        </button>

        <button
          type="button"
          onClick={sendModelChat}
          className="px-3 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 shrink-0" />
          Mẫu đang ngồi chat
        </button>
      </div>

      <button
        type="button"
        onClick={sendJoinPasserby}
        className="w-full py-2 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Footprints className="w-3.5 h-3.5 text-amber-400" />
        Giả lập khách JOIN đi ngang cửa sổ
      </button>

      {/* Live Action Log */}
      <div className="rounded-xl bg-stone-950 border border-stone-800 p-2.5 h-32 overflow-y-auto font-mono text-[11px] space-y-1 text-stone-400">
        {logs.length === 0 ? (
          <div className="text-stone-600">Chưa có nhật ký sự kiện...</div>
        ) : (
          logs.map((entry, idx) => (
            <div key={`${entry}_${idx}`} className="truncate">
              {entry}
            </div>
          ))
        )}
      </div>
    </section>
  );
};
