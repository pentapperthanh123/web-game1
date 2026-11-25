import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Eye, Layers, ShieldAlert, Sparkles } from 'lucide-react';
import type { PreviewPresetKey } from '@shared/types/salon';
import { getStageBaseUrl, salonAdminEmitter } from '../services/adminEmitter';

const PREVIEW_PRESETS: Array<{ key: PreviewPresetKey; label: string; bg: string }> = [
  { key: 'HAIR', label: 'HAIR', bg: 'bg-[#FFD4E2]' },
  { key: 'NAIL', label: 'NAIL', bg: 'bg-[#C9F2E3]' },
  { key: 'VIP_QUEUE', label: 'VIP Queue', bg: 'bg-[#FFE5B4]' },
  { key: 'TROLL', label: 'Oops! Troll', bg: 'bg-[#FFD1CE]' },
  { key: 'ROYAL', label: 'Royal Top 1', bg: 'bg-[#FFF0A6]' },
];

export const StagePreviewPanel: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [previewMode, setPreviewMode] = useState<'MIRROR' | 'SANDBOX'>('MIRROR');
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [pendingPreset, setPendingPreset] = useState<PreviewPresetKey | null>(null);

  const stageBaseUrl = getStageBaseUrl();
  const iframeSrc = previewMode === 'SANDBOX' ? `${stageBaseUrl}?preview=1` : stageBaseUrl;

  useEffect(() => {
    salonAdminEmitter.setPreviewIframe(iframeRef.current);
    return () => salonAdminEmitter.setPreviewIframe(null);
  }, []);

  const syncSafeZoneToFrame = (enabled: boolean, mode: 'MIRROR' | 'SANDBOX') => {
    if (mode === 'SANDBOX') {
      salonAdminEmitter.emitAdminAction('SET_SAFE_ZONE', { showSafeZone: enabled }, 'PREVIEW');
    } else {
      salonAdminEmitter.emitAdminAction('SET_SAFE_ZONE', { showSafeZone: enabled }, 'LIVE');
    }
  };

  const handleToggleSafeZone = () => {
    const next = !showSafeZone;
    setShowSafeZone(next);
    syncSafeZoneToFrame(next, previewMode);
  };

  const handlePresetClick = (preset: PreviewPresetKey) => {
    if (previewMode !== 'SANDBOX') {
      setPreviewMode('SANDBOX');
      setPendingPreset(preset);
      return;
    }
    salonAdminEmitter.emitPreviewPreset(preset);
  };

  const handleIframeLoad = () => {
    salonAdminEmitter.setPreviewIframe(iframeRef.current);
    syncSafeZoneToFrame(showSafeZone, previewMode);
    if (previewMode === 'SANDBOX' && pendingPreset) {
      const presetToApply = pendingPreset;
      setPendingPreset(null);
      setTimeout(() => salonAdminEmitter.emitPreviewPreset(presetToApply), 120);
    }
  };

  return (
    <aside className="admin-card p-4 flex flex-col items-center gap-3">
      <div className="w-full flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-[#E85D82]" />
          <h2 className="font-display font-bold text-[17px]">Live Preview 9:16</h2>
        </div>

        <a
          href={stageBaseUrl}
          target="_blank"
          rel="noreferrer"
          className="admin-btn bg-[#FFF0D9] text-[11px] font-black px-2.5 py-1 rounded-lg inline-flex items-center gap-1 text-[#3A2825] no-underline"
        >
          <ExternalLink className="w-3 h-3" />
          Stage Sạch
        </a>
      </div>

      {/* Mode Switch: Mirror Live vs Sandbox Preview */}
      <div className="w-full grid grid-cols-2 gap-1.5 bg-[#F5E6DD] p-1 rounded-xl border-2 border-[#3A2825]">
        <button
          type="button"
          onClick={() => setPreviewMode('MIRROR')}
          className={`py-1.5 rounded-lg text-xs font-black cursor-pointer transition ${
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
          className={`py-1.5 rounded-lg text-xs font-black cursor-pointer transition ${
            previewMode === 'SANDBOX'
              ? 'bg-[#FFE5B4] border-2 border-[#3A2825] text-[#3A2825]'
              : 'text-[#7D6059]'
          }`}
        >
          Sandbox Test
        </button>
      </div>

      {/* Safe-Zone Toggle */}
      <button
        type="button"
        onClick={handleToggleSafeZone}
        className={`w-full admin-btn rounded-xl px-3 py-2 text-xs font-black flex items-center justify-center gap-2 cursor-pointer ${
          showSafeZone ? 'bg-[#FFD56B]' : 'bg-white'
        }`}
      >
        <ShieldAlert className="w-4 h-4" />
        {showSafeZone ? 'Đang bật TikTok Safe-Zone Overlay' : 'Bật TikTok Safe-Zone Overlay'}
      </button>

      {/* Scaled 720x1280 Preview Frame */}
      <div className="relative w-[288px] h-[512px] rounded-[24px] overflow-hidden border-[4px] border-[#3A2825] bg-[#2B211F] shadow-inner shrink-0">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          onLoad={handleIframeLoad}
          title="Salon Studio Stage Preview"
          className="w-full h-full border-0"
        />
      </div>

      {/* Isolated Visual Preset Tester (Never corrupts live session!) */}
      <div className="w-full space-y-1.5 pt-1">
        <div className="flex items-center gap-1.5 text-[11px] font-black uppercase text-[#7D6059]">
          <Layers className="w-3.5 h-3.5" />
          Xem nhanh trạng thái (Sandbox an toàn)
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {PREVIEW_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePresetClick(p.key)}
              className={`admin-btn ${p.bg} text-[#3A2825] text-[11px] font-black py-1.5 px-2 rounded-xl cursor-pointer flex items-center justify-center gap-1`}
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span className="truncate">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
};
