import React, { useState } from 'react';
import { Volume2, VolumeX, Mic, Play } from 'lucide-react';
import type { SoundFxType } from '@shared/constants/audioConfig';
import { dispatchSyncMessage, emitAdminAction } from '../services/adminEmitter';

export const SoundConsole: React.FC = () => {
  const [micMode, setMicMode] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);

  const handleMicModeToggle = () => {
    const nextVal = !micMode;
    setMicMode(nextVal);
    emitAdminAction('SET_MIC_MODE', { micMode: nextVal });
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    emitAdminAction('SET_VOLUME', { volume: newVol });
  };

  const handleMuteToggle = () => {
    const nextVal = !isMuted;
    setIsMuted(nextVal);
    emitAdminAction('SET_VOLUME', { volume: nextVal ? 0 : volume });
  };

  const testSfx = (sfx: SoundFxType) => {
    dispatchSyncMessage({
      type: 'PLAY_SFX',
      sfx,
      timestamp: Date.now(),
    });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <h2 className="text-sm font-black text-emerald-400 tracking-wider flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span>ÂM THANH & CHẾ ĐỘ MỞ MIC</span>
        </h2>
        {/* Mic Mode Toggle */}
        <button
          onClick={handleMicModeToggle}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
            micMode
              ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)]'
              : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{micMode ? 'Mic Mode: ĐANG BẬT' : 'Bật Chế Độ Mở Mic'}</span>
        </button>
      </div>

      {/* Mic mode description note */}
      {micMode && (
        <div className="text-[11px] text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1.5 rounded-lg">
          🎙️ Âm thanh nền tự động hạ xuống 18% để Host dễ mở mic chém gió và cà khịa người chơi!
        </div>
      )}

      {/* Volume Slider & Mute */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleMuteToggle}
          className="p-1.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={isMuted ? 0 : volume}
          onChange={(e) => handleVolumeChange(Number(e.target.value))}
          className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
        />
        <span className="text-xs font-mono font-bold text-neutral-300 w-9 text-right">
          {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
        </span>
      </div>

      {/* SFX Trigger Testing Buttons */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <span className="text-[11px] text-neutral-400 w-full font-medium">Thử nghiệm SFX:</span>
        <button
          onClick={() => testSfx('KEY_CLICK')}
          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[11px] font-mono flex items-center gap-1"
        >
          <Play className="w-2.5 h-2.5 text-cyan-400" /> Gõ phím
        </button>
        <button
          onClick={() => testSfx('DRINK_SLURP')}
          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[11px] font-mono flex items-center gap-1"
        >
          <Play className="w-2.5 h-2.5 text-amber-400" /> Húp Sting
        </button>
        <button
          onClick={() => testSfx('BSOD_EXPLODE')}
          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[11px] font-mono flex items-center gap-1"
        >
          <Play className="w-2.5 h-2.5 text-blue-400" /> Nổ màn xanh
        </button>
        <button
          onClick={() => testSfx('POWER_CUT')}
          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[11px] font-mono flex items-center gap-1"
        >
          <Play className="w-2.5 h-2.5 text-yellow-400" /> Cúp cầu dao
        </button>
        <button
          onClick={() => testSfx('MOM_ALARM')}
          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-[11px] font-mono flex items-center gap-1"
        >
          <Play className="w-2.5 h-2.5 text-red-400" /> Còi báo mẹ
        </button>
      </div>
    </div>
  );
};
