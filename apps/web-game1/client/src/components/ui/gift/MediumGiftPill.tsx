import { useTranslation } from 'react-i18next';
import { GIFT_TIER } from '../../../constants/game';
import { GIFT_CELEBRATION_COLORS, GIFT_SPARKLE_COUNT } from '../../../constants/giftPresentation';
import { GiftAnnouncement } from '../../../types/game';
import { TeamColorPalette } from '../../../types/team';
import { GiftSparkleBurst } from './GiftSparkleBurst';
import {
  DonorAvatar,
  StreakCounter,
  formatCleanGiftName,
  resolveGiftCoins,
  resolveGiftIcon,
} from './giftShared';

const SPARKLE_RADIUS_PX = { X: 130, Y: 32 } as const;

interface MediumGiftPillProps {
  banner: GiftAnnouncement;
  teamTheme: TeamColorPalette;
}

/** 10–49 coins: Hextech Broadcast Capsule with VIP Avatar, Gift Icon, and Metallic Coin Badge. */
export const MediumGiftPill = ({ banner, teamTheme }: MediumGiftPillProps) => {
  const { t } = useTranslation();
  const streakCount = banner.streakCount ?? 1;
  const coins = resolveGiftCoins(banner);
  const giftIcon = resolveGiftIcon(banner.giftName, coins);
  const cleanGiftName = formatCleanGiftName(banner.giftName);
  const sparkleColors = [
    teamTheme.primaryHex,
    GIFT_CELEBRATION_COLORS.GOLD_LIGHT,
    GIFT_CELEBRATION_COLORS.WHITE,
  ];

  return (
    <div className="relative max-w-full animate-gift-pop-in">
      <div
        style={{ boxShadow: `0 0 22px ${teamTheme.primaryHex}88` }}
        className="absolute inset-0 rounded-full animate-gift-glow-pulse pointer-events-none"
      />
      <div
        style={{
          borderColor: teamTheme.primaryHex,
          boxShadow: `inset 0 0 14px ${teamTheme.primaryHex}30, 0 6px 20px rgba(0,0,0,0.85)`,
        }}
        className="relative overflow-hidden flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border-2 bg-slate-950/95 max-w-full"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-gift-shimmer pointer-events-none" />
        <DonorAvatar
          name={banner.donorName}
          avatarUrl={banner.donorAvatarUrl}
          sizeClassName="w-7 h-7"
          ringColor={teamTheme.primaryHex}
        />
        <span className="text-[11px] font-black text-white truncate min-w-0 drop-shadow">
          {banner.donorName}
        </span>
        <span className="flex items-center gap-1 min-w-0">
          <span className="text-sm leading-none drop-shadow">{giftIcon}</span>
          <span className={`text-[11px] font-extrabold truncate min-w-0 ${teamTheme.textClass}`}>
            {cleanGiftName}
          </span>
        </span>
        <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 border border-amber-300/70 text-[10.5px] font-mono font-black text-amber-300 shrink-0 shadow-[0_0_8px_rgba(251,191,36,0.4)]">
          {t('Gift.coinsGained', { defaultValue: '+{{coins}} xu', coins })}
        </span>
        <StreakCounter
          count={streakCount}
          label={t('Gift.comboStreak', { defaultValue: 'COMBO x{{count}}', count: streakCount })}
        />
      </div>
      <GiftSparkleBurst
        count={GIFT_SPARKLE_COUNT[GIFT_TIER.MEDIUM]}
        radiusX={SPARKLE_RADIUS_PX.X}
        radiusY={SPARKLE_RADIUS_PX.Y}
        colors={sparkleColors}
      />
    </div>
  );
};
