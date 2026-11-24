import React from 'react';
import { Flame, Sparkles, Zap } from 'lucide-react';
import type { GiftAlertItem } from '../../../shared/types/clash';
import { useClashStore } from '../store/clashStore';
import { ViewerAvatar } from './ViewerAvatar';
import { useClashText } from '../i18n/clashText';

const TIER_BADGES = {
  LARGE: {
    icon: Flame,
    textColor: 'text-rose-300',
    borderGlow: 'shadow-[0_0_24px_rgba(244,63,94,0.55)]',
    bgGradient: 'from-rose-950/90 via-slate-900/95 to-purple-950/90',
  },
  MEDIUM: {
    icon: Zap,
    textColor: 'text-cyan-300',
    borderGlow: 'shadow-[0_0_20px_rgba(6,182,212,0.45)]',
    bgGradient: 'from-cyan-950/90 via-slate-900/95 to-blue-950/90',
  },
  SMALL: {
    icon: Sparkles,
    textColor: 'text-yellow-300',
    borderGlow: 'shadow-[0_0_14px_rgba(250,204,21,0.35)]',
    bgGradient: 'from-slate-900/90 via-slate-900/95 to-slate-950/90',
  },
} as const;

export const GiftDonationOverlay: React.FC = () => {
  const recentGifts = useClashStore((s) => s.recentGiftAlerts);
  const text = useClashText();

  if (recentGifts.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-[164px] inset-x-0 z-30 pointer-events-none flex flex-col items-center gap-2 px-4 transition-all">
      {/* Newest card only: totals live in the bottom-right gift panel, and a stack here covers the TOP lists */}
      {recentGifts.slice(0, 1).map((alert: GiftAlertItem, index: number) => {
        const tierStyle = TIER_BADGES[alert.tier];
        const TierIcon = tierStyle.icon;
        const totalCoins = alert.coinValue * alert.repeatCount;

        return (
          <div
            key={alert.id}
            className={`w-full max-w-[420px] rounded-2xl p-2.5 border-2 backdrop-blur-md bg-gradient-to-r ${tierStyle.bgGradient} ${tierStyle.borderGlow} flex items-center justify-between gap-3 animate-fade-in shadow-2xl transition-transform ${
              index === 0 ? 'scale-100' : 'scale-95 opacity-85'
            }`}
            style={{ borderColor: alert.teamColor }}
          >
            {/* Left: Avatar with Ring */}
            <div className="relative shrink-0">
              <ViewerAvatar
                src={alert.avatarUrl}
                name={alert.nickname}
                seed={alert.username}
                sizePx={44}
                ringColor={alert.teamColor}
                ringWidthPx={2}
              />
              <span
                className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase text-white shadow-md"
                style={{ backgroundColor: alert.teamColor }}
              >
                {alert.teamName}
              </span>
            </div>

            {/* Middle: Donor & Gift Details */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5">
                <span className="text-sm leading-[1.3] font-black text-white truncate max-w-[130px]">
                  {alert.nickname}
                </span>
                <span
                  className="px-1.5 py-0.2 rounded text-[10px] font-extrabold uppercase tracking-wider text-black font-mono shadow"
                  style={{ backgroundColor: alert.teamColor }}
                >
                  {alert.teamName}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs mt-0.5">
                <span className="text-slate-300 font-medium">{text.giftSent}</span>
                <span className="font-extrabold text-white">
                  {alert.giftName}
                </span>
                {alert.repeatCount > 1 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-black text-[10px] font-black animate-pulse">
                    x{alert.repeatCount}
                  </span>
                )}
              </div>
            </div>

            {/* Right: Tier Badge & Push Force */}
            <div className="flex flex-col items-end shrink-0 leading-tight">
              <div className="flex items-center gap-1">
                <TierIcon className={`w-3.5 h-3.5 ${tierStyle.textColor} animate-bounce`} />
                <span className={`text-[10px] font-black tracking-wider ${tierStyle.textColor}`}>
                  {text.giftTierTitle[alert.tier]}
                </span>
              </div>
              <span className="text-xs font-black text-yellow-300 drop-shadow mt-0.5">
                {text.pushPercent(alert.pushPercent)}
              </span>
              <span className="text-[10px] font-semibold text-slate-400">
                {text.coins(totalCoins)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
