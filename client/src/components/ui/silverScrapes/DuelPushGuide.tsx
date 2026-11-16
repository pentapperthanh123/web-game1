import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { DUEL_PUSH_GUIDE, DUEL_PUSH_MAX_STRENGTH } from './silverScrapesShared';

const STRENGTH_STEPS = Array.from({ length: DUEL_PUSH_MAX_STRENGTH }, (_, index) => index + 1);

/** How viewers can push the clash, with a bar meter showing which interaction pushes hardest. */
export const DuelPushGuide = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full rounded-2xl border border-slate-700/70 bg-slate-900/70 px-3 pt-2 pb-2.5">
      <div className="mb-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        {t('SilverScrapes.guideTitle', 'Cách đẩy chưởng')}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {DUEL_PUSH_GUIDE.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex flex-col items-center gap-1 text-center">
              <div className="w-8 h-8 rounded-xl bg-slate-800/90 border border-slate-600/60 flex items-center justify-center">
                <Icon className="w-4 h-4 text-amber-300" />
              </div>
              <span className="text-[10px] font-bold leading-tight text-slate-200">{t(item.labelKey, item.labelFallback)}</span>
              <div className="flex gap-0.5">
                {STRENGTH_STEPS.map((step) => (
                  <span
                    key={step}
                    className={clsx('w-2 h-1 rounded-full', step <= item.strength ? 'bg-amber-400' : 'bg-slate-700')}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
