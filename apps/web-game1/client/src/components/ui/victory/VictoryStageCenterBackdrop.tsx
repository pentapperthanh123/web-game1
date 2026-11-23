import React from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Trophy } from 'lucide-react';
import { TeamColorPalette, TeamProfile } from '../../../types/team';
import { TeamType } from '../../../constants/game';
import { TeamLogo } from '../../icons/TeamLogos';

interface VictoryStageCenterBackdropProps {
  winnerProfile: TeamProfile;
  winnerSlot: TeamType;
  winnerTheme: TeamColorPalette;
  isSeriesEnded: boolean;
  seriesFormat: string;
}

export const VictoryStageCenterBackdrop: React.FC<VictoryStageCenterBackdropProps> = React.memo(({
  winnerProfile,
  winnerSlot,
  winnerTheme,
  isSeriesEnded,
  seriesFormat,
}) => {
  const { t } = useTranslation();
  const teamTag = winnerProfile?.shortTag || winnerSlot;

  return (
    <div className="relative flex flex-col items-center justify-center pointer-events-none select-none my-auto py-2">
      {/* Symmetrical Hextech Tech Wings & Outer Halo */}
      <div className="relative flex items-center justify-center">
        {/* Left Wing Line */}
        <div className="hidden sm:block w-16 md:w-24 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-amber-300" />

        {/* Central Hextech Core Emblem Card */}
        <div
          style={{
            borderColor: winnerTheme.primaryHex,
            boxShadow: `0 0 35px ${winnerTheme.primaryHex}70, 0 8px 32px rgba(0,0,0,0.95), inset 0 0 20px ${winnerTheme.primaryHex}25`,
            background: 'linear-gradient(135deg, rgba(3, 7, 18, 0.95) 0%, rgba(15, 23, 42, 0.92) 50%, rgba(3, 7, 18, 0.95) 100%)',
          }}
          className="relative px-6 py-3 sm:px-8 sm:py-4 rounded-3xl border-2 shadow-2xl flex flex-col items-center max-w-[90vw] overflow-hidden"
        >
          {/* Subtle Accent Shimmer */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_10px_#fbbf24]" />

          {/* Large Team Icon & Slay Seal */}
          <div className="flex items-center gap-3">
            <div
              className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-950 border-2 flex items-center justify-center shadow-xl shrink-0"
              style={{
                borderColor: winnerTheme.primaryHex,
              }}
            >
              <TeamLogo
                teamProfile={winnerProfile}
                teamSlot={winnerSlot}
                className="w-9 h-9 sm:w-11 sm:h-11 object-contain"
              />
            </div>

            <div className="flex flex-col items-start leading-tight">
              <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-amber-300">
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                <span>
                  {isSeriesEnded
                    ? t('Victory.seriesChampionTitle', 'QUÁN QUÂN {{format}}', { format: seriesFormat })
                    : t('Victory.roundSecuredTitle', 'ĐOẠT BÙA LỢI & CHIẾN THẮNG')}
                </span>
              </div>

              <div className="text-base sm:text-lg md:text-xl font-black uppercase tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {teamTag} {t('Victory.slayDominance', 'CHIẾM ƯU THẾ TUYỆT ĐỐI')}
              </div>

              <div className="flex items-center gap-2 mt-0.5 text-[9.5px] sm:text-[10.5px] font-semibold text-slate-300">
                <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span>{t('Victory.moraleBuffDesc', 'Toàn đội hình nhận hào quang cổ vũ từ khán đài')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Wing Line */}
        <div className="hidden sm:block w-16 md:w-24 h-0.5 bg-gradient-to-l from-transparent via-amber-400/60 to-amber-300" />
      </div>
    </div>
  );
});

VictoryStageCenterBackdrop.displayName = 'VictoryStageCenterBackdrop';
