import { GiftSkyBeam } from './gift/GiftSkyBeam';
import { GiftSparkler } from './gift/GiftSparkler';

/**
 * 3D layer of the tiered gift reaction. Both parts stay mounted (hidden when idle, 0 draw calls)
 * so shaders never recompile at the moment a gift lands.
 *   MEDIUM → sparkler fountain at the team wing
 *   BIG    → team-colour sky beam + floor rings on the boss
 *   MEGA   → wider gold beam + rings + rotating gold rays
 * Meteors for every tier are spawned by the store and drawn by MeteorShower3D.
 */
export const CelestialGiftVFX = () => (
  <>
    <GiftSparkler />
    <GiftSkyBeam />
  </>
);
