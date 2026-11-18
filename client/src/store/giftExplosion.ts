import {
  BOSS_STATUS,
  DAMAGE_SOURCE,
  DAMAGE_TYPE,
  GAME_CONSTANTS,
  GIFT_METEOR_SPAWN,
  GIFT_TIER,
  GIFT_TIER_CONFIG,
  GiftTier,
  SUMMON_BADGES,
  TeamType,
} from '../constants/game';
import { getTeamTheme } from '../constants/teams';
import { playSound } from '../services/soundManager';
import { audioService } from '../services/audioService';
import { GameState, GiftAnnouncement, MeteorEntity } from '../types/game';
import { GIFT_FIREWORK, GIFT_SOUND_LAYERS, GIFT_STREAK_PITCH, GiftSoundLayer } from '../constants/giftPresentation';
import { GIFT_EFFECT, GIFT_EFFECT_TUNING, type GiftRulePayload } from '../constants/giftConfig';
import { applyGiftRuleEffect, resolveGiftDamageMultiplier } from './giftRuleEffects';
import { getGiftTierConfig, getMegaGradeConfig, isGiftTierAtLeast, resolveFireworkShellCount } from './giftTier';
import {
  applyDynamicGiftRules,
  GIFT_VFX_ASSET_TYPE,
  GIFT_SKILL_BINDING,
  GiftVfxAssetType,
} from './dynamicGiftStore';
import { useGiftVfxStore, MegaWeaponCategory } from './giftVfxStore';

const LIVEOPS_WEAPON_MAP: Readonly<Partial<Record<GiftVfxAssetType, MegaWeaponCategory>>> = {
  [GIFT_VFX_ASSET_TYPE.SWORD_STRIKE]: 'SWORD',
  [GIFT_VFX_ASSET_TYPE.LASER_BEAM]: 'LASER',
  [GIFT_VFX_ASSET_TYPE.LOVE_BURST]: 'LOVE',
  [GIFT_VFX_ASSET_TYPE.WATER_BUBBLE]: 'WATER',
};

const LIVEOPS_SKILL_TUNING = {
  STUN_DURATION_MS: 2500,
  FULL_FURY_AMOUNT: 100,
  HEAL_AMOUNT: 1500,
} as const;

export interface GiftEvent {
  giftName: string;
  team: TeamType;
  donorName: string;
  donorAvatarUrl?: string;
  coins: number;
  streakCount: number;
  totalCoins: number;
  isComboFinal: boolean;
  /** Admin gift rule (damage multiplier, special effect), when one matched this gift. */
  rule?: GiftRulePayload;
}

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
  damageMultiplier: resolveGiftDamageMultiplier(event.rule),
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

const resolveMeteorCount = (tier: GiftTier, coins: number): number => {
  if (coins >= GIFT_METEOR_SPAWN.FRENZY_MIN_COINS && coins < GIFT_TIER_CONFIG[GIFT_TIER.BIG].minCoins) {
    return GIFT_METEOR_SPAWN.FRENZY_METEOR_COUNT;
  }
  const baseCount = getGiftTierConfig(tier).meteorCount;
  return tier === GIFT_TIER.MEGA ? baseCount + getMegaGradeConfig(coins).bonusMeteorCount : baseCount;
};

/** Small tiers climb in pitch as the streak grows; BIG / MEGA stingers keep their natural pitch. */
const resolveStreakRate = (tier: GiftTier, streakCount: number): number => {
  if (isGiftTierAtLeast(tier, GIFT_TIER.BIG)) return 1;
  return Math.min(GIFT_STREAK_PITCH.MAX_RATE, 1 + (streakCount - 1) * GIFT_STREAK_PITCH.STEP_PER_STREAK);
};

const playSoundLayer = (layer: GiftSoundLayer, streakRate: number): void => {
  const play = () => playSound(layer.event, { volumeScale: layer.volumeScale, rateScale: layer.rateScale * streakRate });
  if (layer.delayMs <= 0) {
    play();
    return;
  }
  setTimeout(play, layer.delayMs);
};

/** One synth crack per firework shell, timed to the 3D bursts (GiftFireworks reads the same timeline). */
const scheduleFireworkSounds = (shellCount: number): void => {
  for (let shellIndex = 0; shellIndex < shellCount; shellIndex += 1) {
    setTimeout(
      () => audioService.playFireworkBurst(),
      GIFT_FIREWORK.FIRST_SHELL_DELAY_MS + shellIndex * GIFT_FIREWORK.SHELL_INTERVAL_MS
    );
  }
};

const playGiftSound = (tier: GiftTier, event: GiftEvent, isQuietTick: boolean): void => {
  if (isQuietTick) {
    audioService.playHeartChime();
    return;
  }
  const streakRate = resolveStreakRate(tier, event.streakCount);
  GIFT_SOUND_LAYERS[tier].forEach((layer) => playSoundLayer(layer, streakRate));
  scheduleFireworkSounds(resolveFireworkShellCount(tier, event.totalCoins));
};

/**
 * Small gifts (roses) only earn an elite champion every few streak ticks: before, every 3rd 1-coin tick
 * did, and elites stay on the field, so rose spam was worth ~15x more per coin than a big gift.
 */
const shouldSummonElite = (event: GiftEvent): boolean => {
  const rules = GAME_CONSTANTS.TIKTOK_ENGAGEMENT;
  if (event.coins <= rules.SMALL_GIFT_MAX_COINS) return event.streakCount % rules.SMALL_GIFT_ELITE_EVERY_STREAK === 0;
  return event.streakCount === 1 || event.streakCount % rules.ELITE_SUMMON_EVERY_STREAK === 0 || event.coins >= rules.ELITE_SUMMON_MIN_COINS;
};

/** Pro fury grows with the gift's value (3 per coin, capped at the old flat +30). */
const resolveGiftFuryGain = (coins: number): number =>
  Math.min(GAME_CONSTANTS.PRO_FURY.FURY_GAIN_GIFT_BOOST, coins * GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_FURY_PER_COIN);

const summonEliteChampion = (get: () => GameState, event: GiftEvent): void => {
  const roster = get().activeTeams[event.team]?.roster ?? [];
  const signaturePool = roster.map((pro) => pro.signatureChampion).filter(Boolean);
  const pool = signaturePool.length > 0 ? signaturePool : GAME_CONSTANTS.TIKTOK_ENGAGEMENT.FALLBACK_ELITE_CHAMPIONS;
  const eliteChampion = pool[Math.floor(Math.random() * pool.length)];
  get().summonMinion(
    `${SUMMON_BADGES.ELITE} ${event.donorName}`,
    eliteChampion,
    event.team,
    true,
    event.donorAvatarUrl,
    false,
    true
  );
};

/** Screen / boss / 3D feedback for one gift tick. Returns the meteors to spawn. */
const applyGiftImpact = (
  get: () => GameState,
  event: GiftEvent,
  tier: GiftTier,
  damage: number,
  isQuietTick: boolean,
  now: number
): MeteorEntity[] => {
  const config = getGiftTierConfig(tier);
  const theme = getTeamTheme(get().activeTeams[event.team]?.colorTheme);
  const damageType = isGiftTierAtLeast(tier, GIFT_TIER.BIG) ? DAMAGE_TYPE.ULTIMATE : DAMAGE_TYPE.NORMAL;

  get().healTeamChampions(event.team, GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_HEAL_AMOUNT);
  get().damageBoss(
    damage,
    event.team,
    `${event.donorName} (${event.giftName})`,
    damageType,
    {
      source: DAMAGE_SOURCE.GIFT,
      hpDamageCap: Math.round(get().bossMaxHp * GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_BOSS_HP_CAP_RATIO),
      donorAvatarUrl: event.donorAvatarUrl,
      giftName: event.giftName,
      coins: event.coins,
    }
  );
  if (isQuietTick) return [];

  if (config.hasScreenFlash) get().triggerScreenFlash(theme.secondaryHex);
  if (config.screenShake > 0) get().triggerScreenShake(config.screenShake);
  if (config.burstIntensity > 0) get().spawnParticleBurst(BOSS_HIT_ORIGIN, theme.primaryHex, config.burstIntensity);
  return buildGiftMeteors(resolveMeteorCount(tier, event.totalCoins), theme.primaryHex, now, event.streakCount);
};

const logGift = (get: () => GameState, event: GiftEvent, damage: number, isQuietTick: boolean): void => {
  const teamTag = get().activeTeams[event.team]?.shortTag || event.team;
  const streakLabel = event.streakCount > 1 ? ` x${event.streakCount}` : '';
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
  frenzyUntil?: number;
  frenzyTeam?: TeamType;
}

/** Runs the whole gift reaction (sound, rewards, VFX inputs); the slice commits the returned state. */
export const runGiftExplosion = (get: () => GameState, event: GiftEvent, now: number): GiftExplosionResult => {
  const processed = applyDynamicGiftRules(event);
  const tier = processed.effectiveTier;
  const config = getGiftTierConfig(tier);
  const isQuietTick = isRapidStreakTick(event) && !isGiftTierAtLeast(tier, GIFT_TIER.BIG);

  const ruleMultiplier = resolveGiftDamageMultiplier(event.rule);
  const totalDamage = Math.round(processed.calculatedDamage * ruleMultiplier);

  const meteors = applyGiftImpact(get, event, tier, totalDamage, isQuietTick, now);
  // A killing gift hands its audio to the finisher cinematic (avatar strike → impact → card).
  // Playing the gift layers here as well would also throttle the cinematic's opening sting.
  const hasKilledBoss = get().bossStatus === BOSS_STATUS.DEFEATED;
  if (!hasKilledBoss) playGiftSound(tier, event, isQuietTick);
  const roster = get().activeTeams[event.team]?.roster ?? [];
  const furyGain = resolveGiftFuryGain(event.coins);
  roster.forEach((pro) => get().addPlayerFury(pro.id, furyGain));
  if (shouldSummonElite(event)) summonEliteChampion(get, event);

  // Trigger 3D Mega Weapon if mapped to a custom weapon asset
  const weaponCategory = LIVEOPS_WEAPON_MAP[processed.vfxAssetType];
  if (weaponCategory) {
    useGiftVfxStore.getState().triggerMegaWeapon({
      category: weaponCategory,
      team: event.team,
      targetPos: BOSS_HIT_ORIGIN,
      donorName: event.donorName,
      donorAvatarUrl: event.donorAvatarUrl,
      coins: event.coins,
    });
  }

  // LiveOps Bound Skill execution
  let liveOpsStunUntil = 0;
  if (!hasKilledBoss && processed.boundSkill !== GIFT_SKILL_BINDING.NONE) {
    const teamTag = get().activeTeams[event.team]?.shortTag || event.team;
    switch (processed.boundSkill) {
      case GIFT_SKILL_BINDING.STUN_BOSS:
        liveOpsStunUntil = now + LIVEOPS_SKILL_TUNING.STUN_DURATION_MS;
        get().addLog('GIFT', `⚡ [LIVEOPS] ${event.donorName} kích hoạt CHOÁNG BOSS 2.5s!`, event.team);
        break;
      case GIFT_SKILL_BINDING.FULL_FURY:
        roster.forEach((pro) => get().addPlayerFury(pro.id, LIVEOPS_SKILL_TUNING.FULL_FURY_AMOUNT));
        get().addLog('GIFT', `🔥 [LIVEOPS] ${event.donorName} bơm ĐẦY 100% NỘ cho phe ${teamTag}!`, event.team);
        break;
      case GIFT_SKILL_BINDING.HEAL_TEAM:
        get().healTeamChampions(event.team, LIVEOPS_SKILL_TUNING.HEAL_AMOUNT);
        get().addLog('GIFT', `🛡️ [LIVEOPS] ${event.donorName} HỒI SINH LỰC toàn phe ${teamTag}!`, event.team);
        break;
      case GIFT_SKILL_BINDING.SUMMON_CHAMPION:
        summonEliteChampion(get, event);
        get().addLog('GIFT', `👑 [LIVEOPS] ${event.donorName} triệu hồi TƯỚNG TINH ANH VIP!`, event.team);
        break;
      default:
        break;
    }
  }

  // Innate milestone effects:
  // Mốc 30 xu (Kính Mát): BATTLE_FRENZY (+40% attack speed, fury boost, light heal, 8 meteors)
  const isFrenzyMilestone = event.coins === 30 || event.rule?.effect === GIFT_EFFECT.BATTLE_FRENZY;
  // Mốc 99 xu (Vương Miện): AEGIS_BARRIER (Full team heal + 2.5s boss stagger + VIP fanfare)
  const isAegisMilestone = event.coins === 99 || event.rule?.effect === GIFT_EFFECT.AEGIS_BARRIER;

  let ruleStunUntil = 0;
  let frenzyUntil: number | undefined;

  if (event.rule && !hasKilledBoss) {
    const ruleResult = applyGiftRuleEffect(
      { get, team: event.team, donorName: event.donorName, donorAvatarUrl: event.donorAvatarUrl, rule: event.rule },
      now
    );
    ruleStunUntil = ruleResult.bossStunUntil;
    if (ruleResult.frenzyDurationMs > 0) {
      frenzyUntil = now + ruleResult.frenzyDurationMs;
    }
  }

  if (isFrenzyMilestone && !hasKilledBoss) {
    frenzyUntil = Math.max(frenzyUntil ?? 0, now + GIFT_EFFECT_TUNING.FRENZY_DURATION_MS);
    roster.forEach((pro) => get().addPlayerFury(pro.id, GIFT_EFFECT_TUNING.FRENZY_FURY_AMOUNT));
    get().healTeamChampions(event.team, GIFT_EFFECT_TUNING.FRENZY_HEAL_AMOUNT);
    const teamTag = get().activeTeams[event.team]?.shortTag || event.team;
    get().addLog(
      'GIFT',
      `🕶️ [CUỒNG NỘ CHIẾN TRƯỜNG] ${event.donorName} kích hoạt BATTLE FRENZY (+40% tốc đánh, nạp nộ & hồi phục) cho phe ${teamTag}!`,
      event.team
    );
  }

  if (isAegisMilestone && !hasKilledBoss) {
    get().healTeamChampions(event.team, GIFT_EFFECT_TUNING.AEGIS_HEAL_AMOUNT);
    const teamTag = get().activeTeams[event.team]?.shortTag || event.team;
    get().addLog(
      'GIFT',
      `👑 [LÁ CHẮN AEGIS & CHOÁNG BOSS] ${event.donorName} tặng Vương Miện khống chế Boss 2.5s & hồi phục toàn phe ${teamTag}!`,
      event.team
    );
  }

  logGift(get, event, totalDamage, isQuietTick);

  const hasBanner = config.bannerDurationMs > 0 && !isQuietTick;
  const tierStaggerUntil = !hasKilledBoss && config.bossStaggerMs > 0 ? now + config.bossStaggerMs : 0;
  return {
    tier,
    banner: hasBanner ? buildGiftAnnouncement(event, tier, now) : null,
    meteors,
    bossStaggerUntil: Math.max(tierStaggerUntil, ruleStunUntil, liveOpsStunUntil),
    frenzyUntil,
    frenzyTeam: frenzyUntil ? event.team : undefined,
  };
};
