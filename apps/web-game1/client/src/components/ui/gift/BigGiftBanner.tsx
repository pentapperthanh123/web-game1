import { useTranslation } from 'react-i18next';
import { Flame, Sparkles } from 'lucide-react';
import { GIFT_TIER } from '../../../constants/game';
import {
  GIFT_BIG_CONFETTI_COUNT,
  GIFT_CELEBRATION_COLORS,
  GIFT_SPARKLE_COUNT,
} from '../../../constants/giftPresentation';
import { GiftAnnouncement } from '../../../types/game';
import { TeamColorPalette, TeamProfile } from '../../../types/team';
import { TeamLogo } from '../../icons/TeamLogos';
import {
  DonorAvatar,
  GiftEmblemOrb,
  StreakCounter,
  formatCleanGiftName,
  resolveGiftCoins,
  resolveGiftDamage,
} from './giftShared';
import { GiftConfetti } from './GiftConfetti';
import { GiftSparkleBurst } from './GiftSparkleBurst';

const SPARKLE_RADIUS_PX = { X: 185, Y: 52 } as const;

const buildBorderGradient = (teamTheme: TeamColorPalette): string =>
  `conic-gradient(from 0deg, ${teamTheme.primaryHex}, ${GIFT_CELEBRATION_COLORS.WHITE}, ${teamTheme.secondaryHex}, ${GIFT_CELEBRATION_COLORS.GOLD}, ${teamTheme.primaryHex})`;

interface BigGiftBannerProps {
  banner: GiftAnnouncement;
  teamTheme: TeamColorPalette;
  teamProfile: TeamProfile | undefined;
}

/** 50–198 coins: Hextech Winged Broadcast Banner with Left VIP Avatar, Center Damage Pill, and Right 3D Gift Emblem Orb. */
export const BigGiftBanner = ({ banner, teamTheme, teamProfile }: BigGiftBannerProps) => {
  const { t } = useTranslation();
  const streakCount = banner.streakCount ?? 1;
  const teamTag = teamProfile?.shortTag || banner.team;
  const coins = resolveGiftCoins(banner);
  const cleanGiftName = formatCleanGiftName(banner.giftName);
  const celebrationColors = [
    GIFT_CELEBRATION_COLORS.GOLD,
    teamTheme.primaryHex,
    teamTheme.secondaryHex,
    GIFT_CELEBRATION_COLORS.WHITE,
  ];

  return (
    <div className="relative w-full flex items-center justify-center animate-gift-slam-in">
      <GiftConfetti colors={celebrationColors} count={GIFT_BIG_CONFETTI_COUNT} />

      <div className="relative flex items-center justify-center w-full max-w-[368px]">
        {/* Left Team-Tinted Hextech Fin */}
        <div className="hidden sm:flex -mr-1.5 items-center pointer-events-none z-10 opacity-90">
          <div
            style={{
              borderColor: teamTheme.primaryHex,
              background: `linear-gradient(to left, ${teamTheme.primaryHex}88, transparent)`,
            }}
            className="w-3.5 h-10 skew-x-[20deg] rounded-l border-l-2"
          />
        </div>

        <div className="relative flex-1 min-w-0">
          <div
            style={{ boxShadow: `0 0 28px ${teamTheme.primaryHex}99` }}
            className="absolute inset-0 rounded-2xl animate-gift-glow-pulse pointer-events-none"
          />

          <div className="relative overflow-hidden rounded-2xl p-[2px] shadow-2xl">
            <div
              style={{ background: buildBorderGradient(teamTheme) }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[135%] aspect-square animate-gift-aura pointer-events-none"
            />
            <div
              style={{
                boxShadow: `inset 0 0 18px ${teamTheme.primaryHex}25`,
              }}
              className={`relative overflow-hidden rounded-[14px] px-3 py-2 bg-slate-950/96 ${teamTheme.giftBannerGradientClass}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-gift-shimmer pointer-events-none" />

              {/* Hextech Corner Rivets */}
              <span
                style={{ borderColor: teamTheme.primaryHex }}
                className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rotate-45 border bg-white/20 pointer-events-none"
              />
              <span
                style={{ borderColor: teamTheme.primaryHex }}
                className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rotate-45 border bg-white/20 pointer-events-none"
              />

              <div className="relative flex items-center gap-2.5">
                {/* Left: Donor Avatar + Team Shield */}
                <div className="relative shrink-0">
                  <DonorAvatar
                    name={banner.donorName}
                    avatarUrl={banner.donorAvatarUrl}
                    sizeClassName="w-11 h-11"
                    ringColor={teamTheme.primaryHex}
                  />
                  <div
                    style={{ borderColor: teamTheme.primaryHex }}
                    className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-md bg-slate-950 border p-0.5 shadow"
                  >
                    <TeamLogo
                      teamProfile={teamProfile}
                      teamSlot={banner.team}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Center: Patron Badge, Donor Name, Gift & Damage Pill */}
                <div className="flex-1 min-w-0 flex flex-col items-start leading-tight gap-0.5">
                  <div className="w-full flex items-center gap-1.5 min-w-0">
                    <span
                      className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded-full shrink-0 border border-white/20 ${teamTheme.bgBadgeClass}`}
                    >
                      {t('Gift.patronTag', { defaultValue: 'ĐẠI GIA {{team}}', team: teamTag })}
                    </span>
                    <span className="flex-1 min-w-0 text-xs font-black text-white truncate drop-shadow">
                      {banner.donorName}
                    </span>
                  </div>

                  <div className="w-full flex items-center gap-1 min-w-0">
                    <span className="text-[9.5px] font-bold text-slate-300 shrink-0">
                      {t('Gift.sentLabel', 'ĐÃ TẶNG')}:
                    </span>
                    <span className={`text-xs font-black truncate ${teamTheme.textClass}`}>
                      {cleanGiftName}
                    </span>
                    <StreakCounter
                      count={streakCount}
                      label={t('Gift.comboStreak', {
                        defaultValue: 'COMBO x{{count}}',
                        count: streakCount,
                      })}
                    />
                    <Sparkles className="w-3 h-3 text-yellow-300 shrink-0" />
                  </div>

                  <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-emerald-400/50 text-[9.5px] font-mono font-black text-emerald-300 max-w-full">
                    <Flame className="w-3 h-3 fill-current text-rose-500 shrink-0" />
                    <span className="truncate">
                      +{resolveGiftDamage(banner).toLocaleString()}{' '}
                      {t('Gift.ultimateBonus', 'ST TUYỆT KỸ & MƯA THIÊN THẠCH!')}
                    </span>
                  </div>
                </div>

                {/* Right: 3D Gift Emblem Orb + Coin Plaque */}
                <div className="shrink-0 flex flex-col items-center justify-center gap-0.5 pl-1 border-l border-white/10">
                  <GiftEmblemOrb
                    giftName={banner.giftName}
                    coins={coins}
                    accentColor={teamTheme.primaryHex}
                    size="md"
                  />
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-300/70 text-[10.5px] font-mono font-black text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-gift-coin-punch whitespace-nowrap">
                    {t('Gift.coinsGained', {
                      defaultValue: '+{{coins}} xu',
                      coins: coins.toLocaleString(),
                    })}
                  </span>
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

        {/* Right Team-Tinted Hextech Fin */}
        <div className="hidden sm:flex -ml-1.5 items-center pointer-events-none z-10 opacity-90">
          <div
            style={{
              borderColor: teamTheme.primaryHex,
              background: `linear-gradient(to right, ${teamTheme.primaryHex}88, transparent)`,
            }}
            className="w-3.5 h-10 skew-x-[-20deg] rounded-r border-r-2"
          />
        </div>
      </div>
    </div>
  );
};
