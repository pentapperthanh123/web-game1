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
  };

  return (
    <aside className="admin-card p-2.5 flex flex-col h-full w-full min-h-0 bg-[#FFFDF9] select-none gap-2 overflow-hidden">
      {/* Top Status Bar - Minimal & Clean (No bulky buttons) */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-1 pb-1.5 border-b-2 border-[#3A2825]/15">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#FFD4E2] border-2 border-[#3A2825] flex items-center justify-center shrink-0">
            <Eye className="w-4 h-4 text-[#3A2825]" />
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <h2 className="font-display font-bold text-sm text-[#3A2825] whitespace-nowrap">
              Live Preview (720×1280)
            </h2>
            <span className="text-[11px] font-extrabold text-[#7D6059] truncate hidden sm:inline">
              9:16 Dọc TikTok
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border-2 border-[#3A2825] text-[10px] font-black ${
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
            {previewMode === 'MIRROR' ? 'Mirror Live' : 'Sandbox Test'}
          </span>

          {showSafeZone && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFD56B] border border-[#3A2825] text-[10px] font-black text-[#3A2825]">
              <Layers className="w-3 h-3" />
              Safe-Zone ON
            </span>
          )}
        </div>
      </div>

      {/* Main Full-Height 9:16 Stage Frame - Takes 100% Remaining Height */}
      <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1.5 bg-[#261C1A] rounded-[18px] border-[3.5px] border-[#3A2825] shadow-inner relative overflow-hidden">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          onLoad={handleIframeLoad}
          title="Salon Studio Stage 9:16"
          className="h-full aspect-[9/16] max-w-full rounded-[14px] shadow-2xl border-2 border-[#3A2825]/50 bg-black block"
        />
      </div>
    </aside>
  );
};
