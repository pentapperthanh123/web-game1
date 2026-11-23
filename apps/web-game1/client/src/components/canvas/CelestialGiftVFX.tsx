import { GiftFireworks } from './gift/GiftFireworks';
import { GiftSkyBeam } from './gift/GiftSkyBeam';
import { GiftSparkler } from './gift/GiftSparkler';

/**
 * 3D layer of the tiered gift reaction. All parts stay mounted (hidden when idle, 0 draw calls)
 * so shaders never recompile at the moment a gift lands.
 *   MEDIUM → sparkler fountain at the team wing
 *   BIG    → bigger fountain + team-colour sky beam + floor rings + 2 firework shells
 *   MEGA   → gold fountain + wider gold beam + rings + rotating rays + 4 / 6 / 9 shells by grade
 * Meteors for every tier (1 for SMALL) are spawned by the store and drawn by MeteorShower3D.
 */
export const CelestialGiftVFX = () => (
  <>
    <GiftSparkler />
    <GiftSkyBeam />
    <GiftFireworks />
  </>
);
