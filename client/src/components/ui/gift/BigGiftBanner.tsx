import { useTranslation } from 'react-i18next';
import { Flame, Sparkles } from 'lucide-react';
import { GiftAnnouncement } from '../../../types/game';
import { TeamColorPalette, TeamProfile } from '../../../types/team';
import { TeamLogo } from '../../icons/TeamLogos';
import { DonorAvatar, StreakCounter, resolveGiftCoins, resolveGiftDamage } from './giftShared';

interface BigGiftBannerProps {
  banner: GiftAnnouncement;
  teamTheme: TeamColorPalette;
  teamProfile: TeamProfile | undefined;
}

/** 99–999 coins: full-width banner with avatar, gift, coins, damage and the team crest. */
export const BigGiftBanner = ({ banner, teamTheme, teamProfile }: BigGiftBannerProps) => {
  const { t } = useTranslation();
  const streakCount = banner.streakCount ?? 1;
  const teamTag = teamProfile?.shortTag || banner.team;

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl px-3 py-2 shadow-2xl border backdrop-blur-xl animate-gift-pill-in ${teamTheme.giftBannerGradientClass}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-gift-shimmer" />
      <div className="relative flex items-center gap-2.5">
        <div className="relative shrink-0">
          <DonorAvatar name={banner.donorName} avatarUrl={banner.donorAvatarUrl} sizeClassName="w-11 h-11" ringColor={teamTheme.primaryHex} />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-md bg-slate-950 border border-white/20 p-0.5">
            <TeamLogo teamProfile={teamProfile} teamSlot={banner.team} className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="flex-1 min-w-0 leading-tight">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded-full shrink-0 ${teamTheme.bgBadgeClass}`}>
              {t('Gift.patronTag', { defaultValue: 'ĐẠI GIA {{team}}', team: teamTag })}
            </span>
            <span className="text-xs font-black text-white truncate">{banner.donorName}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 min-w-0">
            <span className="text-[10px] font-bold text-slate-300 shrink-0">{t('Gift.sentLabel', 'ĐÃ TẶNG')}:</span>
            <span className={`text-xs font-black truncate ${teamTheme.textClass}`}>{banner.giftName}</span>
            <span className="text-[10px] font-mono font-black text-amber-300 shrink-0">
              {t('Gift.coinsGained', { defaultValue: '+{{coins}} xu', coins: resolveGiftCoins(banner) })}
            </span>
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
  );
};
