import { useState, useEffect } from 'react';
import { Crown, Swords, Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY, TeamType, COMBAT_VFX_CONSTANTS } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { SummonPortalEntity } from '../../types/game';
import { SESSION_TIER, SESSION_TIER_STYLE, isSessionTierAtLeast } from '../../constants/sessionLeaderboard';
import { useSessionTier } from '../../store/sessionLeaderboardStore';
import { SessionTierBadge } from './session/SessionTierBadge';

const ChampionPortrait = ({
  avatarUrl,
  championName,
  sizeClass,
}: {
  avatarUrl: string;
  championName: string;
  sizeClass: string;
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={`${sizeClass} rounded-full bg-slate-800 flex items-center justify-center`}>
        <Swords className="w-3.5 h-3.5 text-slate-200" />
      </div>
    );
  }

  return (
    <img
      src={avatarUrl}
      alt={championName}
      onError={() => setHasError(true)}
      className={`${sizeClass} rounded-full object-cover bg-slate-900`}
      draggable={false}
    />
  );
};

const SummonSpotlightCard = ({
  portal,
  side,
  isFadingOut = false,
}: {
  portal: SummonPortalEntity;
  side: 'left' | 'right';
  isFadingOut?: boolean;
}) => {
  const teamProfile = useGameStore((state) => state.activeTeams[portal.team]);
  const theme = getTeamTheme(teamProfile?.colorTheme);
  const isRight = side === 'right';
  const isSignature = Boolean(portal.isSignatureSynergy && portal.signaturePlayerName);
  const sessionTier = useSessionTier(portal.summonerName);
  // Diamond and up: the entrance glows in the tier colour and shows the tier name
  const isHighTier = isSessionTierAtLeast(sessionTier, SESSION_TIER.DIAMOND);
  const cardBorderClass = isSignature || isHighTier ? 'border-amber-400/90 ring-1 ring-amber-400/50' : `${theme.borderClass} border`;
  const rankGlowStyle = sessionTier && isHighTier ? `0 0 12px ${SESSION_TIER_STYLE[sessionTier].light}` : null;
  const signatureGlowStyle = isSignature ? '0 0 10px rgba(251,191,36,0.5)' : theme.glowStyle;
  const cardShadowStyle = rankGlowStyle ?? signatureGlowStyle;
  const nameColorClass = isSignature ? 'text-amber-300' : 'text-white';

  return (
    <div
      key={portal.id}
      style={{ boxShadow: cardShadowStyle }}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-slate-950/95 shadow-md max-w-[125px] sm:max-w-[145px] transition-all duration-300 select-none ${
        isFadingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100 animate-in fade-in zoom-in-95'
      } ${cardBorderClass} ${isRight ? 'flex-row-reverse text-right' : 'text-left'}`}
    >
      {/* High-visibility Mini Champion Avatar */}
      <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
        <ChampionPortrait
          avatarUrl={portal.avatarUrl}
          championName={portal.championName}
          sizeClass="w-5 h-5 rounded-full object-cover border border-white/80 shadow-sm ring-1 ring-slate-950"
        />
      </div>

      <div className="min-w-0 flex-1 leading-none py-0.5">
        <div className={`flex items-center gap-0.5 ${isRight ? 'flex-row-reverse' : ''}`}>
          <span className={`text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider drop-shadow truncate ${nameColorClass}`}>
            {portal.championName}
          </span>
          {portal.isCrit && (
            <Zap className="w-2.5 h-2.5 text-rose-400 fill-current animate-bounce shrink-0" />
          )}
          {isSignature && (
            <Crown className="w-2.5 h-2.5 text-amber-300 fill-current shrink-0" />
          )}
        </div>
        <div className={`flex items-center gap-0.5 mt-0.5 min-w-0 ${isRight ? 'flex-row-reverse' : ''}`}>
          <SessionTierBadge tier={sessionTier} hasLabel={isHighTier} />
          <p className={`text-[8px] sm:text-[8.5px] font-bold text-amber-300 truncate drop-shadow-[0_1px_2px_rgba(0,0,0,1)] ${isRight ? 'text-right' : 'text-left'}`}>
            @{portal.summonerName.replace(/^@+/, '')}
          </p>
        </div>
      </div>
    </div>
  );
};

const getLatestTeamPortal = (
  portals: SummonPortalEntity[],
  team: TeamType,
  now: number
): SummonPortalEntity | null => {
  for (let i = portals.length - 1; i >= 0; i--) {
    const portal = portals[i];
    if (
      portal.team === team &&
      now - portal.createdAt < COMBAT_VFX_CONSTANTS.SUMMON.SPOTLIGHT_DURATION_MS
    ) {
      return portal;
    }
  }
  return null;
};

export const SummonSpotlight = ({
  side,
  className = '',
}: {
  side: 'left' | 'right';
  className?: string;
}) => {
  const activeSummonPortals = useGameStore((state) => state.activeSummonPortals);
  const team = side === 'left' ? TEAM_KEY.BLG : TEAM_KEY.GENG;
  const now = Date.now();
  const latestPortal = getLatestTeamPortal(activeSummonPortals, team, now);
  const [hiddenPortalId, setHiddenPortalId] = useState<string | null>(null);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    if (!latestPortal) return;
    setHiddenPortalId(null);
    setIsFadingOut(false);
    const duration = COMBAT_VFX_CONSTANTS.SUMMON.SPOTLIGHT_DURATION_MS;
    const elapsed = Date.now() - latestPortal.createdAt;
    const remainingMs = Math.max(0, duration - elapsed);
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, Math.max(0, remainingMs - 350));
    const hideTimer = setTimeout(() => {
      setHiddenPortalId(latestPortal.id);
    }, remainingMs);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [latestPortal?.id, latestPortal?.createdAt]);

  if (!latestPortal || hiddenPortalId === latestPortal.id) return null;

  return (
    <div
      className={`pointer-events-none flex flex-col ${side === 'right' ? 'items-end' : 'items-start'} ${className}`}
    >
      <SummonSpotlightCard portal={latestPortal} side={side} isFadingOut={isFadingOut} />
    </div>
  );
};

export const SummonShowcase = () => {
  const activeSummonPortals = useGameStore((state) => state.activeSummonPortals);
  const now = Date.now();

  const latestLeftPortal = getLatestTeamPortal(activeSummonPortals, TEAM_KEY.BLG, now);
  const latestRightPortal = getLatestTeamPortal(activeSummonPortals, TEAM_KEY.GENG, now);

  return (
    <>
      {/* Left Wing: Dynamic Left Team Summon Spotlight */}
      <div className="absolute top-[186px] sm:top-[196px] left-1.5 sm:left-2.5 z-50 pointer-events-none flex flex-col space-y-1.5">
        {latestLeftPortal && <SummonSpotlightCard portal={latestLeftPortal} side="left" />}
      </div>

      {/* Right Wing: Dynamic Right Team Summon Spotlight */}
      <div className="absolute top-[186px] sm:top-[196px] right-1.5 sm:right-2.5 z-50 pointer-events-none flex flex-col items-end space-y-1.5">
        {latestRightPortal && <SummonSpotlightCard portal={latestRightPortal} side="right" />}
      </div>
    </>
  );
};
