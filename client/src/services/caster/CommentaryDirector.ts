/**
 * CommentaryDirector.ts
 *
 * Event director that reads real-time game state and dispatches standardized
 * static caster categories to `VoiceManager` (offline MP3s, zero `viet-tts` runtime calls):
 * - `match_start`, `match_end`, `lead_change`, `close_race`, `boss_low_hp`, `boss_killed`,
 *   `cta_hype`, `cta_trailing`, `hype_short`, plus boss mechanics & VIP donor reactions.
 */

import { CASTER_CATEGORY } from '../../data/castersIndex';
import { TEAM_KEY, TeamType } from '../../constants/game';
import { useGameStore } from '../../store/gameStore';
import { VoiceManager } from './VoiceManager';

const PRONUNCIATION_MAP: Readonly<Record<string, string>> = {
  'GEN.G': 'Gen Gi',
  'GEN G': 'Gen Gi',
  'GENG': 'Gen Gi',
  'GEN': 'Gen Gi',
  'T1': 'Tê Một',
  'G2': 'Gờ Hai',
  'HLE': 'Hắc Lờ E',
  'BLG': 'Bê Lờ Gờ',
  'GAM': 'Gam',
  'TES': 'Tê E Ét',
  'DK': 'Đê Ka',
  'KT': 'Ka Tê',
  'JDG': 'Ji Đi Gi',
  'WBG': 'Đắp Lờ Bê Gi',
  'FNC': 'Ép Nờ Xê',
};

export const ROUND_NUMBER_WORDS: Readonly<Record<number, string>> = {
  1: 'một',
  2: 'hai',
  3: 'ba',
  4: 'bốn',
  5: 'năm',
};

export function getPhoneticTeamName(nameOrTag: string): string {
  let upper = (nameOrTag || '').trim().toUpperCase();
  upper = upper.replace(/\bESPORTS\b|\bGAMING\b/gi, '').trim();
  if (PRONUNCIATION_MAP[upper]) {
    return PRONUNCIATION_MAP[upper];
  }
  const sortedKeys = Object.keys(PRONUNCIATION_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (upper.includes(key)) {
      return upper.replace(key, PRONUNCIATION_MAP[key]).trim();
    }
  }
  return nameOrTag || 'Đội tuyển';
}

export const COMMENTARY_CONFIG = {
  TICK_INTERVAL_MS: 1_500,
  COMEBACK_COOLDOWN_MS: 12_000,
  PERIODIC_COOLDOWN_MS: 16_000,
  INITIAL_PERIODIC_DELAY_MS: 5_000,
  QUIET_CHECK_WINDOW_MS: 5_000,
  COMEBACK_THRESHOLD_PERCENT: 2,
  DOMINATING_THRESHOLD_PERCENT: 20,
  NECK_AND_NECK_THRESHOLD_PERCENT: 5,
  CLUTCH_FINAL_DIFF_PERCENT: 10,
  LEADER_TIE_MARGIN_PERCENT: 0.5,
  BOSS_LOW_HP_RATIO: 0.2,
  BOSS_HALF_HP_RATIO: 0.5,
  FINAL_COUNTDOWN_SECONDS: 10,
  HYPE_SHORT_CHANCE: 0.25,
} as const;

const MILESTONE_KEY = {
  BOSS_HP_50: 'boss_hp_50',
  BOSS_LOW_HP: 'boss_low_hp',
  BOSS_KILLED: 'boss_killed',
  FINAL_10S: 'final_10s',
} as const;

type LeaderSide = 'blue' | 'red' | 'tie';

function resolveLeaderSide(bluePct: number, redPct: number): LeaderSide {
  if (bluePct > redPct + COMMENTARY_CONFIG.LEADER_TIE_MARGIN_PERCENT) return 'blue';
  if (redPct > bluePct + COMMENTARY_CONFIG.LEADER_TIE_MARGIN_PERCENT) return 'red';
  return 'tie';
}

export class CommentaryDirectorService {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private currentRound = -1;
  private triggeredMilestones = new Set<string>();
  private previousLeader: LeaderSide = 'tie';
  private lastComebackAt = 0;
  private lastPeriodicAt = 0;
  private lastInteractionCount = 0;
  private lastInteractionCheckAt = Date.now();
  private isRoundActive = false;

  public start(): () => void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    this.timerId = setInterval(() => this.tick(), COMMENTARY_CONFIG.TICK_INTERVAL_MS);
    this.tick();

    return () => this.stop();
  }

  public stop(): void {
    if (!this.timerId) return;
    clearInterval(this.timerId);
    this.timerId = null;
  }

  /** Called when a round officially begins combat. */
  public onRoundStart(roundNumber: number, _teamAName?: string, _teamBName?: string): void {
    this.currentRound = roundNumber;
    this.triggeredMilestones.clear();
    this.previousLeader = 'tie';
    this.lastComebackAt = Date.now();
    this.lastPeriodicAt = Date.now() + COMMENTARY_CONFIG.INITIAL_PERIODIC_DELAY_MS;
    this.isRoundActive = true;

    VoiceManager.playCaster(CASTER_CATEGORY.MATCH_START);
  }

  /** Called when round ends — plays static offline `match_end` clip. */
  public onRoundEnd(_winnerTeam: TeamType | null): void {
    this.isRoundActive = false;
    VoiceManager.playCaster(CASTER_CATEGORY.MATCH_END);
  }

  /** Called when boss is defeated. */
  public onBossKilled(): void {
    if (this.triggeredMilestones.has(MILESTONE_KEY.BOSS_KILLED)) return;
    this.triggeredMilestones.add(MILESTONE_KEY.BOSS_KILLED);
    VoiceManager.playCaster(CASTER_CATEGORY.BOSS_KILLED);
  }

  /** Called when a VIP gift is received — reads dynamic donor name via `/api/tts` then chains static reaction. */
  public onVipDonation(donorName: string, giftName: string): void {
    const cleanName = VoiceManager.cleanNickname(donorName);
    const text = `Cảm ơn ${cleanName} đã gửi tặng ${giftName}!`;
    VoiceManager.speakDynamic(text, CASTER_CATEGORY.DONATE_REACT_VIP);
  }

  public onShieldUp(): void {
    VoiceManager.playCaster(CASTER_CATEGORY.SHIELD_UP);
  }

  public onShieldBroken(): void {
    VoiceManager.playCaster(CASTER_CATEGORY.SHIELD_BROKEN);
  }

  public onBossEnrage(): void {
    VoiceManager.playCaster(CASTER_CATEGORY.BOSS_ENRAGE);
  }

  public onBossSkill(): void {
    VoiceManager.playCaster(CASTER_CATEGORY.BOSS_SKILL);
  }

  public onSilverScrapesStart(): void {
    VoiceManager.playCaster(CASTER_CATEGORY.SILVER_SCRAPES_START);
  }

  public playShortHype(): void {
    VoiceManager.playCaster(CASTER_CATEGORY.HYPE_SHORT);
  }

  private tick(): void {
    const state = useGameStore.getState();
    const now = Date.now();

    if (state.currentRound !== this.currentRound && !state.isRoundIntermission) {
      this.onRoundStart(state.currentRound);
      return;
    }

    if (this.isRoundActive && state.bossHp <= 0 && !this.triggeredMilestones.has(MILESTONE_KEY.BOSS_KILLED)) {
      this.onBossKilled();
      return;
    }

    if (!this.isRoundActive || state.bossHp <= 0 || state.isRoundIntermission) {
      return;
    }

    const scoreBlue = state.teamScores[TEAM_KEY.BLG] || 0;
    const scoreRed = state.teamScores[TEAM_KEY.GENG] || 0;
    const totalScore = scoreBlue + scoreRed;

    const bluePct = totalScore > 0 ? (scoreBlue / totalScore) * 100 : 50;
    const redPct = totalScore > 0 ? (scoreRed / totalScore) * 100 : 50;
    const diffPct = Math.abs(bluePct - redPct);
    const currentLeader = resolveLeaderSide(bluePct, redPct);

    // 1. Lead change / comeback
    const isLeadChanged =
      this.previousLeader !== 'tie' &&
      currentLeader !== 'tie' &&
      currentLeader !== this.previousLeader &&
      diffPct >= COMMENTARY_CONFIG.COMEBACK_THRESHOLD_PERCENT &&
      now - this.lastComebackAt >= COMMENTARY_CONFIG.COMEBACK_COOLDOWN_MS;

    if (isLeadChanged) {
      this.lastComebackAt = now;
      this.previousLeader = currentLeader;
      VoiceManager.playCaster(CASTER_CATEGORY.LEAD_CHANGE);
      return;
    }
    if (this.previousLeader === 'tie' && currentLeader !== 'tie') {
      this.previousLeader = currentLeader;
    }

    // 2. Boss HP milestones
    const bossMaxHp = state.bossMaxHp || 1;
    const bossHpRatio = state.bossHp / bossMaxHp;

    if (
      bossHpRatio <= COMMENTARY_CONFIG.BOSS_HALF_HP_RATIO &&
      bossHpRatio > COMMENTARY_CONFIG.BOSS_LOW_HP_RATIO &&
      !this.triggeredMilestones.has(MILESTONE_KEY.BOSS_HP_50)
    ) {
      this.triggeredMilestones.add(MILESTONE_KEY.BOSS_HP_50);
      VoiceManager.playCaster(CASTER_CATEGORY.BOSS_HP_50);
      return;
    }

    if (
      bossHpRatio <= COMMENTARY_CONFIG.BOSS_LOW_HP_RATIO &&
      !this.triggeredMilestones.has(MILESTONE_KEY.BOSS_LOW_HP)
    ) {
      this.triggeredMilestones.add(MILESTONE_KEY.BOSS_LOW_HP);
      VoiceManager.playCaster(CASTER_CATEGORY.BOSS_LOW_HP);
      return;
    }

    // 3. Final 10 seconds in Silver Scrapes
    if (state.silverScrapesState?.isActive) {
      const remainingSec = Math.max(0, Math.floor(state.silverScrapesState.timeRemaining / 1_000));
      if (
        remainingSec <= COMMENTARY_CONFIG.FINAL_COUNTDOWN_SECONDS &&
        remainingSec > 0 &&
        !this.triggeredMilestones.has(MILESTONE_KEY.FINAL_10S)
      ) {
        this.triggeredMilestones.add(MILESTONE_KEY.FINAL_10S);
        const category =
          diffPct <= COMMENTARY_CONFIG.CLUTCH_FINAL_DIFF_PERCENT
            ? CASTER_CATEGORY.CLUTCH_FINAL_10S
            : CASTER_CATEGORY.ONE_SIDED_FINAL_10S;
        VoiceManager.playCaster(category);
        return;
      }
    }

    // 4. Periodic commentary (CTA / close race / trailing rally / short hype)
    if (now - this.lastPeriodicAt < COMMENTARY_CONFIG.PERIODIC_COOLDOWN_MS) {
      return;
    }

    const totalLikes = (state.totalLikesBLG || 0) + (state.totalLikesGENG || 0);
    const currentInteractions = totalLikes + (state.minions?.length || 0);
    const isQuiet =
      currentInteractions === this.lastInteractionCount &&
      now - this.lastInteractionCheckAt >= COMMENTARY_CONFIG.QUIET_CHECK_WINDOW_MS;

    this.lastInteractionCount = currentInteractions;
    this.lastInteractionCheckAt = now;
    this.lastPeriodicAt = now;

    if (isQuiet) {
      VoiceManager.playCaster(CASTER_CATEGORY.CTA_HYPE);
      return;
    }

    if (diffPct <= COMMENTARY_CONFIG.NECK_AND_NECK_THRESHOLD_PERCENT) {
      VoiceManager.playCaster(CASTER_CATEGORY.CLOSE_RACE);
      return;
    }

    if (diffPct >= COMMENTARY_CONFIG.DOMINATING_THRESHOLD_PERCENT) {
      VoiceManager.playCaster(CASTER_CATEGORY.CTA_TRAILING);
      return;
    }

    if (Math.random() < COMMENTARY_CONFIG.HYPE_SHORT_CHANCE) {
      VoiceManager.playCaster(CASTER_CATEGORY.HYPE_SHORT);
    }
  }
}

export const CommentaryDirector = new CommentaryDirectorService();
