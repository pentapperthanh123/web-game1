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
    <section className="admin-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-[#FFD4E2] border-2 border-[#3A2825] flex items-center justify-center">
            <Volume2 className="w-5 h-5 text-[#3A2825]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-[17px] leading-tight">
              Âm Thanh SFX & Chế Độ Mở Mic
            </h2>
            <p className="text-xs font-bold text-[#7D6059]">
              Bật Mic Mode để tự hạ âm lượng nền khi Host bình luận
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleMic}
          className={`admin-btn px-3.5 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer ${
            micMode ? 'bg-[#FFD56B]' : 'bg-white'
          }`}
        >
          {micMode ? <Mic className="w-4 h-4 text-[#B86E00]" /> : <MicOff className="w-4 h-4 text-[#7D6059]" />}
          {micMode ? 'Mic Mode: ĐANG BẬT (Nhỏ nền)' : 'Mic Mode: Tắt'}
        </button>
      </div>

      <div className="bg-[#FFF7EE] border-2 border-[#3A2825]/30 rounded-xl p-3 flex items-center gap-3">
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

      <div className="flex flex-wrap gap-2">
        {SFX_TESTS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => salonAdminEmitter.emitAdminAction('PLAY_TEST_SFX', { sfxName: item.key })}
            className="admin-btn bg-[#FFFDF9] hover:bg-[#FFEFE3] text-xs font-black px-3 py-1.5 rounded-xl cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>
    </section>
  );
};
