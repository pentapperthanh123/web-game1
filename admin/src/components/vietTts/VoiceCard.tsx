import React from 'react';
import { Play, Square, Loader2, Check, Folder } from 'lucide-react';
import { VietTtsVoice, VoiceGender } from '../../types/vietTtsStudio';

interface VoiceCardProps {
  voice: VietTtsVoice;
  isPrimaryMale: boolean;
  isPrimaryFemale: boolean;
  isPlaying: boolean;
  isLoading: boolean;
  onTest: (voiceId: string) => void;
  onSetPrimary: (gender: VoiceGender, voiceId: string) => void;
}

interface TestButtonStateProps {
  isLoading: boolean;
  isPlaying: boolean;
}

const TestButtonState: React.FC<TestButtonStateProps> = ({ isLoading, isPlaying }) => {
  if (isLoading) {
    return (
      <>
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Đang tải...</span>
      </>
    );
  }
  if (isPlaying) {
    return (
      <>
        <Square className="w-3.5 h-3.5 fill-current" />
        <span>Dừng phát</span>
      </>
    );
  }
  return (
    <>
      <Play className="w-3.5 h-3.5 fill-current" />
      <span>Nghe Thử Mẫu</span>
    </>
  );
};

export const VoiceCard: React.FC<VoiceCardProps> = ({
  voice,
  isPrimaryMale,
  isPrimaryFemale,
  isPlaying,
  isLoading,
  onTest,
  onSetPrimary,
}) => {
  const isSelected = isPrimaryMale || isPrimaryFemale;

  return (
    <div
      className={`relative flex flex-col justify-between p-4 rounded-xl border transition-all duration-200 ${
        isSelected
          ? 'bg-amber-950/20 border-amber-500/60 shadow-lg shadow-amber-500/10'
          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Top Header & Badges */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 text-base">
              <span>{voice.name}</span>
              {voice.isCustomClone ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-normal flex items-center gap-1">
                  <Folder className="w-2.5 h-2.5" /> Clone .wav
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                  {voice.gender === 'male' ? '👨 Nam' : '👩 Nữ'}
                </span>
              )}
            </h4>
            <span className="font-mono text-xs text-slate-400">{voice.id}</span>
          </div>

          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700/80 shrink-0">
            {voice.tag}
          </span>
        </div>

        {/* Selected Status Badges */}
        <div className="flex flex-wrap gap-1.5">
          {isPrimaryMale && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-sky-500/20 border border-sky-400/50 text-sky-300">
              <Check className="w-3 h-3" /> Giọng Nam Chính
            </span>
          )}
          {isPrimaryFemale && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-pink-500/20 border border-pink-400/50 text-pink-300">
              <Check className="w-3 h-3" /> Giọng Nữ Chính
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{voice.description}</p>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        {/* Play / Test Button */}
        <button
          type="button"
          onClick={() => onTest(voice.id)}
          disabled={isLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            isPlaying
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
          }`}
        >
          <TestButtonState isLoading={isLoading} isPlaying={isPlaying} />
        </button>

        {/* Set as Primary Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSetPrimary('male', voice.id)}
            disabled={isPrimaryMale}
            className={`px-2 py-1 rounded text-[11px] font-medium transition ${
              isPrimaryMale
                ? 'opacity-40 cursor-default bg-slate-800 text-slate-500'
                : 'bg-slate-800 hover:bg-sky-950 hover:text-sky-300 text-slate-300 border border-slate-700 hover:border-sky-500/50'
            }`}
            title="Đặt giọng này làm Giọng Nam chính cho Game"
          >
            + Giọng Nam
          </button>
          <button
            type="button"
            onClick={() => onSetPrimary('female', voice.id)}
            disabled={isPrimaryFemale}
            className={`px-2 py-1 rounded text-[11px] font-medium transition ${
              isPrimaryFemale
                ? 'opacity-40 cursor-default bg-slate-800 text-slate-500'
                : 'bg-slate-800 hover:bg-pink-950 hover:text-pink-300 text-slate-300 border border-slate-700 hover:border-pink-500/50'
            }`}
            title="Đặt giọng này làm Giọng Nữ chính cho Game"
          >
            + Giọng Nữ
          </button>
        </div>
      </div>
    </div>
  );
};
