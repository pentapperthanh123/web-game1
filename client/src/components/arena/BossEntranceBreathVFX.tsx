import React from 'react';
import { GAME_THEME, GameThemeType } from '../../constants/game';

interface BossEntranceBreathVFXProps {
  isActive: boolean;
  gameTheme: GameThemeType;
  isSkillCast?: boolean;
  castKey?: number;
  overrideColor?: string;
  overrideSecondaryColor?: string;
}

export interface DragonMouthModelSpec {
  leftPercent: number;
  topPercent: number;
  nativeFacesRight: boolean;
  tiltDeg: number;
  coreColor: string;
  midColor: string;
  outerColor: string;
}

/** Exact mouth pixel anchors measured directly against each dragon sprite PNG. */
export const DRAGON_MOUTH_SPECS: Partial<Record<GameThemeType, DragonMouthModelSpec>> = {
  [GAME_THEME.RONG_NUI]: {
    leftPercent: 19.5,
    topPercent: 53.5,
    nativeFacesRight: false,
    tiltDeg: -8,
    coreColor: '#ffffff',
    midColor: '#fde047',
    outerColor: '#ea580c',
  },
  [GAME_THEME.ELDER_DRAGON]: {
    leftPercent: 58.5,
    topPercent: 31.0,
    nativeFacesRight: true,
    tiltDeg: -4,
    coreColor: '#ffffff',
    midColor: '#67e8f9',
    outerColor: '#0284c7',
  },
};

export const isDragonNativeFacingRight = (gameTheme: GameThemeType): boolean =>
  DRAGON_MOUTH_SPECS[gameTheme]?.nativeFacesRight ?? false;

const EMBER_OFFSETS = [
  { delay: '0s', top: '28%', size: 'w-2 h-2' },
  { delay: '0.1s', top: '46%', size: 'w-2.5 h-2.5' },
  { delay: '0.22s', top: '64%', size: 'w-1.5 h-1.5' },
  { delay: '0.32s', top: '36%', size: 'w-2 h-2' },
  { delay: '0.44s', top: '54%', size: 'w-2.5 h-2.5' },
  { delay: '0.56s', top: '48%', size: 'w-1.5 h-1.5' },
] as const;

export const BossEntranceBreathVFX: React.FC<BossEntranceBreathVFXProps> = React.memo(
  ({ isActive, gameTheme, isSkillCast = false, castKey = 0, overrideColor, overrideSecondaryColor }) => {
    const spec = DRAGON_MOUTH_SPECS[gameTheme];
    if (!isActive || !spec) return null;

    const midColor = overrideSecondaryColor || spec.midColor;
    const outerColor = overrideColor || spec.outerColor;
    const gradId = `dragon-mouth-fire-${gameTheme}-${isSkillCast ? castKey : 'entry'}`;
    const sizeClass = isSkillCast
      ? 'w-40 sm:w-52 h-20 sm:h-24'
      : 'w-32 sm:w-40 h-16 sm:h-20';

    return (
      <div
        key={`${gameTheme}-${isSkillCast ? castKey : 'entry'}`}
        aria-hidden="true"
        style={{
          left: `${spec.leftPercent}%`,
          top: `${spec.topPercent}%`,
          transform: `translateY(-50%) scaleX(${spec.nativeFacesRight ? -1 : 1}) rotate(${spec.tiltDeg}deg)`,
        }}
        className="absolute pointer-events-none z-30"
      >
        {/* Static -translate-x-full wrapper keeps nozzle right at the dragon's jaw */}
        <div className="-translate-x-full">
          <div className={`relative ${sizeClass} animate-boss-fire-breath mix-blend-screen`}>
            <svg
              viewBox="0 0 220 120"
              className="w-full h-full overflow-visible drop-shadow-[0_0_12px_rgba(249,115,22,0.75)]"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={`${gradId}-outer`} x1="100%" y1="50%" x2="0%" y2="50%">
                  <stop offset="0%" stopColor={spec.coreColor} stopOpacity="1" />
                  <stop offset="22%" stopColor={midColor} stopOpacity="0.95" />
                  <stop offset="58%" stopColor={outerColor} stopOpacity="0.82" />
                  <stop offset="100%" stopColor={outerColor} stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${gradId}-core`} x1="100%" y1="50%" x2="10%" y2="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="40%" stopColor={midColor} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={outerColor} stopOpacity="0" />
                </linearGradient>
              </defs>

              <path
                d="M216 60 C186 52, 148 34, 108 26 C74 19, 44 10, 8 18 C32 30, 14 44, 4 58 C24 66, 8 82, 16 98 C50 96, 84 86, 120 78 C158 70, 188 66, 216 60 Z"
                fill={`url(#${gradId}-outer)`}
              />

              <path
                d="M214 60 C176 48, 132 38, 76 34 C46 32, 28 40, 18 52 C44 54, 40 66, 20 74 C52 78, 114 74, 214 60 Z"
                fill={`url(#${gradId}-core)`}
                opacity="0.92"
              />
            </svg>

            <div
              style={{ boxShadow: `0 0 16px ${outerColor}` }}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded-full bg-white blur-[1.5px]"
            />
          </div>
        </div>

        {/* Flying Fire Embers spraying outward from jaw */}
        {EMBER_OFFSETS.map((ember, idx) => (
          <span
            key={idx}
            style={{
              top: ember.top,
              animationDelay: ember.delay,
              backgroundColor: midColor,
              boxShadow: `0 0 8px ${outerColor}`,
            }}
            className={`absolute right-0 rounded-full animate-boss-fire-ember ${ember.size}`}
          />
        ))}
      </div>
    );
  }
);

BossEntranceBreathVFX.displayName = 'BossEntranceBreathVFX';
