import { audioService } from './audioService';
import { casterSpeechEngine } from './caster/speechEngine';
import { casterQueue } from './caster/presentationQueue';
import { hideRoundIntro } from '../store/roundIntroStore';
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
