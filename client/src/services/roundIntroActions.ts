import { audioService } from './audioService';
import { casterSpeechEngine } from './caster/speechEngine';
import { casterQueue } from './caster/presentationQueue';
import { VoiceManager } from './caster/VoiceManager';
import {
  hideRoundIntro,
  isCurrentRoundIntroActive,
  playIntroCinematic,
  useRoundIntroStore,
} from '../store/roundIntroStore';
import { playSound } from './soundManager';
import { SFX_EVENT } from '../constants/sfx';
import { useGameStore } from '../store/gameStore';
import { triggerCombatDeployBanner } from '../store/combatDeployBannerStore';
import { syncAmbience } from './arenaAmbience';

/**
 * Triggers the immediate start of the round combat.
 * Cancels pending intro voice lines, hides the intro banner,
 * plays entry sound effects, triggers the esports 3D Xung Trận banner,
 * and pulses screen flash & shake.
 */
export const triggerStartRoundCombat = (): void => {
  const currentRound = useGameStore.getState().currentRound || 1;
  audioService.cancelSpeech();
  casterSpeechEngine.interrupt();
  casterQueue.clear();
  VoiceManager.stopAll();
  hideRoundIntro();
  audioService.setCombatMuted(false);
  syncAmbience();

  // Play esports war drum, brass fanfare, and sword clash
  audioService.playCombatDeployBlastSound();
  playSound(SFX_EVENT.MATCH_ACCEPT);
  playSound(SFX_EVENT.ROUND_START);

  // Trigger esports 3D XUNG TRẬN banner with radial shockwave
  triggerCombatDeployBanner(currentRound, Date.now());

  const store = useGameStore.getState();
  store.triggerScreenFlash('#f59e0b');
  store.triggerScreenShake(0.95);
};

/**
 * "Bắt đầu ván đấu" behaves the same wherever it is pressed (intro card button, Space/Enter, the admin
 * portal, the overlay's own admin tab): a waiting card plays the cinematic and then the narrated intro;
 * an intro that is already narrating jumps straight into combat. Presses during the cinematic are ignored.
 */
export const requestRoundStart = (): void => {
  const intro = useRoundIntroStore.getState();
  if (intro.isCinematicPlaying) return;
  const isWaitingToStart = intro.isManualHold && isCurrentRoundIntroActive();
  if (isWaitingToStart) {
    playIntroCinematic();
    return;
  }
  triggerStartRoundCombat();
};
