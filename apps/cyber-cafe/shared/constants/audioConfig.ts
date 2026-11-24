export type SoundFxType =
  | 'KEY_CLICK'
  | 'DRINK_SLURP'
  | 'BSOD_EXPLODE'
  | 'POWER_CUT'
  | 'MOM_ALARM'
  | 'MOM_BUST'
  | 'SUCCESS_SAFE'
  | 'COIN_DROP'
  | 'NEW_PLAYER';

export interface SoundConfig {
  defaultVolume: number;
  micModeDuckingVolume: number;
}

export const SOUND_CONFIG: SoundConfig = {
  defaultVolume: 0.75,
  micModeDuckingVolume: 0.18,
};
