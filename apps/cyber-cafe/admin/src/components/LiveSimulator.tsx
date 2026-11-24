import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  PlayCircle,
  StopCircle,
  UserPlus,
  Flame,
  Shield,
  Heart,
  Gift,
  Activity,
  Sliders,
  Sparkles,
} from 'lucide-react';
import {
  AUTOBOT_PRESETS,
  RETRO_NET_QUOTES,
  type AutobotModeType,
} from '@shared/constants/cafeConfig';
import {
  simulateChat,
  simulateGift,
  simulateLike,
} from '../services/adminEmitter';

const BOT_NAMES = [
  'Cu_Tí_Võ_Lâm',
  'Hùng_Headshot',
  'Anh_Ba_Cày_Thuê',
  'Bé_Heo_Audition',
  'Phong_Kiếm_Thế',
  'Long_Đột_Kích',
  'Đại_Hiệp_Net',
  'Tiểu_Bảo_2008',
  'Công_Tử_Bạc_Liêu',
  'Khánh_Sky_Net',
  'Tuấn_Tiền_Tỉ',
  'Hải_Dưới_Ghế',
];

interface LiveSimulatorProps {
  isAutoBotRunning?: boolean;
  onToggleAutoBot?: (running: boolean) => void;
  botMode?: AutobotModeType;
  onBotModeChange?: (mode: AutobotModeType) => void;
}

export const LiveSimulator: React.FC<LiveSimulatorProps> = ({
  isAutoBotRunning: externalIsRunning,
  onToggleAutoBot,
  botMode: externalBotMode,
  onBotModeChange,
}) => {
  const [internalIsRunning, setInternalIsRunning] = useState(false);
  const [internalBotMode, setInternalBotMode] = useState<AutobotModeType>('CHILL');

  const isAutoBotRunning = externalIsRunning !== undefined ? externalIsRunning : internalIsRunning;
  const botMode = externalBotMode !== undefined ? externalBotMode : internalBotMode;

  const handleToggleAutoBot = (val?: boolean) => {
    const nextVal = typeof val === 'boolean' ? val : !isAutoBotRunning;
    if (onToggleAutoBot) {
      onToggleAutoBot(nextVal);
    } else {
      setInternalIsRunning(nextVal);
    }
  };

  const [botPaceMs, setBotPaceMs] = useState<number>(AUTOBOT_PRESETS.CHILL.intervalMs);
  const [dodgeSuccessRate, setDodgeSuccessRate] = useState<number>(AUTOBOT_PRESETS.CHILL.dodgeSuccessRate);

  useEffect(() => {
    if (externalBotMode) {
      setBotPaceMs(AUTOBOT_PRESETS[externalBotMode].intervalMs);
      setDodgeSuccessRate(AUTOBOT_PRESETS[externalBotMode].dodgeSuccessRate);
    }
  }, [externalBotMode]);

  // Live Telemetry Counters
  const [stats, setStats] = useState({
    chatsSent: 0,
    likesTapped: 0,
    giftsDonated: 0,
  });

  const [logs, setLogs] = useState<string[]>([]);
  const botTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = (msg: string) => {
    setLogs((prev) => [msg, ...prev.slice(0, 9)]);
  };

  // Switch bot mode preset
  const handleModeChange = (mode: AutobotModeType) => {
    if (onBotModeChange) {
      onBotModeChange(mode);
    } else {
      setInternalBotMode(mode);
    }
    setBotPaceMs(AUTOBOT_PRESETS[mode].intervalMs);
    setDodgeSuccessRate(AUTOBOT_PRESETS[mode].dodgeSuccessRate);
    addLog(`⚙️ Đã chuyển sang chế độ bot: ${AUTOBOT_PRESETS[mode].name}`);
  };

  // Manual Test Actions
  const handleSit = () => {
    const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const quote = RETRO_NET_QUOTES.SIT_AND_QUEUE[Math.floor(Math.random() * RETRO_NET_QUOTES.SIT_AND_QUEUE.length)];
    simulateChat(randomName, `ngoi - ${quote}`);
    setStats((s) => ({ ...s, chatsSent: s.chatsSent + 1 }));
    addLog(`👤 [Khách mới] ${randomName}: "ngoi"`);
  };

  const handleGrind = () => {
    const quote = RETRO_NET_QUOTES.GRIND_AND_SCORE[Math.floor(Math.random() * RETRO_NET_QUOTES.GRIND_AND_SCORE.length)];
    simulateChat('Tiểu Bảo 2008', `cay - ${quote}`);
    setStats((s) => ({ ...s, chatsSent: s.chatsSent + 1 }));
    addLog(`⚔️ Tiểu Bảo 2008: "cay" (+8s, +15đ)`);
  };

  const handleNup = () => {
    const quote = RETRO_NET_QUOTES.MOM_WARNING[Math.floor(Math.random() * RETRO_NET_QUOTES.MOM_WARNING.length)];
    simulateChat('Tiểu Bảo 2008', `nup - ${quote}`);
    setStats((s) => ({ ...s, chatsSent: s.chatsSent + 1 }));
    addLog(`🛡️ Tiểu Bảo 2008: "nup" (Alt-Tab học bài)`);
  };

  const handleLikes = () => {
    simulateLike(15);
    setStats((s) => ({ ...s, likesTapped: s.likesTapped + 15 }));
    addLog(`❤️ +15 Tim nạp giờ`);
  };

  const handleGiftSmallNoodle = () => {
    const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    simulateGift(randomName, 1, 'Mì Tôm Trứng');
    setStats((s) => ({ ...s, giftsDonated: s.giftsDonated + 1 }));
    addLog(`🍜 ${randomName} tặng Mì Tôm (+45s, x2 speed)`);
  };

  const handleGiftSmallReset = () => {
    const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    simulateGift(randomName, 2, 'Reset Wire');
    setStats((s) => ({ ...s, giftsDonated: s.giftsDonated + 1 }));
    addLog(`🖥️ ${randomName} bấm Reset rút mạng (BSOD -25s)`);
  };

  const handleGiftMediumMom = () => {
    const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    simulateGift(randomName, 10, 'Gọi Mẹ Cầm Chổi');
    setStats((s) => ({ ...s, giftsDonated: s.giftsDonated + 1 }));
    addLog(`🧹 ${randomName} gọi Phụ Huynh (10 xu)`);
  };

  const handleGiftLargeBlackout = () => {
    const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    simulateGift(randomName, 50, 'Cúp Cầu Dao');
    setStats((s) => ({ ...s, giftsDonated: s.giftsDonated + 1 }));
    addLog(`⚡ ${randomName} cúp cầu dao cả quán (50 xu)`);
  };

  // High-Energy Auto-Bot Net Loop
  useEffect(() => {
    if (isAutoBotRunning) {
      botTimerRef.current = setInterval(() => {
        const preset = AUTOBOT_PRESETS[botMode];
        const rand = Math.random();
        const randomName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];

        if (rand < preset.grindChance) {
          // Bot cày điểm
          const quote = RETRO_NET_QUOTES.GRIND_AND_SCORE[Math.floor(Math.random() * RETRO_NET_QUOTES.GRIND_AND_SCORE.length)];
          simulateChat(randomName, `cày - ${quote}`);
          setStats((s) => ({ ...s, chatsSent: s.chatsSent + 1 }));
          addLog(`🤖 [Bot Cày] ${randomName}: "cày" (+8s, +15đ)`);
        } else if (rand < preset.grindChance + preset.likeChance) {
          // Bot thả tim
          const likes = Math.floor(Math.random() * 12) + 5;
          simulateLike(likes);
          setStats((s) => ({ ...s, likesTapped: s.likesTapped + likes }));
          addLog(`🤖 [Bot Tim] Viewers thả +${likes} Tim`);
        } else if (rand < preset.grindChance + preset.likeChance + preset.queueChance) {
          // Bot vào hàng chờ hoặc núp phòng ngừa
          const isNupCheck = Math.random() < 0.4;
          if (isNupCheck) {
            const quote = RETRO_NET_QUOTES.MOM_WARNING[Math.floor(Math.random() * RETRO_NET_QUOTES.MOM_WARNING.length)];
            simulateChat(randomName, `núp - ${quote}`);
            setStats((s) => ({ ...s, chatsSent: s.chatsSent + 1 }));
            addLog(`🤖 [Bot Núp] ${randomName}: "núp"`);
          } else {
            const quote = RETRO_NET_QUOTES.SIT_AND_QUEUE[Math.floor(Math.random() * RETRO_NET_QUOTES.SIT_AND_QUEUE.length)];
            simulateChat(randomName, `ngồi - ${quote}`);
            setStats((s) => ({ ...s, chatsSent: s.chatsSent + 1 }));
            addLog(`🤖 [Bot Chờ] ${randomName}: "ngồi"`);
          }
        } else {
          // Bot tặng quà (tùy theo preset)
          if (botMode === 'CHAOS') {
            const giftType = Math.random();
            if (giftType < 0.4) {
              simulateGift(randomName, 10, 'Gọi Mẹ Cầm Chổi');
              addLog(`💥 [Bot Chaos] ${randomName} GỌI MẸ VỤT CHỔI!`);
            } else if (giftType < 0.7) {
              simulateGift(randomName, 2, 'Reset Wire');
              addLog(`💥 [Bot Chaos] ${randomName} BẤM RESET RÚT DÂY MẠNG!`);
            } else {
              simulateGift(randomName, 50, 'Cúp Cầu Dao');
              addLog(`⚡ [Bot Chaos] ${randomName} GIẬT CẦU DAO CẢ QUÁN!`);
            }
          } else {
            simulateGift(randomName, 1, 'Mì Tôm Trứng');
            addLog(`🍜 [Bot Buff] ${randomName} tặng Mì Tôm Trứng`);
          }
          setStats((s) => ({ ...s, giftsDonated: s.giftsDonated + 1 }));
        }
      }, botPaceMs);
    } else {
      if (botTimerRef.current) {
        clearInterval(botTimerRef.current);
        botTimerRef.current = null;
      }
    }

    return () => {
      if (botTimerRef.current) {
        clearInterval(botTimerRef.current);
        botTimerRef.current = null;
      }
    };
  }, [isAutoBotRunning, botMode, botPaceMs, dodgeSuccessRate]);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-xl flex flex-col gap-4">
      {/* Header & Auto-Bot Net Switch */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-400" />
          <div>
            <h2 className="text-sm font-black text-purple-400 tracking-wider flex items-center gap-1.5">
              <span>HỆ THỐNG AUTOBOT TỰ ĐỘNG (AUTOBOT ENGINE)</span>
              <span className="px-1.5 py-0.2 rounded bg-purple-950 border border-purple-500/40 text-[9px] text-purple-300 font-bold">
                PRO 2008
              </span>
            </h2>
            <p className="text-[11px] text-neutral-400">
              Giả lập lưu lượng người xem, cày điểm, tranh ghế và phản xạ né mẹ chân thực
            </p>
          </div>
        </div>

        {/* Big On/Off Toggle Button */}
        <button
          onClick={() => handleToggleAutoBot()}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
            isAutoBotRunning
              ? 'bg-purple-600 text-white border-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.8)] scale-105'
              : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
          }`}
        >
          {isAutoBotRunning ? <StopCircle className="w-4 h-4 text-white" /> : <PlayCircle className="w-4 h-4 text-purple-400" />}
          <span>{isAutoBotRunning ? 'AUTOBOT: ĐANG CHẠY' : 'BẬT AUTOBOT NET'}</span>
        </button>
      </div>

      {/* Autobot Mode Presets (Chill / Chaos / Rank Rush) */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-bold text-neutral-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Chọn Kịch Bản Bot:</span>
          </span>
          <span className="text-[11px] text-purple-300 font-mono">
            {AUTOBOT_PRESETS[botMode].description}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(['CHILL', 'CHAOS', 'RANK_RUSH'] as AutobotModeType[]).map((mode) => {
            const isSelected = botMode === mode;
            return (
              <button
                key={mode}
                onClick={() => handleModeChange(mode)}
                className={`px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  isSelected
                    ? 'bg-purple-950 border-purple-400 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
                }`}
              >
                <span>{AUTOBOT_PRESETS[mode].name}</span>
                <span className="text-[9px] font-mono opacity-70">
                  {mode === 'CHAOS' ? '💥 Phá liên tục' : mode === 'RANK_RUSH' ? '⚡ Cày thần tốc' : '☕ Êm đềm'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Speed & Dodge Rate Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-950/80 border border-neutral-800/80 p-3 rounded-xl">
        {/* Speed Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-neutral-400 flex items-center gap-1">
              <Sliders className="w-3 h-3 text-cyan-400" /> Nhịp Độ Bot:
            </span>
            <span className="text-cyan-300 font-bold">{botPaceMs}ms</span>
          </div>
          <input
            type="range"
            min={600}
            max={3000}
            step={100}
            value={botPaceMs}
            onChange={(e) => setBotPaceMs(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
          />
          <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
            <span>Bão Chat (0.6s)</span>
            <span>Thong thả (3.0s)</span>
          </div>
        </div>

        {/* Dodge Rate Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] font-mono">
            <span className="text-neutral-400 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" /> Tỷ Lệ Né Mẹ:
            </span>
            <span className="text-emerald-300 font-bold">{Math.round(dodgeSuccessRate * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.4}
            max={1.0}
            step={0.05}
            value={dodgeSuccessRate}
            onChange={(e) => setDodgeSuccessRate(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
          />
          <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
            <span>Dễ bị bắt (40%)</span>
            <span>Cao thủ né (100%)</span>
          </div>
        </div>
      </div>

      {/* Live Telemetry Counter Badges */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <div className="text-[10px] text-neutral-400 font-medium">Chat Bot Bắn:</div>
          <div className="text-xs font-black font-mono text-cyan-300">{stats.chatsSent}</div>
        </div>
        <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <div className="text-[10px] text-neutral-400 font-medium">Tim Đã Thả:</div>
          <div className="text-xs font-black font-mono text-pink-400">{stats.likesTapped}</div>
        </div>
        <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between">
          <div className="text-[10px] text-neutral-400 font-medium">Quà Bot Nạp:</div>
          <div className="text-xs font-black font-mono text-amber-400">{stats.giftsDonated}</div>
        </div>
      </div>

      {/* Manual Quick Testing Buttons */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold text-neutral-400">Nút Test Thủ Công Tức Thì:</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={handleSit}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-cyan-300 cursor-pointer transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-cyan-400" /> Vào Ghế ("ngồi")
          </button>

          <button
            onClick={handleGrind}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-yellow-300 cursor-pointer transition-colors"
          >
            <Flame className="w-3.5 h-3.5 text-yellow-400" /> Cày Điểm ("cày")
          </button>

          <button
            onClick={handleNup}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-emerald-300 cursor-pointer transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" /> Núp Mẹ ("núp")
          </button>

          <button
            onClick={handleLikes}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-xs font-bold text-pink-300 cursor-pointer transition-colors"
          >
            <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400" /> Thả 15 Tim
          </button>

          <button
            onClick={handleGiftSmallNoodle}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-700 text-xs font-bold text-amber-200 cursor-pointer transition-colors"
          >
            <Gift className="w-3.5 h-3.5 text-amber-400" /> Mì Tôm (1 xu)
          </button>

          <button
            onClick={handleGiftSmallReset}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-blue-950/70 hover:bg-blue-900 border border-blue-700 text-xs font-bold text-blue-200 cursor-pointer transition-colors"
          >
            <Gift className="w-3.5 h-3.5 text-blue-400" /> Rút Mạng (1 xu)
          </button>

          <button
            onClick={handleGiftMediumMom}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-red-950/70 hover:bg-red-900 border border-red-700 text-xs font-bold text-red-200 cursor-pointer transition-colors"
          >
            <Gift className="w-3.5 h-3.5 text-red-400" /> Gọi Mẹ (10 xu)
          </button>

          <button
            onClick={handleGiftLargeBlackout}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-purple-950/70 hover:bg-purple-900 border border-purple-700 text-xs font-bold text-purple-200 cursor-pointer transition-colors"
          >
            <Gift className="w-3.5 h-3.5 text-purple-400" /> Cúp Điện (50 xu)
          </button>
        </div>
      </div>

      {/* Simulator Event Feed Logs */}
      <div className="bg-neutral-950 border border-neutral-800/80 rounded-lg p-2.5 text-[11px] font-mono flex flex-col gap-1 min-h-[105px]">
        <div className="text-neutral-500 font-bold border-b border-neutral-900 pb-1 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-purple-400" /> NHẬT KÝ HOẠT ĐỘNG AUTOBOT:
          </span>
          <span className="text-[10px] text-neutral-500">{isAutoBotRunning ? '● Đang truyền dữ liệu' : '○ Tạm dừng'}</span>
        </div>
        {logs.length === 0 ? (
          <span className="text-neutral-600 italic">Bấm các nút test hoặc bật Auto-Bot Net để xem luồng tương tác...</span>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="text-neutral-300">
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
