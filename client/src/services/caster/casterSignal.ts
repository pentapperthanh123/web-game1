import {
  CASTER_DUEL_SIGNALS,
  CASTER_INTRO_SIGNALS,
  CASTER_SIGNAL_PRIORITY,
  CasterSignal,
  CasterVoice,
} from '../../constants/caster';
import { TeamType } from '../../constants/game';
import { useCasterStore } from '../../store/casterStore';
import { useGameStore } from '../../store/gameStore';
import { isCurrentRoundIntroActive } from '../../store/roundIntroStore';
import { CasterSlots, composeCasterLine, getAnonymousName } from './casterComposer';
import { casterQueue } from './presentationQueue';
import { resolveSpeechName } from './speechNameRegistry';

export const getTeamTag = (team: TeamType | null | undefined): string => {
  if (!team) return '';
  return useGameStore.getState().activeTeams[team]?.shortTag || team;
};

/** Spoken name of a viewer, or "a warrior of <team>" when the name may not be read. */
export const speakerFor = (displayName: string | null | undefined, team: TeamType | null | undefined): string =>
  resolveSpeechName(displayName) ?? getAnonymousName(getTeamTag(team));

export interface CasterSignalMeta {
  team?: TeamType;
  speakerName?: string;
  voice?: CasterVoice;
  ttlMs?: number;
  deadlineAt?: number;
}

/** During the duel only its own lines are said; during the intro card only the intro lines. */
const isSignalAllowedNow = (signal: CasterSignal): boolean => {
  const isDuelActive = useGameStore.getState().silverScrapesState.isActive;
  if (isDuelActive) return CASTER_DUEL_SIGNALS.has(signal);
  if (isCurrentRoundIntroActive()) return CASTER_INTRO_SIGNALS.has(signal);
  return true;
};

/** Composes and queues one caster line; silently skipped when the voice is off, the moment does not allow it, or a slot is missing. */
export const castCasterSignal = (signal: CasterSignal, slots: CasterSlots, meta: CasterSignalMeta = {}): void => {
  if (!useCasterStore.getState().isTtsEnabled) return;
  if (!isSignalAllowedNow(signal)) return;
  const text = composeCasterLine(signal, slots);
  if (!text) return;
  casterQueue.enqueue({
    signal,
    priority: CASTER_SIGNAL_PRIORITY[signal],
    text,
    createdAt: Date.now(),
    team: meta.team,
    teamTag: meta.team ? getTeamTag(meta.team) : undefined,
    speakerName: meta.speakerName,
    voice: meta.voice,
    ttlMs: meta.ttlMs,
    deadlineAt: meta.deadlineAt,
  });
};
