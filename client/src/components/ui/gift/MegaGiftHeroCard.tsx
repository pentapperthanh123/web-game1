import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';
import { GiftAnnouncement } from '../../../types/game';
import { TeamColorPalette, TeamProfile } from '../../../types/team';
import { GiftConfetti } from './GiftConfetti';
import { DonorAvatar, StreakCounter, resolveGiftCoins, resolveGiftDamage } from './giftShared';

const MEGA_GOLD = '#fbbf24';
const RAYS_GRADIENT = `repeating-conic-gradient(from 0deg, rgba(251,191,36,0.28) 0deg 8deg, transparent 8deg 22deg)`;
const RAYS_MASK = 'radial-gradient(circle, black 30%, transparent 70%)';

interface MegaGiftHeroCardProps {
  banner: GiftAnnouncement;
  teamTheme: TeamColorPalette;
  teamProfile: TeamProfile | undefined;
}

/** ≥1000 coins: centred hero card with rotating gold rays, confetti and a big avatar. */
export const MegaGiftHeroCard = ({ banner, teamTheme, teamProfile }: MegaGiftHeroCardProps) => {
  const { t } = useTranslation();
  const streakCount = banner.streakCount ?? 1;
  const teamTag = teamProfile?.shortTag || banner.team;
  const confettiColors = [MEGA_GOLD, teamTheme.primaryHex, teamTheme.secondaryHex, '#ffffff'];

  return (
    <div className="relative w-full pt-2 animate-gift-hero-in">
      <div
        className="absolute left-1/2 top-[44%] w-[260px] h-[260px] rounded-full animate-gift-rays pointer-events-none"
        style={{ background: RAYS_GRADIENT, maskImage: RAYS_MASK, WebkitMaskImage: RAYS_MASK }}
      />
      <GiftConfetti colors={confettiColors} />

      <div className="relative mx-auto max-w-[300px] rounded-3xl border-2 border-amber-300/80 bg-gradient-to-b from-amber-950/95 via-slate-950/95 to-slate-950/95 shadow-[0_0_40px_rgba(251,191,36,0.55)] px-4 pt-3 pb-3 text-center">
        <div className="flex items-center justify-center gap-1 text-[10px] font-black tracking-[0.2em] text-amber-300 uppercase">
          <Crown className="w-3.5 h-3.5 fill-current" />
          <span>{t('Gift.megaCrest', { defaultValue: 'ĐẠI GIA {{team}}', team: teamTag })}</span>
          <Crown className="w-3.5 h-3.5 fill-current" />
        </div>

        <div className="relative mx-auto mt-2 w-20 h-20">
          <div
            className="absolute left-1/2 top-1/2 w-24 h-24 rounded-full border-2 border-dashed animate-gift-ring-spin"
            style={{ borderColor: MEGA_GOLD }}
          />
          <DonorAvatar name={banner.donorName} avatarUrl={banner.donorAvatarUrl} sizeClassName="w-20 h-20" ringColor={MEGA_GOLD} />
        </div>

        <div className="mt-2 text-lg font-black text-white truncate">{banner.donorName}</div>
        <div className="flex items-center justify-center gap-1.5 mt-0.5 min-w-0">
          <span className={`text-sm font-black truncate ${teamTheme.textClass}`}>{banner.giftName}</span>
          <StreakCounter count={streakCount} label={t('Gift.comboStreak', { defaultValue: 'COMBO x{{count}}', count: streakCount })} />
        </div>
        <div className="mt-1 text-xl font-black font-mono text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">
          {t('Gift.coinsGained', { defaultValue: '+{{coins}} xu', coins: resolveGiftCoins(banner).toLocaleString() })}
        </div>
        <div className="text-[11px] font-mono font-black text-emerald-300">
          {t('Gift.megaDamage', { defaultValue: '+{{damage}} ST • BOSS BỊ ĐÁNH BẬT!', damage: resolveGiftDamage(banner).toLocaleString() })}
        </div>
      </div>
    </div>
  );
};
