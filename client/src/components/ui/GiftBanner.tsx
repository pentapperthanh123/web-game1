import { useEffect, useState, type ReactElement } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, GIFT_TIER, GiftTier } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { resolveBannerDurationMs } from '../../store/giftTier';
import { GiftAnnouncement } from '../../types/game';
import { TeamColorPalette, TeamProfile } from '../../types/team';
import { MediumGiftPill } from './gift/MediumGiftPill';
import { BigGiftBanner } from './gift/BigGiftBanner';
import { MegaGiftHeroCard } from './gift/MegaGiftHeroCard';
import './gift/gift.css';
import { useSessionTier } from '../../store/sessionLeaderboardStore';
import { SessionTierBadge } from './session/SessionTierBadge';
import { SESSION_TIER, isSessionTierAtLeast } from '../../constants/sessionLeaderboard';

interface GiftPresentationProps {
  banner: GiftAnnouncement;
  teamTheme: TeamColorPalette;
  teamProfile: TeamProfile | undefined;
}

type GiftPresentation = (props: GiftPresentationProps) => ReactElement;

/** SMALL gifts never set a banner (they only get a heart chime + damage). */
const GIFT_PRESENTATION: Readonly<Partial<Record<GiftTier, GiftPresentation>>> = {
  [GIFT_TIER.MEDIUM]: MediumGiftPill,
  [GIFT_TIER.BIG]: BigGiftBanner,
  [GIFT_TIER.MEGA]: MegaGiftHeroCard,
};

/** Must match the `.animate-gift-exit` duration in gift.css. */
const GIFT_BANNER_EXIT_MS = 450;

/** Picks the presentation for the gift tier, plays its exit animation, then dismisses it. */
export const GiftBanner = () => {
  const { t } = useTranslation();
  const bossStatus = useGameStore((state) => state.bossStatus);
  const activeGiftBanner = useGameStore((state) => state.activeGiftBanner);
  const dismissGiftBanner = useGameStore((state) => state.dismissGiftBanner);
  const teamProfile = useGameStore((state) => (activeGiftBanner ? state.activeTeams[activeGiftBanner.team] : undefined));
  const donorSessionTier = useSessionTier(activeGiftBanner?.donorName);
  // Only high tiers get the ribbon, so small gifts stay quiet
  const hasTierRibbon = isSessionTierAtLeast(donorSessionTier, SESSION_TIER.DIAMOND);

  const [leavingBannerId, setLeavingBannerId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeGiftBanner) return;
    const duration = resolveBannerDurationMs(
      activeGiftBanner.tier,
      activeGiftBanner.totalCoins ?? activeGiftBanner.coins
    );
    const bannerId = activeGiftBanner.id;
    const leaveTimer = setTimeout(() => setLeavingBannerId(bannerId), Math.max(0, duration - GIFT_BANNER_EXIT_MS));
    const dismissTimer = setTimeout(dismissGiftBanner, duration);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(dismissTimer);
    };
  }, [activeGiftBanner, dismissGiftBanner]);

  if (!activeGiftBanner || bossStatus === BOSS_STATUS.DEFEATED) return null;
  const Presentation = GIFT_PRESENTATION[activeGiftBanner.tier];
  if (!Presentation) return null;

  return (
    <div
      key={activeGiftBanner.id}
      className={clsx(
        'w-full flex flex-col items-center gap-0.5 pointer-events-none',
        leavingBannerId === activeGiftBanner.id && 'animate-gift-exit'
      )}
    >
      {/* Ribbon above any gift tier's card: a Diamond+ donor of the session is shown as such */}
      {hasTierRibbon && (
        <div className="flex items-center gap-1 text-[9px] font-black text-amber-200 drop-shadow">
          <SessionTierBadge tier={donorSessionTier} hasLabel />
          <span>{t('SessionBoard.giftRibbon', 'ra tay!')}</span>
        </div>
      )}
      <Presentation
        key={activeGiftBanner.id}
        banner={activeGiftBanner}
        teamTheme={getTeamTheme(teamProfile?.colorTheme)}
        teamProfile={teamProfile}
      />
    </div>
  );
};
