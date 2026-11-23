import React, { useEffect, useState } from 'react';
import { LessonControl } from './components/LessonControl';
import { LiveConfigPanel } from './components/LiveConfigPanel';
import { ClassroomSimulator } from './components/ClassroomSimulator';
import { QuestionBankEditor } from './components/QuestionBankEditor';
import { ClassroomLiveDrawer } from './components/ClassroomLiveDrawer';
import { School, ExternalLink, Smartphone } from 'lucide-react';
import { useAdminStore } from './store/adminStore';
import { emitAdminAction, emitLiveConfig } from './services/adminEmitter';

export const App: React.FC = () => {
  const [isLivePreviewOpen, setIsLivePreviewOpen] = useState<boolean>(false);

  // Lắng nghe tín hiệu CLIENT_READY khi IFrame hoặc Tab con tải xong
  useEffect(() => {
    const handleWindowMsg = (e: MessageEvent) => {
      if (e.data?.type === 'CLIENT_READY') {
        const store = useAdminStore.getState();
        const currentQ = store.questions[store.currentQuestionIndex] || store.questions[0];
        emitAdminAction('START_QUESTION', { question: currentQ });
        emitLiveConfig({
          isMicMode: store.isMicMode,
          isLockWhileReading: store.isLockWhileReading,
          isAvatarVisible: store.isAvatarVisible,
          heartGoal: store.heartGoal,
        });
      }
    };
    window.addEventListener('message', handleWindowMsg);
    return () => window.removeEventListener('message', handleWindowMsg);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center shadow-md">
            <School className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white leading-tight">
              Bảng Điều Khiển Host - Lớp Học Trực Tuyến
            </h1>
            <p className="text-[11px] text-gray-400">
              apps/classroom-live · Màn hình phát Live:{' '}
              <a
                href="http://localhost:8010"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
              >
                localhost:8010 <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Nút bật/tắt nhúng Live Client 9:16 */}
          <button
            type="button"
            onClick={() => setIsLivePreviewOpen((prev) => !prev)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-md active:scale-95 cursor-pointer ${
              isLivePreviewOpen
                ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20'
                : 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/50 hover:border-emerald-500'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>{isLivePreviewOpen ? 'Đóng Xem Live' : '📱 Xem Live Client (9:16)'}</span>
          </button>

          <span className="hidden sm:flex items-center gap-1.5 bg-emerald-950 border border-emerald-500/50 text-emerald-300 text-xs px-3 py-1 rounded-full font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Sẵn sàng kết nối TikTok LIVE</span>
          </span>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cột 1: Điều phối tiết học & Bộ giả lập */}
        <div className="flex flex-col gap-4">
          <LessonControl />
          <ClassroomSimulator />
        </div>

        {/* Cột 2: Cấu hình trực tiếp & Ngân hàng 60 câu hỏi */}
        <div className="flex flex-col gap-4">
          <LiveConfigPanel />
          <QuestionBankEditor />
        </div>
      </main>

      {/* Nút Floating góc dưới phải mở Live Preview khi Drawer đóng */}
      {!isLivePreviewOpen && (
        <button
          type="button"
          onClick={() => setIsLivePreviewOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-emerald-400/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <Smartphone className="w-4 h-4" />
          <span>Mở Live Preview (9:16)</span>
          <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
        </button>
      )}

      {/* Live Client Preview Drawer (Nhúng màn hình dọc 9:16 của Client port 8010) */}
      <ClassroomLiveDrawer
        isOpen={isLivePreviewOpen}
        onClose={() => setIsLivePreviewOpen(false)}
        clientUrl="http://localhost:8010"
      />
    </div>
  );
};

export default App;
