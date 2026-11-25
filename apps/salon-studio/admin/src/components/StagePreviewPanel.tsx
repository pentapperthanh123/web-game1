import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, Eye, Layers, RefreshCw, ShieldAlert, Sparkles } from 'lucide-react';
import type { PreviewPresetKey } from '@shared/types/salon';
import { getStageBaseUrl, salonAdminEmitter } from '../services/adminEmitter';

const PREVIEW_PRESETS: Array<{ key: PreviewPresetKey; label: string; bg: string }> = [
  { key: 'HAIR', label: 'HAIR Mode', bg: 'bg-[#FFD4E2]' },
  { key: 'NAIL', label: 'NAIL Mode', bg: 'bg-[#C9F2E3]' },
  { key: 'VIP_QUEUE', label: 'VIP Queue', bg: 'bg-[#FFE5B4]' },
  { key: 'TROLL', label: 'Oops! Troll', bg: 'bg-[#FFD1CE]' },
  { key: 'ROYAL', label: 'Royal Top 1', bg: 'bg-[#FFF0A6]' },
];

export const StagePreviewPanel: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [previewMode, setPreviewMode] = useState<'MIRROR' | 'SANDBOX'>('MIRROR');
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [pendingPreset, setPendingPreset] = useState<PreviewPresetKey | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  const stageBaseUrl = getStageBaseUrl();
  const iframeSrc =
    previewMode === 'SANDBOX'
      ? `${stageBaseUrl}?preview=1&k=${reloadKey}`
      : `${stageBaseUrl}?k=${reloadKey}`;

  useEffect(() => {
    salonAdminEmitter.setPreviewIframe(iframeRef.current);
    return () => salonAdminEmitter.setPreviewIframe(null);
  }, [reloadKey, previewMode]);

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

  const handleReloadIframe = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <aside className="admin-card p-3.5 flex flex-col h-full min-h-0 bg-[#FFFDF9] select-none gap-2.5">
      {/* Header bar */}
      <div className="shrink-0 flex items-center justify-between gap-2 pb-1.5 border-b-2 border-[#3A2825]/15">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FFD4E2] border-2 border-[#3A2825] flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 text-[#3A2825]" />
          </div>
          <div>
            <h2 className="font-display font-bold text-base leading-tight">Live Preview 9:16</h2>
            <div className="text-[11px] font-extrabold text-[#7D6059]">
              {previewMode === 'MIRROR' ? 'Đang đồng bộ Live thật' : 'Chế độ Sandbox độc lập'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Tải lại iframe"
            onClick={handleReloadIframe}
            className="admin-btn bg-white hover:bg-[#FFEFE3] p-1.5 rounded-lg text-[#3A2825] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <a
            href={stageBaseUrl}
            target="_blank"
            rel="noreferrer"
            className="admin-btn bg-[#FFF0D9] hover:bg-[#FFE5B4] text-[11px] font-black px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 text-[#3A2825] no-underline"
          >
            <ExternalLink className="w-3 h-3" />
            Stage Sạch
          </a>
        </div>
      </div>

      {/* Toolbar: Switch Mode & Safe-Zone */}
      <div className="shrink-0 grid grid-cols-2 gap-2">
        <div className="grid grid-cols-2 gap-1 bg-[#F5E6DD] p-1 rounded-xl border-2 border-[#3A2825]">
          <button
            type="button"
            onClick={() => setPreviewMode('MIRROR')}
            className={`py-1 rounded-lg text-xs font-black cursor-pointer transition ${
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
            className={`py-1 rounded-lg text-xs font-black cursor-pointer transition ${
              previewMode === 'SANDBOX'
                ? 'bg-[#FFE5B4] border-2 border-[#3A2825] text-[#3A2825]'
                : 'text-[#7D6059]'
            }`}
          >
            Sandbox Test
          </button>
        </div>

        <button
          type="button"
          onClick={handleToggleSafeZone}
          className={`admin-btn rounded-xl px-2.5 py-1 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer ${
            showSafeZone ? 'bg-[#FFD56B]' : 'bg-white'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span className="truncate">
            {showSafeZone ? 'Safe-Zone: BẬT' : 'Safe-Zone Overlay'}
          </span>
        </button>
      </div>

      {/* Main Full-Height 9:16 Preview Frame */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center p-2 bg-[#281D1B] rounded-[22px] border-[3.5px] border-[#3A2825] shadow-inner relative overflow-hidden">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          onLoad={handleIframeLoad}
          title="Salon Studio Stage Preview"
          className="h-full aspect-[9/16] max-w-full rounded-[14px] shadow-2xl border-2 border-[#3A2825]/50 bg-black"
        />
      </div>

      {/* Bottom Bar: Sandbox Preset Tester */}
      <div className="shrink-0 pt-0.5 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-black uppercase text-[#7D6059]">
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            Xem nhanh trạng thái (Sandbox test)
          </span>
          {previewMode === 'SANDBOX' && (
            <span className="text-[#E09A1F] font-black">● Đang test Sandbox</span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {PREVIEW_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => handlePresetClick(p.key)}
              className={`admin-btn ${p.bg} text-[#3A2825] text-[11px] font-black py-1 px-1 rounded-xl cursor-pointer flex items-center justify-center gap-1`}
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
