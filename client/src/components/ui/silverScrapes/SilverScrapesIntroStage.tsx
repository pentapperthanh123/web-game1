import React from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Swords, ShieldAlert, Sparkles, Zap } from 'lucide-react';
import { DuelFighter } from '../../../types/game';
import { TeamColorPalette } from '../../../constants/teams';

interface SilverScrapesIntroStageProps {
  leftFighter: DuelFighter;
  rightFighter: DuelFighter;
  leftTeamTag: string;
  rightTeamTag: string;
  leftTheme: TeamColorPalette;
  rightTheme: TeamColorPalette;
  introRemaining: number;
  onSkip: () => void;
}

export const SilverScrapesIntroStage: React.FC<SilverScrapesIntroStageProps> = React.memo(
  ({
    leftFighter,
    rightFighter,
    leftTeamTag,
    rightTeamTag,
    leftTheme,
    rightTheme,
    introRemaining,
    onSkip,
  }) => {
    const { t } = useTranslation();

    const displayCount = Math.max(1, introRemaining);

    return (
      <div className="relative z-20 w-full max-w-xl mx-auto flex flex-col items-center gap-4 sm:gap-5 px-3 py-6 my-auto animate-in fade-in zoom-in-95 duration-300">
        {/* 1. Decider Status Pill & Hazard Alert */}
        <div className="flex flex-col items-center gap-1.5 text-center">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 text-[11px] sm:text-xs font-black tracking-widest uppercase shadow-[0_0_20px_rgba(245,158,11,0.25)] animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {t('SilverScrapes.introBadge', '⚡ TỶ SỐ CÂN BẰNG • VÁN ĐẤU QUYẾT ĐỊNH ⚡')}
            </span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          </div>

          {/* Grand Esports Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black italic tracking-wider uppercase bg-gradient-to-b from-white via-amber-200 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_4px_16px_rgba(245,158,11,0.5)] select-none">
            {t('SilverScrapes.introTitle', 'SILVER SCRAPES')}
          </h1>

          <p className="text-xs sm:text-sm font-black tracking-[0.25em] text-cyan-300 uppercase drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]">
            {t('SilverScrapes.introSubtitle', 'ĐẠI CHIẾN ĐỘC TÔN 1V1')}
          </p>
        </div>

        {/* 2. Fighters Clash Stage (Left vs Right) */}
        <div className="w-full grid grid-cols-11 items-center gap-2 sm:gap-4 my-2">
          {/* Left Fighter Card */}
          <div
            style={{
              borderColor: `${leftTheme.primaryHex}88`,
              boxShadow: `0 0 28px ${leftTheme.primaryHex}33`,
            }}
            className="col-span-5 rounded-2xl p-3 sm:p-4 bg-slate-900/90 border-2 backdrop-blur-md flex flex-col items-center text-center relative overflow-hidden group"
          >
            <div
              style={{
                background: `radial-gradient(circle at 50% 20%, ${leftTheme.primaryHex}44, transparent 75%)`,
              }}
              className="absolute inset-0 pointer-events-none"
            />
            {/* Team Tag Badge */}
            <span
              style={{ backgroundColor: `${leftTheme.primaryHex}33`, color: leftTheme.primaryHex }}
              className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border border-current mb-2"
            >
              {leftTeamTag}
            </span>

            {/* Fighter Avatar */}
            <div
              style={{ borderColor: leftTheme.primaryHex }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 overflow-hidden shadow-lg relative mb-2 bg-slate-950"
            >
              {leftFighter.avatarUrl ? (
                <img
                  src={leftFighter.avatarUrl}
                  alt={leftFighter.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-slate-400">
                  {leftFighter.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Fighter Name & Champion */}
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wide truncate max-w-full">
              {leftFighter.name}
            </h3>
            <p className="text-[11px] sm:text-xs font-bold text-amber-300/90 flex items-center gap-1 mt-0.5">
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{leftFighter.champion}</span>
            </p>
          </div>

          {/* VS Clash Emblem */}
          <div className="col-span-1 flex flex-col items-center justify-center">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-950 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center justify-center relative">
              <span className="text-xs sm:text-sm font-black italic text-amber-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.8)]">
                VS
              </span>
            </div>
          </div>

          {/* Right Fighter Card */}
          <div
            style={{
              borderColor: `${rightTheme.primaryHex}88`,
              boxShadow: `0 0 28px ${rightTheme.primaryHex}33`,
            }}
            className="col-span-5 rounded-2xl p-3 sm:p-4 bg-slate-900/90 border-2 backdrop-blur-md flex flex-col items-center text-center relative overflow-hidden group"
          >
            <div
              style={{
                background: `radial-gradient(circle at 50% 20%, ${rightTheme.primaryHex}44, transparent 75%)`,
              }}
              className="absolute inset-0 pointer-events-none"
            />
            {/* Team Tag Badge */}
            <span
              style={{ backgroundColor: `${rightTheme.primaryHex}33`, color: rightTheme.primaryHex }}
              className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase border border-current mb-2"
            >
              {rightTeamTag}
            </span>

            {/* Fighter Avatar */}
            <div
              style={{ borderColor: rightTheme.primaryHex }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 overflow-hidden shadow-lg relative mb-2 bg-slate-950"
            >
              {rightFighter.avatarUrl ? (
                <img
                  src={rightFighter.avatarUrl}
                  alt={rightFighter.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-slate-400">
                  {rightFighter.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Fighter Name & Champion */}
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wide truncate max-w-full">
              {rightFighter.name}
            </h3>
            <p className="text-[11px] sm:text-xs font-bold text-amber-300/90 flex items-center gap-1 mt-0.5">
              <Zap className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{rightFighter.champion}</span>
            </p>
          </div>
        </div>

        {/* 3. Countdown & Battle Commences Pill */}
        <div className="flex flex-col items-center gap-2 text-center w-full max-w-md">
          <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-amber-500/20 border-2 border-amber-400/60 shadow-[0_0_24px_rgba(245,158,11,0.35)] flex items-center space-x-2">
            <Swords className="w-5 h-5 text-amber-400 animate-bounce shrink-0" />
            <span className="text-sm sm:text-base font-black tracking-wide text-white uppercase">
              {t('SilverScrapes.introCountdown', 'ĐẠI CHIẾN BẮT ĐẦU SAU {{count}}S', {
                count: displayCount,
              })}
            </span>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-300/80 font-medium leading-relaxed px-4">
            {t(
              'SilverScrapes.introTip',
              'Chuẩn bị Thả Tim, Gõ Chat & Tặng Quà để nạp năng lượng đẩy lùi đối thủ!'
            )}
          </p>
        </div>

        {/* 4. Skip / Enter Battle Early Button */}
        <button
          type="button"
          onClick={onSkip}
          className="mt-1 px-4 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-xs font-bold text-slate-300 hover:text-white border border-slate-700/80 hover:border-amber-400/50 transition-colors shadow-lg flex items-center space-x-1.5 active:scale-95 cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span>{t('SilverScrapes.introBattleNow', 'VÀO TRẬN NGAY')}</span>
        </button>
      </div>
    );
  }
);

SilverScrapesIntroStage.displayName = 'SilverScrapesIntroStage';
