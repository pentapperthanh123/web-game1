import React, { useState } from 'react';
import { RefreshCw, PlayCircle, Terminal, AlertTriangle, Loader2 } from 'lucide-react';
import { BatchGenerationStatus, VietTtsCurrentConfig, VietTtsVoice, VoiceGender } from '../../types/vietTtsStudio';

interface BatchGeneratorBarProps {
  currentConfig: VietTtsCurrentConfig;
  status: BatchGenerationStatus;
  allVoices: readonly VietTtsVoice[];
  onSetPrimaryVoice: (gender: VoiceGender, voiceId: string) => void;
  onGenerate: (force: boolean) => void;
}

export const BatchGeneratorBar: React.FC<BatchGeneratorBarProps> = ({
  currentConfig,
  status,
  allVoices,
  onSetPrimaryVoice,
  onGenerate,
}) => {
  const [showLogs, setShowLogs] = useState(false);

  const maleVoices = allVoices.filter((v) => v.gender === 'male' || v.isCustomClone);
  const femaleVoices = allVoices.filter((v) => v.gender === 'female');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Title & Dropdown Selectors */}
        <div className="space-y-2 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              <PlayCircle className="w-4 h-4 text-emerald-400" />
              <span>Hệ Thống Audio BLV Tĩnh Của Game</span>
            </h4>
            {status.isRunning && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                <Loader2 className="w-3 h-3 animate-spin" /> Đang chạy sinh audio...
              </span>
            )}
          </div>

          {/* Voice Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Giọng Nam Selector */}
            <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-sky-400 font-semibold shrink-0">👨 Giọng Nam:</span>
              <select
                value={currentConfig.voiceMale}
                onChange={(e) => onSetPrimaryVoice('male', e.target.value)}
                disabled={status.isRunning}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
              >
                {maleVoices.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-slate-100">
                    {v.name} ({v.id})
                  </option>
                ))}
              </select>
            </div>

            {/* Giọng Nữ Selector */}
            <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
              <span className="text-pink-400 font-semibold shrink-0">👩 Giọng Nữ:</span>
              <select
                value={currentConfig.voiceFemale}
                onChange={(e) => onSetPrimaryVoice('female', e.target.value)}
                disabled={status.isRunning}
                className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
              >
                {femaleVoices.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-900 text-slate-100">
                    {v.name} ({v.id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowLogs(!showLogs)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>{showLogs ? 'Ẩn Log' : 'Xem Log'}</span>
          </button>

          <button
            type="button"
            disabled={status.isRunning}
            onClick={() => onGenerate(false)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/20 transition disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status.isRunning ? 'animate-spin' : ''}`} />
            <span>Sinh Audio Mới (Có Cache)</span>
          </button>

          <button
            type="button"
            disabled={status.isRunning}
            onClick={() => onGenerate(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500 text-xs font-medium transition disabled:opacity-40"
            title="Bỏ qua cache hash và sinh lại toàn bộ 52 câu thoại với 2 giọng đã chọn"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Sinh Lại Toàn Bộ (--force)</span>
          </button>
        </div>
      </div>

      {/* Progress Line */}
      {status.lastLine && (
        <div className="p-2 rounded bg-slate-950/80 border border-slate-800/80 text-xs font-mono text-slate-300 truncate">
          {status.lastLine}
        </div>
      )}

      {/* Log Console Drawer */}
      {showLogs && (
        <div className="mt-2 p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto space-y-1">
          {status.logs.length === 0 ? (
            <span className="text-slate-500 italic">Chưa có log nào...</span>
          ) : (
            status.logs.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                {line}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
