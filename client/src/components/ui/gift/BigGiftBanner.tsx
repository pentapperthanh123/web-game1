import { useTranslation } from 'react-i18next';
import { Flame, Sparkles } from 'lucide-react';
import { GIFT_TIER } from '../../../constants/game';
import { GIFT_BIG_CONFETTI_COUNT, GIFT_CELEBRATION_COLORS, GIFT_SPARKLE_COUNT } from '../../../constants/giftPresentation';
import { GiftAnnouncement } from '../../../types/game';
import { TeamColorPalette, TeamProfile } from '../../../types/team';
import { TeamLogo } from '../../icons/TeamLogos';
import { DonorAvatar, StreakCounter, resolveGiftCoins, resolveGiftDamage } from './giftShared';
import { GiftConfetti } from './GiftConfetti';
import { GiftSparkleBurst } from './GiftSparkleBurst';

const SPARKLE_RADIUS_PX = { X: 185, Y: 52 } as const;

/** Team colours chasing each other around the banner edge. */
const buildBorderGradient = (teamTheme: TeamColorPalette): string =>
  `conic-gradient(from 0deg, ${teamTheme.primaryHex}, ${GIFT_CELEBRATION_COLORS.WHITE}, ${teamTheme.secondaryHex}, ${GIFT_CELEBRATION_COLORS.GOLD}, ${teamTheme.primaryHex})`;

interface BigGiftBannerProps {
  banner: GiftAnnouncement;
  teamTheme: TeamColorPalette;
  teamProfile: TeamProfile | undefined;
}

/** 99–999 coins: banner that slams in with a spinning team-colour border, confetti and twinkling stars. */
export const BigGiftBanner = ({ banner, teamTheme, teamProfile }: BigGiftBannerProps) => {
  const { t } = useTranslation();
  const streakCount = banner.streakCount ?? 1;
  const teamTag = teamProfile?.shortTag || banner.team;
  const celebrationColors = [GIFT_CELEBRATION_COLORS.GOLD, teamTheme.primaryHex, teamTheme.secondaryHex, GIFT_CELEBRATION_COLORS.WHITE];

  return (
    <div className="relative w-full animate-gift-slam-in">
      <div
        style={{ boxShadow: `0 0 34px ${teamTheme.primaryHex}` }}
        className="absolute inset-0 rounded-2xl animate-gift-glow-pulse pointer-events-none"
      />
      <GiftConfetti colors={celebrationColors} count={GIFT_BIG_CONFETTI_COUNT} />

      <div className="relative overflow-hidden rounded-2xl p-[2px] shadow-2xl">
        <div
          style={{ background: buildBorderGradient(teamTheme) }}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[130%] aspect-square animate-gift-aura pointer-events-none"
        />
        <div className={`relative overflow-hidden rounded-[14px] px-3.5 py-2.5 bg-slate-950 ${teamTheme.giftBannerGradientClass}`}>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-gift-shimmer pointer-events-none" />
          <div className="relative flex items-center gap-2.5">
            <div className="relative shrink-0">
              <DonorAvatar name={banner.donorName} avatarUrl={banner.donorAvatarUrl} sizeClassName="w-12 h-12" ringColor={teamTheme.primaryHex} />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-slate-950 border border-white/20 p-0.5">
                <TeamLogo teamProfile={teamProfile} teamSlot={banner.team} className="w-full h-full object-contain" />
              </div>
            </div>

            <div className="flex-1 min-w-0 leading-tight">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded-full shrink-0 ${teamTheme.bgBadgeClass}`}>
                  {t('Gift.patronTag', { defaultValue: 'ĐẠI GIA {{team}}', team: teamTag })}
                </span>
                <span className="flex-1 min-w-0 text-xs font-black text-white truncate">{banner.donorName}</span>
                <span className="shrink-0 text-sm font-mono font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-gift-coin-punch">
                  {t('Gift.coinsGained', { defaultValue: '+{{coins}} xu', coins: resolveGiftCoins(banner).toLocaleString() })}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5 min-w-0">
                <span className="text-[10px] font-bold text-slate-300 shrink-0">{t('Gift.sentLabel', 'ĐÃ TẶNG')}:</span>
                <span className={`text-xs font-black truncate ${teamTheme.textClass}`}>{banner.giftName}</span>
                <StreakCounter count={streakCount} label={t('Gift.comboStreak', { defaultValue: 'COMBO x{{count}}', count: streakCount })} />
                <Sparkles className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
              </div>
              <div className="flex items-center gap-1 mt-0.5 text-[10px] font-mono font-black text-emerald-400 truncate">
                <Flame className="w-3 h-3 fill-current text-rose-500 shrink-0" />
                <span className="truncate">
                  +{resolveGiftDamage(banner).toLocaleString()} {t('Gift.ultimateBonus', 'ST TUYỆT KỸ & MƯA THIÊN THẠCH!')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <GiftSparkleBurst
        count={GIFT_SPARKLE_COUNT[GIFT_TIER.BIG]}
        radiusX={SPARKLE_RADIUS_PX.X}
        radiusY={SPARKLE_RADIUS_PX.Y}
        colors={celebrationColors}
        isLooping
      />
    </div>
  );
};
