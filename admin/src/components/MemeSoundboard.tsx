import React, { useState } from 'react';
import { MEME_SOUND_ITEMS, MemeSoundItem } from '../constants/memeAudio';
import { adminSocketService } from '../services/socket';

interface MemeSoundboardProps {
  visible?: boolean;
}

export const MemeSoundboard: React.FC<MemeSoundboardProps> = ({ visible = true }) => {
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [lastTriggered, setLastTriggered] = useState<{ id: string; name: string; time: string } | null>(null);

  if (!visible) return null;

  const handlePlaySound = (sound: MemeSoundItem) => {
    setActiveSoundId(sound.id);
    setLastTriggered({
      id: sound.id,
      name: sound.name,
      time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
    });

    adminSocketService.triggerMeme(sound.id);

    setTimeout(() => {
      setActiveSoundId((current) => (current === sound.id ? null : current));
    }, 450);
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl" role="img" aria-label="soundboard">
            📻
          </span>
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Bảng Âm Thanh Meme (Soundboard)
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium">
                Live SFX
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Kích hoạt hiệu ứng âm thanh kịch tính & hài hước trực tiếp lên màn hình Overlay qua Socket.
            </p>
          </div>
        </div>

        {lastTriggered && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className="text-slate-400">Vừa phát:</span>
            <span className="font-semibold text-amber-300">{lastTriggered.name}</span>
            <span className="text-slate-500 text-[10px]">({lastTriggered.time})</span>
          </div>
        )}
      </div>

      {/* Grid of Sound Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {MEME_SOUND_ITEMS.map((sound) => {
          const isActive = activeSoundId === sound.id;
          return (
            <button
              key={sound.id}
              type="button"
              onClick={() => handlePlaySound(sound)}
              className={`group relative flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all duration-150 cursor-pointer select-none active:scale-95 ${
                sound.badgeColor
              } ${
                isActive
                  ? 'ring-2 ring-white/60 scale-95 shadow-lg shadow-amber-500/20 brightness-125'
                  : 'shadow-md'
              }`}
            >
              <span className="text-2xl mb-1.5 transition-transform duration-150 group-hover:scale-110">
                {sound.icon}
              </span>
              <span className="font-bold text-sm tracking-tight leading-tight line-clamp-1">
                {sound.name}
              </span>
              <span className="text-[10px] opacity-75 mt-0.5 line-clamp-1">
                {sound.description}
              </span>

              {isActive && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer status / Tip */}
      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Sẵn sàng phát lệnh tức thời xuống Client Overlay</span>
        </span>
        <span className="italic text-[11px] text-slate-400">
          Tip: Nhạc Căng Thẳng cũng tự động phát khi Boss còn ≤ 10% HP.
        </span>
      </div>
    </div>
  );
};
