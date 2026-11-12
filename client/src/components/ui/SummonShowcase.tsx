import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Swords, Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY, TeamType, COMBAT_VFX_CONSTANTS } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { SummonPortalEntity } from '../../types/game';

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
}: {
  portal: SummonPortalEntity;
  side: 'left' | 'right';
}) => {
  const { t } = useTranslation();
  const teamProfile = useGameStore((state) => state.activeTeams[portal.team]);
  const theme = getTeamTheme(teamProfile?.colorTheme);
  const isRight = side === 'right';
  const isSignature = Boolean(portal.isSignatureSynergy && portal.signaturePlayerName);
  const cardBorderClass = isSignature ? 'border-amber-400/90 ring-1 ring-amber-400/40' : theme.borderClass;
  const cardShadowStyle = isSignature ? '0 0 12px rgba(251,191,36,0.45)' : theme.glowStyle;
  const nameColorClass = isSignature ? 'text-amber-300' : theme.textClass;

  return (
    <div
      key={portal.id}
      style={{ boxShadow: cardShadowStyle }}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-xl border backdrop-blur-md animate-summon-entrance max-w-[128px] sm:max-w-[145px] bg-slate-950/90 ${cardBorderClass} ${
        isRight ? 'flex-row-reverse text-right' : ''
      }`}
    >
      {/* Spinning Magic Summon Ring + Champion Avatar */}
      <div className="relative w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center shrink-0">
        <div
          className={`absolute inset-0 rounded-full border border-dashed animate-spin-slow ${theme.summonPortalBorderClass}`}
        />
        <ChampionPortrait
          avatarUrl={portal.avatarUrl}
          championName={portal.championName}
          sizeClass="w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 relative z-10 border border-white/60"
        />
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <div className={`flex items-center gap-1 ${isRight ? 'justify-end' : ''}`}>
          <span className={`text-[7px] sm:text-[7.5px] font-black px-1 py-0.5 rounded ${theme.bgBadgeClass} leading-none tracking-wider`}>
            {t('Combat.summonTag', 'TRIỆU HỒI')}
          </span>
          {portal.isCrit && (
            <Zap className="w-2.5 h-2.5 text-rose-400 fill-current animate-bounce shrink-0" />
          )}
          {isSignature && (
            <Crown className="w-2.5 h-2.5 text-amber-300 fill-current shrink-0" />
          )}
        </div>
        <p className={`text-[10px] sm:text-[11px] font-black truncate mt-0.5 ${nameColorClass}`}>
          {portal.championName}
        </p>
        <p className="text-[7.5px] sm:text-[8px] text-slate-300/80 truncate font-semibold flex items-center gap-0.5">
          <span className="opacity-70 text-[7px]">💬</span>
          <span className="truncate">@{portal.summonerName.replace(/^@+/, '')}</span>
        </p>
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

export const SummonSpotlight = ({ side }: { side: 'left' | 'right' }) => {
  const activeSummonPortals = useGameStore((state) => state.activeSummonPortals);
  const team = side === 'left' ? TEAM_KEY.BLG : TEAM_KEY.GENG;
  const now = Date.now();
  const latestPortal = getLatestTeamPortal(activeSummonPortals, team, now);

  if (!latestPortal) return null;

  return (
    <div className={`pointer-events-none flex flex-col ${side === 'right' ? 'items-end' : 'items-start'}`}>
      <SummonSpotlightCard portal={latestPortal} side={side} />
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
      <div className="absolute top-[186px] sm:top-[196px] left-1.5 sm:left-2.5 z-[25] pointer-events-none flex flex-col space-y-1.5">
        {latestLeftPortal && <SummonSpotlightCard portal={latestLeftPortal} side="left" />}
      </div>

      {/* Right Wing: Dynamic Right Team Summon Spotlight */}
      <div className="absolute top-[186px] sm:top-[196px] right-1.5 sm:right-2.5 z-[25] pointer-events-none flex flex-col items-end space-y-1.5">
        {latestRightPortal && <SummonSpotlightCard portal={latestRightPortal} side="right" />}
      </div>
    </>
  );
};
