import React from 'react';
import { GAME_THEME, GameThemeType } from '../../constants/game';

interface BossEntranceBreathVFXProps {
  isActive: boolean;
  gameTheme: GameThemeType;
}

interface DragonMouthSpec {
  anchorClass: string;
  facesRight: boolean;
  coreColor: string;
  midColor: string;
  outerColor: string;
}

const DRAGON_MOUTH_SPECS: Partial<Record<GameThemeType, DragonMouthSpec>> = {
  [GAME_THEME.RONG_NUI]: {
    anchorClass: 'left-[36%] top-[44%]',
    facesRight: false,
    coreColor: '#ffffff',
    midColor: '#fde047',
    outerColor: '#ea580c',
  },
  [GAME_THEME.RONG_GIA]: {
    anchorClass: 'left-[48%] top-[33%]',
    facesRight: false,
    coreColor: '#ffffff',
    midColor: '#fde047',
    outerColor: '#f97316',
  },
  [GAME_THEME.ELDER_DRAGON]: {
    anchorClass: 'left-[55%] top-[33%]',
    facesRight: true,
    coreColor: '#ffffff',
    midColor: '#67e8f9',
    outerColor: '#0284c7',
  },
};

const EMBER_OFFSETS = [
  { delay: '0s', top: '26%', size: 'w-2 h-2' },
  { delay: '0.1s', top: '44%', size: 'w-2.5 h-2.5' },
  { delay: '0.22s', top: '62%', size: 'w-1.5 h-1.5' },
  { delay: '0.32s', top: '34%', size: 'w-2 h-2' },
  { delay: '0.44s', top: '54%', size: 'w-2.5 h-2.5' },
  { delay: '0.56s', top: '48%', size: 'w-1.5 h-1.5' },
] as const;

export const BossEntranceBreathVFX: React.FC<BossEntranceBreathVFXProps> = React.memo(
  ({ isActive, gameTheme }) => {
    const spec = DRAGON_MOUTH_SPECS[gameTheme];
    if (!isActive || !spec) return null;

    const gradId = `entrance-fire-${gameTheme}`;

    return (
      <div
        aria-hidden="true"
        style={{ transform: `translateY(-50%) scaleX(${spec.facesRight ? -1 : 1})` }}
        className={`absolute ${spec.anchorClass} pointer-events-none z-30`}
      >
        {/* Tapered Organic SVG Flame Jet emerging directly from the mouth */}
        <div className="relative -translate-x-full w-36 sm:w-44 h-20 sm:h-24 animate-boss-fire-breath mix-blend-screen">
          <svg
            viewBox="0 0 220 120"
            className="w-full h-full overflow-visible drop-shadow-[0_0_12px_rgba(249,115,22,0.75)]"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={`${gradId}-outer`} x1="100%" y1="50%" x2="0%" y2="50%">
                <stop offset="0%" stopColor={spec.coreColor} stopOpacity="1" />
                <stop offset="22%" stopColor={spec.midColor} stopOpacity="0.95" />
                <stop offset="58%" stopColor={spec.outerColor} stopOpacity="0.82" />
                <stop offset="100%" stopColor={spec.outerColor} stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`${gradId}-core`} x1="100%" y1="50%" x2="10%" y2="50%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                <stop offset="40%" stopColor={spec.midColor} stopOpacity="0.95" />
                <stop offset="100%" stopColor={spec.outerColor} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Outer jagged flame tongue silhouette (narrow at mouth x=216, fanning out to x=0) */}
            <path
              d="M216 60 C186 52, 148 34, 108 26 C74 19, 44 10, 8 18 C32 30, 14 44, 4 58 C24 66, 8 82, 16 98 C50 96, 84 86, 120 78 C158 70, 188 66, 216 60 Z"
              fill={`url(#${gradId}-outer)`}
            />

            {/* Secondary licking flame wisps */}
            <path
              d="M214 60 C176 48, 132 38, 76 34 C46 32, 28 40, 18 52 C44 54, 40 66, 20 74 C52 78, 114 74, 214 60 Z"
              fill={`url(#${gradId}-core)`}
              opacity="0.92"
            />
          </svg>

          {/* Concentrated white-hot nozzle flare right at the mouth */}
          <div
            style={{ boxShadow: `0 0 18px ${spec.outerColor}` }}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white blur-[1.5px]"
          />
        </div>

        {/* Flying Fire Embers spraying outward */}
        {EMBER_OFFSETS.map((ember, idx) => (
          <span
            key={idx}
            style={{
              top: ember.top,
              animationDelay: ember.delay,
              backgroundColor: spec.midColor,
              boxShadow: `0 0 8px ${spec.outerColor}`,
            }}
            className={`absolute right-0 rounded-full animate-boss-fire-ember ${ember.size}`}
          />
        ))}
      </div>
    );
  }
);

BossEntranceBreathVFX.displayName = 'BossEntranceBreathVFX';
