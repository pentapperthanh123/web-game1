import { TeamType } from '../constants/game';
import { useGameStore } from '../store/gameStore';
import { gameSocket } from './socket';

export type MockLiveMode = 'natural' | 'highlight';

export interface MockLiveStatus {
  isActive: boolean;
  mode: MockLiveMode;
  phase: 'EARLY' | 'MID' | 'CLIMAX';
  phaseLabel: string;
  summonsCount: number;
  giftsCount: number;
  likesCount: number;
  lastAction: string;
}

const VIETNAMESE_VIEWER_NAMES = [
  'Minh Tuấn',
  'Quỳnh Anh',
  'Faker Fanboy',
  'Gà Con Chiến Tướng',
  'Hoàng Long',
  'Trâm Anh',
  'Tuấn Khang',
  'Bảo Ngọc',
  'Đức Huy',
  'Hải Đăng',
  'Huyền Trang',
  'Thanh Tùng',
  'Khánh Vy',
  'Anh Quân',
  'Phương Linh',
  'Tiến Dũng',
  'Thu Thảo',
  'Văn Hậu',
  'Mỹ Duyên',
  'Hoàng Nam',
  'Ngọc Ánh',
  'Việt Cường',
  'Kim Ngân',
  'Đăng Khoa',
  'Bích Phương',
  'Gia Bảo',
  'Thùy Dung',
  'Quang Hải',
  'Hồng Nhung',
  'Chovy Gánh Team',
  'Bin Bổ Củi',
  'Quân Sư Keria',
  'Oner Trộm Rồng',
  'Gumayusi Gáy Khét',
  'Ruler Đỉnh Chóp',
  'Knight Múa Kiếm',
] as const;

const SMALL_GIFTS = [
  { name: 'Hoa Hồng', coins: 1, streakRange: [1, 10] },
  { name: 'Trái Tim', coins: 1, streakRange: [1, 5] },
  { name: 'Cà Phê', coins: 1, streakRange: [1, 3] },
  { name: 'Pháo Giấy Mini', coins: 1, streakRange: [1, 5] },
] as const;

const MEDIUM_GIFTS = [
  { name: 'Mũ Bảo Hiểm', coins: 99, streakRange: [1, 1] },
  { name: 'Corgi Lắc Mông', coins: 30, streakRange: [1, 2] },
  { name: 'Nước Hoa VIP', coins: 200, streakRange: [1, 1] },
  { name: 'Donut Ngọt Ngào', coins: 30, streakRange: [1, 3] },
] as const;

const BIG_GIFTS = [
  { name: 'Súng Nước Siêu Cấp', coins: 99, streakRange: [1, 1] },
  { name: 'Xe Bay Hoàng Gia', coins: 500, streakRange: [1, 1] },
  { name: 'Thiên Nga Pha Lê', coins: 699, streakRange: [1, 1] },
] as const;

const MEGA_GIFTS = [
  { name: 'Sư Tử Hùng Vĩ', coins: 1000, streakRange: [1, 1] },
  { name: 'Lâu Đài Hoàng Kim', coins: 2500, streakRange: [1, 1] },
  { name: 'Tàu Vũ Trụ Tối Thượng', coins: 5000, streakRange: [1, 1] },
] as const;

const FALLBACK_CHAMPIONS = ['Ahri', 'Yasuo', 'Lee Sin', 'Jinx', 'Aatrox', 'Zed', 'Akali', 'Yone'] as const;

const SIMULATION_TIMING = {
  NATURAL: { minMs: 1400, maxMs: 2400 },
  HIGHLIGHT: { minMs: 700, maxMs: 1200 },
} as const;

const RANDOM_PICK_FRACTION = 0.5;

class MockLiveSimulator {
  private active = false;
  private currentMode: MockLiveMode = 'natural';
  private timer: ReturnType<typeof setTimeout> | null = null;
  private summonsCount = 0;
  private giftsCount = 0;
  private likesCount = 0;
  private lastAction = '';
  private statusListeners: Array<(status: MockLiveStatus) => void> = [];

  public start(mode: MockLiveMode = 'natural', resetMatch = false): void {
    if (this.active && this.currentMode === mode && !resetMatch) return;
    this.stop();
    this.active = true;
    this.currentMode = mode;
    if (resetMatch) {
      this.summonsCount = 0;
      this.giftsCount = 0;
      this.likesCount = 0;
      this.lastAction = 'Đã reset ván mới, chuẩn bị xung trận!';
      this.scheduleNextTick(1800);
    } else {
      this.scheduleNextTick(300);
    }
    this.notifyStatus(resetMatch ? 'Đã reset ván 1 & bắt đầu giả lập live' : 'Đã bắt đầu giả lập live');
  }

  public stop(): void {
    this.active = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.notifyStatus('Đã dừng giả lập live');
  }

  public toggle(mode: MockLiveMode = 'natural'): boolean {
    if (this.active) {
      this.stop();
      return false;
    }
    this.start(mode);
    return true;
  }

  public isActive(): boolean {
    return this.active;
  }

  public getMode(): MockLiveMode {
    return this.currentMode;
  }

  public getStatus(): MockLiveStatus {
    const state = useGameStore.getState();
    const bossHpRatio = state.bossMaxHp > 0 ? state.bossHp / state.bossMaxHp : 1;
    let phase: 'EARLY' | 'MID' | 'CLIMAX' = 'EARLY';
    let phaseLabel = 'Đầu ván: Hoa hồng & Triệu hồi';

    if (bossHpRatio <= 0.3) {
      phase = 'CLIMAX';
      phaseLabel = 'Cao trào: Quà Khủng & Lội ngược dòng';
    } else if (bossHpRatio <= 0.6) {
      phase = 'MID';
      phaseLabel = 'Giữa ván: Quà Vừa & Rượt đuổi';
    }

    return {
      isActive: this.active,
      mode: this.currentMode,
      phase,
      phaseLabel,
      summonsCount: this.summonsCount,
      giftsCount: this.giftsCount,
      likesCount: this.likesCount,
      lastAction: this.lastAction,
    };
  }

  public subscribe(callback: (status: MockLiveStatus) => void): () => void {
    this.statusListeners.push(callback);
    callback(this.getStatus());
    return () => {
      this.statusListeners = this.statusListeners.filter((listener) => listener !== callback);
    };
  }

  private scheduleNextTick(delayMs?: number): void {
    if (!this.active) return;
    const timing = SIMULATION_TIMING[this.currentMode === 'highlight' ? 'HIGHLIGHT' : 'NATURAL'];
    const nextDelay = delayMs ?? timing.minMs + Math.random() * (timing.maxMs - timing.minMs);

    this.timer = setTimeout(() => {
      this.timer = null;
      this.tick();
    }, nextDelay);
  }

  private tick(): void {
    if (!this.active) return;
    const state = useGameStore.getState();

    // Pause simulation if round is halted, victory screen or intro is active
    if (state.bossHp <= 0 || state.roundWinner !== null || state.isRoundIntermission) {
      this.scheduleNextTick(2000);
      return;
    }

    const roll = Math.random();
    if (roll < 0.48) {
      this.simulateSummon(state);
    } else if (roll < 0.88) {
      this.simulateGift(state);
    } else {
      this.simulateLikes(state);
    }

    this.scheduleNextTick();
  }

  private pickRandomName(): string {
    return VIETNAMESE_VIEWER_NAMES[Math.floor(Math.random() * VIETNAMESE_VIEWER_NAMES.length)];
  }

  private resolveTargetTeam(state: ReturnType<typeof useGameStore.getState>): TeamType {
    const teams = Object.keys(state.activeTeams) as TeamType[];
    if (teams.length < 2) return teams[0] || 'BLG';

    const [leftTeam, rightTeam] = teams;
    const leftScore = state.teamScores?.[leftTeam] ?? 0;
    const rightScore = state.teamScores?.[rightTeam] ?? 0;
    const total = leftScore + rightScore;

    if (total <= 0) {
      return Math.random() < RANDOM_PICK_FRACTION ? leftTeam : rightTeam;
    }

    const leadRatio = Math.abs(leftScore - rightScore) / total;
    const trailingTeam = leftScore < rightScore ? leftTeam : rightTeam;
    const leadingTeam = leftScore >= rightScore ? leftTeam : rightTeam;

    // If one team is trailing by more than 20%, 75% chance to support trailing team to keep match exciting
    if (leadRatio > 0.2) {
      return Math.random() < 0.75 ? trailingTeam : leadingTeam;
    }

    return Math.random() < RANDOM_PICK_FRACTION ? leftTeam : rightTeam;
  }

  private simulateSummon(state: ReturnType<typeof useGameStore.getState>): void {
    const targetTeam = this.resolveTargetTeam(state);
    const viewerName = this.pickRandomName();
    const teamProfile = state.activeTeams[targetTeam];
    const teamTag = teamProfile?.shortTag || targetTeam;

    const roster = teamProfile?.roster ?? [];
    const pool = roster.length > 0 ? roster.map((p) => p.signatureChampion) : FALLBACK_CHAMPIONS;
    const champion = pool[Math.floor(Math.random() * pool.length)];

    state.summonMinion(viewerName, champion, targetTeam);
    state.addChatMessage(viewerName, `${champion} ${teamTag}`, targetTeam, champion);

    this.summonsCount += 1;
    this.lastAction = `${viewerName} triệu hồi ${champion} (${teamTag})`;
    this.notifyStatus(this.lastAction);
  }

  private simulateLikes(state: ReturnType<typeof useGameStore.getState>): void {
    const targetTeam = this.resolveTargetTeam(state);
    const viewerName = this.pickRandomName();
    const likeCount = Math.floor(Math.random() * 8) + 3;

    state.addLikes(likeCount, targetTeam, viewerName);
    this.likesCount += likeCount;
    this.lastAction = `${viewerName} thả ${likeCount} tim`;
    this.notifyStatus(this.lastAction);
  }

  private simulateGift(state: ReturnType<typeof useGameStore.getState>): void {
    const targetTeam = this.resolveTargetTeam(state);
    const viewerName = this.pickRandomName();
    const teamTag = state.activeTeams[targetTeam]?.shortTag || targetTeam;

    const bossHpRatio = state.bossMaxHp > 0 ? state.bossHp / state.bossMaxHp : 1;
    const leftScore = state.teamScores?.[Object.keys(state.activeTeams)[0] as TeamType] ?? 0;
    const rightScore = state.teamScores?.[Object.keys(state.activeTeams)[1] as TeamType] ?? 0;
    const total = leftScore + rightScore;
    const leadRatio = total > 0 ? Math.abs(leftScore - rightScore) / total : 0;

    let selectedGift: { name: string; coins: number; streakRange: readonly [number, number] };

    // Escalating gift tiers based on Boss HP and comeback situations
    if (bossHpRatio <= 0.3 || leadRatio > 0.35) {
      // Climax phase or heavy comeback: Big and Mega gifts drop!
      const tierRoll = Math.random();
      if (tierRoll < 0.2) {
        selectedGift = MEGA_GIFTS[Math.floor(Math.random() * MEGA_GIFTS.length)];
      } else if (tierRoll < 0.6) {
        selectedGift = BIG_GIFTS[Math.floor(Math.random() * BIG_GIFTS.length)];
      } else if (tierRoll < 0.85) {
        selectedGift = MEDIUM_GIFTS[Math.floor(Math.random() * MEDIUM_GIFTS.length)];
      } else {
        selectedGift = SMALL_GIFTS[Math.floor(Math.random() * SMALL_GIFTS.length)];
      }
    } else if (bossHpRatio <= 0.6) {
      // Mid game phase: Medium gifts with occasional Big gifts
      const tierRoll = Math.random();
      if (tierRoll < 0.15) {
        selectedGift = BIG_GIFTS[Math.floor(Math.random() * BIG_GIFTS.length)];
      } else if (tierRoll < 0.65) {
        selectedGift = MEDIUM_GIFTS[Math.floor(Math.random() * MEDIUM_GIFTS.length)];
      } else {
        selectedGift = SMALL_GIFTS[Math.floor(Math.random() * SMALL_GIFTS.length)];
      }
    } else {
      // Early game phase: mostly Small gifts (Roses, Hearts) and few Medium gifts
      const tierRoll = Math.random();
      if (tierRoll < 0.15) {
        selectedGift = MEDIUM_GIFTS[Math.floor(Math.random() * MEDIUM_GIFTS.length)];
      } else {
        selectedGift = SMALL_GIFTS[Math.floor(Math.random() * SMALL_GIFTS.length)];
      }
    }

    const streak =
      selectedGift.streakRange[0] +
      Math.floor(Math.random() * (selectedGift.streakRange[1] - selectedGift.streakRange[0] + 1));

    state.triggerGiftExplosion(selectedGift.name, targetTeam, viewerName, selectedGift.coins);

    this.giftsCount += 1;
    this.lastAction = `${viewerName} tặng ${selectedGift.name} (${teamTag}) x${streak}`;
    this.notifyStatus(this.lastAction);
  }

  private notifyStatus(message?: string): void {
    const status = this.getStatus();
    this.statusListeners.forEach((listener) => listener(status));
    if (message) {
      gameSocket.sendAutoLiveStatus({ ...status, message });
    }
  }
}

export const mockLiveSimulator = new MockLiveSimulator();
