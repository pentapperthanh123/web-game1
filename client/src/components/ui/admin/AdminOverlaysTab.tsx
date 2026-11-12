import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Layout, Check } from 'lucide-react';
import { useGameStore } from '../../../store/gameStore';
import { ADMIN_CONSTANTS, OVERLAY_SECTION } from '../../../constants/game';
import { OverlayVisibility } from '../../../types/game';
import { gameSocket } from '../../../services/socket';
import { gameBus } from '../../../services/eventBus';

const FEEDBACK_TOAST_DURATION_MS = 1500;
const OVERLAY_KEYS = Object.values(OVERLAY_SECTION) as (keyof OverlayVisibility)[];

function buildUniformOverlayVisibility(isVisible: boolean): OverlayVisibility {
  return OVERLAY_KEYS.reduce<OverlayVisibility>(
    (acc, key) => {
      acc[key] = isVisible;
      return acc;
    },
    {} as OverlayVisibility
  );
}

export const AdminOverlaysTab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const overlayVisibility = useGameStore((state) => state.overlayVisibility);
  const setOverlayVisibility = useGameStore((state) => state.setOverlayVisibility);

  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current !== null) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const showFeedback = (message: string) => {
    setStatusFeedback(message);
    if (feedbackTimerRef.current !== null) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setStatusFeedback((prev) => (prev === message ? null : prev));
    }, FEEDBACK_TOAST_DURATION_MS);
  };

  const applyVisibilityPatch = (patch: Partial<OverlayVisibility>, feedbackMsg: string) => {
    setOverlayVisibility(patch);
    gameSocket.sendOverlayVisibility(patch);
    gameBus.publish({ type: 'SET_OVERLAY_VISIBILITY', payload: patch });
    showFeedback(feedbackMsg);
  };

  const handleToggle = (key: keyof OverlayVisibility, label: string) => {
    const nextState = !overlayVisibility[key];
    const feedbackMsg = nextState
      ? t('Admin.overlayShownFeedback', { defaultValue: 'Hiện: {{label}}', label })
      : t('Admin.overlayHiddenFeedback', { defaultValue: 'Ẩn: {{label}}', label });

    applyVisibilityPatch({ [key]: nextState }, feedbackMsg);
  };

  const handleSetAll = (isVisible: boolean) => {
    const uniformState = buildUniformOverlayVisibility(isVisible);
    const feedbackMsg = isVisible
      ? t('Admin.overlayShowAllFeedback', 'Đã bật hiển thị toàn bộ section!')
      : t('Admin.overlayHideAllFeedback', 'Đã ẩn toàn bộ section HUD!');

    applyVisibilityPatch(uniformState, feedbackMsg);
  };

  const totalCount = ADMIN_CONSTANTS.OVERLAYS.length;
  const activeCount = ADMIN_CONSTANTS.OVERLAYS.filter(
    (item) => overlayVisibility[item.key as keyof OverlayVisibility]
  ).length;

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
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/70 border border-slate-800">
        <div className="flex items-center space-x-1.5 font-bold text-cyan-300">
          <Layout className="w-3.5 h-3.5 text-cyan-400" />
          <span>{t('Admin.overlayTitle', 'Ẩn/Hiện Các Section Màn Hình:')}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono">
            {activeCount}/{totalCount}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleSetAll(true)}
            className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-bold hover:bg-emerald-900/80 transition active:scale-95"
          >
            <Eye className="w-3 h-3" />
            <span>{t('Admin.overlayShowAll', 'Hiện tất cả')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetAll(false)}
            className="flex items-center space-x-1 py-1 px-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold hover:bg-slate-700 transition active:scale-95"
          >
            <EyeOff className="w-3 h-3" />
            <span>{t('Admin.overlayHideAll', 'Ẩn tất cả')}</span>
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
                {isVisible
                  ? t('Admin.overlayVisibleStatus', 'Đang hiện')
                  : t('Admin.overlayHiddenStatus', 'Đang ẩn')}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
