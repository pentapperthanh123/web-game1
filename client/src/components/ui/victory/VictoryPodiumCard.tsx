import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';
import clsx from 'clsx';
import { TeamType } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { DPSPlayer } from '../../../types/game';
import { TeamProfile } from '../../../types/team';

export const PODIUM_SIZE = 3;

/** Visual order left → right is 2nd, 1st, 3rd, so the winner stands in the middle. */
const PODIUM_VISUAL_ORDER = [1, 0, 2] as const;

const RANK_STYLE: Record<number, { medal: string; pedestal: string; name: string }> = {
  0: {
    medal: '🥇',
    pedestal: 'h-12 bg-gradient-to-t from-amber-600/60 to-amber-300/30 border-amber-300/70',
    name: 'text-amber-200 font-black',
  },
  1: {
    medal: '🥈',
    pedestal: 'h-9 bg-gradient-to-t from-slate-500/50 to-slate-200/20 border-slate-300/60',
    name: 'text-slate-100 font-bold',
  },
  2: {
    medal: '🥉',
    pedestal: 'h-7 bg-gradient-to-t from-orange-800/50 to-orange-400/20 border-orange-400/60',
    name: 'text-orange-200 font-bold',
  },
};

interface HonorBadge {
  label: string;
  badgeClass: string;
}

const resolveHonorBadge = (
  rank: number,
  isFinisher: boolean,
  translate: (key: string, fallback: string) => string
): HonorBadge => {
  if (rank === 0) {
    if (isFinisher) {
      return {
        label: translate('Victory.titleKingFinisher', 'VUA SÁT THƯƠNG & KẾT LIỄU'),
        badgeClass:
          'bg-gradient-to-r from-amber-500/40 via-yellow-400/30 to-rose-500/40 text-amber-200 border-amber-300/70 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
      };
    }
    return {
      label: translate('Victory.titleDamageKing', 'VUA SÁT THƯƠNG'),
      badgeClass:
        'bg-amber-500/25 text-amber-300 border-amber-400/50 shadow-[0_0_6px_rgba(245,158,11,0.4)]',
    };
  }

  if (rank === 1) {
    if (isFinisher) {
      return {
        label: `${translate('Victory.titleWarGod', 'CHIẾN THẦN')} • ${translate('Victory.titleFinisherBadge', 'KẾT LIỄU')}`,
        badgeClass: 'bg-rose-950/60 text-rose-200 border-rose-400/60',
      };
    }
    return {
      label: translate('Victory.titleWarGod', 'CHIẾN THẦN'),
      badgeClass: 'bg-slate-700/40 text-slate-200 border-slate-400/40',
    };
  }

  if (isFinisher) {
    return {
      label: `${translate('Victory.titleValiant', 'DŨNG SĨ')} • ${translate('Victory.titleFinisherBadge', 'KẾT LIỄU')}`,
      badgeClass: 'bg-rose-950/60 text-rose-200 border-rose-400/60',
    };
  }

  return {
    label: translate('Victory.titleValiant', 'DŨNG SĨ'),
    badgeClass: 'bg-orange-950/40 text-orange-200 border-orange-500/40',
  };
};

interface PodiumSlotProps {
  player: DPSPlayer;
  rank: number;
  teamProfile: TeamProfile | undefined;
  isFinisher: boolean;
}

const PodiumSlot = ({ player, rank, teamProfile, isFinisher }: PodiumSlotProps) => {
  const { t } = useTranslation();
  const style = RANK_STYLE[rank];
  const teamTheme = getTeamTheme(teamProfile?.colorTheme);
  const honorBadge = resolveHonorBadge(rank, isFinisher, (key, fallback) => t(key, fallback));

  return (
    <div className="flex-1 min-w-0 flex flex-col items-center justify-end">
      <span className="text-base leading-none">{style.medal}</span>

      {/* Honor MVP Title Badge */}
      <span
        className={clsx(
          'mt-0.5 text-[6.5px] sm:text-[7.5px] font-black uppercase px-1 py-0.2 rounded border truncate max-w-full tracking-wide text-center',
          honorBadge.badgeClass
        )}
      >
        {honorBadge.label}
      </span>

      <div className={clsx('text-[10px] truncate max-w-full px-0.5 mt-0.5', style.name)}>
        {player.userName}
      </div>
      <div className="text-[9px] font-mono font-bold text-emerald-300">
        {player.totalDamage.toLocaleString()}
      </div>
      <span
        className={clsx('mt-0.5 text-[7.5px] font-black px-1 rounded', teamTheme.badgePillClass)}
      >
        {teamProfile?.shortTag ?? player.team}
      </span>
      <div className={clsx('w-full mt-0.5 rounded-t-md border', style.pedestal)} />
    </div>
  );
};

interface VictoryPodiumCardProps {
  topPlayers: readonly DPSPlayer[];
  activeTeams: Record<TeamType, TeamProfile>;
  finisherPlayerName?: string | null;
}

/** Top 3 viewers of the round on a podium (the AI caster reads them from the store). */
export const VictoryPodiumCard = ({
  topPlayers,
  activeTeams,
  finisherPlayerName,
}: VictoryPodiumCardProps) => {
  const { t } = useTranslation();
  const champion = topPlayers[0];

  if (!champion) return null;

  return (
    <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border border-amber-500/40 shadow-xl space-y-1.5">
      <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-black text-amber-300 uppercase tracking-wider">
        <Crown className="w-3.5 h-3.5 fill-current text-amber-400 shrink-0" />
        <span>{t('LiveHud.podiumTitle', 'TOP 3 CHIẾN BINH CỦA VÁN')}</span>
      </div>
      <div className="flex items-end gap-1.5">
        {PODIUM_VISUAL_ORDER.map((rank) => {
          const player = topPlayers[rank];
          if (!player) return <div key={rank} className="flex-1" />;
          const isFinisher = Boolean(
            finisherPlayerName &&
              player.userName.trim().toLowerCase() === finisherPlayerName.trim().toLowerCase()
          );
          return (
            <PodiumSlot
              key={player.id}
              player={player}
              rank={rank}
              teamProfile={activeTeams[player.team]}
              isFinisher={isFinisher}
            />
          );
        })}
      </div>
    </div>
  );
};
