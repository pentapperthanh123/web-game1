import React, { useEffect, useRef } from 'react';
import { Eye, Layers } from 'lucide-react';
import { getStageBaseUrl, salonAdminEmitter } from '../services/adminEmitter';
import { usePreviewStore } from '../store/previewStore';

export const StagePreviewPanel: React.FC = () => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const previewMode = usePreviewStore((s) => s.previewMode);
  const showSafeZone = usePreviewStore((s) => s.showSafeZone);
  const reloadKey = usePreviewStore((s) => s.reloadKey);

  const stageBaseUrl = getStageBaseUrl();
  const iframeSrc =
    previewMode === 'SANDBOX'
      ? `${stageBaseUrl}?preview=1&k=${reloadKey}`
      : `${stageBaseUrl}?k=${reloadKey}`;

  useEffect(() => {
    salonAdminEmitter.setPreviewIframe(iframeRef.current);
    return () => salonAdminEmitter.setPreviewIframe(null);
  }, [reloadKey, previewMode]);

  const handleIframeLoad = () => {
    salonAdminEmitter.setPreviewIframe(iframeRef.current);
    const target = previewMode === 'SANDBOX' ? 'PREVIEW' : 'LIVE';
    salonAdminEmitter.emitAdminAction('SET_SAFE_ZONE', { showSafeZone }, target);

    const { pendingPreset, clearPendingPreset } = usePreviewStore.getState();
    if (previewMode === 'SANDBOX' && pendingPreset) {
      window.setTimeout(() => {
        salonAdminEmitter.emitPreviewPreset(pendingPreset);
        clearPendingPreset();
      }, 120);
    }
  };

  return (
    <aside className="admin-card p-2 flex flex-col h-full w-full min-h-0 bg-[#FFFDF9] select-none gap-1.5 overflow-hidden">
      {/* Top Status Bar - Minimal & Clean */}
      <div className="shrink-0 flex items-center justify-between gap-1.5 px-1 pb-1 border-b border-[#3A2825]/15">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#FFD4E2] border-2 border-[#3A2825] flex items-center justify-center shrink-0">
            <Eye className="w-3.5 h-3.5 text-[#3A2825]" />
          </div>
          <h2 className="font-display font-bold text-xs text-[#3A2825] whitespace-nowrap">
            Live Preview (9:16)
          </h2>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#3A2825] text-[10px] font-black ${
              previewMode === 'MIRROR'
                ? 'bg-[#C9F2E3] text-[#175B43]'
                : 'bg-[#FFE5B4] text-[#8A5200]'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                previewMode === 'MIRROR' ? 'bg-[#2BB673]' : 'bg-[#E09A1F]'
              }`}
            />
            {previewMode === 'MIRROR' ? 'Mirror Live' : 'Sandbox'}
          </span>

          {showSafeZone && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#FFD56B] border border-[#3A2825] text-[9px] font-black text-[#3A2825]">
              <Layers className="w-2.5 h-2.5" />
              Safe-Zone
            </span>
          )}
        </div>
      </div>

      {/* Main Full-Height 9:16 Stage Frame - Fits Width Snugly Like a Phone Mockup */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center p-2 bg-[#F5E6DD] rounded-[16px] border-2 border-[#3A2825]/20 shadow-inner relative overflow-hidden">
        <div className="h-full aspect-[9/16] max-w-full flex items-center justify-center bg-[#1A1211] p-1 rounded-[16px] border-[3px] border-[#3A2825] shadow-2xl relative">
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            onLoad={handleIframeLoad}
            title="Salon Studio Stage 9:16"
            className="w-full h-full rounded-[12px] bg-black block"
          />
        </div>
      </div>
    </aside>
  );
};
