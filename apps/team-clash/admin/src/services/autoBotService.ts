import { adminEmitter } from './adminEmitter';

const BOT_NAMES = [
  'Linh_Cute99',
  'Minh_ProGamer',
  'AnhTuan_HN',
  'Huong_Baby',
  'Duy_Kameha',
  'Thao_Nguyen',
  'Son_Tung_Fan',
  'Mai_Mai_Yeu',
  'Quoc_Bao9x',
  'Trang_Bap',
];

const GIFTS = [
  { name: 'Rose', coins: 1 },
  { name: 'TikTok', coins: 1 },
  { name: 'Heart Me', coins: 5 },
  { name: 'Paper Crane', coins: 10 },
  { name: 'Super Beam', coins: 25 },
  { name: 'Galaxy Clash', coins: 50 },
];

declare global {
  interface Window {
    __TEAM_CLASH_BOT_TIMER__?: NodeJS.Timeout | number | null;
    __TEAM_CLASH_BOT_RUNNING__?: boolean;
  }
}

class AutoBotService {
  private timerId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private botTeamMap = new Map<string, 'LEFT' | 'RIGHT'>();

  constructor() {
    // If any orphan interval exists on window from HMR, kill it immediately
    this.stop();
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public start(): void {
    this.stop(); // Always clear previous timer before starting new one
    this.isRunning = true;
    if (typeof window !== 'undefined') {
      window.__TEAM_CLASH_BOT_RUNNING__ = true;
    }

    const timer = setInterval(() => {
      this.tickBot();
    }, 650);

    this.timerId = timer;
    if (typeof window !== 'undefined') {
      window.__TEAM_CLASH_BOT_TIMER__ = timer;
    }
  }

  public stop(): void {
    this.isRunning = false;
    if (typeof window !== 'undefined') {
      window.__TEAM_CLASH_BOT_RUNNING__ = false;
      if (window.__TEAM_CLASH_BOT_TIMER__) {
        clearInterval(window.__TEAM_CLASH_BOT_TIMER__ as number);
        window.__TEAM_CLASH_BOT_TIMER__ = null;
      }
    }
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private tickBot(): void {
    // Strict Guard: If AutoBot is off, NEVER emit any event
    if (!this.isRunning || (typeof window !== 'undefined' && !window.__TEAM_CLASH_BOT_RUNNING__)) {
      this.stop();
      return;
    }

    const randomViewer = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const roll = Math.random();

    // Determine or assign bot's team
    let team = this.botTeamMap.get(randomViewer);
    if (!team) {
      team = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
      this.botTeamMap.set(randomViewer, team);
    }

    // 1. Roll for Chat Push (72% probability)
    if (roll < 0.72) {
      const isLeft = team === 'LEFT';
      const text = isLeft ? (Math.random() > 0.5 ? 'g' : 'girl') : Math.random() > 0.5 ? 'b' : 'boy';

      adminEmitter.emitLiveEvent({
        type: 'CHAT',
        timestamp: Date.now(),
        user: {
          id: `bot_${randomViewer}`,
          username: randomViewer,
          nickname: randomViewer,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${randomViewer}`,
        },
        text,
      });
      return;
    }

    // 2. Roll for Like Batch (21% probability)
    if (roll < 0.93) {
      adminEmitter.emitLiveEvent({
        type: 'LIKE',
        timestamp: Date.now(),
        user: {
          id: `bot_${randomViewer}`,
          username: randomViewer,
          nickname: randomViewer,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${randomViewer}`,
        },
        count: Math.floor(Math.random() * 5) + 1,
        team,
      });
      return;
    }

    // 3. Roll for Gift Attack (7% probability - creates exciting Donation alerts without instant wipeout)
    const gift = GIFTS[Math.floor(Math.random() * GIFTS.length)];
    const isLeft = team === 'LEFT';
    const teamKeyword = isLeft ? 'g' : 'b';

    adminEmitter.emitLiveEvent({
      type: 'CHAT',
      timestamp: Date.now(),
      user: {
        id: `bot_${randomViewer}`,
        username: randomViewer,
        nickname: randomViewer,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${randomViewer}`,
      },
      text: teamKeyword,
      team,
    });

    // Trigger gift
    adminEmitter.emitLiveEvent({
      type: 'GIFT',
      timestamp: Date.now(),
      user: {
        id: `bot_${randomViewer}`,
        username: randomViewer,
        nickname: randomViewer,
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${randomViewer}`,
      },
      giftName: gift.name,
      coinValue: gift.coins,
      repeatCount: 1,
      team,
    });
  }
}

export const autoBotService = new AutoBotService();
