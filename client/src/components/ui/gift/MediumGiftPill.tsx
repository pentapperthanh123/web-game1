import { useTranslation } from 'react-i18next';
import { GIFT_TIER } from '../../../constants/game';
import { GIFT_CELEBRATION_COLORS, GIFT_SPARKLE_COUNT } from '../../../constants/giftPresentation';
import { GiftAnnouncement } from '../../../types/game';
import { TeamColorPalette } from '../../../types/team';
import { GiftSparkleBurst } from './GiftSparkleBurst';
import { DonorAvatar, StreakCounter, resolveGiftCoins } from './giftShared';

const SPARKLE_RADIUS_PX = { X: 120, Y: 30 } as const;

interface MediumGiftPillProps {
  banner: GiftAnnouncement;
  teamTheme: TeamColorPalette;
}

/** 10–98 coins: compact pill that pops in with a one-shot star burst and a breathing team-colour glow. */
export const MediumGiftPill = ({ banner, teamTheme }: MediumGiftPillProps) => {
  const { t } = useTranslation();
  const streakCount = banner.streakCount ?? 1;
  const sparkleColors = [teamTheme.primaryHex, GIFT_CELEBRATION_COLORS.GOLD_LIGHT, GIFT_CELEBRATION_COLORS.WHITE];
  return (
    <div className="relative max-w-full animate-gift-pop-in">
      <div
        style={{ boxShadow: `0 0 22px ${teamTheme.primaryHex}` }}
        className="absolute inset-0 rounded-full animate-gift-glow-pulse pointer-events-none"
      />
      <div
        style={{ borderColor: teamTheme.primaryHex }}
        className="relative overflow-hidden flex items-center gap-1.5 pl-0.5 pr-3 py-0.5 rounded-full border-2 bg-slate-950/92 backdrop-blur-md shadow-lg max-w-full"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-gift-shimmer pointer-events-none" />
        <DonorAvatar name={banner.donorName} avatarUrl={banner.donorAvatarUrl} sizeClassName="w-7 h-7" ringColor={teamTheme.primaryHex} />
        <span className="text-[11px] font-black text-white truncate min-w-0">{banner.donorName}</span>
        <span className={`text-[11px] font-bold truncate min-w-0 ${teamTheme.textClass}`}>{banner.giftName}</span>
        <span className="text-[11px] font-mono font-black text-amber-300 shrink-0">
          {t('Gift.coinsGained', { defaultValue: '+{{coins}} xu', coins: resolveGiftCoins(banner) })}
        </span>
        <StreakCounter count={streakCount} label={t('Gift.comboStreak', { defaultValue: 'COMBO x{{count}}', count: streakCount })} />
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
