import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Zap } from 'lucide-react';
import { DUEL_PERCENT_CENTER, DUEL_PERCENT_MAX } from './silverScrapesShared';

const BEAM_CORE_HIGHLIGHT = '#ffffff';
const CLASH_ELECTRIC_ARC = {
  VIEW_BOX: '0 0 64 64',
  PATH: 'M32 2 L28 18 L36 16 L30 28 M32 62 L36 46 L28 48 L34 36 M2 32 L18 28 L16 36 L28 30 M62 32 L46 36 L48 28 L36 34',
  STROKE_COLOR: '#fde047',
  STROKE_WIDTH: 2.2,
} as const;

interface DuelTugBarProps {
  leftPercent: number;
  leftTag: string;
  rightTag: string;
  leftColor: string;
  rightColor: string;
  isClashFlashing: boolean;
}

/**
 * High-voltage Dragon Ball / Anime-style energy beam clash tug-of-war bar.
 * Dual plasma beams push against each other, colliding at a radiant center shockwave node.
 */
export const DuelTugBar: React.FC<DuelTugBarProps> = React.memo(
  ({ leftPercent, leftTag, rightTag, leftColor, rightColor, isClashFlashing }) => {
    const { t } = useTranslation();
    const rightPercent = DUEL_PERCENT_MAX - leftPercent;

    return (
      <div className="w-full flex flex-col gap-2.5">
        {/* Score & Prompt Header */}
        <div className="w-full flex items-center justify-between px-1">
          {/* Left Team Percentage */}
          <div className="flex items-baseline gap-1.5 font-mono">
            <span
              style={{ color: leftColor }}
              className="text-2xl sm:text-3xl font-black tabular-nums drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
            >
              {leftPercent.toFixed(1)}%
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-300 font-sans tracking-wide">
              {leftTag}
            </span>
          </div>

          {/* Central Call to Action Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-cyan-950/80 via-slate-900/90 to-amber-950/80 border border-amber-400/50 shadow-[0_0_14px_rgba(245,158,11,0.35)] animate-pulse">
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase text-amber-300 tracking-wider">
              {t('SilverScrapes.clashPrompt', 'Tap Tim & Donate Để Đẩy Chưởng')}
            </span>
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
          </div>

          {/* Right Team Percentage */}
          <div className="flex items-baseline gap-1.5 font-mono justify-end">
            <span className="text-xs sm:text-sm font-bold text-slate-300 font-sans tracking-wide">
              {rightTag}
            </span>
            <span
              style={{ color: rightColor }}
              className="text-2xl sm:text-3xl font-black tabular-nums drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
            >
              {rightPercent.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* High-Voltage Energy Beam Channel */}
        <div className="relative w-full h-11 sm:h-12">
          {/* Channel Frame */}
          <div className="absolute inset-0 rounded-full bg-slate-950 border-2 border-slate-700/90 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.95),0_0_20px_rgba(0,0,0,0.8)]">
            {/* Left Beam: Left Color -> Cyan -> Core White */}
            <div
              style={{
                transform: `scaleX(${leftPercent / DUEL_PERCENT_MAX})`,
                background: `linear-gradient(90deg, ${leftColor} 0%, #38bdf8 70%, ${BEAM_CORE_HIGHLIGHT} 100%)`,
              }}
              className="absolute inset-0 origin-left transition-transform duration-200 ease-out shadow-[0_0_20px_rgba(56,189,248,0.7)]"
            />

            {/* Right Beam: Right Color -> Amber -> Core White */}
            <div
              style={{
                transform: `scaleX(${rightPercent / DUEL_PERCENT_MAX})`,
                background: `linear-gradient(270deg, ${rightColor} 0%, #fbbf24 70%, ${BEAM_CORE_HIGHLIGHT} 100%)`,
              }}
              className="absolute inset-0 origin-right transition-transform duration-200 ease-out shadow-[0_0_20px_rgba(251,191,36,0.7)]"
            />

            {/* Longitudinal Light Core Reflection Line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/40 pointer-events-none blur-[0.5px]" />
          </div>

          {/* Radiating Clash Shockwave Node */}
          <div
            style={{ transform: `translateX(${leftPercent - DUEL_PERCENT_CENTER}%)` }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-200 ease-out"
          >
            {/* Outer Shockwave Ripple Ring */}
            <div
              className={clsx(
                'absolute w-12 h-12 rounded-full border-2 border-white/80 transition-transform duration-200',
                isClashFlashing ? 'scale-150 border-cyan-300 opacity-90 animate-ping' : 'scale-100 opacity-60'
              )}
            />

            {/* High-Voltage Electric Arc Sparks around Clash Node */}
            <svg
              viewBox={CLASH_ELECTRIC_ARC.VIEW_BOX}
              className={clsx(
                'absolute w-16 h-16 pointer-events-none animate-electric-arc',
                isClashFlashing ? 'scale-125 opacity-100' : 'scale-100 opacity-75'
              )}
              aria-hidden="true"
            >
              <path
                d={CLASH_ELECTRIC_ARC.PATH}
                stroke={CLASH_ELECTRIC_ARC.STROKE_COLOR}
                strokeWidth={CLASH_ELECTRIC_ARC.STROKE_WIDTH}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>

            {/* Main Clash Orb */}
            <div
              className={clsx(
                'relative w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white flex items-center justify-center transition-all duration-150',
                isClashFlashing
                  ? 'scale-135 shadow-[0_0_40px_#ffffff,0_0_70px_#38bdf8,0_0_90px_#f59e0b]'
                  : 'scale-100 shadow-[0_0_24px_#ffffff,0_0_40px_#f59e0b]'
              )}
            >
              {/* Inner Pulsing Plasma Core */}
              <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-white animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

DuelTugBar.displayName = 'DuelTugBar';

