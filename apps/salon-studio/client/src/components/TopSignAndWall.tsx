import React from 'react';
import { Crown, Eye, Scissors, Sparkles } from 'lucide-react';
import { SALON_I18N } from '@shared/constants/i18n';
import {
  COLOR_SWATCHES,
  getDeterministicAvatarColor,
  HAIR_STYLE_LABELS,
  NAIL_SHAPE_LABELS,
  SKIN_TONES,
} from '@shared/constants/presets';
import type { FinishedWorkItem } from '@shared/types/salon';
import { useSalonStore } from '../store/salonStore';

const DEFAULT_HAIR_SHOWCASE: readonly FinishedWorkItem[] = [
  {
    id: 'hair_preset_1',
    nickname: 'Pink Curls',
    service: 'HAIR',
    colorKey: 'pink',
    hasPastelShimmer: true,
    hairStyle: 'curly',
    nailShape: 'oval',
    nailArtStyle: 'FRENCH_TIP',
    accessory: 'BOW',
    trollEffect: null,
    isRoyal: false,
    skinTone: SKIN_TONES[0],
    completedAt: 1,
  },
  {
    id: 'hair_preset_2',
    nickname: 'Long Straight',
    service: 'HAIR',
    colorKey: 'pastel_peach',
    hasPastelShimmer: false,
    hairStyle: 'long',
    nailShape: 'square',
    nailArtStyle: 'FRENCH_TIP',
    accessory: 'NONE',
    trollEffect: null,
    isRoyal: false,
    skinTone: SKIN_TONES[1],
    completedAt: 2,
  },
  {
    id: 'hair_preset_3',
    nickname: 'Blonde Ombre',
    service: 'HAIR',
    colorKey: 'gold',
    hasPastelShimmer: true,
    hairStyle: 'bob',
    nailShape: 'almond',
    nailArtStyle: 'FRENCH_TIP',
    accessory: 'SPARKLE_CLIP',
    trollEffect: null,
    isRoyal: false,
    skinTone: SKIN_TONES[0],
    completedAt: 3,
  },
  {
    id: 'hair_preset_4',
    nickname: 'Purple Pixie',
    service: 'HAIR',
    colorKey: 'purple',
    hasPastelShimmer: false,
    hairStyle: 'short',
    nailShape: 'oval',
    nailArtStyle: 'FRENCH_TIP',
    accessory: 'NONE',
    trollEffect: null,
    isRoyal: false,
    skinTone: SKIN_TONES[2],
    completedAt: 4,
  },
  {
    id: 'hair_preset_5',
    nickname: 'Cool Balayage',
    service: 'HAIR',
    colorKey: 'blue',
    hasPastelShimmer: true,
    hairStyle: 'cool',
    nailShape: 'long',
    nailArtStyle: 'FRENCH_TIP',
    accessory: 'NONE',
    trollEffect: null,
    isRoyal: false,
    skinTone: SKIN_TONES[1],
    completedAt: 5,
  },
];

const DEFAULT_NAIL_SHOWCASE: readonly FinishedWorkItem[] = [
  {
    id: 'nail_preset_1',
    nickname: 'Rose French',
    service: 'NAIL',
    colorKey: 'shimmer_rose',
    hasPastelShimmer: true,
    hairStyle: 'curly',
    nailShape: 'almond',
    nailArtStyle: 'FRENCH_TIP',
    accessory: 'NONE',
    trollEffect: null,
    isRoyal: false,
    skinTone: SKIN_TONES[0],
    completedAt: 1,
  },
  {
    id: 'nail_preset_2',
    nickname: 'Mint Daisy',
    service: 'NAIL',
    colorKey: 'pastel_mint',
    hasPastelShimmer: true,
    hairStyle: 'long',
    nailShape: 'oval',
    nailArtStyle: 'FLORAL',
    accessory: 'NONE',
    trollEffect: null,
    isRoyal: false,
    skinTone: SKIN_TONES[1],
    completedAt: 2,
  },
  {
    id: 'nail_preset_3',
    nickname: 'Crystal Glow',
    service: 'NAIL',
    colorKey: 'gold',
    hasPastelShimmer: true,
    hairStyle: 'bob',
    nailShape: 'long',
    nailArtStyle: 'STARS',
    accessory: 'ROYAL_CROWN',
    trollEffect: null,
    isRoyal: false,
    skinTone: SKIN_TONES[0],
    completedAt: 3,
  },
  {
    id: 'nail_preset_4',
    nickname: 'Peach Glitter',
    service: 'NAIL',
    colorKey: 'pastel_peach',
    hasPastelShimmer: true,
    hairStyle: 'short',
    nailShape: 'square',
    nailArtStyle: 'FRENCH_TIP',
    accessory: 'NONE',
    trollEffect: null,
    isRoyal: false,
    skinTone: SKIN_TONES[2],
    completedAt: 4,
  },
];

const MiniWorkIllustration: React.FC<{ item: FinishedWorkItem }> = ({ item }) => {
  const swatch = COLOR_SWATCHES[item.colorKey];

  if (item.service === 'NAIL') {
    return (
      <svg viewBox="0 0 64 44" className="w-full h-9">
        {/* Soft velvet manicure pillow */}
        <rect
          x="5"
          y="29"
          width="54"
          height="11"
          rx="5.5"
          fill="#FAD2E0"
          stroke="#3A2825"
          strokeWidth="2"
        />
        {/* 5 Completed Painted Fingertips */}
        {[12, 22, 32, 42, 52].map((x, idx) => {
          const fingerY = idx === 2 ? 12 : idx === 1 || idx === 3 ? 14 : 17;
          const nailY = fingerY - 3;
          return (
            <g key={x}>
              <rect
                x={x - 3.6}
                y={fingerY}
                width="7.2"
                height="18"
                rx="3.6"
                fill={item.skinTone}
                stroke="#3A2825"
                strokeWidth="1.8"
              />
              <rect
                x={x - 3.2}
                y={nailY}
                width="6.4"
                height="9.5"
                rx="3"
                fill={swatch.hex}
                stroke="#3A2825"
                strokeWidth="1.6"
              />
              {/* French tip white smile curve */}
              <path
                d={`M ${x - 3} ${nailY + 2.5} Q ${x} ${nailY + 4} ${x + 3} ${nailY + 2.5}`}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="1.3"
              />
              {/* Accent flower / star / crystal on middle finger */}
              {idx === 2 && item.nailArtStyle === 'FLORAL' && (
                <circle cx={x} cy={nailY + 5.5} r="2" fill="#FFF5B8" stroke="#3A2825" strokeWidth="0.9" />
              )}
              {idx === 2 && (item.nailArtStyle === 'STARS' || item.isRoyal) && (
                <polygon
                  points={`${x},${nailY + 2.5} ${x + 2.2},${nailY + 5.2} ${x},${nailY + 8} ${x - 2.2},${nailY + 5.2}`}
                  fill="#FFF0A6"
                  stroke="#3A2825"
                  strokeWidth="0.9"
                />
              )}
            </g>
          );
        })}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 46" className="w-full h-9">
      {item.hairStyle === 'long' && (
        <rect
          x="15"
          y="14"
          width="34"
          height="28"
          rx="12"
          fill={swatch.hex}
          stroke="#3A2825"
          strokeWidth="2.2"
        />
      )}
      {item.hairStyle === 'bob' && (
        <circle cx="32" cy="25" r="17" fill={swatch.hex} stroke="#3A2825" strokeWidth="2.2" />
      )}
      {item.hairStyle === 'curly' && (
        <>
          <circle cx="19" cy="22" r="8" fill={swatch.hex} stroke="#3A2825" strokeWidth="2" />
          <circle cx="45" cy="22" r="8" fill={swatch.hex} stroke="#3A2825" strokeWidth="2" />
          <circle cx="24" cy="14" r="8" fill={swatch.hex} stroke="#3A2825" strokeWidth="2" />
          <circle cx="40" cy="14" r="8" fill={swatch.hex} stroke="#3A2825" strokeWidth="2" />
        </>
      )}

      <circle cx="32" cy="26" r="12.5" fill={item.skinTone} stroke="#3A2825" strokeWidth="2.2" />

      {item.hairStyle === 'cool' ? (
        <path
          d="M18 23 L16 12 L25 15 L31 7 L36 14 L45 9 L46 22 Q32 16 18 23 Z"
          fill={swatch.hex}
          stroke="#3A2825"
          strokeWidth="2"
        />
      ) : (
        <path
          d="M19 24 A13.5 13.5 0 0 1 45 24 L45 19 Q32 13 19 19 Z"
          fill={swatch.hex}
          stroke="#3A2825"
          strokeWidth="2"
        />
      )}

      <circle cx="27.5" cy="26.5" r="1.6" fill="#3A2825" />
      <circle cx="36.5" cy="26.5" r="1.6" fill="#3A2825" />
      <path
        d="M28.5 31 Q32 34 35.5 31"
        stroke="#3A2825"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
      />

      {item.isRoyal && (
        <path
          d="M25 12 L23 5 L28 9 L32 3 L36 9 L41 5 L39 12 Z"
          fill="#FFD56B"
          stroke="#3A2825"
          strokeWidth="1.6"
        />
      )}
    </svg>
  );
};

function getConciseCardLabel(item: FinishedWorkItem): string {
  if (item.service === 'NAIL') {
    return NAIL_SHAPE_LABELS[item.nailShape];
  }
  const raw = item.nickname.trim();
  if (raw.length <= 14) return raw;
  return HAIR_STYLE_LABELS[item.hairStyle];
}

export const TopSignAndWall: React.FC = () => {
  const language = useSalonStore((s) => s.config.language);
  const activeService = useSalonStore((s) => s.activeService);
  const todayCount = useSalonStore((s) => s.todayCount);
  const watchingCount = useSalonStore((s) => s.watchingCount);
  const finishedWall = useSalonStore((s) => s.finishedWall);
  const royalTopPin = useSalonStore((s) => s.royalTopPin);

  const t = SALON_I18N[language];
  const maxWallCards = activeService === 'NAIL' ? 4 : 5;

  // Mode-matched cards: 4 spacious cards in NAIL mode, 5 in HAIR mode
  const wallCards: Array<{ item: FinishedWorkItem; isPinnedRoyal: boolean }> = [];
  if (royalTopPin && royalTopPin.service === activeService) {
    wallCards.push({ item: royalTopPin, isPinnedRoyal: true });
  }
  for (const work of finishedWall) {
    if (work.service !== activeService) continue;
    if (royalTopPin && work.id === royalTopPin.id) continue;
    if (wallCards.length >= maxWallCards) break;
    wallCards.push({ item: work, isPinnedRoyal: false });
  }

  const fallbackList =
    activeService === 'NAIL' ? DEFAULT_NAIL_SHOWCASE : DEFAULT_HAIR_SHOWCASE;
  for (const presetItem of fallbackList) {
    if (wallCards.length >= maxWallCards) break;
    if (wallCards.some((c) => c.item.id === presetItem.id)) continue;
    wallCards.push({ item: presetItem, isPinnedRoyal: false });
  }

  const boardTitle = activeService === 'NAIL' ? t.wallTitleNail : t.wallTitle;
  const cardWidthClass = activeService === 'NAIL' ? 'w-[152px]' : 'w-[126px]';
  const rowGapClass = activeService === 'NAIL' ? 'gap-4' : 'gap-2';

  return (
    <header className="absolute top-0 left-0 w-full h-[214px] px-4 pt-2.5 pointer-events-none z-20">
      {/* Row 1: Pastel Cartoon Signboard & Mode-Synced Board Title */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="cartoon-card bg-[#FFFDF9] rounded-[22px] px-3.5 py-1.5 flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#FFD4E2] border-[3px] border-[#3A2825] flex items-center justify-center shrink-0">
            {activeService === 'HAIR' ? (
              <Scissors className="w-5 h-5 text-[#3A2825]" strokeWidth={2.6} />
            ) : (
              <Sparkles className="w-5 h-5 text-[#3A2825]" strokeWidth={2.6} />
            )}
          </div>
          <div>
            <div className="font-display font-bold text-[20px] leading-tight text-[#3A2825] tracking-wide">
              {t.signTitle}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10.5px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#C9F2E3] border-2 border-[#3A2825] text-[#3A2825]">
                {activeService === 'HAIR' ? t.modeHair : t.modeNail}
              </span>
              <span className="text-[11px] font-extrabold text-[#7D6059] flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {watchingCount}
              </span>
            </div>
          </div>
        </div>

        {/* Center Section Pill: "BẢNG MẪU TÓC" in HAIR mode, "BẢNG MẪU NAIL" in NAIL mode */}
        <div className="cartoon-pill bg-[#FFFDF9] rounded-full px-3.5 py-1 text-[12px] font-display font-extrabold text-[#3A2825] tracking-wide uppercase">
          ✨ {boardTitle} ✨
        </div>

        {/* Today Counter Badge */}
        <div className="cartoon-card bg-[#FFE5B4] rounded-[20px] px-3.5 py-1.5 text-center min-w-[114px]">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#7D6059]">
            {t.todayLabel}
          </div>
          <div className="font-display font-bold text-[24px] leading-none text-[#3A2825]">
            {todayCount}
          </div>
        </div>
      </div>

      {/* Row 2: Mode-Synced Clothesline Cards (zero '...' truncation, well above mirror/station) */}
      <div className="relative mt-2 h-[104px]">
        <svg viewBox="0 0 688 18" className="w-full h-4 overflow-visible">
          <path
            d="M 4 4 Q 344 16 684 4"
            fill="none"
            stroke="#3A2825"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
        </svg>

        <div className={`absolute inset-x-1 top-1.5 flex items-start justify-between ${rowGapClass}`}>
          {wallCards.map(({ item, isPinnedRoyal }, idx) => {
            const cardBg = isPinnedRoyal
              ? 'bg-[#FFF3BF] border-[#D98C00]'
              : 'bg-[#FFFDF9]';
            const cardLabel = getConciseCardLabel(item);
            const badgeLetter = (cardLabel.trim()[0] || 'S').toUpperCase();

            return (
              <div
                key={item.id}
                style={{ animationDelay: `${idx * 0.45}s` }}
                className={`relative ${cardWidthClass} rounded-[15px] p-1.5 border-[3px] border-[#3A2825] shadow-[0_3px_0_#3A2825] ${cardBg}`}
              >
                {/* Wooden clothespin */}
                <div className="w-3.5 h-3 rounded-sm bg-[#E7BC91] border-2 border-[#3A2825] mx-auto -mt-2.5 mb-0.5" />

                {isPinnedRoyal && (
                  <div className="absolute top-1 right-1 z-10 bg-[#FFD56B] border-[1.5px] border-[#3A2825] rounded-full px-1.5 py-0.5 flex items-center gap-0.5 text-[8px] font-black text-[#3A2825] shadow-sm">
                    <Crown className="w-2.5 h-2.5" />
                    {t.vipTopPinLabel}
                  </div>
                )}

                <div className="bg-[#FFF7EE] rounded-lg border-2 border-[#3A2825]/20 px-1">
                  <MiniWorkIllustration item={item} />
                </div>

                {/* Concise 1-line Label without '...' truncation */}
                <div className="mt-1 flex items-center justify-center gap-1 px-0.5">
                  <div
                    style={{
                      backgroundColor: getDeterministicAvatarColor(cardLabel),
                    }}
                    className="w-3.5 h-3.5 rounded-full border border-[#3A2825] flex items-center justify-center text-[8px] font-black text-[#3A2825] shrink-0"
                  >
                    {badgeLetter}
                  </div>
                  <span className="text-[10.5px] font-extrabold text-[#3A2825] leading-tight whitespace-nowrap">
                    {cardLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};
