import React from 'react';
import { Mic, MicOff, Lock, Unlock, Heart, Eye, EyeOff } from 'lucide-react';
import { useAdminStore } from '../store/adminStore';
import { emitLiveConfig } from '../services/adminEmitter';

export const LiveConfigPanel: React.FC = () => {
  const {
    isMicMode,
    toggleMicMode,
    isLockWhileReading,
    toggleLockWhileReading,
    isAvatarVisible,
    toggleAvatarVisible,
    heartGoal,
    setHeartGoal,
  } = useAdminStore();

  const handleToggleMic = () => {
    const nextVal = !isMicMode;
    toggleMicMode();
    emitLiveConfig({ isMicMode: nextVal });
  };

  const handleToggleLock = () => {
    const nextVal = !isLockWhileReading;
    toggleLockWhileReading();
    emitLiveConfig({ isLockWhileReading: nextVal });
  };

  const handleToggleAvatar = () => {
    const nextVal = !isAvatarVisible;
    toggleAvatarVisible();
    emitLiveConfig({ isAvatarVisible: nextVal });
  };

  const handleSetGoal = (goal: number) => {
    setHeartGoal(goal);
    emitLiveConfig({ heartGoal: goal });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <h2 className="text-sm font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
          <span>⚙️ Cấu Hình Trực Tiếp (Live Config)</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* 1. Công tắc Host Mở Mic */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-gray-200">Chế độ Host Mở Mic</span>
            <span className="text-[11px] text-gray-400">Tắt TTS tự đọc để Host tự nói qua micro</span>
          </div>
          <button
            type="button"
            onClick={handleToggleMic}
            className={`p-2 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
              isMicMode
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            {isMicMode ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span>{isMicMode ? 'BẬT' : 'TẮT'}</span>
          </button>
        </div>

        {/* 2. Công tắc Khóa khi đọc đề */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-gray-200">Khóa gõ khi đọc đề</span>
            <span className="text-[11px] text-gray-400">Nghe hết đề, mở bảng mới tính điểm</span>
          </div>
          <button
            type="button"
            onClick={handleToggleLock}
            className={`p-2 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
              isLockWhileReading
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            {isLockWhileReading ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            <span>{isLockWhileReading ? 'KHÓA' : 'MỞ'}</span>
          </button>
        </div>

        {/* 3. Công tắc hiện avatar người xem */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between md:col-span-2">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-gray-200">Hiện avatar người xem</span>
            <span className="text-[11px] text-gray-400">Tắt để xem riêng hình học sinh (chỉ còn tên / chữ cái đầu)</span>
          </div>
          <button
            type="button"
            onClick={handleToggleAvatar}
            className={`p-2 rounded-lg font-bold transition flex items-center gap-1 cursor-pointer active:scale-95 ${
              isAvatarVisible
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
            }`}
          >
            {isAvatarVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{isAvatarVisible ? 'HIỆN' : 'ẨN'}</span>
          </button>
        </div>

        {/* 4. Ngưỡng tim Giờ Ra Chơi */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between md:col-span-2">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-400 fill-rose-500" />
            <span className="font-bold text-gray-200">Mục tiêu tim kích hoạt Giờ Ra Chơi:</span>
          </div>
          <div className="flex items-center gap-2">
            {[5000, 10000, 20000].map((goal) => (
              <button
                type="button"
                key={goal}
                onClick={() => handleSetGoal(goal)}
                className={`px-3 py-1 rounded text-xs font-bold transition cursor-pointer active:scale-95 ${
                  heartGoal === goal
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-800 text-gray-300 hover:bg-slate-700'
                }`}
              >
                {goal.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveConfigPanel;
