import React, { useState } from 'react';
import {
  Bot,
  Crown,
  Gift,
  Music,
  Play,
  PlusCircle,
  Sparkles,
  Square,
} from 'lucide-react';
import { GAMEPLAY_LIMITS } from '@shared/config';
import { getMessages, getPaceLabel } from '@shared/i18n';
import { RECIPE_LIST } from '@shared/recipes';
import type {
  AutoBotPace,
  DanceStyle,
  DrinkInventoryMap,
  GiftTier,
  IceLevel,
  Language,
  RecipeId,
} from '@shared/types';
import {
  triggerGiftLargeSimulation,
  triggerGiftMediumSimulation,
  triggerGiftSmallSimulation,
  triggerOrderSimulation,
  triggerSpecificOrderSimulation,
  triggerTikTokDanceTest,
} from '../services/adminBridge';

interface AutoBotBarPanelProps {
  language: Language;
  inventory: DrinkInventoryMap | null;
  unlimitedInventory?: boolean;
  isBotEnabled: boolean;
  pace: AutoBotPace;
  onToggleBot: () => void;
  onChangePace: (pace: AutoBotPace) => void;
}

const PACE_OPTIONS: readonly AutoBotPace[] = ['SLOW', 'NORMAL', 'FAST'];
const ICE_OPTIONS: readonly IceLevel[] = ['NORMAL', 'LESS', 'EXTRA', 'NONE'];

const DRINK_PRODUCT_IMAGE_MAP: Readonly<Partial<Record<RecipeId, string>>> = {
  matcha: '/drinks/matcha.png',
  thai_tea: '/drinks/thai_tea.png',
  coffee_milk: '/drinks/coffee_milk.png',
  berry_soda: '/drinks/berry_soda.png',
  blue_citrus: '/drinks/blue_citrus.png',
};

const FruitTeaThumbSvg: React.FC<{ baseColor: string; accentColor: string }> = ({
  baseColor,
  accentColor,
}) => (
  <svg viewBox="0 0 46 54" className="w-full h-full" aria-hidden="true">
    <path d="M12 18 H34 L31 46 Q30 49 26 49 H20 Q16 49 15 46 Z" fill={baseColor} stroke="#3B2820" strokeWidth="2" />
    <path d="M12 18 A11 9 0 0 1 34 18 Z" fill="#FFFDF9" fillOpacity="0.82" stroke="#3B2820" strokeWidth="1.8" />
    <line x1="23" y1="16" x2="26" y2="5" stroke="#3B2820" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M29 17 A5.5 5.5 0 0 1 38 17 Z" fill={accentColor} stroke="#3B2820" strokeWidth="1.6" />
  </svg>
);

const DANCE_TIER_BUTTONS: readonly {
  tier: GiftTier;
  style: DanceStyle;
  bgClass: string;
  labelKey: 'btnDanceSmall' | 'btnDanceMedium' | 'btnDanceLarge';
}[] = [
  {
    tier: 'SMALL',
    style: 'heart_sway',
    bgClass: 'bg-[#FDE0C6] hover:bg-[#FBD1AC] text-[#3B2820]',
    labelKey: 'btnDanceSmall',
  },
  {
    tier: 'MEDIUM',
    style: 'groove_wave',
    bgClass: 'bg-[#D9F0F6] hover:bg-[#C3E7F0] text-[#235F70]',
    labelKey: 'btnDanceMedium',
  },
  {
    tier: 'LARGE',
    style: 'party_hype',
    bgClass: 'bg-[#F0788C] hover:bg-[#E5667B] text-[#FFFDF9]',
    labelKey: 'btnDanceLarge',
  },
];

export const AutoBotBarPanel: React.FC<AutoBotBarPanelProps> = ({
  language,
  inventory,
  unlimitedInventory = false,
  isBotEnabled,
  pace,
  onToggleBot,
  onChangePace,
}) => {
  const [selectedIce, setSelectedIce] = useState<IceLevel>('NORMAL');
  const msg = getMessages(language);

  const iceLabelMap: Record<IceLevel, string> = {
    NORMAL: msg.iceNormal,
    LESS: msg.iceLess,
    EXTRA: msg.iceExtra,
    NONE: msg.iceNone,
  };

  return (
    <section className="bar-panel p-3.5 space-y-3">
      {/* Header & Main Toggle + Pace */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b-2 border-[#3B2820]/12">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-[12px] bg-[#A7D397] border-[2.5px] border-[#3B2820] flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-[#3B2820]" strokeWidth={2.6} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-[15px] leading-tight text-[#3B2820] truncate">
              {msg.autoBotTitle}
            </h2>
            <p className="text-[11px] font-bold text-[#7A5F52] truncate">
              {msg.autoBotSubtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[#F9EFE2] p-1 rounded-[10px] border-2 border-[#3B2820]/20">
            {PACE_OPTIONS.map((option) => {
              const isSelected = pace === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChangePace(option)}
                  className={`px-2 py-0.5 rounded-[7px] text-[11px] font-black cursor-pointer ${
                    isSelected
                      ? 'bg-[#F7C95B] text-[#3B2820] border border-[#3B2820]'
                      : 'text-[#7A5F52] hover:text-[#3B2820]'
                  }`}
                >
                  {getPaceLabel(option, language)}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={onToggleBot}
            className={`bar-btn px-3.5 py-1.5 text-[12px] font-black inline-flex items-center gap-1.5 shrink-0 cursor-pointer ${
              isBotEnabled
                ? 'bg-[#F0788C] hover:bg-[#E7647B] text-[#FFFDF9]'
                : 'bg-[#A7D397] hover:bg-[#93C780] text-[#3B2820]'
            }`}
          >
            {isBotEnabled ? (
              <Square className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>{isBotEnabled ? msg.autoBotOn : msg.autoBotOff}</span>
          </button>
        </div>
      </div>

      {/* Clickable 5-Drink Order Menu + Ice Level Picker */}
      <div className="space-y-1.5 p-2.5 rounded-[12px] bg-[#F9EFE2] border-2 border-[#3B2820]/15">
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <p className="text-[11px] font-black uppercase tracking-wide text-[#3B2820]">
            {msg.orderMenuLabel}
          </p>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-black text-[#7A5F52] mr-0.5">
              {msg.icePickerLabel}:
            </span>
            {ICE_OPTIONS.map((ice) => {
              const isSelected = selectedIce === ice;
              return (
                <button
                  key={ice}
                  type="button"
                  onClick={() => setSelectedIce(ice)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black border-[1.5px] cursor-pointer ${
                    isSelected
                      ? 'bg-[#D9F0F6] border-[#3B2820] text-[#235F70]'
                      : 'bg-[#FFFDF9] border-[#3B2820]/30 text-[#7A5F52]'
                  }`}
                >
                  {iceLabelMap[ice]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {RECIPE_LIST.map((recipe) => {
            const slot = inventory?.[recipe.id];
            const currentMl = slot?.currentMl ?? GAMEPLAY_LIMITS.DEFAULT_CAPACITY_ML;
            const isSoldOut = !unlimitedInventory && currentMl < GAMEPLAY_LIMITS.COST_PER_DRINK_ML;
            const label = language === 'EN' ? recipe.shortNameEn : recipe.nameVi;
            const thumbUrl = DRINK_PRODUCT_IMAGE_MAP[recipe.id];
            let stockCaption = `${currentMl}ml`;
            if (unlimitedInventory) {
              stockCaption = '∞';
            } else if (isSoldOut) {
              stockCaption = msg.soldOutBadge;
            }

            return (
              <button
                key={recipe.id}
                type="button"
                disabled={isSoldOut}
                onClick={() =>
                  triggerSpecificOrderSimulation(recipe.id, selectedIce, 'SIMULATOR')
                }
                className={`bar-btn px-1.5 py-1.5 text-[11px] font-black flex flex-col items-center justify-center gap-1 transition-transform ${
                  isSoldOut
                    ? 'bg-[#EFE0CC] text-[#9A7F70] opacity-60 cursor-not-allowed'
                    : 'bg-[#FFFDF9] hover:bg-[#FFF5E6] text-[#3B2820] cursor-pointer active:scale-95'
                }`}
              >
                <div className="w-[46px] h-[54px] rounded-[9px] bg-[#FBE7EE] border-[1.5px] border-[#3B2820]/20 overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={label}
                      draggable={false}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <FruitTeaThumbSvg
                      baseColor={recipe.baseColor}
                      accentColor={recipe.accentColor}
                    />
                  )}
                </div>
                <span className="truncate max-w-full leading-tight">{label}</span>
                <span className="text-[9.5px] font-extrabold text-[#7A5F52] leading-none">
                  {stockCaption}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => triggerOrderSimulation('SIMULATOR')}
            className="bar-btn bg-[#CBEAD2] hover:bg-[#B7E1C0] px-2 py-1.5 text-[11px] font-black text-[#245B3A] flex flex-col items-center justify-center gap-1 cursor-pointer"
          >
            <PlusCircle className="w-6 h-6 shrink-0" />
            <span className="truncate">{msg.btnAddOrder}</span>
          </button>
        </div>
      </div>

      {/* Donate Gifts + Direct Barista TikTok Dance Tiers */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-black uppercase tracking-wide text-[#7A5F52]">
          {msg.donateDanceTitle}
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => triggerGiftSmallSimulation('SIMULATOR')}
            className="bar-btn bg-[#FDE0C6] hover:bg-[#FBD1AC] px-2 py-1.5 text-[11.5px] font-black text-[#3B2820] inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Gift className="w-3.5 h-3.5 shrink-0 text-[#B85719]" />
            <span className="truncate">{msg.btnGift1}</span>
          </button>

          <button
            type="button"
            onClick={() => triggerGiftMediumSimulation('SIMULATOR')}
            className="bar-btn bg-[#D9F0F6] hover:bg-[#C3E7F0] px-2 py-1.5 text-[11.5px] font-black text-[#3B2820] inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0 text-[#2E7E94]" />
            <span className="truncate">{msg.btnGift2}</span>
          </button>

          <button
            type="button"
            onClick={() => triggerGiftLargeSimulation('SIMULATOR')}
            className="bar-btn bg-[#FFF1C2] hover:bg-[#FCE49A] px-2 py-1.5 text-[11.5px] font-black text-[#3B2820] inline-flex items-center justify-center gap-1 cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5 shrink-0 text-[#B57400]" />
            <span className="truncate">{msg.btnGift3}</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {DANCE_TIER_BUTTONS.map((item) => (
            <button
              key={item.style}
              type="button"
              onClick={() => triggerTikTokDanceTest(item.tier, item.style)}
              className={`bar-btn ${item.bgClass} px-2 py-1.5 text-[11.5px] font-black inline-flex items-center justify-center gap-1.5 cursor-pointer`}
            >
              <Music className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{msg[item.labelKey]}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
