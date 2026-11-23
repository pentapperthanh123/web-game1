import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mic, Skull, Gift, Headphones } from 'lucide-react';
import { CASTER_PRIORITY, CASTER_SPEAKER, CASTER_VOICE, CasterSpeaker } from '../../constants/caster';
import { getThemeConfig, GameThemeType } from '../../constants/game';
import { useCasterStore, CasterSubtitle as CasterSubtitleType, CasterSubtitleTurn } from '../../store/casterStore';
import { useGameStore } from '../../store/gameStore';

const BOX_STYLE = {
  BOSS: 'border-rose-500/80 text-rose-100',
  HIGHLIGHT: 'border-amber-300/80 text-amber-100',
  DEFAULT: 'border-cyan-300/50 text-white',
  DONATE: 'border-2 border-amber-300/90 bg-slate-950/95 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.65)]',
} as const;

/** Each caster has a colour, so viewers can tell who is talking even while reading. */
const SPEAKER_STYLE: Readonly<Record<CasterSpeaker, { label: string; Icon: typeof Mic; fallbackName: string }>> = {
  [CASTER_SPEAKER.A]: { label: 'text-cyan-300', Icon: Mic, fallbackName: 'Bảo' },
  [CASTER_SPEAKER.B]: { label: 'text-amber-300', Icon: Headphones, fallbackName: 'Anna' },
};
const BOSS_LABEL_CLASS = 'text-rose-400';

const useSpeakerName = (speaker: CasterSpeaker): string => {
  const { t } = useTranslation();
  return t(`Caster.casters.${speaker}.name`, SPEAKER_STYLE[speaker].fallbackName);
};

/** The turn said just before, dimmed: the reply only lands when the viewer can see what it answers. */
const PreviousTurnLine: React.FC<{ turn: CasterSubtitleTurn }> = ({ turn }) => {
  const name = useSpeakerName(turn.speaker);
  return (
    <p className="text-[9.5px] sm:text-[10px] font-semibold leading-snug text-slate-400/80 line-clamp-1">
      <span className={`font-black mr-1 ${SPEAKER_STYLE[turn.speaker].label} opacity-70`}>{name}:</span>
      {turn.text}
    </p>
  );
};

interface SubtitlePillProps {
  item: CasterSubtitleType;
  gameTheme: GameThemeType;
  isDonate?: boolean;
}

const resolveBoxStyle = (item: CasterSubtitleType, isDonate: boolean): string => {
  if (isDonate) return BOX_STYLE.DONATE;
  if (item.voice === CASTER_VOICE.BOSS) return BOX_STYLE.BOSS;
  if (item.priority <= CASTER_PRIORITY.P2) return BOX_STYLE.HIGHLIGHT;
  return BOX_STYLE.DEFAULT;
};

const SubtitlePill: React.FC<SubtitlePillProps> = ({ item, gameTheme, isDonate = false }) => {
  const isBoss = item.voice === CASTER_VOICE.BOSS;
  const speaker = item.speaker ?? CASTER_SPEAKER.A;
  const speakerName = useSpeakerName(speaker);
  const speakerStyle = SPEAKER_STYLE[speaker];

  const speakerLabel = isBoss ? getThemeConfig(gameTheme).bossName : speakerName;
  const labelClass = isBoss ? BOSS_LABEL_CLASS : speakerStyle.label;
  const SpeakerIcon = isBoss ? Skull : isDonate ? Gift : speakerStyle.Icon;

  return (
    <div
      key={item.id}
      className={`flex items-start gap-1.5 px-3 py-1.5 rounded-xl border shadow-lg ${resolveBoxStyle(item, isDonate)}`}
    >
      <SpeakerIcon
        className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${labelClass} ${isDonate ? 'animate-bounce' : ''}`}
        aria-hidden="true"
      />
      <div className="min-w-0">
        {item.previousTurn && <PreviousTurnLine turn={item.previousTurn} />}
        <p className="text-[11px] sm:text-xs font-bold leading-snug">
          <span className={`font-black mr-1 ${labelClass}`}>{speakerLabel}:</span>
          {item.text}
        </p>
      </div>
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
