import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { calculateGiftBaseDamage } from '../../../constants/game';
import { resolveAnnouncementCoins } from '../../../store/giftTier';
import { GiftAnnouncement } from '../../../types/game';
import './gift.css';

export const resolveGiftCoins = resolveAnnouncementCoins;

export const resolveGiftDamage = (banner: GiftAnnouncement): number =>
  Math.round(calculateGiftBaseDamage(resolveGiftCoins(banner)) * (banner.damageMultiplier ?? 1));

const INITIALS_LENGTH = 2;

const GIFT_ICON_RULES: ReadonlyArray<{ readonly keyword: string; readonly icon: string }> = [
  { keyword: 'phượng hoàng', icon: '🔥' },
  { keyword: 'rồng', icon: '🐉' },
  { keyword: 'sư tử', icon: '🦁' },
  { keyword: 'lâu đài', icon: '🏰' },
  { keyword: 'vũ trụ', icon: '🚀' },
  { keyword: 'thiên nga', icon: '🦢' },
  { keyword: 'xe bay', icon: '🏎️' },
  { keyword: 'trái tim', icon: '💖' },
  { keyword: 'tim cktg', icon: '💖' },
  { keyword: 'vương miện', icon: '👑' },
  { keyword: 'súng nước', icon: '🔫' },
  { keyword: 'kính mát', icon: '🕶️' },
  { keyword: 'nước hoa', icon: '💎' },
  { keyword: 'mũ bảo hiểm', icon: '🪖' },
  { keyword: 'corgi', icon: '🐶' },
  { keyword: 'donut', icon: '🍩' },
  { keyword: 'bánh quy', icon: '🍪' },
  { keyword: 'cà phê', icon: '☕' },
  { keyword: 'pháo', icon: '🎉' },
  { keyword: 'hoa hồng', icon: '🌹' },
  { keyword: 'hồng', icon: '🌹' },
];

const EMOJI_EXTRACTOR_REGEX = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/u;

const COIN_TIER_FALLBACK_ICONS = {
  LEGEND: { minCoins: 1000, icon: '🐉' },
  MEGA: { minCoins: 199, icon: '👑' },
  BIG: { minCoins: 50, icon: '💎' },
  MEDIUM: { minCoins: 10, icon: '⚡' },
  SMALL: { icon: '🌹' },
} as const;

/** Resolves a vivid gift icon from the gift name or coin tier. */
export const resolveGiftIcon = (giftName: string, coins = 0): string => {
  const normalized = (giftName || '').toLowerCase();
  for (const rule of GIFT_ICON_RULES) {
    if (normalized.includes(rule.keyword)) {
      return rule.icon;
    }
  }
  const emojiMatch = giftName.match(EMOJI_EXTRACTOR_REGEX);
  if (emojiMatch?.[0]) {
    return emojiMatch[0];
  }
  if (coins >= COIN_TIER_FALLBACK_ICONS.LEGEND.minCoins) return COIN_TIER_FALLBACK_ICONS.LEGEND.icon;
  if (coins >= COIN_TIER_FALLBACK_ICONS.MEGA.minCoins) return COIN_TIER_FALLBACK_ICONS.MEGA.icon;
  if (coins >= COIN_TIER_FALLBACK_ICONS.BIG.minCoins) return COIN_TIER_FALLBACK_ICONS.BIG.icon;
  if (coins >= COIN_TIER_FALLBACK_ICONS.MEDIUM.minCoins) return COIN_TIER_FALLBACK_ICONS.MEDIUM.icon;
  return COIN_TIER_FALLBACK_ICONS.SMALL.icon;
};

/** Strips trailing emoji from gift name so the text and the 3D icon orb don't duplicate it. */
export const formatCleanGiftName = (giftName: string): string => {
  const cleaned = giftName.replace(EMOJI_EXTRACTOR_REGEX, '').trim();
  return cleaned || giftName;
};

interface DonorAvatarProps {
  name: string;
  avatarUrl?: string;
  sizeClassName: string;
  ringColor: string;
  className?: string;
}

/** Donor's TikTok avatar inside a Hextech metallic bevel ring; renders a radiant crest when no image is present. */
export const DonorAvatar = ({
  name,
  avatarUrl,
  sizeClassName,
  ringColor,
  className,
}: DonorAvatarProps) => {
  const [hasFailed, setHasFailed] = useState(false);
  const isImageShown = Boolean(avatarUrl) && !hasFailed;
  const cleanInitials = (name || 'VIP').replace(/[^a-zA-Z0-9À-ỹ]/g, '').slice(0, INITIALS_LENGTH).toUpperCase() || 'VP';

  return (
    <div
      style={{
        borderColor: ringColor,
        boxShadow: `0 0 16px ${ringColor}99, inset 0 0 10px ${ringColor}66`,
        background: `radial-gradient(circle at 30% 25%, ${ringColor}55 0%, #0f172a 65%, #020617 100%)`,
      }}
      className={clsx(
        'relative rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0 select-none',
        sizeClassName,
        className
      )}
    >
      {/* Inner Hextech metallic rim highlight */}
      <div className="absolute inset-[2px] rounded-full border border-white/25 pointer-events-none" />
      {isImageShown ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setHasFailed(true)}
        />
      ) : (
        <div className="relative flex flex-col items-center justify-center leading-none">
          <span
            style={{ textShadow: `0 1px 4px rgba(0,0,0,0.95), 0 0 8px ${ringColor}` }}
            className="text-[11px] sm:text-xs font-black tracking-tighter bg-gradient-to-b from-white via-amber-100 to-amber-300 bg-clip-text text-transparent"
          >
            {cleanInitials}
          </span>
        </div>
      )}
    </div>
  );
};

interface GiftEmblemOrbProps {
  giftName: string;
  coins: number;
  accentColor: string;
  size?: 'md' | 'lg';
}

/** 3D-styled Hextech Gift Emblem Orb displayed on the right wing of Big/Mega gift banners. */
export const GiftEmblemOrb = ({
  giftName,
  coins,
  accentColor,
  size = 'lg',
}: GiftEmblemOrbProps) => {
  const icon = resolveGiftIcon(giftName, coins);
  const isLarge = size === 'lg';
  const boxSizeClass = isLarge ? 'w-12 h-12 sm:w-13 sm:h-13' : 'w-10 h-10 sm:w-11 sm:h-11';
  const iconSizeClass = isLarge ? 'text-2xl sm:text-[26px]' : 'text-xl sm:text-2xl';

  return (
    <div className={clsx('relative flex items-center justify-center shrink-0', boxSizeClass)}>
      {/* Outer pulsing radial glow */}
      <div
        style={{ background: `radial-gradient(circle, ${accentColor}75 0%, transparent 72%)` }}
        className="absolute -inset-2 rounded-full blur-md animate-pulse pointer-events-none"
      />
      {/* Rotated Hextech diamond frame */}
      <div
        style={{
          borderColor: accentColor,
          boxShadow: `0 0 14px ${accentColor}80, inset 0 0 10px ${accentColor}45`,
          background: 'linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(2,6,23,0.98) 100%)',
        }}
        className="absolute inset-1 rotate-45 rounded-xl border-2 pointer-events-none"
      />
      {/* Inner gold bevel diamond */}
      <div className="absolute inset-2 rotate-45 rounded-lg border border-amber-300/35 pointer-events-none" />
      {/* Floating Gift Icon */}
      <span
        style={{ filter: `drop-shadow(0 2px 6px rgba(0,0,0,0.9)) drop-shadow(0 0 10px ${accentColor})` }}
        className={clsx('relative z-10 select-none animate-rose-bounce', iconSizeClass)}
      >
        {icon}
      </span>
    </div>
  );
};

/** True for one render cycle each time `value` grows, so the streak counter can punch. */
export const useGrowthPulse = (value: number): number => {
  const previousRef = useRef(value);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (value > previousRef.current) setPulseKey((key) => key + 1);
    previousRef.current = value;
  }, [value]);
  return pulseKey;
};

interface StreakCounterProps {
  count: number;
  label: string;
}

export const StreakCounter = ({ count, label }: StreakCounterProps) => {
  const pulseKey = useGrowthPulse(count);
  if (count <= 1) return null;
  return (
    <span
      key={pulseKey}
      className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 text-slate-950 font-black text-[9px] tracking-wider uppercase shrink-0 animate-gift-streak-punch shadow-[0_0_12px_rgba(245,158,11,0.85)] border border-yellow-200"
    >
      {label}
    </span>
  );
};
