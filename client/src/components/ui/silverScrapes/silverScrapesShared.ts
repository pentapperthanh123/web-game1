import { Gift, Heart, MessageSquare, Share2, type LucideIcon } from 'lucide-react';
import { TEAM_KEY, TeamType } from '../../../constants/game';
import { SilverScrapesDuelEvent } from '../../../types/game';

export const DUEL_PERCENT_MIN = 0;
export const DUEL_PERCENT_MAX = 100;
export const DUEL_PERCENT_CENTER = 50;
/** A side counts as "leading" once it pushed the clash point this far past the centre. */
export const DUEL_LEAD_THRESHOLD_PERCENT = 3;
const SECONDS_PER_MINUTE = 60;
const TIME_PAD_LENGTH = 2;
const TIME_PAD_CHAR = '0';
/** Below this many seconds the timer turns urgent. */
export const DUEL_URGENT_SECONDS = 10;

export const DUEL_SIDE = {
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
} as const;
export type DuelSide = (typeof DUEL_SIDE)[keyof typeof DUEL_SIDE];

export const DUEL_SIDE_TEAM: Readonly<Record<DuelSide, TeamType>> = {
  [DUEL_SIDE.LEFT]: TEAM_KEY.BLG,
  [DUEL_SIDE.RIGHT]: TEAM_KEY.GENG,
};

export const DUEL_DRAW = 'DRAW';

export const clampDuelPercent = (percent: number): number =>
  Math.max(DUEL_PERCENT_MIN, Math.min(DUEL_PERCENT_MAX, percent));

export const formatDuelTime = (totalSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = String(Math.floor(safeSeconds / SECONDS_PER_MINUTE)).padStart(TIME_PAD_LENGTH, TIME_PAD_CHAR);
  const seconds = String(safeSeconds % SECONDS_PER_MINUTE).padStart(TIME_PAD_LENGTH, TIME_PAD_CHAR);
  return `${minutes}:${seconds}`;
};

/** Which side is ahead on the tug-of-war, or null while it is roughly even. */
export const resolveLeadingSide = (leftPercent: number): DuelSide | null => {
  if (leftPercent >= DUEL_PERCENT_CENTER + DUEL_LEAD_THRESHOLD_PERCENT) return DUEL_SIDE.LEFT;
  if (leftPercent <= DUEL_PERCENT_CENTER - DUEL_LEAD_THRESHOLD_PERCENT) return DUEL_SIDE.RIGHT;
  return null;
};

/** Card to highlight: the winner once decided (none on a draw), otherwise whoever is ahead. */
export const resolveHighlightedSide = (winner: TeamType | typeof DUEL_DRAW | null, leftPercent: number): DuelSide | null => {
  if (winner === null) return resolveLeadingSide(leftPercent);
  if (winner === DUEL_SIDE_TEAM[DUEL_SIDE.LEFT]) return DUEL_SIDE.LEFT;
  if (winner === DUEL_SIDE_TEAM[DUEL_SIDE.RIGHT]) return DUEL_SIDE.RIGHT;
  return null;
};

/** Server descriptions often already start with the viewer's name; do not print it twice. */
export const resolveEventText = (event: SilverScrapesDuelEvent): { donorName: string | null; description: string } => {
  const isNameIncluded = event.description.trimStart().startsWith(event.donorName);
  return { donorName: isNameIncluded ? null : event.donorName, description: event.description };
};

export interface DuelPushGuideItem {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  labelFallback: string;
  /** Relative push strength (1–4), ordered like the server's duel deltas (like < chat < share < gift). */
  strength: number;
}

export const DUEL_PUSH_MAX_STRENGTH = 4;

export const DUEL_PUSH_GUIDE: readonly DuelPushGuideItem[] = [
  { key: 'heart', icon: Heart, labelKey: 'SilverScrapes.guideHeart', labelFallback: 'Thả tim', strength: 1 },
  { key: 'chat', icon: MessageSquare, labelKey: 'SilverScrapes.guideChat', labelFallback: 'Chat gọi tướng', strength: 2 },
  { key: 'share', icon: Share2, labelKey: 'SilverScrapes.guideShare', labelFallback: 'Follow & Chia sẻ', strength: 3 },
  { key: 'gift', icon: Gift, labelKey: 'SilverScrapes.guideGift', labelFallback: 'Tặng quà', strength: 4 },
];
