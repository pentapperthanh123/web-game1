import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Skull, Gift } from 'lucide-react';
import { CASTER_PRIORITY, CASTER_VOICE } from '../../constants/caster';
import { getThemeConfig, GameThemeType } from '../../constants/game';
import { useCasterStore, CasterSubtitle as CasterSubtitleType } from '../../store/casterStore';
import { useGameStore } from '../../store/gameStore';

const STYLE = {
  BOSS: { box: 'border-rose-500/80 text-rose-100', label: 'text-rose-400', icon: 'text-rose-400' },
  HIGHLIGHT: { box: 'border-amber-300/80 text-amber-100', label: 'text-cyan-300', icon: 'text-cyan-300' },
  DEFAULT: { box: 'border-cyan-300/50 text-white', label: 'text-cyan-300', icon: 'text-cyan-300' },
  DONATE: {
    box: 'border-2 border-amber-300/90 bg-slate-950/95 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.65)]',
    label: 'text-amber-300',
    icon: 'text-amber-300',
  },
} as const;

interface SubtitlePillProps {
  item: CasterSubtitleType;
  gameTheme: GameThemeType;
  isDonate?: boolean;
}

const SubtitlePill: React.FC<SubtitlePillProps> = ({ item, gameTheme, isDonate }) => {
  const { t } = useTranslation();
  const isBoss = item.voice === CASTER_VOICE.BOSS;
  const isHighlight = item.priority <= CASTER_PRIORITY.P2;

  let style: (typeof STYLE)[keyof typeof STYLE] = STYLE.DEFAULT;
  if (isDonate) {
    style = STYLE.DONATE;
  } else if (isBoss) {
    style = STYLE.BOSS;
  } else if (isHighlight) {
    style = STYLE.HIGHLIGHT;
  }

  const resolveSpeakerLabel = () => {
    if (isDonate) return t('Caster.donateLabel', 'Vinh Danh');
    if (isBoss) return getThemeConfig(gameTheme).bossName;
    return t('Caster.subtitleLabel', 'BLV Bão');
  };

  const speakerLabel = resolveSpeakerLabel();
  const SpeakerIcon = isDonate ? Gift : isBoss ? Skull : Mic;

  return (
    <div
      key={item.id}
      className={`flex items-start gap-1.5 px-3 py-1.5 rounded-xl border shadow-lg ${style.box}`}
    >
      <SpeakerIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${style.icon} ${isDonate ? 'animate-bounce' : ''}`} aria-hidden="true" />
      <p className="text-[11px] sm:text-xs font-bold leading-snug">
        <span className={`font-black mr-1 ${style.label}`}>{speakerLabel}:</span>
        {item.text}
      </p>
    </div>
  );
};

/** Caption of the line being spoken: commentary voice and parallel donate voice. */
export const CasterSubtitle = React.memo(() => {
  const subtitle = useCasterStore((state) => state.subtitle);
  const donateSubtitle = useCasterStore((state) => state.donateSubtitle);
  const gameTheme = useGameStore((state) => state.gameTheme);

  if (!subtitle && !donateSubtitle) return null;

  return (
    <div
      aria-live="polite"
      className="absolute left-1/2 -translate-x-1/2 bottom-[20%] z-[37] w-max max-w-[88%] pointer-events-none flex flex-col items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200"
    >
      {donateSubtitle && <SubtitlePill item={donateSubtitle} gameTheme={gameTheme} isDonate />}
      {subtitle && <SubtitlePill item={subtitle} gameTheme={gameTheme} />}
    </div>
  );
});

CasterSubtitle.displayName = 'CasterSubtitle';
