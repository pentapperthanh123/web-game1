import React from 'react';
import { Square, Loader2, Gauge, AlertCircle, Volume2, Sparkles, Music } from 'lucide-react';
import { SPEED_CONFIG } from '../../constants/vietTtsStudio';
import { AudioPreviewState } from '../../types/vietTtsStudio';

interface VoiceTesterBarProps {
  testText: string;
  testSpeed: number;
  previewState: AudioPreviewState;
  onTextChange: (text: string) => void;
  onSpeedChange: (speed: number) => void;
  onStopPreview: () => void;
}

export const VoiceTesterBar: React.FC<VoiceTesterBarProps> = ({
  testSpeed,
  previewState,
  onSpeedChange,
  onStopPreview,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg backdrop-blur space-y-3">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Title & Badge */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>Trình Phát Audio Mẫu Chuẩn Viet-TTS</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> 0ms Latency · Sẵn 100%
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Phát trực tiếp các file audio demo có sẵn của Viet-TTS để nghe chất giọng chuẩn, không tốn GPU/CPU.
            </p>
          </div>
        </div>

        {/* Speed Slider */}
        <div className="flex items-center gap-3 bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Gauge className="w-3.5 h-3.5 text-amber-400" /> Tốc độ:
          </span>
          <span className="font-mono font-semibold text-amber-300 text-xs w-10 text-right">
            {testSpeed.toFixed(2)}x
          </span>
          <input
            type="range"
            min={SPEED_CONFIG.MIN}
            max={SPEED_CONFIG.MAX}
            step={SPEED_CONFIG.STEP}
            value={testSpeed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="w-24 accent-amber-400 bg-slate-800 cursor-pointer h-1.5 rounded"
          />
        </div>
      </div>

      {/* Now Playing Banner */}
      {previewState.isPlaying && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 animate-pulse">
          <div className="flex items-center gap-2 text-xs text-amber-300 font-medium">
            <Music className="w-4 h-4 animate-bounce text-amber-400" />
            <span>Đang phát file mẫu của giọng:</span>
            <span className="font-mono font-bold text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
              {previewState.activeVoiceId}
            </span>
          </div>

          <button
            type="button"
            onClick={onStopPreview}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Dừng phát</span>
          </button>
        </div>
      )}

      {/* Loading Voice Banner */}
      {previewState.isLoadingVoice && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-amber-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Đang tải file audio mẫu ({previewState.activeVoiceId})...</span>
        </div>
      )}

      {/* Error Message */}
      {previewState.errorMessage && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{previewState.errorMessage}</span>
        </div>
      )}
    </div>
  );
};
