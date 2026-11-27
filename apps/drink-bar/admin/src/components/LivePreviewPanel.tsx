import React, { useEffect, useRef } from 'react';
import { MonitorPlay } from 'lucide-react';
import { getMessages } from '@shared/i18n';
import type { DrinkBarConfig } from '@shared/types';
import { drinkBarAdminBridge, getClientStageUrl } from '../services/adminBridge';

interface LivePreviewPanelProps {
  config: DrinkBarConfig;
}

export const LivePreviewPanel: React.FC<LivePreviewPanelProps> = ({ config }) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const msg = getMessages(config.language);
  const mirrorUrl = getClientStageUrl(true);

  useEffect(() => {
    drinkBarAdminBridge.setPreviewIframe(iframeRef.current);
    return () => drinkBarAdminBridge.setPreviewIframe(null);
  }, []);

  const handleIframeLoad = () => {
    drinkBarAdminBridge.setPreviewIframe(iframeRef.current);
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_LANGUAGE', {
      language: config.language,
    });
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_BREW_DURATION', {
      brewDurationSec: config.brewDurationSec,
    });
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_SFX_ENABLED', {
      sfxEnabled: config.sfxEnabled,
    });
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_MUSIC_ENABLED', {
      sfxMusicEnabled: config.sfxMusicEnabled,
    });
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_BGM_ENABLED', {
      bgmEnabled: config.bgmEnabled,
    });
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_TTS_ENABLED', {
      ttsEnabled: config.ttsEnabled,
    });
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_MASTER_VOLUME', {
      masterVolume: config.masterVolume,
    });
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_MIC_MODE', {
      micMode: config.micMode,
    });
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_SAFE_ZONE', {
      showSafeZone: config.showSafeZone,
    });
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_DEFAULT_CAPACITY', {
      defaultCapacityMl: config.defaultCapacityMl,
    });
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_AUTO_RESTOCK', {
      autoRestockEnabled: config.autoRestockEnabled,
    });
    drinkBarAdminBridge.syncConfigToPreviewOnly('SET_UNLIMITED_INVENTORY', {
      unlimitedInventory: config.unlimitedInventory,
    });
  };

  return (
    <aside className="flex flex-col h-full w-full min-h-0 bg-[#FFF5F7] lg:border-l-[2.5px] border-t-[2.5px] lg:border-t-0 border-[#3B2820] select-none overflow-hidden">
      {/* Preview Panel Header: Left "Live Preview (9:16)" | Right "● Mirror Live" */}
      <div className="shrink-0 flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-[#FFFDF9] border-b border-[#3B2820]/20">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-6 h-6 rounded-md bg-[#E8B584] border-2 border-[#3B2820] flex items-center justify-center shrink-0">
            <MonitorPlay className="w-3.5 h-3.5 text-[#3B2820]" strokeWidth={2.6} />
          </div>
          <h2 className="font-display font-bold text-xs text-[#3B2820] whitespace-nowrap">
            {msg.previewHeaderTitle}
          </h2>
        </div>

        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[#3B2820] text-[10px] font-black bg-[#CBEAD2] text-[#245B3A] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#249A55] animate-pulse" />
          <span>{msg.mirrorLiveBadge}</span>
        </span>
      </div>

      {/* Main Full-Height 9:16 Stage Frame - Edge-to-Edge Clean Preview */}
      <div
        className="flex-1 min-h-0 w-full flex items-center justify-center relative overflow-hidden bg-[#FFF5F7]"
        style={{ containerType: 'size' }}
      >
        <div
          className="relative overflow-hidden bg-[#FFF5F7] flex items-center justify-center"
          style={{
            width: 'min(100cqw, calc(100cqh * 9 / 16))',
            height: 'min(100cqh, calc(100cqw * 16 / 9))',
          }}
        >
          <iframe
            ref={iframeRef}
            src={mirrorUrl}
            allow="autoplay"
            onLoad={handleIframeLoad}
            title="Drink Bar Live Preview 9:16"
            className="w-full h-full block border-0"
          />
        </div>
      </div>
    </aside>
  );
};
