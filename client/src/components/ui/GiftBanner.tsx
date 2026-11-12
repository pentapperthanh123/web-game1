import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Flame } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { GAME_CONSTANTS } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { TeamLogo } from '../icons/TeamLogos';

export const GiftBanner = () => {
  const { t } = useTranslation();
  const activeGiftBanner = useGameStore((state) => state.activeGiftBanner);
  const dismissGiftBanner = useGameStore((state) => state.dismissGiftBanner);
  const activeTeams = useGameStore((state) => state.activeTeams);

  useEffect(() => {
    if (!activeGiftBanner) return;
    const timer = setTimeout(() => {
      dismissGiftBanner();
    }, 4500);
    return () => clearTimeout(timer);
  }, [activeGiftBanner, dismissGiftBanner]);

  if (!activeGiftBanner) return null;

  const teamProfile = activeTeams[activeGiftBanner.team];
  const teamTheme = getTeamTheme(teamProfile?.colorTheme);
  const teamTag = teamProfile?.shortTag || activeGiftBanner.team;
  const streakCount = activeGiftBanner.streakCount ?? 1;
  const displayCoins = activeGiftBanner.totalCoins ?? activeGiftBanner.coins ?? 0;
  const giftDamage = displayCoins * GAME_CONSTANTS.TIKTOK_ENGAGEMENT.GIFT_DAMAGE_PER_COIN;

  return (
    <div className="w-full pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
      <div
        className={`relative overflow-hidden rounded-2xl px-3 py-2 shadow-2xl border backdrop-blur-xl ${teamTheme.giftBannerGradientClass}`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent translate-x-[-100%] animate-[shimmer_1.8s_infinite]" />

        <div className="relative flex items-center space-x-2.5">
          <div
            style={{ boxShadow: teamTheme.glowStyle }}
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 p-1 shadow-lg border bg-slate-900/90 ${teamTheme.borderClass}`}
          >
            <TeamLogo teamProfile={teamProfile} teamSlot={activeGiftBanner.team} className="w-7 h-7 object-contain" />
          </div>

          <div className="flex-1 min-w-0 leading-tight">
            <div className="flex items-center space-x-1.5">
              <span
                className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded-full shrink-0 ${teamTheme.bgBadgeClass}`}
              >
                {t('Gift.patronTag', 'ĐẠI GIA {{team}}', { team: teamTag })}
              </span>
              <span className="text-xs font-black text-white truncate">
                {activeGiftBanner.donorName}
              </span>
            </div>

            <div className="flex items-center space-x-1 mt-0.5 min-w-0">
              <span className="text-[10px] font-bold text-slate-300 shrink-0">
                {t('Gift.sentLabel', 'ĐÃ TẶNG')}:
              </span>
              <span className={`text-xs font-black truncate ${teamTheme.textClass}`}>
                {activeGiftBanner.giftName}
              </span>
              {streakCount > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 text-slate-950 font-black text-[9px] shrink-0 animate-combo-punch shadow-[0_0_12px_rgba(245,158,11,0.8)] border border-amber-300">
                  {t('Gift.comboStreak', 'COMBO x{{count}}', { count: streakCount })}
                </span>
              )}
              <Sparkles className="w-3.5 h-3.5 text-yellow-300 animate-spin shrink-0" />
            </div>

            <div className="flex items-center space-x-1 mt-0.5 text-[10px] font-mono font-black text-emerald-400 truncate">
              <Flame className="w-3 h-3 fill-current text-rose-500 animate-pulse shrink-0" />
              <span className="truncate">
                +{giftDamage.toLocaleString()} {t('Gift.ultimateBonus', 'ST TUYỆT KỸ & MƯA THIÊN THẠCH!')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
