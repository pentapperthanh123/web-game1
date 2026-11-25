import React from 'react';
import { Crown, Eye, Scissors, Sparkles } from 'lucide-react';
import { SALON_I18N } from '@shared/constants/i18n';
import { COLOR_SWATCHES } from '@shared/constants/presets';
import type { FinishedWorkItem } from '@shared/types/salon';
import { useSalonStore } from '../store/salonStore';

const MiniWorkIllustration: React.FC<{ item: FinishedWorkItem }> = ({ item }) => {
  const swatch = COLOR_SWATCHES[item.colorKey];

  if (item.service === 'NAIL') {
    const isCurled = item.trollEffect === 'SUPER_LONG_CURLED';
    return (
      <svg viewBox="0 0 64 50" className="w-full h-11">
        <rect x="6" y="34" width="52" height="12" rx="6" fill="#F9C3D5" stroke="#3A2825" strokeWidth="2.5" />
        {[16, 26, 36, 46].map((x, idx) => (
          <g key={x}>
            <rect
              x={x - 4}
              y={isCurled ? 8 : 16}
              width="8"
              height={isCurled ? 26 : 18}
              rx="4"
              fill={item.skinTone}
              stroke="#3A2825"
              strokeWidth="2"
            />
            <rect
              x={x - 3.5}
              y={isCurled ? 4 + (idx % 2) * 2 : 13}
              width="7"
              height={isCurled ? 15 : 9}
              rx="3"
              fill={swatch.hex}
              stroke="#3A2825"
              strokeWidth="1.8"
            />
          </g>
        ))}
        {item.trollEffect === 'FUNNY_CHARMS' && (
          <circle cx="32" cy="14" r="5" fill="#FF6B6B" stroke="#3A2825" strokeWidth="1.8" />
        )}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 52" className="w-full h-11">
      {/* Head */}
      <circle cx="32" cy="30" r="14" fill={item.skinTone} stroke="#3A2825" strokeWidth="2.4" />
      {/* Hair / Troll variant */}
      {item.trollEffect === 'BALD_STRIPE' ? (
        <>
          <circle cx="20" cy="24" r="7" fill={swatch.hex} stroke="#3A2825" strokeWidth="2" />
          <circle cx="44" cy="24" r="7" fill={swatch.hex} stroke="#3A2825" strokeWidth="2" />
          <rect x="27" y="14" width="10" height="10" rx="4" fill={item.skinTone} stroke="#3A2825" strokeWidth="2" />
        </>
      ) : item.trollEffect === 'BURNT_AFRO' ? (
        <>
          <circle cx="22" cy="18" r="9" fill="#332C30" stroke="#3A2825" strokeWidth="2" />
          <circle cx="32" cy="14" r="10" fill="#332C30" stroke="#3A2825" strokeWidth="2" />
          <circle cx="42" cy="18" r="9" fill="#332C30" stroke="#3A2825" strokeWidth="2" />
        </>
      ) : (
        <path
          d="M17 28 A15 15 0 0 1 47 28 L47 23 Q32 16 17 23 Z"
          fill={swatch.hex}
          stroke="#3A2825"
          strokeWidth="2.2"
        />
      )}
      {/* Eyes */}
      {item.trollEffect ? (
        <>
          <path d="M24 29 L28 31 L24 33 M40 29 L36 31 L40 33" stroke="#3A2825" strokeWidth="2" fill="none" />
          <circle cx="32" cy="37" r="2.5" fill="#FF8FA8" stroke="#3A2825" strokeWidth="1.5" />
        </>
      ) : (
        <>
          <circle cx="27" cy="30" r="1.8" fill="#3A2825" />
          <circle cx="37" cy="30" r="1.8" fill="#3A2825" />
          <path d="M28 35 Q32 39 36 35" stroke="#3A2825" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
      {item.isRoyal && (
        <path
          d="M24 14 L22 6 L28 10 L32 4 L36 10 L42 6 L40 14 Z"
          fill="#FFD56B"
          stroke="#3A2825"
          strokeWidth="1.8"
        />
      )}
    </svg>
  );
};

export const TopSignAndWall: React.FC = () => {
  const language = useSalonStore((s) => s.config.language);
  const activeService = useSalonStore((s) => s.activeService);
  const todayCount = useSalonStore((s) => s.todayCount);
  const watchingCount = useSalonStore((s) => s.watchingCount);
  const finishedWall = useSalonStore((s) => s.finishedWall);
  const royalTopPin = useSalonStore((s) => s.royalTopPin);

  const t = SALON_I18N[language];

  // Combine VIP Top 1 pin (if any) + latest works, max 5 cards total
  const wallCards: Array<{ item: FinishedWorkItem; isPinnedRoyal: boolean }> = [];
  if (royalTopPin) {
    wallCards.push({ item: royalTopPin, isPinnedRoyal: true });
  }
  for (const work of finishedWall) {
    if (royalTopPin && work.id === royalTopPin.id) continue;
    if (wallCards.length >= 5) break;
    wallCards.push({ item: work, isPinnedRoyal: false });
  }

  return (
    <header className="absolute top-0 left-0 w-full h-[230px] px-4 pt-3 pointer-events-none z-20">
      {/* Row 1: Pastel Cartoon Signboard */}
      <div className="flex items-center justify-between gap-3">
        <div className="cartoon-card bg-[#FFFDF9] rounded-[24px] px-4 py-2 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#FFD4E2] border-[3px] border-[#3A2825] flex items-center justify-center shrink-0">
            {activeService === 'HAIR' ? (
              <Scissors className="w-6 h-6 text-[#3A2825]" strokeWidth={2.6} />
            ) : (
              <Sparkles className="w-6 h-6 text-[#3A2825]" strokeWidth={2.6} />
            )}
          </div>
          <div>
            <div className="font-display font-bold text-[22px] leading-tight text-[#3A2825] tracking-wide">
              {t.signTitle}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#C9F2E3] border-2 border-[#3A2825] text-[#3A2825]">
                {activeService === 'HAIR' ? t.modeHair : t.modeNail}
              </span>
              <span className="text-[11px] font-extrabold text-[#7D6059] flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {watchingCount}
              </span>
            </div>
          </div>
        </div>

        {/* Today Counter Badge */}
        <div className="cartoon-card bg-[#FFE5B4] rounded-[22px] px-4 py-2 text-center min-w-[126px]">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#7D6059]">
            {t.todayLabel}
          </div>
          <div className="font-display font-bold text-[28px] leading-none text-[#3A2825]">
            {todayCount}
          </div>
        </div>
      </div>

      {/* Row 2: Clothesline Polaroid Gallery (y ~ 102 -> 224) */}
      <div className="relative mt-3 h-[116px]">
        {/* Curved twine string */}
        <svg viewBox="0 0 688 26" className="w-full h-6 overflow-visible">
          <path
            d="M 4 6 Q 344 26 684 6"
            fill="none"
            stroke="#3A2825"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute inset-x-1 top-2 flex items-start justify-between gap-2">
          {wallCards.length === 0 ? (
            <div className="mx-auto mt-6 cartoon-pill bg-[#FFFDF9]/90 rounded-full px-4 py-1 text-xs font-extrabold text-[#7D6059]">
              {t.wallEmpty}
            </div>
          ) : (
            wallCards.map(({ item, isPinnedRoyal }, idx) => {
              const tiltClass = idx % 2 === 0 ? '-rotate-2' : 'rotate-2';
              const isTroll = Boolean(item.trollEffect);
              const cardBg = isPinnedRoyal
                ? 'bg-[#FFF3BF] border-[#D98C00]'
                : isTroll
                  ? 'bg-[#FFE6E2]'
                  : 'bg-[#FFFDF9]';

              return (
                <div
                  key={item.id}
                  style={{ animationDelay: `${idx * 0.45}s` }}
                  className={`relative w-[124px] rounded-[16px] p-1.5 border-[3px] border-[#3A2825] shadow-[0_3px_0_#3A2825] animate-polaroid-sway ${tiltClass} ${cardBg}`}
                >
                  {/* Wooden clothespin */}
                  <div className="w-4 h-3.5 rounded-sm bg-[#E7BC91] border-2 border-[#3A2825] mx-auto -mt-3 mb-0.5" />

                  {isPinnedRoyal && (
                    <div className="absolute -top-2.5 -right-2 bg-[#FFD56B] border-2 border-[#3A2825] rounded-full px-1.5 py-0.5 flex items-center gap-0.5 text-[9px] font-black text-[#3A2825]">
                      <Crown className="w-2.5 h-2.5" />
                      {t.vipTopPinLabel}
                    </div>
                  )}

                  {isTroll && !isPinnedRoyal && (
                    <div className="absolute -top-2 -right-1.5 bg-[#FF8C7A] border-2 border-[#3A2825] rounded-full px-1.5 py-0.5 text-[9px] font-black text-white">
                      OOPS!
                    </div>
                  )}

                  <div className="bg-[#FFF7EE] rounded-lg border-2 border-[#3A2825]/25 px-1 pt-0.5">
                    <MiniWorkIllustration item={item} />
                  </div>
                  <div className="mt-1 text-center text-[11px] font-extrabold text-[#3A2825] truncate px-0.5">
                    {item.nickname}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </header>
  );
};
