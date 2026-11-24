import React from 'react';
import {
  ShieldAlert,
  ZapOff,
  Soup,
  MonitorX,
  UserCheck,
  Globe,
} from 'lucide-react';
import type { LanguageMode } from '@shared/types/cafe';
import { emitAdminAction } from '../services/adminEmitter';

interface LiveControlsProps {
  language: LanguageMode;
  onLanguageChange: (lang: LanguageMode) => void;
}

export const LiveControls: React.FC<LiveControlsProps> = ({ language, onLanguageChange }) => {
  const isEn = language === 'EN';

  const toggleLanguage = () => {
    const nextLang = isEn ? 'VI' : 'EN';
    onLanguageChange(nextLang);
    emitAdminAction('SET_LANGUAGE', { language: nextLang });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-lg flex flex-col gap-3">
      {/* Header & Language Toggle */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
        <h2 className="text-sm font-black text-amber-400 tracking-wider flex items-center gap-2">
          <span>⚡</span>
          <span>{isEn ? 'HOST INSTANT ACTIONS' : 'ĐIỀU KHIỂN TỨC THÌ (HOST)'}</span>
        </h2>
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 border border-neutral-700 transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isEn ? 'Mode: EN' : 'Chế độ: VI'}</span>
        </button>
      </div>

      {/* Action Buttons Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {/* Trigger Mom */}
        <button
          onClick={() => emitAdminAction('TRIGGER_MOM')}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-950/80 hover:bg-red-900 border border-red-700/80 text-red-200 font-bold text-xs shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{isEn ? '🧹 Call Mom' : '🧹 Thả Phụ Huynh'}</span>
        </button>

        {/* Trigger Blackout */}
        <button
          onClick={() => emitAdminAction('TRIGGER_BLACKOUT')}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-yellow-950/80 hover:bg-yellow-900 border border-yellow-700/80 text-yellow-200 font-bold text-xs shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <ZapOff className="w-4 h-4 text-yellow-400 shrink-0" />
          <span>{isEn ? '💥 Blackout' : '💥 Cúp Cầu Dao'}</span>
        </button>

        {/* Buff Noodles */}
        <button
          onClick={() => emitAdminAction('BUFF_NOODLES')}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/80 text-amber-200 font-bold text-xs shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Soup className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{isEn ? '🍜 Buff Noodle' : '🍜 Buff Mì Tôm'}</span>
        </button>

        {/* Trigger BSOD */}
        <button
          onClick={() => emitAdminAction('TRIGGER_BSOD')}
          className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-700/80 text-blue-200 font-bold text-xs shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <MonitorX className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{isEn ? '🖥️ Trigger BSOD' : '🖥️ Nổ Màn Xanh'}</span>
        </button>

        {/* Rotate Player */}
        <button
          onClick={() => emitAdminAction('KICK_OR_ROTATE_PLAYER')}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-200 font-bold text-xs shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{isEn ? '🔄 Rotate Player' : '🔄 Đổi Khách Mới'}</span>
        </button>
      </div>
    </div>
  );
};
