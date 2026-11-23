import { SFX_EVENT, SfxEventName } from '../../constants/sfx';
import { playSound, soundManager, stopSound } from '../soundManager';

/**
 * Pre-round VS cinematic ("VÁN n • KHAI CHIẾN!") sound, built from recorded effects (bundled
 * Mixkit free-license files in public/sfx) instead of synthesis, which sounded thin and hissy.
 * Each file is started early by the time its own hit sits into the file, so that hit lands exactly
 * on the matching frame of the 3.5 s CSS animation.
 */

/** Visual cue times in seconds, from the keyframe percentages of the 3.5 s animation (index.css). */
export const CINEMATIC_VISUAL_CUES_S = {
  /** vsSlamBadge 27%: the cards collide (26%) and the VS crest lands. */
  VS_SLAM: 0.945,
  /** roundTitleRecoil 30%: "VÁN n • KHAI CHIẾN!" pops. */
  TITLE: 1.05,
} as const;

interface CinematicSoundCue {
  event: SfxEventName;
  /** Visual moment the sound's hit must land on. */
  alignToS: number;
  /** Where that hit sits inside the file (measured on the trimmed file). */
  hitInFileS: number;
}

/**
 * Fly-in whoosh that crashes into the VS slam, a sub-heavy impact under it for weight, then a war horn
 * and a stadium roar on the title. All four files end (with baked fades) before the 3.5 s mark.
 */
const CINEMATIC_SOUND_CUES: readonly CinematicSoundCue[] = [
  { event: SFX_EVENT.INTRO_FLY_IMPACT, alignToS: CINEMATIC_VISUAL_CUES_S.VS_SLAM, hitInFileS: 0.86 },
  { event: SFX_EVENT.INTRO_DEEP_IMPACT, alignToS: CINEMATIC_VISUAL_CUES_S.VS_SLAM, hitInFileS: 0.62 },
  { event: SFX_EVENT.INTRO_CROWD_ROAR, alignToS: CINEMATIC_VISUAL_CUES_S.TITLE, hitInFileS: 0.22 },
  { event: SFX_EVENT.INTRO_TITLE_HORN, alignToS: CINEMATIC_VISUAL_CUES_S.TITLE, hitInFileS: 0.04 },
];

const MS_PER_SECOND = 1000;
const CINEMATIC_EVENTS: readonly SfxEventName[] = CINEMATIC_SOUND_CUES.map((cue) => cue.event);

export interface CinematicScoreHandle {
  /** Stops every pending and playing layer (skip / unmount); safe to call more than once. */
  stop: () => void;
}

const toStartDelayMs = (cue: CinematicSoundCue): number =>
  Math.max(0, (cue.alignToS - cue.hitInFileS) * MS_PER_SECOND);

/** Loads the files ahead of the cinematic so the first cue (≈85 ms in) has no decode delay. */
export const preloadCinematicIntroScore = (): void => {
  soundManager.preload(CINEMATIC_EVENTS);
};

/** Plays the cinematic sound from now; the intro screen mutes combat audio, so cues bypass that mute. */
export const playCinematicIntroScore = (): CinematicScoreHandle => {
  const timers = CINEMATIC_SOUND_CUES.map((cue) =>
    window.setTimeout(() => playSound(cue.event, { bypassCombatMute: true }), toStartDelayMs(cue))
  );
  let isStopped = false;
  return {
    stop: () => {
      if (isStopped) return;
      isStopped = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      CINEMATIC_EVENTS.forEach((event) => stopSound(event));
    },
  };
};
