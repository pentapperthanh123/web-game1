import type { PushTier } from '../../../shared/types/clash';
import { useClashStore } from '../store/clashStore';
import type { GiftMenuKey } from '../utils/giftCatalog';

export type ClashLanguage = 'EN' | 'VI';

/**
 * Every viewer-facing string of the stage lives here so the whole overlay switches language
 * together. English is the default (`language: 'EN'` in the store); VI is kept in sync for the
 * admin language toggle.
 */
export interface ClashText {
  live: string;
  tapToEnableSound: string;
  round: (roundNumber: number) => string;
  /** Accessible label for the series score (rounds won by each team). */
  seriesScore: (leftName: string, leftWins: number, rightName: string, rightWins: number) => string;
  edgeWarning: string;
  /** Join hint, rendered as: {guidanceType} [KEY] {guidanceFor} TEAM ⚔️ … */
  guidanceType: string;
  guidanceFor: string;
  pushHint: (key: string) => string;
  topTeam: (teamName: string) => string;
  points: (value: number) => string;
  teamWins: (teamName: string) => string;
  victorySubtitle: string;
  drawTitle: string;
  drawSubtitle: string;
  roundMvpTitle: string;
  noRankedPlayers: string;
  nextRoundIn: string;
  giftSent: string;
  pushPercent: (percent: number) => string;
  coins: (value: number) => string;
  giftTierTitle: { SMALL: string; MEDIUM: string; LARGE: string };
  giftsTitle: string;
  giftNames: Record<GiftMenuKey, string>;
  /** Short effect line in the gift panel, e.g. "+9% Push". */
  giftEffect: (tier: PushTier, percent: number) => string;
  /** Coin price next to the 🪙 icon (number only, the icon carries the unit). */
  coinPrice: (coins: number) => string;
  /** Label over the damage number of a top-tier gift. */
  critical: string;
}

const EN_TEXT: ClashText = {
  live: 'LIVE',
  tapToEnableSound: '🔊 TAP TO ENABLE SOUND',
  round: (roundNumber) => `ROUND ${roundNumber}`,
  seriesScore: (leftName, leftWins, rightName, rightWins) =>
    `Rounds won: ${leftName} ${leftWins} - ${rightWins} ${rightName}`,
  edgeWarning: '⚠️ ABOUT TO BE PUSHED OUT! TURN IT AROUND!',
  guidanceType: 'Type',
  guidanceFor: 'for',
  pushHint: (key) => `Type "${key}" to push!`,
  topTeam: (teamName) => `TOP ${teamName}`,
  points: (value) => `${value} pts`,
  teamWins: (teamName) => `${teamName} WINS!`,
  victorySubtitle: 'What a round!',
  drawTitle: 'DRAW!',
  drawSubtitle: 'Perfectly even – no point this round',
  roundMvpTitle: '⭐ TOP 3 ROUND MVPs ⭐',
  noRankedPlayers: 'No ranked players yet',
  nextRoundIn: 'Next round starts in:',
  giftSent: 'sent',
  pushPercent: (percent) => `+${percent}% Push`,
  coins: (value) => `(${value} ${value === 1 ? 'coin' : 'coins'})`,
  giftTierTitle: { SMALL: 'DONATE PUSH', MEDIUM: 'SUPER BEAM', LARGE: 'ULTIMATE CLASH' },
  giftsTitle: 'GIFTS',
  giftNames: { rose: 'Rose', fingerHeart: 'Finger Heart', doughnut: 'Doughnut' },
  giftEffect: (tier, percent) =>
    `+${percent}% ${tier === 'LARGE' ? 'Ultimate' : tier === 'MEDIUM' ? 'Beam' : 'Push'}`,
  coinPrice: (coins) => `${coins}`,
  critical: 'CRITICAL!',
};

const VI_TEXT: ClashText = {
  live: 'LIVE',
  tapToEnableSound: '🔊 CHẠM ĐỂ BẬT ÂM THANH',
  round: (roundNumber) => `HIỆP ${roundNumber}`,
  seriesScore: (leftName, leftWins, rightName, rightWins) =>
    `Số hiệp thắng: ${leftName} ${leftWins} - ${rightWins} ${rightName}`,
  edgeWarning: '⚠️ NGUY CƠ BỊ ÉP SÂN! LẬT KÈO NGAY!',
  guidanceType: 'Gõ',
  guidanceFor: 'theo',
  pushHint: (key) => `Gõ "${key}" để đẩy!`,
  topTeam: (teamName) => `TOP ${teamName}`,
  points: (value) => `${value} điểm`,
  teamWins: (teamName) => `${teamName} THẮNG!`,
  victorySubtitle: 'Chiến thắng hiệp đấu ngoạn mục!',
  drawTitle: 'HÒA!',
  drawSubtitle: 'Cân tài cân sức – hiệp này không ai được điểm',
  roundMvpTitle: '⭐ TOP 3 CHIẾN THẦN CỦA HIỆP ⭐',
  noRankedPlayers: 'Chưa có người chơi xếp hạng',
  nextRoundIn: 'Tự động sang hiệp mới sau:',
  giftSent: 'vừa tặng',
  pushPercent: (percent) => `+${percent}% Lực Đẩy`,
  coins: (value) => `(${value} xu)`,
  giftTierTitle: { SMALL: 'DONATE PUSH', MEDIUM: 'SUPER BEAM', LARGE: 'ULTIMATE CLASH' },
  giftsTitle: 'QUÀ TẶNG',
  giftNames: { rose: 'Hoa hồng', fingerHeart: 'Bắn tim', doughnut: 'Bánh donut' },
  giftEffect: (tier, percent) =>
    `+${percent}% ${tier === 'LARGE' ? 'Bùng nổ' : tier === 'MEDIUM' ? 'Tia sáng' : 'Lực đẩy'}`,
  coinPrice: (coins) => `${coins}`,
  critical: 'CHÍ MẠNG!',
};

const TEXT_BY_LANGUAGE: Record<ClashLanguage, ClashText> = {
  EN: EN_TEXT,
  VI: VI_TEXT,
};

export function getClashText(language: ClashLanguage): ClashText {
  return TEXT_BY_LANGUAGE[language] ?? VI_TEXT;
}

/** Strings for the language currently selected by the host (re-renders on change). */
export function useClashText(): ClashText {
  return getClashText(useClashStore((s) => s.language));
}
