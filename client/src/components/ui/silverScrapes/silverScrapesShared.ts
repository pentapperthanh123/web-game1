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
export const resolveHighlightedSide = (
  winner: TeamType | typeof DUEL_DRAW | null,
  leftPercent: number
): DuelSide | null => {
  if (winner === null) return resolveLeadingSide(leftPercent);
  if (winner === DUEL_SIDE_TEAM[DUEL_SIDE.LEFT]) return DUEL_SIDE.LEFT;
  if (winner === DUEL_SIDE_TEAM[DUEL_SIDE.RIGHT]) return DUEL_SIDE.RIGHT;
  return null;
};

/** Server descriptions often already start with the viewer's name; do not print it twice. */
export const resolveEventText = (
  event: SilverScrapesDuelEvent
): { donorName: string | null; description: string } => {
  const isNameIncluded = event.description.trimStart().startsWith(event.donorName);
  return { donorName: isNameIncluded ? null : event.donorName, description: event.description };
};

export interface DuelPushTheme {
  cardBorder: string;
  cardBg: string;
  iconBg: string;
  iconColor: string;
  meterFill: string;
  glowShadow: string;
}

export interface DuelPushGuideItem {
  key: string;
  icon: LucideIcon;
  labelKey: string;
  labelFallback: string;
  powerValue: string;
  strength: number;
  badgeKey?: string;
  badgeFallback?: string;
  theme: DuelPushTheme;
}

export const DUEL_PUSH_MAX_STRENGTH = 4;

export const DUEL_PUSH_GUIDE: readonly DuelPushGuideItem[] = [
  {
    key: 'heart',
    icon: Heart,
    labelKey: 'SilverScrapes.guideHeart',
    labelFallback: 'Thả tim',
    powerValue: '+1',
    strength: 1,
    theme: {
      cardBorder: 'border-rose-500/40 hover:border-rose-400/70',
      cardBg: 'bg-rose-950/30 hover:bg-rose-900/40',
      iconBg: 'bg-rose-900/60 border-rose-500/50',
      iconColor: 'text-rose-300',
      meterFill: 'bg-rose-400',
      glowShadow: 'shadow-[0_0_12px_rgba(244,63,94,0.35)]',
    },
  },
  {
    key: 'chat',
    icon: MessageSquare,
    labelKey: 'SilverScrapes.guideChat',
    labelFallback: 'Chat gọi tướng',
    powerValue: '+5',
    strength: 2,
    theme: {
      cardBorder: 'border-cyan-500/40 hover:border-cyan-400/70',
      cardBg: 'bg-cyan-950/30 hover:bg-cyan-900/40',
      iconBg: 'bg-cyan-900/60 border-cyan-500/50',
      iconColor: 'text-cyan-300',
      meterFill: 'bg-cyan-400',
      glowShadow: 'shadow-[0_0_12px_rgba(6,182,212,0.35)]',
    },
  },
  {
    key: 'share',
    icon: Share2,
    labelKey: 'SilverScrapes.guideShare',
    labelFallback: 'Follow & Chia sẻ',
    powerValue: '+15',
    strength: 3,
    theme: {
      cardBorder: 'border-indigo-500/40 hover:border-indigo-400/70',
      cardBg: 'bg-indigo-950/30 hover:bg-indigo-900/40',
      iconBg: 'bg-indigo-900/60 border-indigo-500/50',
      iconColor: 'text-indigo-300',
      meterFill: 'bg-indigo-400',
      glowShadow: 'shadow-[0_0_12px_rgba(99,102,241,0.35)]',
    },
  },
  {
    key: 'gift',
    icon: Gift,
    labelKey: 'SilverScrapes.guideGift',
    labelFallback: 'Tặng quà',
    powerValue: '+50+',
    strength: 4,
    badgeKey: 'SilverScrapes.superPowerBadge',
    badgeFallback: 'SIÊU LỰC',
    theme: {
      cardBorder: 'border-amber-400/70 hover:border-amber-300',
      cardBg: 'bg-amber-950/40 hover:bg-amber-900/50',
      iconBg: 'bg-amber-900/70 border-amber-400/80',
      iconColor: 'text-amber-300',
      meterFill: 'bg-gradient-to-r from-amber-400 to-yellow-300',
      glowShadow: 'shadow-[0_0_16px_rgba(245,158,11,0.55)]',
    },
  },
];

