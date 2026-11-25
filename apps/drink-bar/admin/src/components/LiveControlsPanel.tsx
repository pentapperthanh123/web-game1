import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Droplets,
  ExternalLink,
  Globe,
  Layers,
  Mic,
  MicOff,
  Music,
  Plus,
  Radio,
  RefreshCw,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DRINK_BAR_STORAGE_KEYS, GAMEPLAY_LIMITS } from '@shared/config';
import { getConnectionStatusLabel, getMessages } from '@shared/i18n';
import { RECIPE_LIST } from '@shared/recipes';
import { sharedSoundEngine } from '@shared/soundEngine';
import type {
  DrinkBarConfig,
  DrinkInventoryMap,
  Language,
  TikTokConnectionState,
  TikTokStatusPayload,
} from '@shared/types';
import {
  drinkBarAdminBridge,
  getClientStageUrl,
  triggerJumpBrewStep,
} from '../services/adminBridge';

interface LiveControlsPanelProps {
  config: DrinkBarConfig;
  inventory: DrinkInventoryMap | null;
  tiktokStatus: TikTokStatusPayload;
  onChangeLanguage: (language: Language) => void;
  onChangeBrewDuration: (sec: number) => void;
  onChangeDefaultCapacity: (ml: number) => void;
  onToggleAutoRestock: () => void;
  onToggleSfx: () => void;
  onToggleMusic: () => void;
  onChangeMasterVolume: (volume: number) => void;
  onToggleMicMode: () => void;
  onToggleSafeZone: () => void;
}

const STATUS_STYLE_MAP: Record<TikTokConnectionState, string> = {
  CONNECTED: 'bg-[#CBEAD2] text-[#245B3A]',
  CONNECTING: 'bg-[#FFF1C2] text-[#8A5200]',
  RECONNECTING: 'bg-[#FDE0C6] text-[#9A4E1A]',
  ERROR: 'bg-[#FAD7DC] text-[#8E2536]',
  DISCONNECTED: 'bg-[#EFE0CC] text-[#7A5F52]',
};

export const LiveControlsPanel: React.FC<LiveControlsPanelProps> = ({
  config,
  inventory,
  tiktokStatus,
  onChangeLanguage,
  onChangeBrewDuration,
  onChangeDefaultCapacity,
  onToggleAutoRestock,
  onToggleSfx,
  onToggleMusic,
  onChangeMasterVolume,
  onToggleMicMode,
  onToggleSafeZone,
}) => {
  const [tiktokId, setTiktokId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem(DRINK_BAR_STORAGE_KEYS.LAST_TIKTOK_ID) || '';
  });
  const [connectError, setConnectError] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(() =>
    sharedSoundEngine.isUnlocked()
  );

  useEffect(() => {
    return sharedSoundEngine.subscribeUnlocked(setIsAudioUnlocked);
  }, []);

  const handleTestAudio = () => {
    void sharedSoundEngine.unlock(true);
  };

  const msg = getMessages(config.language);
  const stageUrl = getClientStageUrl(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tiktokId.trim().replace(/^@+/, '');
    if (!clean) {
      setConnectError(msg.connectErrorMissingId);
      return;
    }
    localStorage.setItem(DRINK_BAR_STORAGE_KEYS.LAST_TIKTOK_ID, clean);
    setConnectError('');
    try {
      const res = await drinkBarAdminBridge.connectTikTok(clean);
      if (!res.ok) {
        setConnectError(res.error || msg.connectErrorServer);
      }
    } catch {
      setConnectError(msg.connectErrorServer);
    }
  };

  const handleCopyStageUrl = () => {
    void navigator.clipboard.writeText(stageUrl);
    setIsCopied(true);
    window.setTimeout(() => setIsCopied(false), 1600);
  };

  return (
    <section className="bar-panel p-3.5 space-y-3">
      {/* Header + EN / VI Language Switch */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b-2 border-[#3B2820]/12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[12px] bg-[#F49E60] border-[2.5px] border-[#3B2820] flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4 text-[#3B2820]" strokeWidth={2.6} />
          </div>
          <h2 className="font-display font-bold text-[15px] text-[#3B2820]">
            {msg.liveControlsTitle}
          </h2>
        </div>

        <div className="flex items-center gap-1 bg-[#F9EFE2] p-1 rounded-[12px] border-2 border-[#3B2820]">
          <Globe className="w-3.5 h-3.5 text-[#7A5F52] ml-1 mr-0.5" />
          {(['EN', 'VI'] as const).map((lang) => {
            const isSelected = config.language === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => onChangeLanguage(lang)}
                className={`px-2.5 py-0.5 rounded-[8px] text-[11px] font-black cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#D89B63] text-[#3B2820] border-[1.5px] border-[#3B2820]'
                    : 'text-[#7A5F52] hover:text-[#3B2820]'
                }`}
              >
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Brew Duration Slider (12s - 30s) */}
      <div className="rounded-[14px] bg-[#F9EFE2] border-2 border-[#3B2820]/25 px-3 py-2 space-y-1.5">
        <div className="flex items-center justify-between text-[12px] font-black">
          <span className="text-[#3B2820]">{msg.brewDurationLabel}</span>
          <span className="px-2 py-0.5 rounded-full bg-[#FFFDF9] border-2 border-[#3B2820] font-display text-[12px]">
            {config.brewDurationSec}s
          </span>
        </div>
        <input
          type="range"
          min={GAMEPLAY_LIMITS.MIN_BREW_DURATION_SEC}
          max={GAMEPLAY_LIMITS.MAX_BREW_DURATION_SEC}
          step={1}
          value={config.brewDurationSec}
          onChange={(e) => onChangeBrewDuration(Number(e.target.value))}
          className="w-full accent-[#C5834B] cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-extrabold text-[#7A5F52]">
          <span>{GAMEPLAY_LIMITS.MIN_BREW_DURATION_SEC}s</span>
          <span>{GAMEPLAY_LIMITS.DEFAULT_BREW_DURATION_SEC}s</span>
          <span>{GAMEPLAY_LIMITS.MAX_BREW_DURATION_SEC}s</span>
        </div>
      </div>

      {/* 4 Quick Actions */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-black uppercase tracking-wide text-[#7A5F52]">
          {msg.quickActionsLabel}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => drinkBarAdminBridge.emitAdminAction('COMPLETE_NOW')}
            className="bar-btn bg-[#CBEAD2] hover:bg-[#B6E0BF] px-2.5 py-2 text-[12px] font-black text-[#3B2820] inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#245B3A]" />
            <span>{msg.btnCompleteNow}</span>
          </button>

          <button
            type="button"
            onClick={() => drinkBarAdminBridge.emitAdminAction('ADD_TOPPING')}
            className="bar-btn bg-[#FFF1C2] hover:bg-[#FCE397] px-2.5 py-2 text-[12px] font-black text-[#3B2820] inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#B57400]" />
            <span>{msg.btnAddTopping}</span>
          </button>

          <button
            type="button"
            onClick={() => drinkBarAdminBridge.emitAdminAction('NEXT_CUSTOMER')}
            className="bar-btn bg-[#FDE0C6] hover:bg-[#FBD1AA] px-2.5 py-2 text-[12px] font-black text-[#3B2820] inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5 shrink-0 text-[#9A4E1A]" />
            <span>{msg.btnNextCustomer}</span>
          </button>

          <button
            type="button"
            onClick={() => drinkBarAdminBridge.emitAdminAction('CLEAR_SHELF')}
            className="bar-btn bg-[#F5E7D6] hover:bg-[#EAD6BE] px-2.5 py-2 text-[12px] font-black text-[#3B2820] inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0 text-[#7A5F52]" />
            <span>{msg.btnClearShelf}</span>
          </button>
        </div>
      </div>

      {/* 5-Phase Fast Jump Controls */}
      <div className="space-y-1.5 p-2 rounded-[12px] bg-[#F9EFE2] border-2 border-[#3B2820]/15">
        <p className="text-[10.5px] font-black uppercase tracking-wide text-[#7A5F52]">
          {msg.stepJumpTitle}
        </p>
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            onClick={() => triggerJumpBrewStep(12)}
            className="bar-btn bg-[#FFFDF9] hover:bg-[#FFF5E6] py-1.5 px-1 text-[10px] font-black text-[#3B2820] text-center cursor-pointer truncate"
          >
            {msg.btnStep1}
          </button>
          <button
            type="button"
            onClick={() => triggerJumpBrewStep(34)}
            className="bar-btn bg-[#FFFDF9] hover:bg-[#FFF5E6] py-1.5 px-1 text-[10px] font-black text-[#3B2820] text-center cursor-pointer truncate"
          >
            {msg.btnStep2}
          </button>
          <button
            type="button"
            onClick={() => triggerJumpBrewStep(58)}
            className="bar-btn bg-[#FFFDF9] hover:bg-[#FFF5E6] py-1.5 px-1 text-[10px] font-black text-[#3B2820] text-center cursor-pointer truncate"
          >
            {msg.btnStep3}
          </button>
          <button
            type="button"
            onClick={() => triggerJumpBrewStep(82)}
            className="bar-btn bg-[#FFFDF9] hover:bg-[#FFF5E6] py-1.5 px-1 text-[10px] font-black text-[#3B2820] text-center cursor-pointer truncate"
          >
            {msg.btnStep4}
          </button>
          <button
            type="button"
            onClick={() => triggerJumpBrewStep(95)}
            className="bar-btn bg-[#FFFDF9] hover:bg-[#FFF5E6] py-1.5 px-1 text-[10px] font-black text-[#3B2820] text-center cursor-pointer truncate"
          >
            {msg.btnStep5}
          </button>
        </div>
      </div>

      {/* Inventory ML & Restock Controls */}
      <div className="space-y-2 p-2.5 rounded-[12px] bg-[#F9EFE2] border-2 border-[#3B2820]/15">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-[#3B2820]">
            <Droplets className="w-3.5 h-3.5 text-[#52A6BC]" />
            <span>{msg.inventoryTitle}</span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleAutoRestock}
              className={`px-2 py-0.5 rounded-full border-2 border-[#3B2820] text-[10px] font-black cursor-pointer ${
                config.autoRestockEnabled
                  ? 'bg-[#CBEAD2] text-[#245B3A]'
                  : 'bg-[#FFFDF9] text-[#7A5F52]'
              }`}
            >
              {msg.autoRestockLabel}
            </button>
            <button
              type="button"
              onClick={() => drinkBarAdminBridge.emitAdminAction('RESTOCK_ALL')}
              className="bar-btn bg-[#FFF1C2] hover:bg-[#FCE397] px-2 py-0.5 text-[10px] font-black text-[#3B2820] inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{msg.btnRestockAll}</span>
            </button>
          </div>
        </div>

        {/* Default Tank Capacity Slider (1000ml - 3000ml) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#7A5F52]">
            <span>{msg.defaultCapacityLabel}</span>
            <span className="px-2 py-0.5 rounded-full bg-[#FFFDF9] border border-[#3B2820] font-display text-[11px] text-[#3B2820]">
              {config.defaultCapacityMl}ml
            </span>
          </div>
          <input
            type="range"
            min={GAMEPLAY_LIMITS.MIN_CAPACITY_ML}
            max={GAMEPLAY_LIMITS.MAX_CAPACITY_ML}
            step={GAMEPLAY_LIMITS.CAPACITY_STEP_ML}
            value={config.defaultCapacityMl}
            onChange={(e) => onChangeDefaultCapacity(Number(e.target.value))}
            className="w-full accent-[#52A6BC] cursor-pointer"
          />
        </div>

        {/* 5 Recipe Stock Rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {RECIPE_LIST.map((recipe) => {
            const slot = inventory?.[recipe.id];
            const currentMl = slot?.currentMl ?? config.defaultCapacityMl;
            const maxMl = slot?.maxMl ?? config.defaultCapacityMl;
            const pct = Math.max(0, Math.min(100, Math.round((currentMl / Math.max(1, maxMl)) * 100)));
            const isEmpty = currentMl < GAMEPLAY_LIMITS.COST_PER_DRINK_ML;
            const name = config.language === 'EN' ? recipe.shortNameEn : recipe.nameVi;

            return (
              <div
                key={recipe.id}
                className="flex items-center justify-between gap-1.5 rounded-[10px] bg-[#FFFDF9] border-[1.8px] border-[#3B2820]/30 px-2 py-1"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[10.5px] font-black text-[#3B2820]">
                    <span className="truncate">{name}</span>
                    <span className={isEmpty ? 'text-[#8E2536]' : 'text-[#5C4033]'}>
                      {isEmpty ? msg.soldOutBadge : `${currentMl}ml`}
                    </span>
                  </div>
                  <div className="mt-0.5 h-[5px] w-full rounded-full bg-[#F5E7D6] overflow-hidden border border-[#3B2820]/30">
                    <div
                      className="h-full rounded-full transition-[width] duration-150"
                      style={{ width: `${pct}%`, backgroundColor: recipe.baseColor }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    drinkBarAdminBridge.emitAdminAction('RESTOCK_RECIPE', {
                      recipeId: recipe.id,
                      addMl: 500,
                    })
                  }
                  className="shrink-0 px-1.5 py-1 rounded-[7px] bg-[#CBEAD2] hover:bg-[#B6E0BF] border-[1.5px] border-[#3B2820] text-[9.5px] font-black text-[#245B3A] inline-flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>500ml</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Master Volume + Audio Chill SFX + Music + micMode + Safe-Zone Guide */}
      <div className="space-y-2 p-2.5 rounded-[12px] bg-[#F9EFE2] border-2 border-[#3B2820]/15">
        <div className="flex items-center justify-between gap-1.5 text-[11px] font-black text-[#3B2820]">
          <span>{msg.masterVolumeLabel}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleTestAudio}
              className={`px-2 py-0.5 rounded-full border-[1.5px] border-[#3B2820] text-[10px] font-black cursor-pointer ${
                isAudioUnlocked
                  ? 'bg-[#CBEAD2] text-[#245B3A]'
                  : 'bg-[#FFF1C2] text-[#8A5200]'
              }`}
            >
              {isAudioUnlocked ? `🔊 ${msg.btnTestAudio}` : `🔇 ${msg.btnTestAudio}`}
            </button>
            <span className="px-2 py-0.5 rounded-full bg-[#FFFDF9] border border-[#3B2820] font-display text-[11px]">
              {Math.round(config.masterVolume * 100)}%
              {config.micMode ? ' (Duck 25%)' : ''}
            </span>
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(config.masterVolume * 100)}
          onChange={(e) => onChangeMasterVolume(Number(e.target.value) / 100)}
          className="w-full accent-[#245B3A] cursor-pointer"
        />

        <div className="grid grid-cols-4 gap-1.5">
          <button
            type="button"
            onClick={onToggleSfx}
            className={`bar-btn px-1.5 py-2 text-[10.5px] font-black flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              config.sfxEnabled
                ? 'bg-[#CBEAD2] text-[#245B3A]'
                : 'bg-[#F5E7D6] text-[#7A5F52]'
            }`}
          >
            {config.sfxEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span className="truncate max-w-full">{msg.sfxLabel}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMusic}
            className={`bar-btn px-1.5 py-2 text-[10.5px] font-black flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              config.sfxMusicEnabled
                ? 'bg-[#FDE0C6] text-[#9A4E1A]'
                : 'bg-[#F5E7D6] text-[#7A5F52]'
            }`}
          >
            <Music className="w-4 h-4" />
            <span className="truncate max-w-full">{msg.sfxMusicLabel}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMicMode}
            title={msg.micModeHint}
            className={`bar-btn px-1.5 py-2 text-[10.5px] font-black flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              config.micMode
                ? 'bg-[#F7C95B] text-[#3B2820]'
                : 'bg-[#F5E7D6] text-[#7A5F52]'
            }`}
          >
            {config.micMode ? (
              <Mic className="w-4 h-4" />
            ) : (
              <MicOff className="w-4 h-4" />
            )}
            <span className="truncate max-w-full">{msg.micModeLabel}</span>
          </button>

          <button
            type="button"
            onClick={onToggleSafeZone}
            className={`bar-btn px-1.5 py-2 text-[10.5px] font-black flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
              config.showSafeZone
                ? 'bg-[#D9F0F6] text-[#235F70]'
                : 'bg-[#F5E7D6] text-[#7A5F52]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="truncate max-w-full">Safe-Zone</span>
          </button>
        </div>
      </div>

      {/* Compact Core Connect Service (server/) Bar */}
      <div className="rounded-[14px] bg-[#F9EFE2] border-2 border-[#3B2820]/25 p-2.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#C5834B]" />
            <span className="text-[11.5px] font-black text-[#3B2820]">
              {msg.tiktokConnectTitle}
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full border-[1.5px] border-[#3B2820] text-[10px] font-black ${
              STATUS_STYLE_MAP[tiktokStatus.status]
            }`}
          >
            {getConnectionStatusLabel(tiktokStatus.status, config.language)}
          </span>
        </div>

        <form onSubmit={(e) => void handleConnect(e)} className="flex gap-1.5">
          <input
            type="text"
            value={tiktokId}
            onChange={(e) => setTiktokId(e.target.value)}
            placeholder={msg.tiktokPlaceholder}
            className="flex-1 min-w-0 bg-[#FFFDF9] border-2 border-[#3B2820] rounded-[11px] px-2.5 py-1 text-[11.5px] font-bold text-[#3B2820] placeholder:text-[#9A7F70] focus:outline-none"
          />
          <button
            type="submit"
            className="bar-btn bg-[#A7D397] hover:bg-[#93C780] px-3 py-1 text-[11.5px] font-black text-[#3B2820] cursor-pointer"
          >
            {msg.btnConnect}
          </button>
          {tiktokStatus.status !== 'DISCONNECTED' && (
            <button
              type="button"
              onClick={() => void drinkBarAdminBridge.disconnectTikTok()}
              className="bar-btn bg-[#FAD7DC] hover:bg-[#F5C0C8] px-2.5 py-1 text-[11.5px] font-black text-[#3B2820] cursor-pointer"
            >
              {msg.btnDisconnect}
            </button>
          )}
        </form>

        {(connectError || tiktokStatus.error) && (
          <p className="text-[11px] font-bold text-[#9C2B3C]">
            {connectError || tiktokStatus.error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#3B2820]/12">
          <span className="text-[10.5px] font-bold text-[#7A5F52] truncate font-mono">
            {msg.stageUrlLabel}: {stageUrl}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleCopyStageUrl}
              className="px-2 py-0.5 rounded-[8px] bg-[#FFFDF9] border-2 border-[#3B2820] text-[10.5px] font-black inline-flex items-center gap-1 cursor-pointer"
            >
              {isCopied ? <Check className="w-3 h-3 text-[#245B3A]" /> : <Copy className="w-3 h-3" />}
              {isCopied ? msg.btnCopied : msg.btnCopyUrl}
            </button>
            <a
              href={stageUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-0.5 rounded-[8px] bg-[#FDE0C6] border-2 border-[#3B2820] text-[10.5px] font-black inline-flex items-center gap-1 text-[#3B2820] no-underline"
            >
              <ExternalLink className="w-3 h-3" />
              {msg.btnOpenStage}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
