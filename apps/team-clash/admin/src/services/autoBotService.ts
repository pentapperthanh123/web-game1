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

class AutoBotService {
  private timerId: NodeJS.Timeout | null = null;
  private botTeamMap = new Map<string, 'LEFT' | 'RIGHT'>();

  public start(): void {
    if (this.timerId) return;

    this.timerId = setInterval(() => {
      this.tickBot();
    }, 400);
  }

  public stop(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private tickBot(): void {
    const randomViewer = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const roll = Math.random();

    // Determine or assign bot's team
    let team = this.botTeamMap.get(randomViewer);
    if (!team) {
      team = Math.random() > 0.5 ? 'LEFT' : 'RIGHT';
      this.botTeamMap.set(randomViewer, team);
    }

    // 1. Roll for Chat Push (65% probability)
    if (roll < 0.65) {
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

    // 2. Roll for Gift Attack (20% probability)
    if (roll < 0.85) {
      const gift = GIFTS[Math.floor(Math.random() * GIFTS.length)];
      // First ensure team is registered via quick chat
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
      });
      return;
    }

    // 3. Roll for Likes (15% probability)
    adminEmitter.emitLiveEvent({
      type: 'LIKE',
      timestamp: Date.now(),
      user: {
        id: `bot_${randomViewer}`,
        username: randomViewer,
        nickname: randomViewer,
      },
      count: Math.floor(Math.random() * 4) + 1,
    });
  }
}

export const autoBotService = new AutoBotService();
