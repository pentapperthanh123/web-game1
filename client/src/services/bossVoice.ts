import { BossVoiceKind, getBossVoicePack, SfxEventName, SFX_EVENT } from '../constants/sfx';
import { GameThemeType } from '../constants/game';
import { playSound, stopSound } from './soundManager';
import { useGameStore } from '../store/gameStore';
import { isCurrentRoundIntroActive } from '../store/roundIntroStore';

const ALL_BOSS_VOICE_EVENTS: readonly SfxEventName[] = [
  SFX_EVENT.BOSS_ROAR,
  SFX_EVENT.BOSS_ENRAGE,
  SFX_EVENT.BOSS_ROAR_HERALD,
  SFX_EVENT.BOSS_ENRAGE_HERALD,
  SFX_EVENT.BOSS_ROAR_MOUNTAIN,
  SFX_EVENT.BOSS_ENRAGE_MOUNTAIN,
  SFX_EVENT.BOSS_ROAR_STORM,
  SFX_EVENT.BOSS_ENRAGE_STORM,
  SFX_EVENT.BOSS_ROAR_ELDER,
  SFX_EVENT.BOSS_ENRAGE_ELDER,
  SFX_EVENT.BOSS_ROAR_VOID,
  SFX_EVENT.BOSS_ENRAGE_VOID,
];

/** Stops any currently playing boss roar or enrage scream. */
export const stopAllBossVoices = (): void => {
  ALL_BOSS_VOICE_EVENTS.forEach((eventName) => {
    stopSound(eventName);
  });
};

/** Plays the given boss's own roar / enrage scream at the rate tuned for that boss. */
export const playBossVoice = (theme: GameThemeType, kind: BossVoiceKind): void => {
  // When Silver Scrapes duel or Round Intro is active, completely mute boss roar/enrage sounds
  if (useGameStore.getState().silverScrapesState.isActive || isCurrentRoundIntroActive()) return;

  const voicePack = getBossVoicePack(theme);
  playSound(voicePack.sounds[kind], { rateScale: voicePack.rateScale });
};
