import React, { useEffect, useRef } from 'react';
import {
  UserPlus,
  Heart,
  MessageSquare,
  Gift,
  Play,
  Square,
  Sparkles,
  Navigation,
  Award,
  Smile,
  AlertOctagon,
  Moon,
  Coffee,
} from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import { emitLiveEvent, emitAdminAction } from '../services/adminEmitter';

const SAMPLE_NAMES = [
  'Đăng Khoa', 'Bảo Ngọc', 'Thị Dâu', 'Thủy Lâm', 'Gia Huy',
  'Ngọc Ánh', 'Uyên Nhi', 'Tuấn Khang', 'Minh Triết', 'Khánh An',
  'Hoàng Nam', 'Phương Thảo', 'Hữu Phước', 'Thanh Trúc', 'Kim Toàn',
];

export const ClassroomSimulator: React.FC = () => {
  const { autoBotActive, toggleAutoBot, questions, currentQuestionIndex } = useAdminStore();
  const botIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Thêm 10 học sinh vào lớp
  const handleAddStudents = () => {
    for (let i = 0; i < 10; i++) {
      const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)] + `_${Math.floor(Math.random() * 90 + 10)}`;
      emitLiveEvent({
        type: 'JOIN',
        platform: 'mock',
        timestamp: Date.now(),
        user: {
          id: `mock_${Date.now()}_${i}`,
          username: name,
          nickname: name,
          avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${name}`,
        },
      });
    }
  };

  // 2. Spam 200 tim
  const handleSpamHearts = () => {
    emitLiveEvent({
      type: 'LIKE',
      platform: 'mock',
      timestamp: Date.now(),
      user: { id: 'fan_tim', username: 'Fan_Thả_Tim', nickname: 'Bé Thả Tim' },
      count: 200,
    });
  };

  // 3. Chat câu trả lời đúng
  const handleChatCorrect = () => {
    const currentQ = questions[currentQuestionIndex] || questions[0];
    const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
    emitLiveEvent({
      type: 'CHAT',
      platform: 'mock',
      timestamp: Date.now(),
      user: { id: `solver_${Date.now()}`, username: name, nickname: name },
      text: currentQ.answer,
    });
  };

  // 4. Chat câu trả lời trêu đùa
  const handleChatWrong = () => {
    const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
    const funTexts = ['Cô ơi cho em đi vệ sinh', 'Đoán bừa một câu nè cô ơi', 'Khó quá cô Anna ơi', 'Hôm nay cô mặc áo dài xinh quá'];
    const text = funTexts[Math.floor(Math.random() * funTexts.length)];
    emitLiveEvent({
      type: 'CHAT',
      platform: 'mock',
      timestamp: Date.now(),
      user: { id: `chatter_${Date.now()}`, username: name, nickname: name },
      text,
    });
  };

  // 5. Tặng quà 3 mức
  const handleSendGift = (coins: number, giftName: string) => {
    const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
    emitLiveEvent({
      type: 'GIFT',
      platform: 'mock',
      timestamp: Date.now(),
      user: { id: `donor_${Date.now()}`, username: name, nickname: name },
      giftName,
      coinValue: coins,
      repeatCount: 1,
    });
  };

  // 6. Chế độ Auto-Bot tự động chạy demo toàn diện
  const tickCountRef = useRef<number>(0);

  useEffect(() => {
    if (autoBotActive) {
      // Bắt đầu ngay câu hỏi hiện tại nếu Client đang ở trạng thái chờ
      const currentQ = questions[currentQuestionIndex] || questions[0];
      emitAdminAction('START_QUESTION', { question: currentQ });

      botIntervalRef.current = setInterval(() => {
        tickCountRef.current += 1;
        const tick = tickCountRef.current;

        // Cứ mỗi 11 nhịp (~22 giây): Tự động phát câu hỏi tiếp theo
        if (tick % 11 === 0) {
          const store = useAdminStore.getState();
          const nextIdx = (store.currentQuestionIndex + 1) % store.questions.length;
          store.setCurrentQuestionIndex(nextIdx);
          emitAdminAction('START_QUESTION', { question: store.questions[nextIdx] });
          return;
        }

        // Vào khoảng giây thứ 8-10 (nhịp thứ 4 hoặc 5): Một học sinh giải đúng câu hỏi
        if (tick % 11 === 5) {
          handleChatCorrect();
          return;
        }

        // Các nhịp còn lại: Mô phỏng không khí lớp học trực tuyến sôi động
        const rand = Math.random();
        if (rand < 0.28) {
          handleSpamHearts();
        } else if (rand < 0.50) {
          handleChatWrong();
        } else if (rand < 0.65) {
          handleSendGift(10, 'Trà sữa tặng cô');
        } else if (rand < 0.82) {
          // Kích hoạt học sinh mới hoặc VIP đi bộ vào lớp
          emitAdminAction(Math.random() > 0.4 ? 'TEST_WALK_NORMAL' : 'TEST_WALK_VIP');
        } else {
          // Kích hoạt tinh nghịch (ngủ gật, ăn vụng) hoặc cô giáo đi kiểm tra
          if (Math.random() > 0.5) {
            emitAdminAction('TEST_STUDENT_SLEEP');
          } else {
            emitAdminAction('TEST_TEACHER_INSPECT');
          }
        }
      }, 2000);
    } else {
      if (botIntervalRef.current) {
        clearInterval(botIntervalRef.current);
        botIntervalRef.current = null;
      }
      tickCountRef.current = 0;
    }

    return () => {
      if (botIntervalRef.current) clearInterval(botIntervalRef.current);
    };
  }, [autoBotActive, currentQuestionIndex, questions]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-sm font-bold text-sky-400 flex items-center gap-1.5 uppercase tracking-wide">
          <span>🧪 Bộ Giả Lập Kiểm Thử (Live Simulator)</span>
        </h2>
        <button
          type="button"
          onClick={toggleAutoBot}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shadow-xs active:scale-95 ${autoBotActive
            ? 'bg-rose-600 text-white animate-pulse'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
        >
          {autoBotActive ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{autoBotActive ? 'DỪNG AUTO-BOT' : 'BẬT AUTO-BOT DEMO'}</span>
        </button>
      </div>

      {/* Hành động mô phỏng cơ bản */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-xs">
        <button
          type="button"
          onClick={handleAddStudents}
          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-2.5 rounded-lg border border-slate-700 transition cursor-pointer active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5 text-blue-400" />
          <span>+10 Học Sinh</span>
        </button>

        <button
          type="button"
          onClick={handleSpamHearts}
          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-2.5 rounded-lg border border-slate-700 transition cursor-pointer active:scale-95"
        >
          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-500" />
          <span>Spam 200 Tim</span>
        </button>

        <button
          type="button"
          onClick={handleChatCorrect}
          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-2.5 rounded-lg border border-slate-700 transition cursor-pointer active:scale-95"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chat Đáp Án Đúng</span>
        </button>

        <button
          type="button"
          onClick={handleChatWrong}
          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold py-2 px-2.5 rounded-lg border border-slate-700 transition cursor-pointer active:scale-95"
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          <span>Chat Trêu Cô</span>
        </button>
      </div>

      {/* Quà đóng quỹ */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <button
          type="button"
          onClick={() => handleSendGift(1, 'Hoa hồng')}
          className="flex items-center justify-center gap-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/40 text-amber-300 font-bold py-2 px-2 rounded-lg transition cursor-pointer active:scale-95"
        >
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span>1 Xu (Vào bàn)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendGift(10, 'Bút vẽ')}
          className="flex items-center justify-center gap-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/40 text-amber-300 font-bold py-2 px-2 rounded-lg transition cursor-pointer active:scale-95"
        >
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span>10 Xu (Mở gợi ý)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSendGift(50, 'Vương miện')}
          className="flex items-center justify-center gap-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/40 text-amber-300 font-bold py-2 px-2 rounded-lg transition cursor-pointer active:scale-95"
        >
          <Gift className="w-3.5 h-3.5 text-amber-400" />
          <span>50 Xu (Buff x2 Điểm Tổ)</span>
        </button>
      </div>

      {/* 4 Nút Test Diễn Hoạt Mới (Animation Test Suite) */}
      <div className="border-t border-slate-800 pt-2 flex flex-col gap-2">
        <span className="text-[11px] font-black uppercase text-purple-300 tracking-wider flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-400" />
          <span>Bộ Test Diễn Hoạt Hoạt Ảnh (Animation Test Suite)</span>
        </span>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => emitAdminAction('TEST_TEACHER_ACTION')}
            className="flex items-center justify-center gap-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-600/50 text-purple-200 font-bold py-2 px-2 rounded-lg transition cursor-pointer active:scale-95 text-left"
          >
            <Smile className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">1. Test Cô giáo đi tuần / Ăn mừng</span>
          </button>

          <button
            type="button"
            onClick={() => emitAdminAction('TEST_WALK_NORMAL')}
            className="flex items-center justify-center gap-1.5 bg-sky-950/80 hover:bg-sky-900 border border-sky-600/50 text-sky-200 font-bold py-2 px-2 rounded-lg transition cursor-pointer active:scale-95 text-left"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate">2. Test 3 HS đi bộ vào lớp (Thường)</span>
          </button>

          <button
            type="button"
            onClick={() => emitAdminAction('TEST_WALK_VIP')}
            className="flex items-center justify-center gap-1.5 bg-yellow-950/80 hover:bg-yellow-900 border border-yellow-600/50 text-yellow-200 font-bold py-2 px-2 rounded-lg transition cursor-pointer active:scale-95 text-left"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">3. Test HS VIP chạy vào bàn (Gift)</span>
          </button>

          <button
            type="button"
            onClick={() => emitAdminAction('TEST_STUDENT_HANDS')}
            className="flex items-center justify-center gap-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-200 font-bold py-2 px-2 rounded-lg transition cursor-pointer active:scale-95 text-left"
          >
            <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">4. Test 5 HS giơ tay & Trả lời đúng</span>
          </button>
        </div>
      </div>

      {/* 4 Nút Test Tinh Nghịch & Kỷ Luật (Discipline & Mischief) */}
      <div className="border-t border-slate-800 pt-2 flex flex-col gap-2">
        <span className="text-[11px] font-black uppercase text-rose-400 tracking-wider flex items-center gap-1">
          <AlertOctagon className="w-3 h-3 text-rose-500" />
          <span>Kỷ Luật & Tinh Nghịch (Ngủ gật, Ăn vụng, Đánh đòn)</span>
        </span>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => emitAdminAction('TEST_TEACHER_INSPECT')}
            className="flex items-center justify-center gap-1.5 bg-rose-950/90 hover:bg-rose-900 border border-rose-600/60 text-rose-200 font-bold py-2 px-2 rounded-lg transition cursor-pointer active:scale-95 text-left col-span-2 shadow-sm"
          >
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="truncate">🚨 1. Bắt Quả Tang & Cô Đi Xuống Đánh Đòn</span>
          </button>

          <button
            type="button"
            onClick={() => emitAdminAction('TEST_STUDENT_SLEEP')}
            className="flex items-center justify-center gap-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-600/50 text-indigo-200 font-bold py-2 px-2 rounded-lg transition cursor-pointer active:scale-95 text-left"
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">😴 2. Test 3 HS Ngủ Gật (Zzz)</span>
          </button>

          <button
            type="button"
            onClick={() => emitAdminAction('TEST_STUDENT_EAT')}
            className="flex items-center justify-center gap-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/50 text-amber-200 font-bold py-2 px-2 rounded-lg transition cursor-pointer active:scale-95 text-left"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">🧋 3. Test 3 HS Ăn Quà Vặt</span>
          </button>

          <button
            type="button"
            onClick={() => emitAdminAction('TEST_STUDENT_TALK')}
            className="flex items-center justify-center gap-1.5 bg-teal-950/80 hover:bg-teal-900 border border-teal-600/50 text-teal-200 font-bold py-2 px-2 rounded-lg transition cursor-pointer active:scale-95 text-left col-span-2"
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-400 shrink-0" />
            <span className="truncate">💬 4. Test 2 Bàn Nói Chuyện Riêng</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClassroomSimulator;
