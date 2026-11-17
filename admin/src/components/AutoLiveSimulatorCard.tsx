import React, { useEffect, useState } from 'react';
import { Clapperboard, Sparkles, Zap, Radio, Check, Square, RotateCcw } from 'lucide-react';
import { adminSocket } from '../services/socket';

export interface AutoLiveStatusPayload {
  isActive: boolean;
  mode: 'natural' | 'highlight';
  phase: 'EARLY' | 'MID' | 'CLIMAX';
  phaseLabel: string;
  summonsCount: number;
  giftsCount: number;
  likesCount: number;
  lastAction: string;
  message?: string;
}

export const AutoLiveSimulatorCard: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'natural' | 'highlight'>('natural');
  const [status, setStatus] = useState<AutoLiveStatusPayload | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const unsub = adminSocket.onAutoLiveStatus((incoming) => {
      setStatus(incoming as AutoLiveStatusPayload);
      setIsActive(incoming.isActive);
      if (incoming.mode) setSelectedMode(incoming.mode);
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((prev) => (prev === msg ? null : prev));
    }, 1800);
  };

  const handleStartWithReset = () => {
    setIsActive(true);
    adminSocket.toggleAutoLive(true, selectedMode, true);
    showToast(
      `🎬 Đã RESET Ván 1 & Bắt Đầu Giả Lập Live (${selectedMode === 'highlight' ? 'Highlight 60s' : 'Tự Nhiên 2-3p'})!`
    );
  };

  const handleStop = () => {
    setIsActive(false);
    adminSocket.toggleAutoLive(false, selectedMode, false);
    showToast('⏹ Đã DỪNG Giả Lập Live!');
  };

  const handleResetNow = () => {
    adminSocket.toggleAutoLive(true, selectedMode, true);
    showToast('🔄 Đã Reset lại ván 1 & bắt đầu lại giả lập!');
  };

  const handleChangeMode = (mode: 'natural' | 'highlight') => {
    setSelectedMode(mode);
    if (isActive) {
      adminSocket.toggleAutoLive(true, mode, false);
      showToast(`Đã chuyển sang chế độ: ${mode === 'highlight' ? 'Highlight TikTok' : 'Tự Nhiên'}`);
    }
  };

  return (
    <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-purple-950/40 border border-purple-500/30 shadow-xl space-y-4">
      {/* Toast Feedback */}
      {feedback && (
        <div className="p-2 rounded-xl bg-purple-950/90 border border-purple-400 text-purple-200 text-xs font-bold text-center flex items-center justify-center space-x-1.5 animate-fadeIn">
          <Check className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-900/40 text-purple-300 border border-purple-500/40 shadow shrink-0">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>TỰ ĐỘNG GIẢ LẬP LIVE (QUAY CONTENT)</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  isActive
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500 animate-pulse'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {isActive ? '● Đang Phát Live' : 'Đang Tắt'}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              1 click tự động reset về Ván 1 (0-0, đầy máu Boss) và tự động tương tác từ đầu để bạn quay video TikTok / Shorts!
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isActive ? (
            <>
              <button
                type="button"
                onClick={handleResetNow}
                className="px-3 sm:px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition active:scale-95 cursor-pointer shadow"
                title="Reset lại ván 1 ngay lập tức"
              >
                <RotateCcw className="w-4 h-4 shrink-0 text-cyan-400" />
                <span>Reset Ván Mới</span>
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition cursor-pointer active:scale-95 shadow-lg bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/40"
              >
                <Square className="w-4 h-4 fill-current shrink-0" />
                <span>DỪNG GIẢ LẬP LIVE</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartWithReset}
              className="px-4 sm:px-6 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center space-x-2 transition cursor-pointer active:scale-95 shadow-lg bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 hover:from-purple-400 hover:to-amber-300 text-slate-950 shadow-purple-900/40"
            >
              <Radio className="w-4 h-4 shrink-0 animate-pulse" />
              <span>RESET VÁN 1 & BẮT ĐẦU QUAY LIVE</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode Selector & Stage Progression */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
        {/* Mode Selector */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-slate-300 flex items-center space-x-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Chọn Kịch Bản Nhịp Độ:</span>
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleChangeMode('natural')}
              className={`p-2 rounded-xl border text-left transition ${
                selectedMode === 'natural'
                  ? 'bg-purple-950/60 border-purple-400 text-white shadow-[0_0_10px_rgba(168,85,247,0.25)]'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-xs text-purple-300">🎬 Kịch Tính Tự Nhiên</div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                Nhịp 1.8s, ván đấu 2-3 phút, kéo co lật kèo sâu sắc
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleChangeMode('highlight')}
              className={`p-2 rounded-xl border text-left transition ${
                selectedMode === 'highlight'
                  ? 'bg-amber-950/60 border-amber-400 text-white shadow-[0_0_10px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-bold text-xs text-amber-300">⚡ Highlight TikTok 60s</div>
              <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                Nhịp 0.9s dồn dập, bão quà và skill nổ liên hoàn
              </div>
            </button>
          </div>
        </div>

        {/* Live Progression Tracker */}
        <div className="space-y-1.5 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-300 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Tiến Trình Quà Leo Thang:</span>
            </span>
            <span className="text-[10px] font-mono text-purple-300 font-semibold">
              {status?.phaseLabel || 'Sẵn sàng kích hoạt'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] text-center font-semibold">
            <div
              className={`p-1.5 rounded-lg border ${
                status?.phase === 'EARLY'
                  ? 'bg-rose-950/60 border-rose-500 text-rose-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <div>Đầu Ván</div>
              <div className="text-[9px] font-normal mt-0.5">Hoa hồng (1 xu)</div>
            </div>

            <div
              className={`p-1.5 rounded-lg border ${
                status?.phase === 'MID'
                  ? 'bg-amber-950/60 border-amber-500 text-amber-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <div>Giữa Ván</div>
              <div className="text-[9px] font-normal mt-0.5">Mũ, Corgi (99x)</div>
            </div>

            <div
              className={`p-1.5 rounded-lg border ${
                status?.phase === 'CLIMAX'
                  ? 'bg-purple-950/60 border-purple-500 text-purple-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <div>Cao Trào & Lật Kèo</div>
              <div className="text-[9px] font-normal mt-0.5">Sư tử, Vũ trụ</div>
            </div>
          </div>

          {status && (
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
              <div>
                Tướng: <span className="text-white font-mono">{status.summonsCount}</span> | Quà:{' '}
                <span className="text-white font-mono">{status.giftsCount}</span>
              </div>
              <div className="truncate max-w-[180px] text-slate-300 italic">{status.lastAction}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
