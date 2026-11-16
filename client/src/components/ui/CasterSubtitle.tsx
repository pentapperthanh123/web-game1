import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Skull } from 'lucide-react';
import { CASTER_PRIORITY, CASTER_VOICE } from '../../constants/caster';
import { getThemeConfig } from '../../constants/game';
import { useCasterStore } from '../../store/casterStore';
import { useGameStore } from '../../store/gameStore';

const STYLE = {
  BOSS: { box: 'border-rose-500/80 text-rose-100', label: 'text-rose-400', icon: 'text-rose-400' },
  HIGHLIGHT: { box: 'border-amber-300/80 text-amber-100', label: 'text-cyan-300', icon: 'text-cyan-300' },
  DEFAULT: { box: 'border-cyan-300/50 text-white', label: 'text-cyan-300', icon: 'text-cyan-300' },
} as const;

/** Caption of the line being spoken: the AI caster, or the boss in its own voice. */
export const CasterSubtitle = React.memo(() => {
  const { t } = useTranslation();
  const subtitle = useCasterStore((state) => state.subtitle);
  const gameTheme = useGameStore((state) => state.gameTheme);
  if (!subtitle) return null;

  const isBoss = subtitle.voice === CASTER_VOICE.BOSS;
  const isHighlight = subtitle.priority <= CASTER_PRIORITY.P2;
  let style: (typeof STYLE)[keyof typeof STYLE] = STYLE.DEFAULT;
  if (isBoss) style = STYLE.BOSS;
  else if (isHighlight) style = STYLE.HIGHLIGHT;
  const speakerLabel = isBoss ? getThemeConfig(gameTheme).bossName : t('Caster.subtitleLabel', 'BLV Bão');
  const SpeakerIcon = isBoss ? Skull : Mic;

  return (
    <div
      aria-live="polite"
      className="absolute left-1/2 -translate-x-1/2 bottom-[19%] z-[37] w-max max-w-[88%] pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      <div
        key={subtitle.id}
        className={`flex items-start gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/85 border shadow-lg ${style.box}`}
      >
        <SpeakerIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${style.icon}`} aria-hidden="true" />
        <p className="text-[11px] sm:text-xs font-bold leading-snug">
          <span className={`font-black mr-1 ${style.label}`}>{speakerLabel}:</span>
          {subtitle.text}
        </p>
      </div>
    </div>
  );
});

CasterSubtitle.displayName = 'CasterSubtitle';
