import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_KEY, TeamType, COMBAT_VFX_CONSTANTS } from '../../constants/game';
import { MinionEntity, SummonPortalEntity } from '../../types/game';

interface TeamThemeStyle {
  borderClass: string;
  bgClass: string;
  badgeClass: string;
  textClass: string;
  glowStyle: string;
}

const TEAM_THEME_MAP: Record<TeamType, TeamThemeStyle> = {
  [TEAM_KEY.BLG]: {
    borderClass: 'border-cyan-400/80',
    bgClass: 'bg-slate-950/85',
    badgeClass: 'bg-cyan-400 text-slate-950',
    textClass: 'text-cyan-300',
    glowStyle: '0 0 18px rgba(0, 242, 254, 0.55)',
  },
  [TEAM_KEY.GENG]: {
    borderClass: 'border-amber-400/80',
    bgClass: 'bg-slate-950/85',
    badgeClass: 'bg-amber-400 text-slate-950',
    textClass: 'text-amber-300',
    glowStyle: '0 0 18px rgba(251, 191, 36, 0.55)',
  },
};

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
  const theme = TEAM_THEME_MAP[portal.team];
  const isRight = side === 'right';

  return (
    <div
      key={portal.id}
      style={{ boxShadow: theme.glowStyle }}
      className={`flex items-center space-x-1.5 px-2 py-1 rounded-2xl border backdrop-blur-md animate-summon-entrance max-w-[138px] sm:max-w-[175px] ${
        theme.borderClass
      } ${theme.bgClass} ${isRight ? 'flex-row-reverse space-x-reverse text-right' : ''}`}
    >
      {/* Spinning Magic Summon Ring + Champion Avatar */}
      <div className="relative w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
        <div
          className={`absolute inset-0 rounded-full border-2 border-dashed animate-spin-slow ${theme.borderClass}`}
        />
        <ChampionPortrait
          avatarUrl={portal.avatarUrl}
          championName={portal.championName}
          sizeClass="w-7 h-7 sm:w-9 sm:h-9 relative z-10 border border-white/60"
        />
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <div className={`flex items-center space-x-1 ${isRight ? 'justify-end' : ''}`}>
          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${theme.badgeClass}`}>
            {t('Combat.summonTag', 'TRIỆU HỒI')}
          </span>
          {portal.isCrit && (
            <Zap className="w-3 h-3 text-rose-400 fill-current animate-bounce shrink-0" />
          )}
        </div>
        <p className={`text-[11px] sm:text-xs font-black truncate mt-0.5 ${theme.textClass}`}>
          {portal.championName}
        </p>
        <p className="text-[9px] text-slate-300 truncate font-semibold flex items-center space-x-0.5">
          <span>💬</span>
          <span className="truncate">@{portal.summonerName.replace(/^@+/, '')}</span>
        </p>
      </div>
    </div>
  );
};

const ActiveSquadRow = ({
  warriors,
  team,
  side,
}: {
  warriors: MinionEntity[];
  team: TeamType;
  side: 'left' | 'right';
}) => {
  if (warriors.length === 0) return null;

  const theme = TEAM_THEME_MAP[team];
  const isRight = side === 'right';

  return (
    <div
      className={`flex items-center -space-x-1.5 ${isRight ? 'justify-end' : 'justify-start'}`}
    >
      {warriors.map((warrior) => {
        const cleanName = warrior.summonerName.replace(/^@+/, '');
        const isBLG = team === TEAM_KEY.BLG;
        return (
          <div
            key={warrior.id}
            style={{ boxShadow: theme.glowStyle }}
            className={`relative rounded-full p-0.5 border bg-slate-950/85 ${theme.borderClass}`}
            title={`${warrior.championName} - @${cleanName}`}
          >
            <ChampionPortrait
              avatarUrl={warrior.avatarUrl}
              championName={warrior.championName}
              sizeClass="w-6 h-6 sm:w-8 sm:h-8"
            />
            <span
              className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[6.5px] sm:text-[7.5px] font-black px-1 rounded-full bg-slate-950/95 border max-w-[54px] truncate shadow ${
                isBLG
                  ? 'border-cyan-500/80 text-cyan-200'
                  : 'border-amber-500/80 text-amber-200'
              }`}
            >
              @{cleanName}
            </span>
          </div>
        );
      })}
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

export const SummonShowcase = () => {
  const activeSummonPortals = useGameStore((state) => state.activeSummonPortals);
  const minions = useGameStore((state) => state.minions);
  const now = Date.now();

  const latestBLGPortal = getLatestTeamPortal(activeSummonPortals, TEAM_KEY.BLG, now);
  const latestGENGPortal = getLatestTeamPortal(activeSummonPortals, TEAM_KEY.GENG, now);

  const blgWarriors = minions
    .filter((m) => m.team === TEAM_KEY.BLG)
    .slice(-COMBAT_VFX_CONSTANTS.SUMMON.MAX_VISIBLE_BADGES_PER_TEAM);
  const gengWarriors = minions
    .filter((m) => m.team === TEAM_KEY.GENG)
    .slice(-COMBAT_VFX_CONSTANTS.SUMMON.MAX_VISIBLE_BADGES_PER_TEAM);

  return (
    <>
      {/* Left Wing: BLG Summon Spotlight & Active Warriors (positioned cleanly below TeamRosterBar toggle) */}
      <div className="absolute top-[206px] sm:top-[216px] left-1.5 sm:left-3 z-20 pointer-events-none flex flex-col space-y-2">
        {latestBLGPortal && <SummonSpotlightCard portal={latestBLGPortal} side="left" />}
        <ActiveSquadRow warriors={blgWarriors} team={TEAM_KEY.BLG} side="left" />
      </div>

      {/* Right Wing: GEN.G Summon Spotlight & Active Warriors */}
      <div className="absolute top-[206px] sm:top-[216px] right-1.5 sm:right-3 z-20 pointer-events-none flex flex-col items-end space-y-2">
        {latestGENGPortal && <SummonSpotlightCard portal={latestGENGPortal} side="right" />}
        <ActiveSquadRow warriors={gengWarriors} team={TEAM_KEY.GENG} side="right" />
      </div>
    </>
  );
};
