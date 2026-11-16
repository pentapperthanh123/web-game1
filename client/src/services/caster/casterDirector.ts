import {
  CASTER_BANTER,
  CASTER_BANTER_RULES,
  CASTER_BANTER_WEIGHTS,
  CASTER_EMPTY_FIELD_BANTER_WEIGHTS,
  CASTER_EVENT_RULES,
  CASTER_INTRO_SIGNALS,
  CASTER_QUEUE,
  CASTER_SIGNAL,
  CASTER_SIGNAL_PRIORITY,
  CASTER_VOICE,
  CasterSignal,
} from '../../constants/caster';
import {
  BOSS_STATUS,
  GAME_CONSTANTS,
  GIFT_TIER,
  GiftTier,
  TEAM_KEY,
  TeamType,
  getThemeConfig,
  isDonorFinisherCheck,
  resolveDefeatShowcaseMs,
} from '../../constants/game';
import { useCasterStore } from '../../store/casterStore';
import { useGameStore } from '../../store/gameStore';
import { isCurrentRoundIntroActive, useRoundIntroStore } from '../../store/roundIntroStore';
import { triggerFieldWipe } from '../../store/combatMomentStore';
import { bossSpeechManager, resolveBossSpeechItem } from '../../constants/bossSpeech';
import { INTRO_STAR_FALLBACK_CHAMPION, pickIntroStar } from '../../utils/introStar';
import { GameState } from '../../types/game';
import {
  CasterSlots,
  composeCasterLine,
  formatScore,
  formatSpeechNumber,
  getCasterLang,
} from './casterComposer';
import { casterSpeechEngine } from './speechEngine';
import { casterQueue } from './presentationQueue';
import { warmPredictableLines } from './casterWarmup';
import { castCasterSignal, getTeamTag, speakerFor } from './casterSignal';
import { announceBattleMoments, announceDuelMoments, createBattleMomentMemory } from './casterBattleMoments';

/** Names starting with a badge (💖 follow reward, 👑 gift elite) already got their own line. */
const BADGED_NAME = /^[^\p{L}\p{N}]/u;
/** Champions suggested by the "how to play" banter. */
const GUIDE_CHAMPIONS = ['Ahri', 'Yasuo', 'Lee Sin', 'Jinx', 'Garen', 'Lux'] as const;

const GIFT_TIER_SIGNAL: Partial<Record<GiftTier, CasterSignal>> = {
  [GIFT_TIER.MEDIUM]: CASTER_SIGNAL.GIFT_MEDIUM,
  [GIFT_TIER.BIG]: CASTER_SIGNAL.GIFT_BIG,
  [GIFT_TIER.MEGA]: CASTER_SIGNAL.GIFT_MEGA,
};

const getOtherTeam = (team: TeamType): TeamType => {
  const teams = Object.keys(useGameStore.getState().activeTeams) as TeamType[];
  return teams.find((candidate) => candidate !== team) ?? team;
};

const getSeriesScore = (state: GameState): string => {
  const [left, right] = Object.values(state.bo5Score);
  return formatScore(left ?? 0, right ?? 0);
};

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

/** The boss roars and its speech-bubble line is shown as its caption (it does not talk). */
export const showBossTaunt = (text: string): void => {
  if (!useCasterStore.getState().isTtsEnabled || !text) return;
  if (useGameStore.getState().silverScrapesState.isActive || isCurrentRoundIntroActive()) return;
  casterQueue.enqueue({
    signal: CASTER_SIGNAL.BOSS_TAUNT,
    priority: CASTER_SIGNAL_PRIORITY[CASTER_SIGNAL.BOSS_TAUNT],
    text,
    createdAt: Date.now(),
    voice: CASTER_VOICE.BOSS,
  });
};

// ── Event announcers used by the socket layer and UI ───────────────────────────────

export const announceFollow = (userName: string, team: TeamType, championName: string): void => {
  castCasterSignal(CASTER_SIGNAL.FOLLOW, { name: speakerFor(userName, team), champion: championName, team: getTeamTag(team) });
};

export const announceShare = (userName: string, team: TeamType, damageAmount: number): void => {
  castCasterSignal(CASTER_SIGNAL.SHARE, {
    name: speakerFor(userName, team),
    team: getTeamTag(team),
    dmg: formatSpeechNumber(damageAmount),
  });
};

export const announceSmallGiftCombo = (donorName: string, team: TeamType, giftName: string, count: number): void => {
  if (count < CASTER_EVENT_RULES.MIN_SMALL_COMBO_COUNT) return;
  castCasterSignal(CASTER_SIGNAL.GIFT_COMBO, {
    name: speakerFor(donorName, team),
    gift: giftName,
    count,
    team: getTeamTag(team),
  });
};


// ── Store watcher ─────────────────────────────────────────────────────────────────

interface DirectorMemory {
  seenPortalIds: Set<string>;
  lastGiftBannerId: string | null;
  lastSkillTimestamp: number;
  hasAnnouncedEnrage: boolean;
  hasAnnouncedLowHp: boolean;
  lastActivityAt: number;
  lastBanterSignal: CasterSignal | null;
  nextBanterSilenceMs: number;
  damageLeader: TeamType | null;
  /** Largest lead share the current leader has held since it took the lead. */
  peakLeadRatio: number;
  lastComebackAt: number;
  livingCount: number;
  /** shownAt of the intro card already narrated (late start / late voice config must not repeat it). */
  narratedIntroShownAt: number;
  /** "Xung trận!" line composed and downloaded during the intro so it plays the instant the card closes. */
  preparedGoLine: string | null;
  /** Round the prepared line names; a server sync may change currentRound while the card is up. */
  preparedGoRound: number;
  hasAnnouncedSeriesEnd: boolean;
  /** Round-end narration waiting for the victory screen (cleared when a new round starts). */
  pendingRoundEndTimer: ReturnType<typeof setTimeout> | null;
}

const getTeamKeys = (state: GameState): TeamType[] => Object.keys(state.activeTeams) as TeamType[];

/** Team ahead on round damage, null while tied. */
const getDamageLeader = (state: GameState): TeamType | null => {
  const [leftTeam, rightTeam] = getTeamKeys(state);
  const leftScore = state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG;
  const rightScore = state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG;
  if (leftScore === rightScore) return null;
  return leftScore > rightScore ? leftTeam : rightTeam;
};

/** Allocation-free count of champions still alive. */
const countLiving = (state: GameState): number => {
  let living = 0;
  for (const minion of state.minions) {
    if ((minion.hp ?? 1) > 0) living += 1;
  }
  return living;
};

const isBattleRunning = (state: GameState): boolean =>
  state.bossHp > 0 && state.roundWinner === null && !state.isRoundIntermission && !state.isSeriesEnded;

/** Lead as a share of total team damage (0 = tied or no damage yet). */
const getLeadRatio = (state: GameState): number => {
  const leftScore = state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG;
  const rightScore = state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG;
  const total = leftScore + rightScore;
  if (total <= 0) return 0;
  return Math.abs(leftScore - rightScore) / total;
};

const createMemory = (state: GameState): DirectorMemory => ({
  // Champions restored from a snapshot are not re-announced
  seenPortalIds: new Set(state.activeSummonPortals.map((portal) => portal.id)),
  lastGiftBannerId: state.activeGiftBanner?.id ?? null,
  lastSkillTimestamp: state.activeBossSkillBanner?.timestamp ?? 0,
  hasAnnouncedEnrage: state.bossStatus === BOSS_STATUS.ENRAGED,
  hasAnnouncedLowHp: false,
  lastActivityAt: Date.now(),
  lastBanterSignal: null,
  nextBanterSilenceMs: CASTER_BANTER.ACTIVE_SILENCE_MS,
  damageLeader: getDamageLeader(state),
  peakLeadRatio: getLeadRatio(state),
  lastComebackAt: 0,
  livingCount: countLiving(state),
  narratedIntroShownAt: 0,
  preparedGoLine: null,
  preparedGoRound: 0,
  hasAnnouncedSeriesEnd: state.isSeriesEnded,
  pendingRoundEndTimer: null,
});

const announceNewSummons = (state: GameState, memory: DirectorMemory): void => {
  if (isCurrentRoundIntroActive()) return;
  if (memory.seenPortalIds.size > CASTER_EVENT_RULES.MAX_TRACKED_PORTALS) {
    memory.seenPortalIds = new Set(state.activeSummonPortals.map((portal) => portal.id));
    return;
  }
  for (const portal of state.activeSummonPortals) {
    if (memory.seenPortalIds.has(portal.id)) continue;
    memory.seenPortalIds.add(portal.id);
    memory.lastActivityAt = Date.now();
    if (BADGED_NAME.test(portal.summonerName)) continue;
    const speakerName = speakerFor(portal.summonerName, portal.team);
    castCasterSignal(
      CASTER_SIGNAL.SUMMON,
      { name: speakerName, champion: portal.championName, team: getTeamTag(portal.team) },
      { team: portal.team, speakerName, ttlMs: CASTER_QUEUE.SUMMON_NAME_TTL_MS }
    );
  }
};

const announceGiftBanner = (state: GameState, memory: DirectorMemory): void => {
  if (isCurrentRoundIntroActive()) return;
  const banner = state.activeGiftBanner;
  if (!banner || banner.id === memory.lastGiftBannerId) return;
  memory.lastGiftBannerId = banner.id;
  memory.lastActivityAt = Date.now();
  const signal = GIFT_TIER_SIGNAL[banner.tier];
  if (!signal) return;
  castCasterSignal(signal, {
    name: speakerFor(banner.donorName, banner.team),
    gift: banner.giftName,
    team: getTeamTag(banner.team),
    count: banner.streakCount ?? 1,
  });
};

const announceBossState = (state: GameState, memory: DirectorMemory): void => {
  if (isCurrentRoundIntroActive()) return;
  const bossName = getThemeConfig(state.gameTheme).bossName;
  if (state.bossStatus === BOSS_STATUS.ENRAGED && !memory.hasAnnouncedEnrage && state.bossHp > 0) {
    memory.hasAnnouncedEnrage = true;
    castCasterSignal(CASTER_SIGNAL.BOSS_ENRAGE, { boss: bossName });
  }
  const isLowHp = state.bossHp > 0 && state.bossHp <= state.bossMaxHp * CASTER_EVENT_RULES.LOW_HP_RATIO;
  if (isLowHp && !memory.hasAnnouncedLowHp) {
    memory.hasAnnouncedLowHp = true;
    castCasterSignal(CASTER_SIGNAL.BOSS_LOW_HP, { boss: bossName });
  }

  const skill = state.activeBossSkillBanner;
  if (!skill || skill.timestamp === memory.lastSkillTimestamp) return;
  memory.lastSkillTimestamp = skill.timestamp;
  if (skill.isUltimate) {
    castCasterSignal(CASTER_SIGNAL.BOSS_ULTIMATE, { boss: bossName, skill: skill.vietnameseName });
    return;
  }
  if (Math.random() < CASTER_EVENT_RULES.BOSS_SKILL_LINE_CHANCE) {
    castCasterSignal(CASTER_SIGNAL.BOSS_SKILL, { boss: bossName, skill: skill.vietnameseName });
  }
};

const announceRoundFlow = (state: GameState, prev: GameState, memory: DirectorMemory): void => {
  const bossName = getThemeConfig(state.gameTheme).bossName;
  const isNewRound =
    state.currentRound !== prev.currentRound || (prev.isRoundIntermission && !state.isRoundIntermission);
  // The new round itself is narrated by the round intro card (announceRoundIntro)
  if (isNewRound) {
    memory.hasAnnouncedEnrage = false;
    memory.hasAnnouncedLowHp = false;
    memory.damageLeader = null;
    memory.peakLeadRatio = 0;
    if (!state.isSeriesEnded) memory.hasAnnouncedSeriesEnd = false;
  }

  if (isNewRound) cancelPendingRoundEnd(memory);
  const isRoundJustWon = prev.roundWinner === null && state.roundWinner !== null;
  const isSeriesJustEnded = state.isSeriesEnded && Boolean(state.seriesWinner) && !memory.hasAnnouncedSeriesEnd;
  if (!isRoundJustWon && !isSeriesJustEnded) return;
  if (isSeriesJustEnded) memory.hasAnnouncedSeriesEnd = true;
  scheduleAtVictoryReveal(state, memory, () => {
    // Read the latest state: the leaderboard and finisher are final by the time the screen shows
    const latest = useGameStore.getState();
    if (isRoundJustWon && latest.roundWinner !== null) announceRoundEnd(latest, bossName);
    if (isSeriesJustEnded) announceSeriesEnd(latest);
  });
};

const cancelPendingRoundEnd = (memory: DirectorMemory): void => {
  if (memory.pendingRoundEndTimer === null) return;
  clearTimeout(memory.pendingRoundEndTimer);
  memory.pendingRoundEndTimer = null;
};

/**
 * The round is decided the instant the boss dies, but the victory screen only appears after the
 * death effects (and the gift finisher cinematic) have played. The round-end narration waits for it,
 * using the same delay as VictoryOverlay, so the caster talks over the screen it describes.
 */
const scheduleAtVictoryReveal = (state: GameState, memory: DirectorMemory, narrate: () => void): void => {
  cancelPendingRoundEnd(memory);
  const isDonorFinisher = isDonorFinisherCheck(state.finisherGiftName, state.finisherCoins);
  const sinceDefeatMs = state.bossDefeatedTimestamp > 0 ? Date.now() - state.bossDefeatedTimestamp : 0;
  const delayMs = Math.max(0, resolveDefeatShowcaseMs(isDonorFinisher) - sinceDefeatMs);
  memory.pendingRoundEndTimer = setTimeout(() => {
    memory.pendingRoundEndTimer = null;
    narrate();
  }, delayMs);
};

const endSequence = { ttlMs: CASTER_EVENT_RULES.ROUND_END_SEQUENCE_TTL_MS };

/**
 * Victory screen, in order: winner (most damage) → viewer MVP → pro MVP → top 3 thanks.
 * (The final blow is called at the kill itself, over the finisher visuals: see casterBattleMoments.)
 * The next round's intro clears whatever has not been said yet.
 */
const announceRoundEnd = (state: GameState, bossName: string): void => {
  const winner = state.roundWinner;
  if (!winner) return;
  castCasterSignal(
    CASTER_SIGNAL.ROUND_WIN,
    { team: getTeamTag(winner), boss: bossName, round: state.currentRound, score: getSeriesScore(state) },
    endSequence
  );

  const [mvp, second, third] = state.leaderboard;
  if (mvp) {
    castCasterSignal(
      CASTER_SIGNAL.MVP,
      { name: speakerFor(mvp.userName, mvp.team), dmg: formatSpeechNumber(mvp.totalDamage), team: getTeamTag(mvp.team) },
      endSequence
    );
  }
  const proMvp = state.proLeaderboard[0];
  if (proMvp) {
    castCasterSignal(
      CASTER_SIGNAL.PRO_MVP,
      {
        name: proMvp.playerName,
        champion: proMvp.championName,
        team: getTeamTag(proMvp.team),
        dmg: formatSpeechNumber(proMvp.totalDamage),
      },
      endSequence
    );
  }
  if (state.leaderboard.length >= CASTER_EVENT_RULES.PODIUM_SIZE && second && third) {
    castCasterSignal(
      CASTER_SIGNAL.PODIUM_THANKS,
      { a: speakerFor(mvp?.userName, mvp?.team), b: speakerFor(second.userName, second.team), c: speakerFor(third.userName, third.team) },
      endSequence
    );
  }
};

/** Series over: champion, thanks, and the next queued matchup if there is one. */
const announceSeriesEnd = (state: GameState): void => {
  if (!state.seriesWinner) return;
  castCasterSignal(
    CASTER_SIGNAL.SERIES_WIN,
    { team: getTeamTag(state.seriesWinner), score: getSeriesScore(state) },
    endSequence
  );
  castCasterSignal(CASTER_SIGNAL.SERIES_OUTRO, { team: getTeamTag(state.seriesWinner) }, endSequence);
  const nextMatch = state.matchQueue[0];
  if (!nextMatch) return;
  const findTag = (teamId: string): string => state.teamCatalog.find((team) => team.id === teamId)?.shortTag ?? '';
  castCasterSignal(
    CASTER_SIGNAL.NEXT_MATCH,
    { teamA: findTag(nextMatch.leftTeamId), teamB: findTag(nextMatch.rightTeamId) },
    endSequence
  );
};

/**
 * "Lội ngược dòng!" only for a real comeback: the team that lost the lead had been clearly
 * ahead, there was a real fight, and champions are on the field (not pros trading hits).
 */
const announceComeback = (state: GameState, memory: DirectorMemory): void => {
  if (isCurrentRoundIntroActive()) return;
  const leader = getDamageLeader(state);
  const leadRatio = getLeadRatio(state);
  if (!leader) return;
  if (leader === memory.damageLeader) {
    memory.peakLeadRatio = Math.max(memory.peakLeadRatio, leadRatio);
    return;
  }
  const previousLeader = memory.damageLeader;
  const previousPeakLead = memory.peakLeadRatio;
  memory.damageLeader = leader;
  memory.peakLeadRatio = leadRatio;
  const leftScore = state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG;
  const rightScore = state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG;
  const totalDamage = leftScore + rightScore;
  const now = Date.now();
  const isRealComeback =
    previousLeader !== null &&
    previousPeakLead >= CASTER_EVENT_RULES.COMEBACK_MIN_PEAK_LEAD_RATIO &&
    memory.livingCount > 0 &&
    totalDamage >= CASTER_EVENT_RULES.COMEBACK_MIN_TOTAL_DAMAGE &&
    now - memory.lastComebackAt >= CASTER_EVENT_RULES.COMEBACK_COOLDOWN_MS;
  if (!isRealComeback) return;
  memory.lastComebackAt = now;
  castCasterSignal(CASTER_SIGNAL.COMEBACK, { team: getTeamTag(leader), teamOther: getTeamTag(previousLeader) });
};

/**
 * Boss wiped the field: the caster calls it, the boss gloats in its own voice,
 * then the caster rallies viewers with how to get back in.
 */
const announceFieldWipe = (state: GameState, memory: DirectorMemory): void => {
  const living = countLiving(state);
  const fallen = memory.livingCount;
  memory.livingCount = living;
  const isWipe = living === 0 && fallen >= CASTER_EVENT_RULES.WIPE_MIN_LIVING && isBattleRunning(state);
  if (!isWipe) return;
  triggerFieldWipe(fallen);
  const [leftTeam, rightTeam] = getTeamKeys(state);
  const slots: CasterSlots = {
    boss: getThemeConfig(state.gameTheme).bossName,
    count: fallen,
    teamA: getTeamTag(leftTeam),
    teamB: getTeamTag(rightTeam),
    champion: GUIDE_CHAMPIONS[Math.floor(Math.random() * GUIDE_CHAMPIONS.length)],
  };
  const ttlMs = CASTER_EVENT_RULES.WIPE_SEQUENCE_TTL_MS;
  castCasterSignal(CASTER_SIGNAL.WIPE, slots, { ttlMs });
  castCasterSignal(CASTER_SIGNAL.BOSS_WIPE_TAUNT, slots, { voice: CASTER_VOICE.BOSS, ttlMs });
  castCasterSignal(CASTER_SIGNAL.EMPTY_FIELD_RALLY, slots, { ttlMs });
};

/**
 * Reads the round intro card: welcome or matchup, the star duel shown on the card,
 * then exactly the chat commands the card suggests. "Xung trận!" follows when the card closes.
 */
const announceRoundIntro = (shownAt: number, memory: DirectorMemory): void => {
  if (
    !useCasterStore.getState().isTtsEnabled ||
    useGameStore.getState().silverScrapesState.isActive ||
    shownAt === memory.narratedIntroShownAt
  )
    return;
  memory.narratedIntroShownAt = shownAt;
  const state = useGameStore.getState();
  const [leftTeam, rightTeam] = getTeamKeys(state);
  const leftStar = pickIntroStar(state.activeTeams[leftTeam], INTRO_STAR_FALLBACK_CHAMPION.LEFT);
  const rightStar = pickIntroStar(state.activeTeams[rightTeam], INTRO_STAR_FALLBACK_CHAMPION.RIGHT);
  const slots: CasterSlots = {
    round: state.currentRound,
    format: state.seriesFormat,
    wins: state.bo5TargetWins,
    teamA: getTeamTag(leftTeam),
    teamB: getTeamTag(rightTeam),
    boss: getThemeConfig(state.gameTheme).bossName,
    hp: formatSpeechNumber(state.bossMaxHp),
    damage: GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_DAMAGE_PER_COIN,
    starA: leftStar.name,
    champA: leftStar.signatureChampion,
    starB: rightStar.name,
    champB: rightStar.signatureChampion,
  };
  casterQueue.clear();
  // Tab-by-tab narration (Matchup, Rules, Gifts) is managed directly by RoundIntroOverlay
  // to synchronize with visual tabs, allow interactive clicks, and avoid overlapping speech.
  warmPredictableLines(GUIDE_CHAMPIONS);
  memory.preparedGoLine = composeCasterLine(CASTER_SIGNAL.ROUND_GO, slots);
  memory.preparedGoRound = state.currentRound;
  if (memory.preparedGoLine) casterSpeechEngine.prefetch(memory.preparedGoLine, getCasterLang());
};

/** The intro card closed (timer or "Xung trận ngay"): skip unread intro lines, let the current one finish, then go. */
const announceRoundGo = (memory: DirectorMemory): void => {
  casterQueue.dropPending(CASTER_INTRO_SIGNALS);
  if (!useCasterStore.getState().isTtsEnabled || useGameStore.getState().silverScrapesState.isActive) return;
  const isPreparedLineCurrent = memory.preparedGoRound === useGameStore.getState().currentRound;
  const text =
    (isPreparedLineCurrent ? memory.preparedGoLine : null) ??
    composeCasterLine(CASTER_SIGNAL.ROUND_GO, {
      round: useGameStore.getState().currentRound,
      boss: getThemeConfig(useGameStore.getState().gameTheme).bossName,
    });
  memory.preparedGoLine = null;
  if (!text) return;
  casterQueue.enqueue({
    signal: CASTER_SIGNAL.ROUND_GO,
    priority: CASTER_SIGNAL_PRIORITY[CASTER_SIGNAL.ROUND_GO],
    text,
    createdAt: Date.now(),
  });
};

/** The card may already be on screen when the director starts or when the voice gets switched on. */
const narrateActiveIntro = (memory: DirectorMemory): void => {
  const intro = useRoundIntroStore.getState();
  if (isCurrentRoundIntroActive()) announceRoundIntro(intro.shownAt, memory);
};

// ── Banter (spec 5.3) ─────────────────────────────────────────────────────────────

interface BanterFacts {
  isIdle: boolean;
  fieldCount: number;
  hpRatio: number;
  leadRatio: number;
  totalDamage: number;
  hasSeriesProgress: boolean;
}

/** A banter line is only allowed when what it says is true right now. */
const BANTER_REQUIREMENTS: Partial<Record<CasterSignal, (facts: BanterFacts) => boolean>> = {
  [CASTER_SIGNAL.BANTER_IDLE]: (facts) => facts.isIdle,
  [CASTER_SIGNAL.BANTER_HYPE]: (facts) => facts.fieldCount >= CASTER_BANTER_RULES.MIN_FIELD_COUNT,
  [CASTER_SIGNAL.BANTER_FIELD]: (facts) => facts.fieldCount >= CASTER_BANTER_RULES.MIN_FIELD_COUNT,
  [CASTER_SIGNAL.BANTER_BOSS_HP]: (facts) => facts.hpRatio <= CASTER_BANTER_RULES.MAX_BOSS_HP_RATIO,
  [CASTER_SIGNAL.BANTER_LEAD]: (facts) =>
    facts.leadRatio >= CASTER_BANTER_RULES.MIN_LEAD_RATIO && facts.totalDamage >= CASTER_BANTER_RULES.MIN_TOTAL_DAMAGE,
  [CASTER_SIGNAL.BANTER_SERIES]: (facts) => facts.hasSeriesProgress,
};

const collectBanterFacts = (state: GameState, isIdle: boolean, livingCount: number): BanterFacts => ({
  isIdle,
  fieldCount: livingCount,
  hpRatio: state.bossHp / Math.max(1, state.bossMaxHp),
  leadRatio: getLeadRatio(state),
  totalDamage:
    (state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG) +
    (state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG),
  hasSeriesProgress: Object.values(state.bo5Score).some((wins) => wins > 0),
});

const pickBanterSignal = (facts: BanterFacts, isFieldEmpty: boolean, lastSignal: CasterSignal | null): CasterSignal => {
  const weights = isFieldEmpty ? CASTER_EMPTY_FIELD_BANTER_WEIGHTS : CASTER_BANTER_WEIGHTS;
  const options = weights.filter(
    ([signal]) => signal !== lastSignal && (BANTER_REQUIREMENTS[signal]?.(facts) ?? true)
  );
  const totalWeight = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * totalWeight;
  for (const [signal, weight] of options) {
    roll -= weight;
    if (roll <= 0) return signal;
  }
  return CASTER_SIGNAL.BANTER_GUIDE;
};

const buildBanterSlots = (state: GameState, livingCount: number): CasterSlots => {
  const [leftTeam, rightTeam] = getTeamKeys(state);
  const leader = getDamageLeader(state) ?? leftTeam;
  return {
    teamA: getTeamTag(leftTeam),
    teamB: getTeamTag(rightTeam),
    team: getTeamTag(leader),
    teamOther: getTeamTag(getOtherTeam(leader)),
    score: getSeriesScore(state),
    champion: GUIDE_CHAMPIONS[Math.floor(Math.random() * GUIDE_CHAMPIONS.length)],
    boss: getThemeConfig(state.gameTheme).bossName,
    hpPercent: Math.ceil((state.bossHp / Math.max(1, state.bossMaxHp)) * CASTER_EVENT_RULES.PERCENT),
    fieldCount: livingCount,
    round: state.currentRound,
    format: state.seriesFormat,
  };
};

const resolveNextBanterSilence = (isIdle: boolean, isFieldEmpty: boolean): number => {
  if (isFieldEmpty) return CASTER_BANTER.EMPTY_FIELD_SILENCE_MS;
  if (isIdle) return randomBetween(CASTER_BANTER.IDLE_SILENCE_MIN_MS, CASTER_BANTER.IDLE_SILENCE_MAX_MS);
  return CASTER_BANTER.ACTIVE_SILENCE_MS;
};

const isBanterAllowed = (state: GameState): boolean =>
  !state.isRoundIntermission &&
  state.roundWinner === null &&
  !state.isSeriesEnded &&
  state.bossHp > 0 &&
  !state.silverScrapesState.isActive &&
  !isCurrentRoundIntroActive();

const tickBanter = (memory: DirectorMemory): void => {
  if (!useCasterStore.getState().isTtsEnabled) return;
  const state = useGameStore.getState();
  if (!isBanterAllowed(state)) return;
  const now = Date.now();
  const requiredSilenceMs =
    memory.livingCount === 0 ? CASTER_BANTER.EMPTY_FIELD_SILENCE_MS : memory.nextBanterSilenceMs;
  if (casterQueue.getSilenceMs(now) < requiredSilenceMs) return;

  const isIdle = now - memory.lastActivityAt > CASTER_BANTER.IDLE_AFTER_MS;
  const isFieldEmpty = memory.livingCount === 0;
  // Empty field: the boss and the caster take turns (pros may still be hitting, so the
  // boss's own "restless" idle state is not reached)
  if (isFieldEmpty && memory.lastBanterSignal !== CASTER_SIGNAL.BOSS_TAUNT) {
    memory.lastBanterSignal = CASTER_SIGNAL.BOSS_TAUNT;
    memory.nextBanterSilenceMs = CASTER_BANTER.EMPTY_FIELD_SILENCE_MS;
    const taunt = resolveBossSpeechItem(bossSpeechManager.getNextSpeech(state.gameTheme, 'RESTLESS'), state.activeTeams);
    showBossTaunt(taunt.text);
    return;
  }
  const facts = collectBanterFacts(state, isIdle, memory.livingCount);
  const signal = pickBanterSignal(facts, isFieldEmpty, memory.lastBanterSignal);
  memory.lastBanterSignal = signal;
  memory.nextBanterSilenceMs = resolveNextBanterSilence(isIdle, isFieldEmpty);
  castCasterSignal(signal, buildBanterSlots(state, memory.livingCount));
};

/** Starts listening to the game; returns the cleanup for the mounting effect. */
export const startCasterDirector = (): (() => void) => {
  const memory = createMemory(useGameStore.getState());
  const momentMemory = createBattleMomentMemory(useGameStore.getState());
  // Runs on every store update: reference checks only, no allocation unless something changed
  const unsubscribe = useGameStore.subscribe((state, prev) => {
    if (state.silverScrapesState.isActive) {
      // The duel silences the battle chatter; only its own lines are said
      if (!prev.silverScrapesState.isActive) {
        casterQueue.clear();
        casterSpeechEngine.interrupt();
      }
      announceDuelMoments(state, prev);
      return;
    }
    // The result may land on the same update that ends the duel
    announceDuelMoments(state, prev);
    announceBattleMoments(state, prev, momentMemory);
    if (state.activeSummonPortals !== prev.activeSummonPortals) announceNewSummons(state, memory);
    if (state.minions !== prev.minions) announceFieldWipe(state, memory);
    if (state.activeGiftBanner !== prev.activeGiftBanner) announceGiftBanner(state, memory);
    const hasBossChange =
      state.bossStatus !== prev.bossStatus ||
      state.bossHp !== prev.bossHp ||
      state.activeBossSkillBanner !== prev.activeBossSkillBanner;
    if (hasBossChange) announceBossState(state, memory);
    const hasRoundChange =
      state.roundWinner !== prev.roundWinner ||
      state.currentRound !== prev.currentRound ||
      state.isRoundIntermission !== prev.isRoundIntermission ||
      state.isSeriesEnded !== prev.isSeriesEnded;
    if (hasRoundChange) announceRoundFlow(state, prev, memory);
    const leftScore = state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG;
    const prevLeftScore = prev.teamScores?.[TEAM_KEY.BLG] ?? prev.teamScoreBLG;
    const rightScore = state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG;
    const prevRightScore = prev.teamScores?.[TEAM_KEY.GENG] ?? prev.teamScoreGENG;
    if (leftScore !== prevLeftScore || rightScore !== prevRightScore) {
      announceComeback(state, memory);
    }
  });
  const unsubscribeIntro = useRoundIntroStore.subscribe((intro, prevIntro) => {
    if (intro.isActive && intro.shownAt !== prevIntro.shownAt) announceRoundIntro(intro.shownAt, memory);
    if (prevIntro.isActive && !intro.isActive) announceRoundGo(memory);
  });
  const unsubscribeVoice = useCasterStore.subscribe((caster, prevCaster) => {
    if (!caster.isTtsEnabled || prevCaster.isTtsEnabled) return;
    narrateActiveIntro(memory);
    warmPredictableLines(GUIDE_CHAMPIONS);
  });
  narrateActiveIntro(memory);
  const banterTimer = setInterval(() => tickBanter(memory), CASTER_BANTER.TICK_MS);
  return () => {
    unsubscribe();
    unsubscribeIntro();
    unsubscribeVoice();
    clearInterval(banterTimer);
    cancelPendingRoundEnd(memory);
    casterQueue.clear();
  };
};
