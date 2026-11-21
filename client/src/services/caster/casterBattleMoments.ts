import { BATTLE_MOMENT_TIMING, CASTER_INTENSITY, CASTER_SIGNAL, CASTER_SPEAKER, CasterSignal } from '../../constants/caster';
import { BOSS_PHASE } from '../../constants/bossPhases';
import {
  BOSS_MECHANICS_CONSTANTS,
  FINISHER_BANNER_CONSTANTS,
  GAME_CONSTANTS,
  getThemeConfig,
  isDonorFinisherCheck,
  resolveDefeatShowcaseMs,
} from '../../constants/game';
import { BossPhase } from '../../types/bossSkill';
import { GameState } from '../../types/game';
import { isCurrentRoundIntroActive } from '../../store/roundIntroStore';
import { formatSpeechNumber } from './casterComposer';
import { castCasterDialogue, castCasterSignal, getTeamTag, speakerFor } from './casterSignal';

const MS_PER_SECOND = 1000;
const DUEL_DRAW = 'DRAW';
/** Buff the duel winner gets (+20 %), as said by the caster. */
const DUEL_WIN_BUFF_PERCENT = Math.round((GAME_CONSTANTS.SILVER_SCRAPES.BUFF_DAMAGE_MULTIPLIER - 1) * 100);

const PHASE_SIGNAL: Readonly<Partial<Record<BossPhase, CasterSignal>>> = {
  [BOSS_PHASE.TWO]: CASTER_SIGNAL.BOSS_PHASE_TWO,
  [BOSS_PHASE.THREE]: CASTER_SIGNAL.BOSS_PHASE_THREE,
};

export interface BattleMomentMemory {
  lastPhase: BossPhase;
  lastHeartBannerId: string | null;
}

export const createBattleMomentMemory = (state: GameState): BattleMomentMemory => ({
  lastPhase: state.bossPhase,
  lastHeartBannerId: state.activeHeartMilestoneBanner?.id ?? null,
});

const isFightOn = (state: GameState): boolean =>
  state.bossHp > 0 &&
  state.roundWinner === null &&
  !state.isRoundIntermission &&
  !isCurrentRoundIntroActive();

const getBossName = (state: GameState): string => getThemeConfig(state.gameTheme).bossName;

/** "Boss awakens" banner: once per phase step, never when the phase drops back for a new round. */
const announcePhaseShift = (state: GameState, memory: BattleMomentMemory): void => {
  if (state.bossPhase === memory.lastPhase) return;
  const isEscalating = state.bossPhase > memory.lastPhase;
  memory.lastPhase = state.bossPhase;
  const signal = PHASE_SIGNAL[state.bossPhase];
  if (!isEscalating || !signal || !isFightOn(state)) return;
  const now = Date.now();
  const intensity = state.bossPhase === BOSS_PHASE.THREE ? CASTER_INTENSITY.CLIMAX : CASTER_INTENSITY.HYPE;
  castCasterDialogue(
    signal,
    { boss: getBossName(state) },
    {
      ttlMs: BATTLE_MOMENT_TIMING.PHASE_SHIFT_TTL_MS,
      deadlineAt: now + BATTLE_MOMENT_TIMING.PHASE_SHIFT_DEADLINE_MS,
      intensity,
    }
  );
};

const announceShield = (state: GameState, prev: GameState): void => {
  const boss = getBossName(state);
  const shield = state.bossShield;
  const now = Date.now();
  if (shield && !prev.bossShield) {
    const seconds = Math.round((shield.expiresAt - shield.createdAt) / MS_PER_SECOND);
    castCasterDialogue(
      CASTER_SIGNAL.BOSS_SHIELD_UP,
      { boss, seconds },
      {
        ttlMs: BATTLE_MOMENT_TIMING.SHIELD_UP_TTL_MS,
        deadlineAt: now + BATTLE_MOMENT_TIMING.SHIELD_UP_DEADLINE_MS,
        intensity: CASTER_INTENSITY.HYPE,
      }
    );
    return;
  }
  const isJustBroken = state.bossShieldBrokenTimestamp > 0 && state.bossShieldBrokenTimestamp !== prev.bossShieldBrokenTimestamp;
  if (isJustBroken) {
    castCasterDialogue(
      CASTER_SIGNAL.BOSS_SHIELD_BROKEN,
      {
        boss,
        dmg: formatSpeechNumber(BOSS_MECHANICS_CONSTANTS.SHIELD.BREAK_BONUS_DAMAGE),
      },
      {
        ttlMs: BATTLE_MOMENT_TIMING.SHIELD_BROKEN_TTL_MS,
        deadlineAt: now + BATTLE_MOMENT_TIMING.SHIELD_BROKEN_DEADLINE_MS,
        intensity: CASTER_INTENSITY.HYPE,
      }
    );
    return;
  }
  // Gone without being broken while the fight goes on: it expired and healed the boss
  const isAbsorbed = !shield && Boolean(prev.bossShield) && isFightOn(state);
  if (!isAbsorbed) return;
  castCasterDialogue(
    CASTER_SIGNAL.BOSS_SHIELD_ABSORBED,
    {
      boss,
      hp: formatSpeechNumber(BOSS_MECHANICS_CONSTANTS.SHIELD.HEAL_PENALTY_AMOUNT),
    },
    {
      ttlMs: BATTLE_MOMENT_TIMING.SHIELD_ABSORBED_TTL_MS,
      deadlineAt: now + BATTLE_MOMENT_TIMING.SHIELD_ABSORBED_DEADLINE_MS,
      intensity: CASTER_INTENSITY.NORMAL,
    }
  );
};

const announceHeartMilestone = (state: GameState, memory: BattleMomentMemory): void => {
  const banner = state.activeHeartMilestoneBanner;
  if (!banner || banner.id === memory.lastHeartBannerId) return;
  memory.lastHeartBannerId = banner.id;
  const now = Date.now();
  castCasterDialogue(
    CASTER_SIGNAL.HEART_MILESTONE,
    {
      count: formatSpeechNumber(banner.milestoneCount),
      heal: banner.healAmount,
    },
    {
      ttlMs: BATTLE_MOMENT_TIMING.HEART_MILESTONE_TTL_MS,
      deadlineAt: now + BATTLE_MOMENT_TIMING.HEART_MILESTONE_DEADLINE_MS,
      intensity: CASTER_INTENSITY.HYPE,
      speaker: CASTER_SPEAKER.B,
    }
  );
};

/**
 * The kill is called the moment the boss dies, over the finisher visuals: a gift kill names the donor
 * and the gift during the avatar strike (finished by the impact), any other kill names the finisher
 * while its card is on screen (finished before the victory screen).
 */
const announceFinisher = (state: GameState, prev: GameState): void => {
  const isJustWon = prev.roundWinner === null && state.roundWinner !== null;
  if (!isJustWon || !state.finisherPlayerName || state.bossDefeatedTimestamp <= 0) return;
  const team = state.finisherTeam ?? state.roundWinner;
  const slots = { name: speakerFor(state.finisherPlayerName, team), team: getTeamTag(team), boss: getBossName(state) };
  const isGiftKill = isDonorFinisherCheck(state.finisherGiftName, state.finisherCoins);
  if (isGiftKill && state.finisherGiftName) {
    castCasterSignal(
      CASTER_SIGNAL.GIFT_FINISHER_CALLOUT,
      { ...slots, gift: state.finisherGiftName },
      { deadlineAt: state.bossDefeatedTimestamp + FINISHER_BANNER_CONSTANTS.AVATAR_STRIKE_DURATION_MS }
    );
    return;
  }
  castCasterSignal(CASTER_SIGNAL.ROUND_FINISHER, slots, {
    deadlineAt: state.bossDefeatedTimestamp + resolveDefeatShowcaseMs(false),
  });
};

/** Silver Scrapes duel: opening matchup, last-stand shield, result with the buff it grants. */
export const announceDuelMoments = (state: GameState, prev: GameState): void => {
  const duel = state.silverScrapesState;
  const prevDuel = prev.silverScrapesState;
  if (duel === prevDuel) return;
  if (duel.isActive && !prevDuel.isActive) {
    castCasterSignal(CASTER_SIGNAL.DUEL_START, {
      fighterA: duel.leftFighter.name,
      championA: duel.leftFighter.champion,
      teamA: getTeamTag(duel.leftFighter.team),
      fighterB: duel.rightFighter.name,
      championB: duel.rightFighter.champion,
      teamB: getTeamTag(duel.rightFighter.team),
      seconds: duel.timeRemaining,
    });
    return;
  }
  if (duel.isLastStandActive && !prevDuel.isLastStandActive && duel.winner === null) {
    castCasterSignal(CASTER_SIGNAL.DUEL_LAST_STAND, {});
    return;
  }
  if (duel.winner === null || prevDuel.winner !== null) return;
  if (duel.winner === DUEL_DRAW) {
    castCasterSignal(CASTER_SIGNAL.DUEL_DRAW, {});
    return;
  }
  const fighter = duel.winner === duel.leftFighter.team ? duel.leftFighter : duel.rightFighter;
  castCasterSignal(CASTER_SIGNAL.DUEL_WIN, {
    fighter: fighter.name,
    team: getTeamTag(duel.winner),
    buff: DUEL_WIN_BUFF_PERCENT,
  });
};

/** Big on-screen moments of the fight that each have a banner and must also have a voice line. */
export const announceBattleMoments = (state: GameState, prev: GameState, memory: BattleMomentMemory): void => {
  announcePhaseShift(state, memory);
  if (state.bossShield !== prev.bossShield || state.bossShieldBrokenTimestamp !== prev.bossShieldBrokenTimestamp) {
    announceShield(state, prev);
  }
  if (state.activeHeartMilestoneBanner !== prev.activeHeartMilestoneBanner) announceHeartMilestone(state, memory);
  if (state.roundWinner !== prev.roundWinner) announceFinisher(state, prev);
};
