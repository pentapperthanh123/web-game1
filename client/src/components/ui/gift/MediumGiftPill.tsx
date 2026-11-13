import { useTranslation } from 'react-i18next';
import { GiftAnnouncement } from '../../../types/game';
import { TeamColorPalette } from '../../../types/team';
import { DonorAvatar, StreakCounter, resolveGiftCoins } from './giftShared';

interface MediumGiftPillProps {
  banner: GiftAnnouncement;
  teamTheme: TeamColorPalette;
}

/** 10–98 coins: compact pill with the donor's avatar, gift and coins. */
export const MediumGiftPill = ({ banner, teamTheme }: MediumGiftPillProps) => {
  const { t } = useTranslation();
  const streakCount = banner.streakCount ?? 1;
  return (
    <div
      style={{ borderColor: teamTheme.primaryHex }}
      className="flex items-center gap-1.5 pl-0.5 pr-2.5 py-0.5 rounded-full border bg-slate-950/90 backdrop-blur-md shadow-lg animate-gift-pill-in max-w-full"
    >
      <DonorAvatar name={banner.donorName} avatarUrl={banner.donorAvatarUrl} sizeClassName="w-6 h-6" ringColor={teamTheme.primaryHex} />
      <span className="text-[10px] font-black text-white truncate min-w-0">{banner.donorName}</span>
      <span className={`text-[10px] font-bold truncate min-w-0 ${teamTheme.textClass}`}>{banner.giftName}</span>
      <span className="text-[10px] font-mono font-black text-amber-300 shrink-0">
        {t('Gift.coinsGained', { defaultValue: '+{{coins}} xu', coins: resolveGiftCoins(banner) })}
      </span>
      <StreakCounter count={streakCount} label={t('Gift.comboStreak', { defaultValue: 'COMBO x{{count}}', count: streakCount })} />
    </div>
  );
};
