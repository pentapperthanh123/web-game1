import React from 'react';
import { SkillVfx2DProps } from './skillVfxShared';

const SKILL_EMBER_PARTICLES = [
  { delay: '0s', top: '22%', size: 'w-2 h-2' },
  { delay: '0.1s', top: '42%', size: 'w-2.5 h-2.5' },
  { delay: '0.2s', top: '62%', size: 'w-2 h-2' },
  { delay: '0.3s', top: '32%', size: 'w-2.5 h-2.5' },
  { delay: '0.42s', top: '52%', size: 'w-2.5 h-2.5' },
  { delay: '0.54s', top: '68%', size: 'w-2 h-2' },
  { delay: '0.66s', top: '38%', size: 'w-2 h-2' },
  { delay: '0.78s', top: '56%', size: 'w-2 h-2' },
] as const;

/** Crisp organic Dragon Fire Breath jet spraying from the mouth into the targeted side zone. */
export const FireBreath2D: React.FC<SkillVfx2DProps> = React.memo(
  ({ color, secondaryColor, direction, nonce }) => {
    const flipScaleX = direction === 1 ? -1 : 1;
    const gradId = `skill-fire-${nonce}`;

    return (
      <div
        aria-hidden="true"
        style={{ transform: `scaleX(${flipScaleX})` }}
        className="absolute inset-0 pointer-events-none z-25 overflow-visible"
      >
        {/* Mouth origin near Dragon head */}
        <div className="absolute left-1/2 top-[38%] -translate-x-2 -translate-y-1/2">
          <div className="relative -translate-x-full w-44 sm:w-60 h-24 sm:h-28 animate-boss-fire-breath mix-blend-screen">
            <svg
              viewBox="0 0 240 120"
              className="w-full h-full overflow-visible drop-shadow-[0_0_14px_rgba(249,115,22,0.8)]"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id={`${gradId}-outer`} x1="100%" y1="50%" x2="0%" y2="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="22%" stopColor={secondaryColor} stopOpacity="0.96" />
                  <stop offset="58%" stopColor={color} stopOpacity="0.86" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
                <linearGradient id={`${gradId}-core`} x1="100%" y1="50%" x2="10%" y2="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                  <stop offset="40%" stopColor={secondaryColor} stopOpacity="0.95" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>

              <path
                d="M236 60 C202 52, 162 34, 118 24 C80 16, 46 8, 8 16 C34 28, 16 44, 4 58 C26 66, 10 84, 18 100 C54 98, 92 88, 132 78 C172 68, 206 65, 236 60 Z"
                fill={`url(#${gradId}-outer)`}
              />

              <path
                d="M234 60 C194 48, 144 38, 84 34 C50 32, 30 40, 18 52 C48 54, 42 66, 22 74 C56 78, 126 74, 234 60 Z"
                fill={`url(#${gradId}-core)`}
                opacity="0.94"
              />
            </svg>

            <div
              style={{ boxShadow: `0 0 20px ${color}` }}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/4 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white blur-[1.5px]"
            />
          </div>

          {SKILL_EMBER_PARTICLES.map((ember, idx) => (
            <span
              key={idx}
              style={{
                top: ember.top,
                animationDelay: ember.delay,
                backgroundColor: secondaryColor,
                boxShadow: `0 0 8px ${color}`,
              }}
              className={`absolute right-0 rounded-full animate-boss-fire-ember ${ember.size}`}
            />
          ))}
        </div>

        {/* Scorched Ground Burn Zone where the Fire Breath hits */}
        <div
          style={{
            background: `radial-gradient(ellipse at center, ${secondaryColor}99 0%, ${color}66 44%, transparent 78%)`,
          }}
          className="absolute top-[74%] -left-44 sm:-left-56 w-44 sm:w-56 h-16 sm:h-20 rounded-full blur-md mix-blend-screen animate-pulse"
        />
      </div>
    );
  }
);

FireBreath2D.displayName = 'FireBreath2D';
