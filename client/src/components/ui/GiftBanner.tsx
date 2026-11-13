import { useEffect, type ReactElement } from 'react';
import { useGameStore } from '../../store/gameStore';
import { GIFT_TIER, GiftTier } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { getGiftTierConfig } from '../../store/giftTier';
import { GiftAnnouncement } from '../../types/game';
import { TeamColorPalette, TeamProfile } from '../../types/team';
import { MediumGiftPill } from './gift/MediumGiftPill';
import { BigGiftBanner } from './gift/BigGiftBanner';
import { MegaGiftHeroCard } from './gift/MegaGiftHeroCard';

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

/** Picks the presentation for the gift tier and dismisses it after the tier's duration. */
export const GiftBanner = () => {
  const activeGiftBanner = useGameStore((state) => state.activeGiftBanner);
  const dismissGiftBanner = useGameStore((state) => state.dismissGiftBanner);
  const teamProfile = useGameStore((state) => (activeGiftBanner ? state.activeTeams[activeGiftBanner.team] : undefined));

  useEffect(() => {
    if (!activeGiftBanner) return;
    const timer = setTimeout(dismissGiftBanner, getGiftTierConfig(activeGiftBanner.tier).bannerDurationMs);
    return () => clearTimeout(timer);
  }, [activeGiftBanner, dismissGiftBanner]);

  if (!activeGiftBanner) return null;
  const Presentation = GIFT_PRESENTATION[activeGiftBanner.tier];
  if (!Presentation) return null;

  return (
    <div className="w-full flex justify-center pointer-events-none">
      <Presentation
        key={activeGiftBanner.id}
        banner={activeGiftBanner}
        teamTheme={getTeamTheme(teamProfile?.colorTheme)}
        teamProfile={teamProfile}
      />
    </div>
  );
};
