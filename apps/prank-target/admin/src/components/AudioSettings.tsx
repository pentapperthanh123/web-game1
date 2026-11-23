import React from 'react';
import { useAdminStore } from '../store/adminStore';
import { Volume2, Mic, Languages, Radio } from 'lucide-react';

export const AudioSettings: React.FC = () => {
  const {
    micMode,
    setMicMode,
    sfxVolume,
    setSfxVolume,
    language,
    setLanguage,
  } = useAdminStore();

  const isVi = language === 'VI';

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold flex items-center gap-2 text-white">
          <Volume2 className="w-5 h-5 text-sky-400" />
          {isVi ? 'ÂM THANH & CHẾ ĐỘ HOST MIC' : 'AUDIO & HOST MIC MODE'}
        </h2>
        <span className="text-xs text-neutral-400">Điều chỉnh âm lượng thời gian thực</span>
      </div>

      <div className="space-y-4">
        {/* Mic Mode Switch */}
        <div
          onClick={() => setMicMode(!micMode)}
          className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
            micMode
              ? 'bg-sky-950/60 border-sky-400/80 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
              : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl ${
                micMode ? 'bg-sky-500 text-black' : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-neutral-100 flex items-center gap-2">
                <span>{isVi ? 'Chế độ Mở Mic (Host Mic On)' : 'Host Mic Mode'}</span>
                {micMode && (
                  <span className="bg-sky-500/20 text-sky-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-400/30">
                    ĐANG GIẢM SFX
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isVi
                  ? 'Tự động giảm 70% âm lượng va chạm để giọng Host cà khịa rõ ràng trên Live.'
                  : 'Reduces impact SFX by 70% so Host commentary comes through clearly.'}
              </p>
            </div>
          </div>

          <div
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
              micMode ? 'bg-sky-500' : 'bg-neutral-700'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                micMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Volume Slider */}
        <div className="p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-neutral-300">
              {isVi ? 'Âm lượng SFX va chạm' : 'SFX Impact Volume'}
            </span>
            <span className="text-xs font-mono font-extrabold text-amber-400">
              {Math.round(sfxVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={sfxVolume}
            onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
            className="w-full accent-amber-500 bg-neutral-800 h-2 rounded-lg cursor-pointer"
          />
        </div>

        {/* Language Quick Selector */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Languages className="w-5 h-5 text-neutral-400" />
            <span className="text-xs font-bold text-neutral-300">
              {isVi ? 'Ngôn ngữ hiển thị trên Sân Khấu' : 'Stage Display Language'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('VI')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                language === 'VI'
                  ? 'bg-amber-500 text-black shadow'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              Tiếng Việt
            </button>
            <button
              onClick={() => setLanguage('EN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                language === 'EN'
                  ? 'bg-amber-500 text-black shadow'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
