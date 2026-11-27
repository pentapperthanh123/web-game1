import type { DanceStyle, DrinkBarSyncMessage, GiftTier, SfxKind } from '@shared/types';
import { soundEngine } from './soundEngine';

class DrinkBarAudioManager {
  public setEnabled(enabled: boolean): void {
    soundEngine.setSfxEnabled(enabled);
  }

  public setMusicEnabled(enabled: boolean): void {
    soundEngine.setMusicEnabled(enabled);
  }

  public setBgmEnabled(enabled: boolean): void {
    soundEngine.setBgmEnabled(enabled);
  }

  public enableAutoCafeBgm(enabled: boolean): void {
    soundEngine.enableAutoCafeBgm(enabled);
  }

  public setMasterVolume(volume: number): void {
    soundEngine.setMasterVolume(volume);
  }

  public setMicMode(micMode: boolean): void {
    soundEngine.setMicMode(micMode);
  }

  public setTtsDucking(ducking: boolean): void {
    soundEngine.setTtsDucking(ducking);
  }

  public isUnlocked(): boolean {
    return soundEngine.isUnlocked();
  }

  public subscribeUnlocked(listener: (unlocked: boolean) => void): () => void {
    return soundEngine.subscribeUnlocked(listener);
  }

  public async unlock(playConfirmTone = false): Promise<boolean> {
    return soundEngine.unlock(playConfirmTone);
  }

  public stopBrewingSfx(): void {
    soundEngine.stopBrewingSfx();
  }

  public stopDanceMusic(): void {
    soundEngine.stopDanceMusic();
  }

  public play(
    kind: SfxKind,
    tier?: GiftTier,
    danceStyle?: DanceStyle,
    pitchScale = 1
  ): void {
    const playedLocally = soundEngine.play(kind, tier, danceStyle, pitchScale);
    if (playedLocally) return;

    // If running inside Live Preview iframe (?mirror=1) while browser blocks iframe AudioContext,
    // relay audio event to Admin parent window which holds active user gesture activation.
    if (typeof window !== 'undefined' && window.parent && window.parent !== window) {
      const relayMsg: DrinkBarSyncMessage = {
        type: 'RELAY_SFX',
        kind,
        tier,
        danceStyle,
        pitchScale,
        timestamp: Date.now(),
      };
      try {
        window.parent.postMessage(relayMsg, '*');
      } catch {
        // Ignore cross-frame error
      }
    }
  }
}

export const drinkBarAudio = new DrinkBarAudioManager();
