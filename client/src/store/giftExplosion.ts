import {
  DAMAGE_TYPE,
  GAME_CONSTANTS,
  GIFT_METEOR_SPAWN,
  GIFT_TIER,
  GiftTier,
  TeamType,
} from '../constants/game';
import { SFX_EVENT, SfxEventName } from '../constants/sfx';
import { getTeamTheme } from '../constants/teams';
import { playSound } from '../services/soundManager';
import { audioService } from '../services/audioService';
import { GameState, GiftAnnouncement, MeteorEntity } from '../types/game';
import { getGiftTierConfig, isGiftTierAtLeast, resolveGiftTier } from './giftTier';

export interface GiftEvent {
  giftName: string;
  team: TeamType;
  donorName: string;
  donorAvatarUrl?: string;
  coins: number;
  streakCount: number;
  totalCoins: number;
  isComboFinal: boolean;
}

const GIFT_TIER_SOUND: Readonly<Record<GiftTier, SfxEventName>> = {
  [GIFT_TIER.SMALL]: SFX_EVENT.SCORE_UP,
  [GIFT_TIER.MEDIUM]: SFX_EVENT.GIFT_MEDIUM,
  [GIFT_TIER.BIG]: SFX_EVENT.BIG_DONATE,
  [GIFT_TIER.MEGA]: SFX_EVENT.GIFT_MEGA,
};

const BOSS_HIT_ORIGIN: [number, number, number] = [0, 0, 0];

/** Low-value streak ticks (1-coin roses ×50) only get full feedback every few ticks, so they never spam. */
export const isRapidStreakTick = (event: GiftEvent): boolean =>
  event.streakCount > 1 &&
  event.coins < GAME_CONSTANTS.TIKTOK_ENGAGEMENT.STREAK_TICK_MAX_COINS &&
  event.streakCount % GAME_CONSTANTS.TIKTOK_ENGAGEMENT.STREAK_FEEDBACK_EVERY !== 0;

export const buildGiftAnnouncement = (event: GiftEvent, tier: GiftTier, now: number): GiftAnnouncement => ({
  id: `banner-${now}-${event.streakCount}`,
  donorName: event.donorName,
  donorAvatarUrl: event.donorAvatarUrl,
  giftName: event.giftName,
  team: event.team,
  tier,
  coins: event.coins,
  streakCount: event.streakCount,
  totalCoins: event.totalCoins,
  isComboFinal: event.isComboFinal,
  timestamp: now,
});

export const buildGiftMeteors = (count: number, color: string, now: number, seed: number): MeteorEntity[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;
    const radius = GIFT_METEOR_SPAWN.RING_RADIUS_MIN + Math.random() * GIFT_METEOR_SPAWN.RING_RADIUS_SPREAD;
    return {
      id: `meteor-${now}-${seed}-${index}`,
      start: [
        Math.cos(angle) * radius,
        GIFT_METEOR_SPAWN.START_HEIGHT_MIN + Math.random() * GIFT_METEOR_SPAWN.START_HEIGHT_SPREAD,
        Math.sin(angle) * radius,
      ],
      target: [
        (Math.random() - 0.5) * GIFT_METEOR_SPAWN.TARGET_SPREAD,
        GIFT_METEOR_SPAWN.TARGET_Y,
        (Math.random() - 0.5) * GIFT_METEOR_SPAWN.TARGET_SPREAD,
      ],
      color,
      createdAt: now + index * GIFT_METEOR_SPAWN.STAGGER_MS,
      duration: GIFT_METEOR_SPAWN.FALL_DURATION_S,
    };
  });

const playGiftSound = (tier: GiftTier, isQuietTick: boolean): void => {
  if (isQuietTick) {
    audioService.playHeartChime();
    return;
  }
  playSound(GIFT_TIER_SOUND[tier]);
};

const shouldSummonElite = (event: GiftEvent): boolean =>
  event.streakCount === 1 ||
  event.streakCount % GAME_CONSTANTS.TIKTOK_ENGAGEMENT.ELITE_SUMMON_EVERY_STREAK === 0 ||
  event.coins >= GAME_CONSTANTS.TIKTOK_ENGAGEMENT.ELITE_SUMMON_MIN_COINS;

const summonEliteChampion = (get: () => GameState, event: GiftEvent): void => {
  const roster = get().activeTeams[event.team]?.roster ?? [];
  const signaturePool = roster.map((pro) => pro.signatureChampion).filter(Boolean);
  const pool = signaturePool.length > 0 ? signaturePool : GAME_CONSTANTS.TIKTOK_ENGAGEMENT.FALLBACK_ELITE_CHAMPIONS;
  const eliteChampion = pool[Math.floor(Math.random() * pool.length)];
  get().summonMinion(`👑 ${event.donorName}`, eliteChampion, event.team, true, event.donorAvatarUrl);
};

/** Screen / boss / 3D feedback for one gift tick. Returns the meteors to spawn. */
const applyGiftImpact = (get: () => GameState, event: GiftEvent, tier: GiftTier, isQuietTick: boolean, now: number): MeteorEntity[] => {
  const config = getGiftTierConfig(tier);
  const theme = getTeamTheme(get().activeTeams[event.team]?.colorTheme);
  const damageType = isGiftTierAtLeast(tier, GIFT_TIER.BIG) ? DAMAGE_TYPE.ULTIMATE : DAMAGE_TYPE.NORMAL;

  get().healTeamChampions(event.team, GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_HEAL_AMOUNT);
  get().damageBoss(event.coins * GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_DAMAGE_PER_COIN, event.team, `${event.donorName} (${event.giftName})`, damageType);
  if (isQuietTick) return [];

  if (config.hasScreenFlash) get().triggerScreenFlash(theme.secondaryHex);
  if (config.screenShake > 0) get().triggerScreenShake(config.screenShake);
  if (config.burstIntensity > 0) get().spawnParticleBurst(BOSS_HIT_ORIGIN, theme.primaryHex, config.burstIntensity);
  return buildGiftMeteors(config.meteorCount, theme.primaryHex, now, event.streakCount);
};

const logGift = (get: () => GameState, event: GiftEvent, isQuietTick: boolean): void => {
  const teamTag = get().activeTeams[event.team]?.shortTag || event.team;
  const streakLabel = event.streakCount > 1 ? ` x${event.streakCount}` : '';
  const damage = event.coins * GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_DAMAGE_PER_COIN;
  get().addLog('GIFT', `💎 ${event.donorName} tặng [${event.giftName}${streakLabel}] (+${event.coins} xu) phe ${teamTag} gây +${damage.toLocaleString()} ST!`, event.team);
  if (!isQuietTick || event.isComboFinal) {
    get().addChatMessage(event.donorName, `Đã tặng ${event.giftName}${streakLabel} (+${damage.toLocaleString()} DMG)!`, event.team);
  }
};

export interface GiftExplosionResult {
  tier: GiftTier;
  banner: GiftAnnouncement | null;
  meteors: MeteorEntity[];
  bossStaggerUntil: number;
}

/** Runs the whole gift reaction (sound, rewards, VFX inputs); the slice commits the returned state. */
export const runGiftExplosion = (get: () => GameState, event: GiftEvent, now: number): GiftExplosionResult => {
  const tier = resolveGiftTier(event.coins, event.totalCoins);
  const config = getGiftTierConfig(tier);
  const isQuietTick = isRapidStreakTick(event) && !isGiftTierAtLeast(tier, GIFT_TIER.BIG);

  playGiftSound(tier, isQuietTick);
  const meteors = applyGiftImpact(get, event, tier, isQuietTick, now);
  const roster = get().activeTeams[event.team]?.roster ?? [];
  roster.forEach((pro) => get().addPlayerFury(pro.id, GAME_CONSTANTS.PRO_FURY.FURY_GAIN_GIFT_BOOST));
  if (shouldSummonElite(event)) summonEliteChampion(get, event);
  logGift(get, event, isQuietTick);

  const hasBanner = config.bannerDurationMs > 0 && !isQuietTick;
  return {
    tier,
    banner: hasBanner ? buildGiftAnnouncement(event, tier, now) : null,
    meteors,
    bossStaggerUntil: config.bossStaggerMs > 0 ? now + config.bossStaggerMs : 0,
  };
};
