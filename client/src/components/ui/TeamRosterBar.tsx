import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { TEAM_ROSTERS, RosterPlayer } from '../../constants/roster';
import { TEAM_KEY } from '../../constants/game';

interface TeamRosterBarProps {
  side: 'left' | 'right';
}

export const TeamRosterBar = ({ side }: TeamRosterBarProps) => {
  const team = side === 'left' ? TEAM_KEY.BLG : TEAM_KEY.GENG;
  const roster = TEAM_ROSTERS[team];
  const minions = useGameStore((state) => state.minions);
  const lastAttackingRosterId = useGameStore((state) => state.lastAttackingRosterId);
  const isLeft = side === 'left';
  // Default to collapsed on mobile/touch screens or narrow viewports to prevent screen cluttering
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      return isTouch || window.innerWidth < 768;
    }
    return false;
  });

  // Handle responsive resizing
  useEffect(() => {
    const handleResize = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      if (isTouch || window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Count active summons per player
  const getSummonCount = (player: RosterPlayer) => {
    return minions.filter(
      (m) => m.team === team && m.championName.toLowerCase().includes(player.name.toLowerCase())
    ).length;
  };

  const totalTeamSummons = minions.filter((m) => m.team === team).length;

  if (isCollapsed) {
    return (
      <div
        className={`absolute top-[168px] sm:top-[176px] ${
          isLeft ? 'left-1' : 'right-1'
        } z-20 pointer-events-auto select-none`}
      >
        <button
          id={`roster-collapsed-${team}`}
          type="button"
          onClick={() => setIsCollapsed(false)}
          className={`flex items-center space-x-1 px-2 py-1 rounded-full border backdrop-blur-md shadow-lg transition active:scale-95 hover:scale-105 ${
            isLeft
              ? 'bg-cyan-950/90 border-cyan-500/80 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
              : 'bg-amber-950/90 border-amber-500/80 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
          }`}
          title={isLeft ? 'Mở BLG Lineup' : 'Mở GEN.G Lineup'}
        >
          {isLeft ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          <Users className="w-3 h-3" />
          <span className="text-[9px] font-black">{totalTeamSummons > 0 ? `${isLeft ? 'BLG' : 'GEN'} (${totalTeamSummons})` : isLeft ? 'BLG' : 'GEN'}</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label={isLeft ? 'BLG Team Roster' : 'Gen.G Team Roster'}
      className={`absolute top-[168px] sm:top-[176px] ${
        isLeft ? 'left-1' : 'right-1'
      } flex flex-col space-y-1 pointer-events-auto z-20 select-none max-w-[108px] sm:max-w-[145px]`}
    >
      {/* Roster Header with Toggle Button */}
      <div
        className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-md mb-0.5 flex items-center justify-between shadow-md ${
          isLeft
            ? 'bg-cyan-950/85 border-cyan-500/80 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
            : 'bg-amber-950/85 border-amber-500/80 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
        }`}
      >
        <div className="flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full animate-ping bg-current inline-block" />
          <span className="truncate">{isLeft ? 'BLG' : 'GEN.G'}</span>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="p-0.5 hover:bg-white/10 rounded transition"
          aria-label="Thu gọn"
        >
          {isLeft ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
      </div>

      {/* Players List with Real Pro Player Portraits */}
      {roster.map((player) => {
        const count = getSummonCount(player);
        const isAttacking = lastAttackingRosterId === player.id;
        const isActive = count > 0 || isAttacking;

        return (
          <RosterItem
            key={player.id}
            player={player}
            count={count}
            isActive={isActive}
            isAttacking={isAttacking}
            isLeft={isLeft}
          />
        );
      })}
    </aside>
  );
};

interface RosterItemProps {
  player: RosterPlayer;
  count: number;
  isActive: boolean;
  isAttacking: boolean;
  isLeft: boolean;
}

const getRosterItemCardClass = (isActive: boolean, isAttacking: boolean, isLeft: boolean): string => {
  if (!isActive) {
    return 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700';
  }
  const scaleClass = isAttacking ? 'scale-110 ring-1 ring-white/60' : 'scale-105';
  if (isLeft) {
    return `bg-gradient-to-r from-cyan-950/95 to-slate-950/90 border-cyan-400 shadow-[0_0_14px_rgba(6,182,212,0.7)] ${scaleClass}`;
  }
  return `bg-gradient-to-r from-amber-950/95 to-slate-950/90 border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.7)] ${scaleClass}`;
};

const RosterItem = ({ player, count, isActive, isAttacking, isLeft }: RosterItemProps) => {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={`relative flex items-center space-x-1.5 px-1.5 py-1 rounded-xl border backdrop-blur-md transition-all duration-200 ${
        isLeft ? 'flex-row' : 'flex-row-reverse space-x-reverse'
      } ${getRosterItemCardClass(isActive, isAttacking, isLeft)}`}
    >
      {/* Real Pro Player Avatar with Role Badge */}
      <div id={`roster-avatar-${player.id}`} className="relative shrink-0 transition-transform duration-200">
        <div
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border ${
            isActive
              ? isLeft
                ? 'border-cyan-400 shadow-[0_0_10px_#06b6d4]'
                : 'border-amber-400 shadow-[0_0_10px_#f59e0b]'
              : isLeft
                ? 'border-cyan-800/60 bg-slate-900'
                : 'border-amber-800/60 bg-slate-900'
          }`}
        >
          {!imageError ? (
            <img
              src={player.avatarUrl}
              alt={player.name}
              className="w-full h-full object-cover object-top"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div
              className={`w-full h-full flex items-center justify-center text-[9px] font-black ${
                isLeft ? 'bg-cyan-900 text-cyan-200' : 'bg-amber-900 text-amber-200'
              }`}
            >
              {player.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Floating Mini Role Tag */}
        <span
          className={`absolute -bottom-1 -right-1 text-[6px] sm:text-[7px] font-mono font-black px-0.5 rounded leading-none shadow ${
            isLeft ? 'bg-cyan-400 text-slate-950' : 'bg-amber-400 text-slate-950'
          }`}
        >
          {player.role}
        </span>
      </div>

      {/* Player Name and Lane Position (No Champion Name) */}
      <div className={`text-[9.5px] sm:text-[10.5px] leading-tight min-w-0 ${isLeft ? 'text-left' : 'text-right'}`}>
        <div className="font-black text-white flex items-center space-x-0.5 truncate">
          <span className="truncate">{player.name}</span>
          {count > 0 && (
            <span
              className={`text-[7px] sm:text-[8px] px-1 rounded-full font-mono font-black ${
                isLeft ? 'bg-cyan-400 text-slate-950' : 'bg-amber-400 text-slate-950'
              }`}
            >
              x{count}
            </span>
          )}
        </div>
        <div className="text-[7.5px] sm:text-[8.5px] text-slate-400 font-semibold tracking-tight truncate">
          {player.roleName}
        </div>
      </div>
    </div>
  );
};
