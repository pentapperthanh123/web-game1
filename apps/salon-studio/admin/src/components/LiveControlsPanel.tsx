import React, { useState } from 'react';
import {
  CheckCircle2,
  FastForward,
  Globe,
  Scissors,
  Sliders,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { GAMEPLAY_LIMITS } from '@shared/constants/salonConfig';
import type { SalonLanguage, SalonScheduleMode } from '@shared/types/salon';
import { salonAdminEmitter } from '../services/adminEmitter';

export const LiveControlsPanel: React.FC = () => {
  const [scheduleMode, setScheduleMode] = useState<SalonScheduleMode>('AUTO');
  const [language, setLanguage] = useState<SalonLanguage>('VI');
  const [turnDurationSec, setTurnDurationSec] = useState<number>(
    GAMEPLAY_LIMITS.DEFAULT_TURN_DURATION_SEC
  );
  const [trollEnabled, setTrollEnabled] = useState<boolean>(true);

  const handleModeChange = (mode: SalonScheduleMode) => {
    setScheduleMode(mode);
    salonAdminEmitter.emitAdminAction('SET_SCHEDULE_MODE', { scheduleMode: mode });
  };

  const handleLanguageChange = (lang: SalonLanguage) => {
    setLanguage(lang);
    salonAdminEmitter.emitAdminAction('SET_LANGUAGE', { language: lang });
  };

  const handleDurationChange = (sec: number) => {
    setTurnDurationSec(sec);
    salonAdminEmitter.emitAdminAction('SET_TURN_DURATION', { turnDurationSec: sec });
  };

  const handleToggleTroll = () => {
    const next = !trollEnabled;
    setTrollEnabled(next);
    salonAdminEmitter.emitAdminAction('SET_TROLL_ENABLED', { trollEnabled: next });
  };

  return (
    <section className="admin-card p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-[#3A2825]/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#C9F2E3] border-2 border-[#3A2825] flex items-center justify-center shrink-0">
            <Sliders className="w-4 h-4 text-[#3A2825]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base leading-tight">
              Quy Trình Tiệm & Can Thiệp Host
            </h2>
            <p className="text-[11px] font-bold text-[#7D6059]">
              Chuyển mode tiệm tóc/nail, thời lượng và thao tác nhanh
            </p>
          </div>
        </div>

        {/* Language switch */}
        <div className="flex items-center gap-1 bg-[#F5E6DD] p-1 rounded-xl border-2 border-[#3A2825]">
          <Globe className="w-3.5 h-3.5 ml-1 text-[#7D6059]" />
          {(['VI', 'EN'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => handleLanguageChange(lang)}
              className={`px-2 py-0.5 rounded-lg text-xs font-black cursor-pointer ${
                language === lang
                  ? 'bg-[#FFD56B] border-2 border-[#3A2825] text-[#3A2825]'
                  : 'text-[#7D6059]'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Mode Switcher: HAIR / NAIL / AUTO */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            { key: 'HAIR', label: 'Cắt Tóc (HAIR)', icon: Scissors, color: 'bg-[#FFD4E2]' },
            { key: 'NAIL', label: 'Làm Móng (NAIL)', icon: Sparkles, color: 'bg-[#C9F2E3]' },
            { key: 'AUTO', label: 'Xen Kẽ (AUTO)', icon: Zap, color: 'bg-[#FFE5B4]' },
          ] as const
        ).map((item) => {
          const Icon = item.icon;
          const active = scheduleMode === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleModeChange(item.key)}
              className={`admin-btn py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${
                active ? item.color : 'bg-white text-[#7D6059]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Duration Slider + Troll Toggle */}
      <div className="grid sm:grid-cols-2 gap-2.5">
        <div className="bg-[#FFF7EE] border-2 border-[#3A2825]/25 rounded-xl p-2.5">
          <div className="flex items-center justify-between text-xs font-black mb-1">
            <span>Thời lượng mỗi lượt:</span>
            <span className="bg-[#FFE5B4] border-2 border-[#3A2825] px-2 py-0.5 rounded-full text-xs">
              {turnDurationSec} giây
            </span>
          </div>
          <input
            type="range"
            min={GAMEPLAY_LIMITS.MIN_TURN_DURATION_SEC}
            max={GAMEPLAY_LIMITS.MAX_TURN_DURATION_SEC}
            step={1}
            value={turnDurationSec}
            onChange={(e) => handleDurationChange(Number(e.target.value))}
            className="w-full accent-[#E85D82] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-bold text-[#7D6059]">
            <span>Nhanh: {GAMEPLAY_LIMITS.MIN_TURN_DURATION_SEC}s</span>
            <span>Chuẩn: 20s</span>
            <span>Chậm: {GAMEPLAY_LIMITS.MAX_TURN_DURATION_SEC}s</span>
          </div>
        </div>

        <div className="bg-[#FFF7EE] border-2 border-[#3A2825]/25 rounded-xl p-2.5 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-black">Hiệu ứng “Trượt Tay” (Tiệm Tóc)</div>
            <div className="text-[11px] font-bold text-[#7D6059]">
              Quà 5–29 xu cạo trọc/cháy xù (Tóc) hoặc VIP Art Style (Nail)
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleTroll}
            className={`admin-btn px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer shrink-0 ${
              trollEnabled ? 'bg-[#86E3C3]' : 'bg-[#E9DDD6]'
            }`}
          >
            {trollEnabled ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
          </button>
        </div>
      </div>

      {/* Direct Host Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => salonAdminEmitter.emitAdminAction('FORCE_COMPLETE_NOW')}
          className="admin-btn bg-[#86E3C3] hover:bg-[#6FD9B5] text-xs font-black py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          Xong Nhanh
        </button>
        <button
          type="button"
          onClick={() => salonAdminEmitter.emitAdminAction('TRIGGER_TROLL_NOW')}
          className="admin-btn bg-[#FFD1CE] hover:bg-[#FFB8B3] text-xs font-black py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>😂</span>
          Lỡ Tay Troll
        </button>
        <button
          type="button"
          onClick={() => salonAdminEmitter.emitAdminAction('CALL_NEXT_CUSTOMER')}
          className="admin-btn bg-[#FFE5B4] hover:bg-[#FFD68A] text-xs font-black py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5 shrink-0" />
          Khách Tiếp
        </button>
        <button
          type="button"
          onClick={() => salonAdminEmitter.emitAdminAction('CLEAR_FINISHED_WALL')}
          className="admin-btn bg-white hover:bg-[#FFEFE3] text-xs font-black py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" />
          Xóa Dây Ảnh
        </button>
      </div>
    </section>
  );
};
