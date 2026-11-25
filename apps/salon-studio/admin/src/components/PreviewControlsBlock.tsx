import React from 'react';
import { ExternalLink, Layers, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import type { PreviewPresetKey } from '@shared/types/salon';
import { getStageBaseUrl } from '../services/adminEmitter';
import { usePreviewStore } from '../store/previewStore';

const PREVIEW_PRESETS: Array<{ key: PreviewPresetKey; label: string; bg: string }> = [
  { key: 'HAIR', label: 'Cắt Tóc (HAIR)', bg: 'bg-[#FFD4E2]' },
  { key: 'NAIL', label: 'Làm Móng (NAIL)', bg: 'bg-[#C9F2E3]' },
  { key: 'VIP_QUEUE', label: 'Hàng Chờ VIP', bg: 'bg-[#FFE5B4]' },
  { key: 'TROLL', label: 'Oops! Tóc / Art Nail', bg: 'bg-[#FFD1CE]' },
  { key: 'ROYAL', label: 'Royal Idol Top 1', bg: 'bg-[#FFF0A6]' },
];

export const PreviewControlsBlock: React.FC = () => {
  const previewMode = usePreviewStore((s) => s.previewMode);
  const showSafeZone = usePreviewStore((s) => s.showSafeZone);
  const setPreviewMode = usePreviewStore((s) => s.setPreviewMode);
  const toggleSafeZone = usePreviewStore((s) => s.toggleSafeZone);
  const reloadIframe = usePreviewStore((s) => s.reloadIframe);
  const applyPreset = usePreviewStore((s) => s.applyPreset);

  const stageBaseUrl = getStageBaseUrl();

  return (
    <div className="bg-[#FFF7EE] border-2 border-[#3A2825]/30 rounded-2xl p-3 space-y-2.5">
      {/* Row 1: Mode Switch & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Mirror Live vs Sandbox Test */}
        <div className="grid grid-cols-2 gap-1 bg-[#F5E6DD] p-1 rounded-xl border-2 border-[#3A2825]">
          <button
            type="button"
            onClick={() => setPreviewMode('MIRROR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition ${
              previewMode === 'MIRROR'
                ? 'bg-[#C9F2E3] border-2 border-[#3A2825] text-[#3A2825]'
                : 'text-[#7D6059]'
            }`}
          >
            Mirror Live
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode('SANDBOX')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer transition ${
              previewMode === 'SANDBOX'
                ? 'bg-[#FFE5B4] border-2 border-[#3A2825] text-[#3A2825]'
                : 'text-[#7D6059]'
            }`}
          >
            Sandbox Test
          </button>
        </div>

        {/* Safe-Zone Toggle & Stage tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={toggleSafeZone}
            className={`admin-btn px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
              showSafeZone ? 'bg-[#FFD56B] text-[#3A2825]' : 'bg-white text-[#7D6059]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{showSafeZone ? 'Safe-Zone: ĐANG BẬT' : 'Bật Safe-Zone'}</span>
          </button>

          <button
            type="button"
            title="Tải lại sân khấu"
            onClick={reloadIframe}
            className="admin-btn bg-white hover:bg-[#FFEFE3] p-1.5 rounded-xl text-[#3A2825] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <a
            href={stageBaseUrl}
            target="_blank"
            rel="noreferrer"
            className="admin-btn bg-[#FFF0D9] hover:bg-[#FFE5B4] text-xs font-black px-3 py-1.5 rounded-xl inline-flex items-center gap-1 text-[#3A2825] no-underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Stage Sạch (Tab mới)
          </a>
        </div>
      </div>

      {/* Row 2: 5 Sandbox Quick State Presets */}
      <div className="space-y-1.5 pt-0.5">
        <div className="flex items-center justify-between text-[11px] font-black uppercase text-[#7D6059]">
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            Xem nhanh trạng thái (Sandbox test không chạm Live):
          </span>
          {previewMode === 'SANDBOX' && (
            <span className="text-[#E09A1F] font-black">● Đang test Sandbox</span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          {PREVIEW_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => applyPreset(p.key)}
              className={`admin-btn ${p.bg} text-[#3A2825] text-xs font-black py-1.5 px-2 rounded-xl cursor-pointer flex items-center justify-center gap-1`}
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
