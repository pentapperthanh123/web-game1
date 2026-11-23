import { useTranslation } from 'react-i18next';
import { Crown, Zap } from 'lucide-react';
import { GIFT_TIER } from '../../../constants/game';
import {
  GIFT_CELEBRATION_COLORS,
  GIFT_SPARKLE_COUNT,
  GiftMegaGradeConfig,
} from '../../../constants/giftPresentation';
import { getMegaGradeConfig } from '../../../store/giftTier';
import { GiftAnnouncement } from '../../../types/game';
import { TeamColorPalette, TeamProfile } from '../../../types/team';
import { TeamLogo } from '../../icons/TeamLogos';
import { GiftConfetti } from './GiftConfetti';
import { GiftSparkleBurst } from './GiftSparkleBurst';
import {
  DonorAvatar,
  GiftEmblemOrb,
  StreakCounter,
  formatCleanGiftName,
  resolveGiftCoins,
  resolveGiftDamage,
} from './giftShared';

const MEGA_GOLD = GIFT_CELEBRATION_COLORS.GOLD;
const RAYS_MASK = 'radial-gradient(circle, black 22%, transparent 66%)';
const SHOCK_RING_DELAYS_S = [0, 0.8] as const;
const SPARKLE_RADIUS_PX = { X: 190, Y: 56 } as const;
const DUAL_RAYS_MIN_CROWNS = 2;
const CROWN_BOB_STAGGER_S = 0.15;

const buildRaysGradient = (color: string): string =>
  `repeating-conic-gradient(from 0deg, ${color}38 0deg 8deg, transparent 8deg 22deg)`;

const buildAuraGradient = (teamTheme: TeamColorPalette): string =>
  `conic-gradient(from 0deg, ${MEGA_GOLD}, ${GIFT_CELEBRATION_COLORS.WHITE}, ${teamTheme.primaryHex}, ${MEGA_GOLD}, ${GIFT_CELEBRATION_COLORS.CYAN}, ${teamTheme.secondaryHex}, ${GIFT_CELEBRATION_COLORS.ROSE}, ${MEGA_GOLD})`;

interface MegaBackdropProps {
  teamTheme: TeamColorPalette;
  hasDualRays: boolean;
}

const MegaBackdrop = ({ teamTheme, hasDualRays }: MegaBackdropProps) => (
  <>
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[220px] h-[220px] rounded-full animate-gift-rays pointer-events-none opacity-60"
      style={{
        background: buildRaysGradient(MEGA_GOLD),
        maskImage: RAYS_MASK,
        WebkitMaskImage: RAYS_MASK,
      }}
    />
    {hasDualRays && (
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full animate-gift-rays-reverse pointer-events-none opacity-45"
        style={{
          background: buildRaysGradient(teamTheme.primaryHex),
          maskImage: RAYS_MASK,
          WebkitMaskImage: RAYS_MASK,
        }}
      />
    )}
    {SHOCK_RING_DELAYS_S.map((delayS) => (
      <div
        key={delayS}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] rounded-full border gift-shock-ring animate-gift-shock-ring pointer-events-none"
        style={{ borderColor: MEGA_GOLD, animationDelay: `${delayS}s` }}
      />
    ))}
  </>
);

interface MegaCrestRibbonProps {
  grade: GiftMegaGradeConfig;
  teamTag: string;
}

const MegaCrestRibbon = ({ grade, teamTag }: MegaCrestRibbonProps) => {
  const { t } = useTranslation();
  const crowns = Array.from({ length: grade.crownCount }, (_, index) => (
    <Crown
      key={index}
      className="w-3 h-3 fill-current animate-gift-crown-bob text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.9)] shrink-0"
      style={{ animationDelay: `${index * CROWN_BOB_STAGGER_S}s` }}
    />
  ));
  return (
    <div className="relative z-20 -mb-2.5 flex items-center justify-center pointer-events-none">
      <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-2 border-amber-400/90 shadow-[0_2px_14px_rgba(245,158,11,0.65)]">
        <span className="w-1.5 h-1.5 rotate-45 bg-amber-300 shadow-[0_0_6px_#fbbf24]" />
        <span className="flex gap-0.5">{crowns}</span>
        <span className="text-[9.5px] font-black tracking-[0.18em] bg-gradient-to-b from-white via-amber-200 to-amber-400 bg-clip-text text-transparent uppercase truncate">
          {t(grade.crestKey, { defaultValue: grade.crestFallback, team: teamTag })}
        </span>
        <span className="flex gap-0.5">{crowns}</span>
        <span className="w-1.5 h-1.5 rotate-45 bg-amber-300 shadow-[0_0_6px_#fbbf24]" />
      </div>
    </div>
  );
};

interface MegaGiftHeroCardProps {
  banner: GiftAnnouncement;
  teamTheme: TeamColorPalette;
  teamProfile: TeamProfile | undefined;
}

/**
 * LoL Worlds Hextech Broadcast Winged Banner for MEGA gifts (≥199 coins).
 * Features Left VIP Avatar Crest, Center Donor & Impact Plaque, and Right 3D Gift Emblem Orb + Coin Badge.
 */
export const MegaGiftHeroCard = ({
  banner,
  teamTheme,
  teamProfile,
}: MegaGiftHeroCardProps) => {
  const { t } = useTranslation();
  const streakCount = banner.streakCount ?? 1;
  const teamTag = teamProfile?.shortTag || banner.team;
  const coins = resolveGiftCoins(banner);
  const grade = getMegaGradeConfig(coins);
  const hasDualRays = grade.crownCount >= DUAL_RAYS_MIN_CROWNS;
  const cleanGiftName = formatCleanGiftName(banner.giftName);
  const celebrationColors = [
    MEGA_GOLD,
    teamTheme.primaryHex,
    teamTheme.secondaryHex,
    GIFT_CELEBRATION_COLORS.WHITE,
  ];

  return (
    <div className="relative w-full flex flex-col items-center animate-gift-hero-in">
      <MegaBackdrop teamTheme={teamTheme} hasDualRays={hasDualRays} />
      <GiftConfetti colors={celebrationColors} count={grade.confettiCount} />

      {/* Top Floating Royal Crest Plaque */}
      <MegaCrestRibbon grade={grade} teamTag={teamTag} />

      {/* Main Symmetrical Hextech Winged Container */}
      <div className="relative flex items-center justify-center w-full max-w-[376px]">
        {/* Left Golden Hextech Wing Fin */}
        <div className="hidden sm:flex -mr-2 items-center pointer-events-none z-10">
          <div className="w-4 h-12 bg-gradient-to-l from-amber-400/85 via-amber-500/45 to-transparent skew-x-[22deg] rounded-l-md border-l-2 border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.65)]" />
          <div className="w-2 h-8 bg-amber-300/70 skew-x-[22deg] border-l border-amber-100" />
        </div>

        {/* Core Hextech Card with Spinning Conic Aura Border */}
        <div className="relative flex-1 min-w-0">
          <div className="absolute -inset-0.5 rounded-2xl shadow-[0_0_32px_rgba(251,191,36,0.7),0_10px_28px_rgba(0,0,0,0.95)] animate-gift-glow-pulse pointer-events-none" />

          <div className="relative overflow-hidden rounded-2xl p-[2px] shadow-2xl">
            <div
              style={{ background: buildAuraGradient(teamTheme) }}
              className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square pointer-events-none ${
                hasDualRays ? 'animate-gift-aura-fast' : 'animate-gift-aura'
              }`}
            />

            <div
              style={{
                background:
                  'linear-gradient(135deg, rgba(2, 6, 23, 0.97) 0%, rgba(15, 23, 42, 0.96) 50%, rgba(23, 15, 8, 0.97) 100%)',
                boxShadow: `inset 0 0 22px ${teamTheme.primaryHex}28, inset 0 1px 0 rgba(254, 240, 138, 0.45)`,
              }}
              className="relative overflow-hidden rounded-[14px] px-3 pb-2.5 pt-3.5"
            >
              {/* Sweeping metallic light sheen */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent animate-gift-shimmer pointer-events-none" />

              {/* Hextech Corner Diamond Rivets */}
              <span className="absolute top-1.5 left-1.5 w-1.5 h-1.5 rotate-45 border border-amber-300/70 bg-amber-400/30 pointer-events-none" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rotate-45 border border-amber-300/70 bg-amber-400/30 pointer-events-none" />
              <span className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 rotate-45 border border-amber-300/70 bg-amber-400/30 pointer-events-none" />
              <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 rotate-45 border border-amber-300/70 bg-amber-400/30 pointer-events-none" />

              <div className="relative flex items-center gap-2.5">
                {/* LEFT COLUMN: VIP Avatar with Spinning Golden Rune Ring & Team Shield */}
                <div className="relative shrink-0 w-13 h-13 flex items-center justify-center">
                  <div
                    className="absolute inset-[-3px] rounded-full border-2 border-dashed animate-gift-ring-spin pointer-events-none"
                    style={{ borderColor: MEGA_GOLD }}
                  />
                  <DonorAvatar
                    name={banner.donorName}
                    avatarUrl={banner.donorAvatarUrl}
                    sizeClassName="w-12 h-12"
                    ringColor={MEGA_GOLD}
                  />
                  <div
                    style={{ borderColor: teamTheme.primaryHex }}
                    className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-md bg-slate-950 border-2 p-0.5 shadow-lg"
                  >
                    <TeamLogo
                      teamProfile={teamProfile}
                      teamSlot={banner.team}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* CENTER COLUMN: Donor Identity, Gift Name & Embossed Combat Impact */}
                <div className="flex-1 min-w-0 flex flex-col items-start leading-tight gap-1">
                  <div className="w-full flex items-center gap-1.5 min-w-0">
                    <span
                      style={{
                        textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 12px rgba(251,191,36,0.45)',
                      }}
                      className="text-xs sm:text-sm font-black text-white tracking-wide truncate"
                    >
                      {banner.donorName}
                    </span>
                    <StreakCounter
                      count={streakCount}
                      label={t('Gift.comboStreak', {
                        defaultValue: 'COMBO x{{count}}',
                        count: streakCount,
                      })}
                    />
                  </div>

                  <div className="w-full flex items-center gap-1 min-w-0">
                    <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
                      {t('Gift.sentLabel', 'TẶNG')}:
                    </span>
                    <span
                      className={`text-xs font-black truncate drop-shadow ${teamTheme.textClass}`}
                    >
                      {cleanGiftName}
                    </span>
                  </div>

                  {/* Embossed Hextech Damage & Boss Knockback Pill */}
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-400/60 shadow-[0_0_10px_rgba(16,185,129,0.25)] max-w-full">
                    <Zap className="w-3 h-3 fill-current text-amber-400 shrink-0 animate-pulse" />
                    <span className="text-[9.5px] font-mono font-black text-emerald-300 truncate">
                      {t('Gift.megaDamage', {
                        defaultValue: '+{{damage}} ST • BOSS BỊ ĐÁNH BẬT!',
                        damage: resolveGiftDamage(banner).toLocaleString(),
                      })}
                    </span>
                  </div>
                </div>

                {/* RIGHT COLUMN: 3D Gift Emblem Orb + Embossed Coin Plaque */}
                <div className="shrink-0 flex flex-col items-center justify-center gap-1 pl-1 border-l border-white/10">
                  <GiftEmblemOrb
                    giftName={banner.giftName}
                    coins={coins}
                    accentColor={MEGA_GOLD}
                    size="md"
                  />
                  <div className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/30 via-yellow-400/25 to-amber-500/30 border border-amber-300/80 shadow-[0_0_10px_rgba(251,191,36,0.45)] animate-gift-coin-punch">
                    <span className="text-[11px] sm:text-xs font-black font-mono text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,1)] whitespace-nowrap">
                      {t('Gift.coinsGained', {
                        defaultValue: '+{{coins}} xu',
                        coins: coins.toLocaleString(),
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <GiftSparkleBurst
            count={GIFT_SPARKLE_COUNT[GIFT_TIER.MEGA]}
            radiusX={SPARKLE_RADIUS_PX.X}
            radiusY={SPARKLE_RADIUS_PX.Y}
            colors={celebrationColors}
            isLooping
          />
        </div>

        {/* Right Golden Hextech Wing Fin */}
        <div className="hidden sm:flex -ml-2 items-center pointer-events-none z-10">
          <div className="w-2 h-8 bg-amber-300/70 skew-x-[-22deg] border-r border-amber-100" />
          <div className="w-4 h-12 bg-gradient-to-r from-amber-400/85 via-amber-500/45 to-transparent skew-x-[-22deg] rounded-r-md border-r-2 border-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.65)]" />
        </div>
      </div>
    </div>
  );
};
