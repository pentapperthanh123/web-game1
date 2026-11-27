import React, { useEffect, useState } from 'react';
import { Coffee, Crown, Sparkles, Users } from 'lucide-react';
import { DEFAULT_DRINK_BAR_CONFIG } from '@shared/config';
import { getMessages } from '@shared/i18n';
import { formatBrewStepBadge, getRecipeLabel } from '@shared/recipes';
import { sharedSoundEngine } from '@shared/soundEngine';
import type {
  AutoBotPace,
  DrinkBarConfig,
  DrinkBarLiveState,
  Language,
  TikTokStatusPayload,
} from '@shared/types';
import { AutoBotBarPanel } from './components/AutoBotBarPanel';
import { LiveControlsPanel } from './components/LiveControlsPanel';
import { LivePreviewPanel } from './components/LivePreviewPanel';
import { drinkBarAdminBridge } from './services/adminBridge';
import { autoBotBar } from './services/autoBotBar';

export const App: React.FC = () => {
  const [config, setConfig] = useState<DrinkBarConfig>({
    ...DEFAULT_DRINK_BAR_CONFIG,
    showSafeZone: false,
  });
  const [liveSnapshot, setLiveSnapshot] = useState<DrinkBarLiveState | null>(null);
  const [tiktokStatus, setTiktokStatus] = useState<TikTokStatusPayload>({
    status: 'DISCONNECTED',
    username: '',
  });
  const [isBotEnabled, setIsBotEnabled] = useState<boolean>(false);
  const [botPace, setBotPace] = useState<AutoBotPace>('NORMAL');

  useEffect(() => {
    autoBotBar.stop();
    sharedSoundEngine.enableAutoCafeBgm(true);
    drinkBarAdminBridge.start();
    const offSnapshot = drinkBarAdminBridge.subscribeSnapshot(setLiveSnapshot);
    const offStatus = drinkBarAdminBridge.subscribeTikTokStatus(setTiktokStatus);

    return () => {
      offSnapshot();
      offStatus();
      autoBotBar.stop();
      drinkBarAdminBridge.stop();
    };
  }, []);

  const handleToggleBot = () => {
    if (isBotEnabled) {
      autoBotBar.stop();
      setIsBotEnabled(false);
    } else {
      autoBotBar.start(botPace);
      setIsBotEnabled(true);
    }
  };

  const handleChangePace = (nextPace: AutoBotPace) => {
    setBotPace(nextPace);
    autoBotBar.setPace(nextPace);
  };

  const handleChangeLanguage = (language: Language) => {
    setConfig((prev) => ({ ...prev, language }));
    drinkBarAdminBridge.emitAdminAction('SET_LANGUAGE', { language });
  };

  const handleChangeBrewDuration = (brewDurationSec: number) => {
    setConfig((prev) => ({ ...prev, brewDurationSec }));
    drinkBarAdminBridge.emitAdminAction('SET_BREW_DURATION', { brewDurationSec });
  };

  const handleToggleSfx = () => {
    const next = !config.sfxEnabled;
    setConfig((prev) => ({ ...prev, sfxEnabled: next }));
    drinkBarAdminBridge.emitAdminAction('SET_SFX_ENABLED', { sfxEnabled: next });
  };

  const handleToggleMusic = () => {
    const next = !config.sfxMusicEnabled;
    setConfig((prev) => ({ ...prev, sfxMusicEnabled: next }));
    drinkBarAdminBridge.emitAdminAction('SET_MUSIC_ENABLED', { sfxMusicEnabled: next });
  };

  const handleToggleBgm = () => {
    const next = !config.bgmEnabled;
    setConfig((prev) => ({ ...prev, bgmEnabled: next }));
    drinkBarAdminBridge.emitAdminAction('SET_BGM_ENABLED', { bgmEnabled: next });
  };

  const handleToggleTts = () => {
    const next = !config.ttsEnabled;
    setConfig((prev) => ({ ...prev, ttsEnabled: next }));
    drinkBarAdminBridge.emitAdminAction('SET_TTS_ENABLED', { ttsEnabled: next });
  };

  const handleChangeMasterVolume = (masterVolume: number) => {
    setConfig((prev) => ({ ...prev, masterVolume }));
    drinkBarAdminBridge.emitAdminAction('SET_MASTER_VOLUME', { masterVolume });
  };

  const handleToggleMicMode = () => {
    const next = !config.micMode;
    setConfig((prev) => ({ ...prev, micMode: next }));
    drinkBarAdminBridge.emitAdminAction('SET_MIC_MODE', { micMode: next });
  };

  const handleToggleSafeZone = () => {
    const next = !config.showSafeZone;
    setConfig((prev) => ({ ...prev, showSafeZone: next }));
    drinkBarAdminBridge.emitAdminAction('SET_SAFE_ZONE', { showSafeZone: next });
  };

  const handleChangeDefaultCapacity = (defaultCapacityMl: number) => {
    setConfig((prev) => ({ ...prev, defaultCapacityMl }));
    drinkBarAdminBridge.emitAdminAction('SET_DEFAULT_CAPACITY', { defaultCapacityMl });
  };

  const handleToggleAutoRestock = () => {
    const next = !config.autoRestockEnabled;
    setConfig((prev) => ({ ...prev, autoRestockEnabled: next }));
    drinkBarAdminBridge.emitAdminAction('SET_AUTO_RESTOCK', { autoRestockEnabled: next });
  };

  const handleToggleUnlimitedInventory = () => {
    const next = !config.unlimitedInventory;
    setConfig((prev) => ({ ...prev, unlimitedInventory: next }));
    drinkBarAdminBridge.emitAdminAction('SET_UNLIMITED_INVENTORY', { unlimitedInventory: next });
  };

  const msg = getMessages(config.language);
  const vipCount = liveSnapshot?.vipQueue.length ?? 0;
  const totalQueue = vipCount + (liveSnapshot?.normalQueue.length ?? 0);
  const activeDrink = liveSnapshot?.activeSlots?.[0] ?? liveSnapshot?.activeDrink ?? null;

  let activeSummary = msg.telemetryIdle;
  if (activeDrink) {
    const b1 = formatBrewStepBadge(activeDrink, config.language, msg.readyLabel);
    activeSummary = `${msg.station1Label}: ${activeDrink.user.nickname} · ${getRecipeLabel(activeDrink.recipeId, config.language, true)} (${b1.stepShort} ${b1.pct}%)`;
  }

  return (
    <div className="h-screen w-full overflow-hidden p-0 flex flex-col lg:flex-row gap-0 box-border">
      {/* CỘT TRÁI (Rộng linh hoạt ~68-74%): Điều khiển Host & Auto-Bot Bar */}
      <div className="flex-1 min-w-0 h-auto lg:h-full flex flex-col gap-2 min-h-0 overflow-hidden">
        {/* Compact Brand Header & Live Telemetry */}
        <header className="shrink-0 px-3.5 py-2 bg-[#FFF7EC] border-b-[2.5px] border-[#3B2820] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-[12px] bg-[#D89B63] border-[2.5px] border-[#3B2820] flex items-center justify-center shrink-0">
                <Coffee className="w-4 h-4 text-[#3B2820]" strokeWidth={2.6} />
              </div>
              <div className="min-w-0">
                <h1 className="font-display font-bold text-base leading-tight text-[#3B2820] truncate">
                  {msg.adminTitle}
                </h1>
                <p className="text-[10px] font-extrabold text-[#7A5F52] truncate">
                  {msg.adminSubtitle}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-lg bg-[#FFFDF9] border-2 border-[#3B2820] text-[11px] font-black inline-flex items-center gap-1 max-w-full">
              <Sparkles className="w-3 h-3 text-[#C5834B] shrink-0" />
              <span className="text-[#7A5F52] shrink-0">{msg.telemetryNow}:</span>
              <span className="truncate">{activeSummary}</span>
            </span>

            <span className="px-2.5 py-0.5 rounded-lg bg-[#CBEAD2] border-2 border-[#3B2820] text-[11px] font-black inline-flex items-center gap-1">
              <Users className="w-3 h-3 text-[#245B3A]" />
              <span>
                {msg.telemetryQueue}: {totalQueue}
              </span>
              {vipCount > 0 && (
                <span className="text-[#8A5200] font-black">(VIP {vipCount})</span>
              )}
            </span>

            <span className="px-2.5 py-0.5 rounded-lg bg-[#FFF1C2] border-2 border-[#3B2820] text-[11px] font-black inline-flex items-center gap-1">
              <Crown className="w-3 h-3 text-[#B57400]" />
              <span>
                {msg.telemetryDone}: {liveSnapshot?.todayDoneCount ?? 0}
              </span>
            </span>
          </div>
        </header>

        {/* Scrollable Controls Stack */}
        <div className="flex-1 min-h-0 overflow-y-auto bar-scroll px-2 space-y-2.5 pb-2">
          <AutoBotBarPanel
            language={config.language}
            inventory={liveSnapshot?.inventory ?? null}
            unlimitedInventory={config.unlimitedInventory}
            isBotEnabled={isBotEnabled}
            pace={botPace}
            onToggleBot={handleToggleBot}
            onChangePace={handleChangePace}
          />

          <LiveControlsPanel
            config={config}
            inventory={liveSnapshot?.inventory ?? null}
            tiktokStatus={tiktokStatus}
            onChangeLanguage={handleChangeLanguage}
            onChangeBrewDuration={handleChangeBrewDuration}
            onChangeDefaultCapacity={handleChangeDefaultCapacity}
            onToggleAutoRestock={handleToggleAutoRestock}
            onToggleUnlimitedInventory={handleToggleUnlimitedInventory}
            onToggleSfx={handleToggleSfx}
            onToggleMusic={handleToggleMusic}
            onToggleBgm={handleToggleBgm}
            onToggleTts={handleToggleTts}
            onChangeMasterVolume={handleChangeMasterVolume}
            onToggleMicMode={handleToggleMicMode}
            onToggleSafeZone={handleToggleSafeZone}
          />
        </div>
      </div>

      {/* CỘT PHẢI (Mở rộng tối ưu khung 9:16): Live Preview + Mirror Live */}
      <div className="w-full lg:w-[420px] xl:w-[480px] 2xl:w-[540px] shrink-0 h-[640px] lg:h-full flex flex-col min-h-0 overflow-hidden">
        <LivePreviewPanel config={config} />
      </div>
    </div>
  );
};

export default App;
