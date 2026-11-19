/**
 * CommentaryDirector.ts
 * 
 * Event director that reads real-time game state and dispatches appropriate
 * commentary lines to VoiceManager:
 * - onRoundStart: Calls speakDynamic with team names mapped to Blue (Team A) & Red (Team B)
 * - Comebacks: Triggered when leading team changes with difference >= 2% (cooldown: 12s)
 * - Milestones: boss_hp_50, boss_low_hp (<=20%), clutch_final_10s, one_sided_final_10s (triggered once per round)
 * - Periodic commentary (idle / dominating / neck and neck) every 15-20s
 */

import { VoiceManager } from './VoiceManager';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY, TeamType } from '../../constants/game';

const PRONUNCIATION_MAP: Record<string, string> = {
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

export const ROUND_NUMBER_WORDS: Record<number, string> = {
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
  // Try word-based matching, longer keys first
  const sortedKeys = Object.keys(PRONUNCIATION_MAP).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (upper.includes(key)) {
      return upper.replace(key, PRONUNCIATION_MAP[key]).trim();
    }
  }
  return nameOrTag || 'Đội tuyển';
}

export const COMMENTARY_CONFIG = {
  TICK_INTERVAL_MS: 1500,
  COMEBACK_COOLDOWN_MS: 12000,
  PERIODIC_COOLDOWN_MS: 16000,
  COMEBACK_THRESHOLD_PERCENT: 2,
  DOMINATING_THRESHOLD_PERCENT: 20,
  NECK_AND_NECK_THRESHOLD_PERCENT: 5,
  BOSS_LOW_HP_RATIO: 0.20,
  BOSS_HALF_HP_RATIO: 0.50,
  FINAL_COUNTDOWN_SECONDS: 10,
} as const;

export class CommentaryDirectorService {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private currentRound = -1;
  private triggeredMilestones = new Set<string>();
  private previousLeader: 'blue' | 'red' | 'tie' = 'tie';
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

    // Initial check
    this.tick();

    return () => this.stop();
  }

  public stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  /**
   * Called when a round officially begins combat.
   * Plays the studio pre-recorded caster clip directly, avoiding Google TTS ("chị Google") voice overlap.
   */
  public onRoundStart(roundNumber: number, _teamAName?: string, _teamBName?: string): void {
    this.currentRound = roundNumber;
    this.triggeredMilestones.clear();
    this.previousLeader = 'tie';
    this.lastComebackAt = Date.now();
    this.lastPeriodicAt = Date.now() + 5000; // Delay first periodic chatter
    this.isRoundActive = true;

    // Play high-quality studio pre-recorded round_start clip directly
    VoiceManager.playCaster('round_start');
  }

  /**
   * Called when round ends.
   */
  public onRoundEnd(winnerTeam: TeamType | null): void {
    this.isRoundActive = false;
    const state = useGameStore.getState();
    const teamKeys = Object.keys(state.activeTeams) as TeamType[];
    const leftKey = teamKeys[0] ?? TEAM_KEY.BLG;
    const rightKey = teamKeys[1] ?? TEAM_KEY.GENG;
    const leftTeam = state.activeTeams[leftKey]?.name ?? 'Phe Trái';
    const rightTeam = state.activeTeams[rightKey]?.name ?? 'Phe Phải';
    const winnerName = winnerTeam === leftKey ? leftTeam : rightTeam;
    const phoneticWinner = getPhoneticTeamName(winnerName);

    const roundWord = ROUND_NUMBER_WORDS[state.currentRound] || String(state.currentRound);
    const winTemplates = [
      `${phoneticWinner} đã xuất sắc giành chiến thắng ván ${roundWord}! Màn trình diễn quá đỉnh cao!`,
      `Chiến thắng hoàn toàn thuộc về ${phoneticWinner}! ${phoneticWinner} đã thi đấu trên cơ hoàn toàn ở ván ${roundWord}!`,
      `Hạ màn ván đấu! ${phoneticWinner} đã xuất sắc giành chiến thắng ván ${roundWord} đầy thuyết phục!`,
      `Khúc khải hoàn vang lên! ${phoneticWinner} chính thức ca khúc khải hoàn ở ván ${roundWord}!`,
      `Một chiến thắng ngọt ngào dành tặng tất cả người hâm mộ của ${phoneticWinner}!`,
      `${phoneticWinner} đã giành chiến thắng chung cuộc ván ${roundWord}! Một chiến công cực kỳ rực rỡ!`,
      `Tiếng còi mãn cuộc! Vinh quang tuyệt đối thuộc về các chiến binh ${phoneticWinner} ở ván ${roundWord}!`,
    ];
    const winDynamicText = winTemplates[Math.floor(Math.random() * winTemplates.length)];

    if (winnerTeam === leftKey) {
      VoiceManager.speakDynamic(winDynamicText, 'blue_win');
    } else {
      VoiceManager.speakDynamic(winDynamicText, 'red_win');
    }
  }

  /**
   * Called when a VIP gift is received.
   */
  public onVipDonation(donorName: string, giftName: string): void {
    const cleanName = VoiceManager.cleanNickname(donorName);
    const text = `Cảm ơn ${cleanName} đã gửi tặng ${giftName}!`;
    VoiceManager.speakDynamic(text, 'donate_react_vip');
  }

  /**
   * Called when boss triggers a shield.
   */
  public onShieldUp(): void {
    VoiceManager.playCaster('shield_up');
  }

  /**
   * Called when boss shield is broken.
   */
  public onShieldBroken(): void {
    VoiceManager.playCaster('shield_broken');
  }

  /**
   * Called when boss enrages.
   */
  public onBossEnrage(): void {
    VoiceManager.playCaster('boss_enrage');
  }

  /**
   * Called when boss casts a skill.
   */
  public onBossSkill(): void {
    VoiceManager.playCaster('boss_skill');
  }

  /**
   * Called when silver scrapes duel starts.
   */
  public onSilverScrapesStart(): void {
    VoiceManager.playCaster('silver_scrapes_start');
  }

  private tick(): void {
    const state = useGameStore.getState();
    const now = Date.now();

    // Check round start transition (only trigger when active and not in intermission/intro)
    if (state.currentRound !== this.currentRound && !state.isRoundIntermission) {
      const teamKeys = Object.keys(state.activeTeams) as TeamType[];
      const leftKey = teamKeys[0] ?? TEAM_KEY.BLG;
      const rightKey = teamKeys[1] ?? TEAM_KEY.GENG;
      const leftTeam = state.activeTeams[leftKey]?.name ?? 'Đội Xanh';
      const rightTeam = state.activeTeams[rightKey]?.name ?? 'Đội Đỏ';
      this.onRoundStart(state.currentRound, leftTeam, rightTeam);
      return;
    }

    if (!this.isRoundActive || state.bossHp <= 0 || state.isRoundIntermission) {
      return;
    }

    // Scores & Leader
    const scoreBlue = state.teamScores[TEAM_KEY.BLG] || 0;
    const scoreRed = state.teamScores[TEAM_KEY.GENG] || 0;
    const totalScore = scoreBlue + scoreRed;

    let bluePct = 50;
    let redPct = 50;
    if (totalScore > 0) {
      bluePct = (scoreBlue / totalScore) * 100;
      redPct = (scoreRed / totalScore) * 100;
    }

    const diffPct = Math.abs(bluePct - redPct);
    const currentLeader: 'blue' | 'red' | 'tie' =
      bluePct > redPct + 0.5 ? 'blue' : redPct > bluePct + 0.5 ? 'red' : 'tie';

    // 1. Check Comeback (Leader changed with gap >= 2%, cooldown 12s)
    if (
      this.previousLeader !== 'tie' &&
      currentLeader !== 'tie' &&
      currentLeader !== this.previousLeader &&
      diffPct >= COMMENTARY_CONFIG.COMEBACK_THRESHOLD_PERCENT &&
      now - this.lastComebackAt >= COMMENTARY_CONFIG.COMEBACK_COOLDOWN_MS
    ) {
      this.lastComebackAt = now;
      this.previousLeader = currentLeader;
      if (currentLeader === 'blue') {
        VoiceManager.playCaster('blue_comeback');
      } else {
        VoiceManager.playCaster('red_comeback');
      }
      return;
    }
    if (this.previousLeader === 'tie' && currentLeader !== 'tie') {
      this.previousLeader = currentLeader;
    }

    // 2. Boss HP Milestones (triggered once per round)
    const bossMaxHp = state.bossMaxHp || 1;
    const bossHpRatio = state.bossHp / bossMaxHp;

    if (
      bossHpRatio <= COMMENTARY_CONFIG.BOSS_HALF_HP_RATIO &&
      bossHpRatio > COMMENTARY_CONFIG.BOSS_LOW_HP_RATIO &&
      !this.triggeredMilestones.has('boss_hp_50')
    ) {
      this.triggeredMilestones.add('boss_hp_50');
      VoiceManager.playCaster('boss_hp_50');
      return;
    }

    if (
      bossHpRatio <= COMMENTARY_CONFIG.BOSS_LOW_HP_RATIO &&
      !this.triggeredMilestones.has('boss_low_hp')
    ) {
      this.triggeredMilestones.add('boss_low_hp');
      VoiceManager.playCaster('boss_low_hp');
      return;
    }

    // 3. Final 10 seconds check in Silver Scrapes or timer phase
    if (state.silverScrapesState?.isActive) {
      const remainingSec = Math.max(0, Math.floor(state.silverScrapesState.timeRemaining / 1000));
      if (remainingSec <= COMMENTARY_CONFIG.FINAL_COUNTDOWN_SECONDS && remainingSec > 0) {
        if (!this.triggeredMilestones.has('final_10s')) {
          this.triggeredMilestones.add('final_10s');
          if (diffPct <= 10) {
            VoiceManager.playCaster('clutch_final_10s');
          } else {
            VoiceManager.playCaster('one_sided_final_10s');
          }
          return;
        }
      }
    }

    // 4. Periodic Commentary when channel is idle (Cooldown 16s)
    if (now - this.lastPeriodicAt >= COMMENTARY_CONFIG.PERIODIC_COOLDOWN_MS) {
      // Check interactions in last 5s (likes + chat + minions)
      const totalLikes = (state.totalLikesBLG || 0) + (state.totalLikesGENG || 0);
      const currentInteractions = totalLikes + (state.minions?.length || 0);
      const isQuiet = currentInteractions === this.lastInteractionCount && (now - this.lastInteractionCheckAt >= 5000);

      this.lastInteractionCount = currentInteractions;
      this.lastInteractionCheckAt = now;
      this.lastPeriodicAt = now;

      if (isQuiet) {
        VoiceManager.playCaster('room_quiet_cta');
      } else if (diffPct <= COMMENTARY_CONFIG.NECK_AND_NECK_THRESHOLD_PERCENT) {
        VoiceManager.playCaster('neck_and_neck');
      } else if (diffPct >= COMMENTARY_CONFIG.DOMINATING_THRESHOLD_PERCENT) {
        if (currentLeader === 'blue') {
          VoiceManager.playCaster('blue_dominating');
        } else if (currentLeader === 'red') {
          VoiceManager.playCaster('red_dominating');
        }
      }
    }
  }
}

export const CommentaryDirector = new CommentaryDirectorService();
