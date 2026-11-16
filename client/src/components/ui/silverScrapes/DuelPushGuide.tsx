import React from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Sparkles } from 'lucide-react';
import { DUEL_PUSH_GUIDE, DUEL_PUSH_MAX_STRENGTH } from './silverScrapesShared';

const STRENGTH_STEPS = Array.from({ length: DUEL_PUSH_MAX_STRENGTH }, (_, index) => index + 1);

/** Viewer action guide displaying interactions and their relative push power on the energy beam. */
export const DuelPushGuide: React.FC = React.memo(() => {
  const { t } = useTranslation();

  return (
    <div className="w-full rounded-2xl border border-slate-700/80 bg-slate-900/85 backdrop-blur-md px-3 pt-2.5 pb-3 shadow-xl">
      {/* Title */}
      <div className="mb-2.5 flex items-center justify-center gap-1.5 text-center text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-300">
        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
        <span>{t('SilverScrapes.guideTitle', 'CÁCH ĐẨY CHƯỞNG (QUYẾT ĐỊNH THẮNG THUA)')}</span>
        <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
      </div>

      {/* 4-Column Action Grid */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {DUEL_PUSH_GUIDE.map((item) => {
          const Icon = item.icon;
          const { theme } = item;

          return (
            <div
              key={item.key}
              className={clsx(
                'relative flex flex-col items-center gap-1 rounded-xl border p-1.5 text-center transition-transform duration-200 hover:scale-[1.02]',
                theme.cardBorder,
                theme.cardBg,
                theme.glowShadow
              )}
            >
              {/* Optional Mega Push Badge */}
              {item.badgeKey && (
                <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-[8px] font-black text-slate-950 uppercase tracking-tighter shadow-md">
                  {t(item.badgeKey, item.badgeFallback || 'SIÊU LỰC')}
                </span>
              )}

              {/* Icon Container */}
              <div
                className={clsx(
                  'w-8 h-8 rounded-xl border flex items-center justify-center shadow-inner mt-0.5',
                  theme.iconBg
                )}
              >
                <Icon className={clsx('w-4 h-4', theme.iconColor)} />
              </div>

              {/* Action Label */}
              <span className="text-[10px] font-bold leading-tight text-slate-200 line-clamp-1">
                {t(item.labelKey, item.labelFallback)}
              </span>

              {/* Power Multiplier Text */}
              <span className={clsx('text-[10px] font-mono font-black', theme.iconColor)}>
                {item.powerValue}
              </span>

              {/* Strength Meter Dots */}
              <div className="flex gap-0.5 mt-0.5">
                {STRENGTH_STEPS.map((step) => {
                  const isFilled = step <= item.strength;
                  return (
                    <span
                      key={step}
                      className={clsx(
                        'w-2 h-1 rounded-full transition-colors',
                        isFilled ? theme.meterFill : 'bg-slate-800'
                      )}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

DuelPushGuide.displayName = 'DuelPushGuide';

