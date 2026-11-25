import React, { useState } from 'react';
import { Mic, MicOff, Volume2 } from 'lucide-react';
import { salonAdminEmitter } from '../services/adminEmitter';

const SFX_TESTS = [
  { key: 'SNIP', label: '✂️ Kéo Tách' },
  { key: 'CLIPPER', label: '💈 Tông-đơ' },
  { key: 'DONE', label: '🔔 Chuông Ting' },
  { key: 'OOPS', label: '😂 Trượt Tay' },
  { key: 'ROYAL', label: '👑 Hoàng Gia' },
] as const;

export const AudioHostPanel: React.FC = () => {
  const [masterVolume, setMasterVolume] = useState<number>(70);
  const [micMode, setMicMode] = useState<boolean>(false);

  const handleVolumeChange = (val: number) => {
    setMasterVolume(val);
    salonAdminEmitter.emitAdminAction('SET_MASTER_VOLUME', { masterVolume: val / 100 });
  };

  const handleToggleMic = () => {
    const next = !micMode;
    setMicMode(next);
    salonAdminEmitter.emitAdminAction('SET_MIC_MODE', { micMode: next });
  };

  return (
    <section className="admin-card p-3.5 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-[#3A2825]/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FFD4E2] border-2 border-[#3A2825] flex items-center justify-center shrink-0">
            <Volume2 className="w-4 h-4 text-[#3A2825]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base leading-tight">
              Âm Thanh SFX & Chế Độ Mở Mic
            </h2>
            <p className="text-[11px] font-bold text-[#7D6059]">
              Bật Mic Mode để hạ âm lượng nền khi Host lên tiếng giao lưu
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleMic}
          className={`admin-btn px-3 py-1.5 rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer ${
            micMode ? 'bg-[#FFD56B] text-[#3A2825]' : 'bg-white text-[#7D6059]'
          }`}
        >
          {micMode ? (
            <Mic className="w-3.5 h-3.5 text-[#B86E00]" />
          ) : (
            <MicOff className="w-3.5 h-3.5" />
          )}
          {micMode ? 'Mic Mode: ĐANG BẬT' : 'Mic Mode: Tắt'}
        </button>
      </div>

      <div className="grid sm:grid-cols-[1fr_auto] gap-2.5 items-center">
        <div className="bg-[#FFF7EE] border-2 border-[#3A2825]/25 rounded-xl px-3 py-1.5 flex items-center gap-2.5">
          <span className="text-xs font-black whitespace-nowrap">Âm lượng: {masterVolume}%</span>
          <input
            type="range"
            min={0}
            max={100}
            value={masterVolume}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            className="flex-1 accent-[#42B38B] cursor-pointer"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SFX_TESTS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => salonAdminEmitter.emitAdminAction('PLAY_TEST_SFX', { sfxName: item.key })}
              className="admin-btn bg-white hover:bg-[#FFEFE3] text-xs font-black px-2.5 py-1.5 rounded-xl cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
