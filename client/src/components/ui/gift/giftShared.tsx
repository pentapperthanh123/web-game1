import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { GAME_CONSTANTS } from '../../../constants/game';
import { GiftAnnouncement } from '../../../types/game';
import './gift.css';

export const resolveGiftCoins = (banner: GiftAnnouncement): number => banner.totalCoins ?? banner.coins ?? 0;

export const resolveGiftDamage = (banner: GiftAnnouncement): number =>
  resolveGiftCoins(banner) * GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_DAMAGE_PER_COIN;

const INITIALS_LENGTH = 2;

interface DonorAvatarProps {
  name: string;
  avatarUrl?: string;
  sizeClassName: string;
  ringColor: string;
  className?: string;
}

/** Donor's TikTok avatar with a team-colour ring; falls back to initials when missing or broken. */
export const DonorAvatar = ({ name, avatarUrl, sizeClassName, ringColor, className }: DonorAvatarProps) => {
  const [hasFailed, setHasFailed] = useState(false);
  const isImageShown = Boolean(avatarUrl) && !hasFailed;
  return (
    <div
      style={{ borderColor: ringColor, boxShadow: `0 0 14px ${ringColor}` }}
      className={clsx('rounded-full overflow-hidden border-2 bg-slate-900 flex items-center justify-center shrink-0', sizeClassName, className)}
    >
      {isImageShown ? (
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" onError={() => setHasFailed(true)} />
      ) : (
        <span className="text-xs font-black text-white">{name.slice(0, INITIALS_LENGTH).toUpperCase()}</span>
      )}
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
      className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 font-black text-[9px] shrink-0 animate-gift-streak-punch shadow-[0_0_12px_rgba(245,158,11,0.8)] border border-amber-300"
    >
      {label}
    </span>
  );
};
