import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';
import { GIFT_TIER } from '../../../constants/game';
import { GIFT_CELEBRATION_COLORS, GIFT_SPARKLE_COUNT, GiftMegaGradeConfig } from '../../../constants/giftPresentation';
import { getMegaGradeConfig } from '../../../store/giftTier';
import { GiftAnnouncement } from '../../../types/game';
import { TeamColorPalette, TeamProfile } from '../../../types/team';
import { GiftConfetti } from './GiftConfetti';
import { GiftSparkleBurst } from './GiftSparkleBurst';
import { DonorAvatar, StreakCounter, resolveGiftCoins, resolveGiftDamage } from './giftShared';

const MEGA_GOLD = GIFT_CELEBRATION_COLORS.GOLD;
const RAYS_MASK = 'radial-gradient(circle, black 30%, transparent 70%)';
const SHOCK_RING_DELAYS_S = [0, 0.8] as const;
const SPARKLE_RADIUS_PX = { X: 150, Y: 105 } as const;
/** From this many crowns up, a second team-colour ray layer counter-rotates and the border spins faster. */
const DUAL_RAYS_MIN_CROWNS = 2;
const CROWN_BOB_STAGGER_S = 0.15;

const buildRaysGradient = (color: string): string =>
  `repeating-conic-gradient(from 0deg, ${color}48 0deg 8deg, transparent 8deg 22deg)`;

/** Gold border laced with the team colours (plus cyan / rose highlights) spinning around the card. */
const buildAuraGradient = (teamTheme: TeamColorPalette): string =>
  `conic-gradient(from 0deg, ${MEGA_GOLD}, ${GIFT_CELEBRATION_COLORS.WHITE}, ${teamTheme.primaryHex}, ${MEGA_GOLD}, ${GIFT_CELEBRATION_COLORS.CYAN}, ${teamTheme.secondaryHex}, ${GIFT_CELEBRATION_COLORS.ROSE}, ${MEGA_GOLD})`;

interface MegaBackdropProps {
  teamTheme: TeamColorPalette;
  hasDualRays: boolean;
}

/** Rotating light rays and expanding shock rings behind the card. */
const MegaBackdrop = ({ teamTheme, hasDualRays }: MegaBackdropProps) => (
  <>
    <div
      className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] rounded-full animate-gift-rays pointer-events-none opacity-90"
      style={{ background: buildRaysGradient(MEGA_GOLD), maskImage: RAYS_MASK, WebkitMaskImage: RAYS_MASK }}
    />
    {hasDualRays && (
      <div
        className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full animate-gift-rays-reverse pointer-events-none opacity-70"
        style={{ background: buildRaysGradient(teamTheme.primaryHex), maskImage: RAYS_MASK, WebkitMaskImage: RAYS_MASK }}
      />
    )}
    {SHOCK_RING_DELAYS_S.map((delayS) => (
      <div
        key={delayS}
        className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full border-2 gift-shock-ring animate-gift-shock-ring pointer-events-none"
        style={{ borderColor: MEGA_GOLD, animationDelay: `${delayS}s` }}
      />
    ))}
  </>
);

interface MegaCrestProps {
  grade: GiftMegaGradeConfig;
  teamTag: string;
}

/** Title row: one crown per grade on each side, bobbing out of phase. */
const MegaCrest = ({ grade, teamTag }: MegaCrestProps) => {
  const { t } = useTranslation();
  const crowns = Array.from({ length: grade.crownCount }, (_, index) => (
    <Crown key={index} className="w-3.5 h-3.5 fill-current animate-gift-crown-bob" style={{ animationDelay: `${index * CROWN_BOB_STAGGER_S}s` }} />
  ));
  return (
    <div className="flex items-center justify-center gap-1 text-[10px] font-black tracking-[0.2em] text-amber-300 uppercase">
      <span className="flex gap-0.5">{crowns}</span>
      <span className="truncate">{t(grade.crestKey, { defaultValue: grade.crestFallback, team: teamTag })}</span>
      <span className="flex gap-0.5">{crowns}</span>
    </div>
  );
};

interface MegaGiftHeroCardProps {
  banner: GiftAnnouncement;
  teamTheme: TeamColorPalette;
  teamProfile: TeamProfile | undefined;
}

/**
 * ≥1000 coins: centred hero card with a spinning aura border, light rays, shock rings, confetti and stars.
 * The MEGA grade (by coins) adds crowns, a second ray layer, more confetti and a grander title.
 */
export const MegaGiftHeroCard = ({ banner, teamTheme, teamProfile }: MegaGiftHeroCardProps) => {
  const { t } = useTranslation();
  const streakCount = banner.streakCount ?? 1;
  const teamTag = teamProfile?.shortTag || banner.team;
  const grade = getMegaGradeConfig(resolveGiftCoins(banner));
  const hasDualRays = grade.crownCount >= DUAL_RAYS_MIN_CROWNS;
  const celebrationColors = [MEGA_GOLD, teamTheme.primaryHex, teamTheme.secondaryHex, GIFT_CELEBRATION_COLORS.WHITE];

  return (
    <div className="relative w-full pt-2 animate-gift-hero-in">
      <MegaBackdrop teamTheme={teamTheme} hasDualRays={hasDualRays} />
      <GiftConfetti colors={celebrationColors} count={grade.confettiCount} />

      <div className="relative mx-auto max-w-[310px]">
        <div className="absolute inset-0 rounded-3xl shadow-[0_0_60px_rgba(251,191,36,0.9)] animate-gift-glow-pulse pointer-events-none" />
        <div className="relative overflow-hidden rounded-3xl p-[2.5px]">
          <div
            style={{ background: buildAuraGradient(teamTheme) }}
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] aspect-square pointer-events-none ${hasDualRays ? 'animate-gift-aura-fast' : 'animate-gift-aura'}`}
          />
          <div className="relative overflow-hidden rounded-[22px] bg-gradient-to-b from-amber-950 via-slate-950 to-slate-950 px-4 pt-3 pb-3 text-center">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/20 to-transparent animate-gift-shimmer pointer-events-none" />
            <MegaCrest grade={grade} teamTag={teamTag} />

            <div className="relative mx-auto mt-2 w-20 h-20">
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-dashed animate-gift-ring-spin"
                style={{ borderColor: MEGA_GOLD }}
              />
              <DonorAvatar name={banner.donorName} avatarUrl={banner.donorAvatarUrl} sizeClassName="w-20 h-20" ringColor={MEGA_GOLD} />
            </div>

            <div className="relative mt-2 text-lg font-black text-white truncate">{banner.donorName}</div>
            <div className="relative flex items-center justify-center gap-1.5 mt-0.5 min-w-0">
              <span className={`text-sm font-black truncate ${teamTheme.textClass}`}>{banner.giftName}</span>
              <StreakCounter count={streakCount} label={t('Gift.comboStreak', { defaultValue: 'COMBO x{{count}}', count: streakCount })} />
            </div>
            <div className="relative mt-1 text-2xl font-black font-mono text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.9)] animate-gift-coin-punch">
              {t('Gift.coinsGained', { defaultValue: '+{{coins}} xu', coins: resolveGiftCoins(banner).toLocaleString() })}
            </div>
            <div className="relative text-[11px] font-mono font-black text-emerald-300">
              {t('Gift.megaDamage', { defaultValue: '+{{damage}} ST • BOSS BỊ ĐÁNH BẬT!', damage: resolveGiftDamage(banner).toLocaleString() })}
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
    </div>
  );
};
