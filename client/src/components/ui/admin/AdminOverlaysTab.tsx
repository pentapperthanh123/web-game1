import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Layout, Check } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { ADMIN_CONSTANTS } from '../../../constants/game';
import { OverlayVisibility } from '../../../types/game';

export const AdminOverlaysTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const overlayVisibility = useGameStore((state) => state.overlayVisibility);
  const setOverlayVisibility = useGameStore((state) => state.setOverlayVisibility);

  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => {
      setStatusFeedback((prev) => (prev === msg ? null : prev));
    }, 1500);
  };

  const handleToggle = (key: keyof OverlayVisibility, label: string) => {
    const nextState = !overlayVisibility[key];
    setOverlayVisibility({ [key]: nextState });
    showFeedback(`${nextState ? 'Hiện' : 'Ẩn'}: ${label}`);
  };

  const handleShowAll = () => {
    setOverlayVisibility({
      bossHealth: true,
      teamScores: true,
      teamRosters: true,
      leaderboard: true,
      chat: true,
      likeCounter: true,
      howToPlay: true,
    });
    showFeedback('Đã bật hiển thị toàn bộ giao diện!');
  };

  const handleHideAll = () => {
    setOverlayVisibility({
      bossHealth: false,
      teamScores: false,
      teamRosters: false,
      leaderboard: false,
      chat: false,
      likeCounter: false,
      howToPlay: false,
    });
    showFeedback('Đã ẩn toàn bộ giao diện HUD!');
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Feedback Toast */}
      {statusFeedback && (
        <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 font-semibold text-center flex items-center justify-center space-x-1.5 animate-fadeIn">
          <Check className="w-3.5 h-3.5" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {/* Bulk Action Controls */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
          <Layout className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('Admin.overlayTitle', 'Cài đặt hiển thị thành phần giao diện:')}</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleShowAll}
            className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-bold hover:bg-emerald-900/80 transition active:scale-95"
          >
            <Eye className="w-3 h-3" />
            <span>Hiện tất cả</span>
          </button>

          <button
            type="button"
            onClick={handleHideAll}
            className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700 transition active:scale-95"
          >
            <EyeOff className="w-3 h-3" />
            <span>Ẩn tất cả</span>
          </button>
        </div>
      </div>

      {/* Overlay Element Toggles */}
      <div className="grid grid-cols-1 gap-2">
        {ADMIN_CONSTANTS.OVERLAYS.map((item) => {
          const key = item.key as keyof OverlayVisibility;
          const isVisible = overlayVisibility[key];
          const label = isVi ? item.labelVi : item.labelEn;

          return (
            <div
              key={item.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition"
            >
              <div className="flex items-center space-x-2 text-slate-200 font-semibold">
                {isVisible ? (
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>{label}</span>
              </div>

              <button
                type="button"
                onClick={() => handleToggle(key, label)}
                className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase transition active:scale-95 ${
                  isVisible
                    ? 'bg-cyan-950/80 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.35)]'
                    : 'bg-slate-950/80 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {isVisible ? 'Đang hiện' : 'Đang ẩn'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

