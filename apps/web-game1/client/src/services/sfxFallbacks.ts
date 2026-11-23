import { SFX_EVENT, SfxEventName } from '../constants/sfx';
import { DAMAGE_TYPE } from '../constants/game';
import { audioService } from './audioService';

const COMBO_FALLBACK_COUNT = 50;
const DEFAULT_PITCH_RATE = 1;

/**
 * Synthesized Web Audio stand-ins, used when every remote/local file of a sound
 * fails to load (offline, 404, blocked host). Keeps the stream from going silent.
 */
export const SFX_FALLBACKS: Record<SfxEventName, () => void> = {
  [SFX_EVENT.CHAT_POP]: () => audioService.playHitSound(),
  [SFX_EVENT.SCORE_UP]: () => audioService.playHeartChime(),
  [SFX_EVENT.LIKE_TAP]: () => audioService.playHitSound(),
  [SFX_EVENT.SKILL_SMITE]: () => audioService.playDamageImpactSound(DAMAGE_TYPE.ULTIMATE, true),
  [SFX_EVENT.BIG_DONATE]: () => audioService.playGiftFanfare(),
  [SFX_EVENT.COMBO_LEVEL_UP]: () => audioService.playComboMilestoneSound(COMBO_FALLBACK_COUNT),
  [SFX_EVENT.FOLLOW_NOTIFY]: () => audioService.playHeartChime(),
  [SFX_EVENT.ROUND_END]: () => audioService.playRoundStartSound(),
  [SFX_EVENT.VICTORY]: () => audioService.playVictoryFanfare(),
  [SFX_EVENT.DEFEAT]: () => audioService.playChampionDeathSound(),
  [SFX_EVENT.ROUND_START]: () => audioService.playRoundStartSound(),
  [SFX_EVENT.BOSS_ROAR]: () => audioService.playBossRoarSound(DEFAULT_PITCH_RATE, false),
  [SFX_EVENT.BOSS_ENRAGE]: () => audioService.playBossEnrageSound(DEFAULT_PITCH_RATE),
  [SFX_EVENT.BOSS_SHIELD]: () => audioService.playBossRoarSound(DEFAULT_PITCH_RATE, false),
  [SFX_EVENT.BOSS_SKILL]: () => audioService.playDamageImpactSound(DAMAGE_TYPE.CRIT, false),
  [SFX_EVENT.BOSS_ULTIMATE]: () => audioService.playBossRoarSound(DEFAULT_PITCH_RATE, true),
  [SFX_EVENT.BOSS_DEFEAT]: () => audioService.playBossDefeatSound(DEFAULT_PITCH_RATE),
  [SFX_EVENT.BOSS_DEATH_CRY]: () => audioService.playChampionDeathSound(),
  [SFX_EVENT.CHAMPION_SUMMON]: () => audioService.playSummonArrivalSound(),
  [SFX_EVENT.CHAMPION_DEATH]: () => audioService.playChampionDeathSound(),
  [SFX_EVENT.CHAMPION_ATTACK]: () => audioService.playAttackWhoosh(false, false),
  [SFX_EVENT.CHAMPION_ATTACK_MELEE]: () => audioService.playSlashSound(false),
  [SFX_EVENT.CHAMPION_HIT]: () => audioService.playDamageImpactSound(DAMAGE_TYPE.NORMAL, false),
  [SFX_EVENT.CRIT_HIT]: () => audioService.playDamageImpactSound(DAMAGE_TYPE.CRIT, true),
  [SFX_EVENT.TEAM_HEAL]: () => audioService.playGlobalDivineHealSound(),
  [SFX_EVENT.BOSS_PHASE_SHIFT]: () => audioService.playBossEnrageSound(DEFAULT_PITCH_RATE),
  [SFX_EVENT.BOSS_FIRE_BREATH]: () => audioService.playAttackWhoosh(true, false),
  [SFX_EVENT.BOSS_SPIKES]: () => audioService.playDamageImpactSound(DAMAGE_TYPE.CRIT, false),
  [SFX_EVENT.BOSS_SWEEP]: () => audioService.playAttackWhoosh(true, true),
  [SFX_EVENT.BOSS_LIGHTNING]: () => audioService.playLaserSound(),
  [SFX_EVENT.BOSS_METEOR]: () => audioService.playDamageImpactSound(DAMAGE_TYPE.ULTIMATE, false),
  [SFX_EVENT.BOSS_BEAM]: () => audioService.playBeamBurstSound(false),
  [SFX_EVENT.BOSS_VORTEX]: () => audioService.playAttackWhoosh(false, false),
  [SFX_EVENT.BOSS_CHARGE]: () => audioService.playShockwaveExplosion(1.1, 1.0, true),
  [SFX_EVENT.GIFT_MEDIUM]: () => audioService.playHeartChime(),
  [SFX_EVENT.GIFT_MEGA]: () => audioService.playGiftFanfare(),
  [SFX_EVENT.CHAMPION_DEATH_MULTI]: () => audioService.playChampionDeathSound(),
  [SFX_EVENT.SIGNATURE_SUMMON]: () => audioService.playSummonArrivalSound(),
  [SFX_EVENT.WIPE]: () => audioService.playBossRoarSound(DEFAULT_PITCH_RATE, true),
  [SFX_EVENT.SILVER_SCRAPES]: () => audioService.startSilverScrapesBgm(),
  [SFX_EVENT.MATCH_FOUND]: () => audioService.playRoundStartSound(),
  [SFX_EVENT.MATCH_ACCEPT]: () => audioService.playSummonArrivalSound(),
  // Bundled local files; if they ever fail, the fly-in file falls back to the synth fanfare, the rest stay silent
  [SFX_EVENT.INTRO_FLY_IMPACT]: () => audioService.playRoundStartSound(),
  [SFX_EVENT.INTRO_DEEP_IMPACT]: () => undefined,
  [SFX_EVENT.INTRO_TITLE_HORN]: () => undefined,
  [SFX_EVENT.INTRO_CROWD_ROAR]: () => undefined,
  [SFX_EVENT.BOSS_ROAR_HERALD]: () => audioService.playBossRoarSound(DEFAULT_PITCH_RATE, false),
  [SFX_EVENT.BOSS_ENRAGE_HERALD]: () => audioService.playBossEnrageSound(DEFAULT_PITCH_RATE),
  [SFX_EVENT.BOSS_ROAR_MOUNTAIN]: () => audioService.playBossRoarSound(DEFAULT_PITCH_RATE, false),
  [SFX_EVENT.BOSS_ENRAGE_MOUNTAIN]: () => audioService.playBossEnrageSound(DEFAULT_PITCH_RATE),
  [SFX_EVENT.BOSS_ROAR_STORM]: () => audioService.playBossRoarSound(DEFAULT_PITCH_RATE, false),
  [SFX_EVENT.BOSS_ENRAGE_STORM]: () => audioService.playBossEnrageSound(DEFAULT_PITCH_RATE),
  [SFX_EVENT.BOSS_ROAR_ELDER]: () => audioService.playBossRoarSound(DEFAULT_PITCH_RATE, false),
  [SFX_EVENT.BOSS_ENRAGE_ELDER]: () => audioService.playBossEnrageSound(DEFAULT_PITCH_RATE),
  [SFX_EVENT.BOSS_ROAR_VOID]: () => audioService.playBossRoarSound(DEFAULT_PITCH_RATE, false),
  [SFX_EVENT.BOSS_ENRAGE_VOID]: () => audioService.playBossEnrageSound(DEFAULT_PITCH_RATE),
};
