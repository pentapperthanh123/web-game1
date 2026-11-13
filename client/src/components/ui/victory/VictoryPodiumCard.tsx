import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';
import clsx from 'clsx';
import { TeamType } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { DPSPlayer } from '../../../types/game';
import { TeamProfile } from '../../../types/team';
import { audioService } from '../../../services/audioService';

export const PODIUM_SIZE = 3;

/** Visual order left → right is 2nd, 1st, 3rd, so the winner stands in the middle. */
const PODIUM_VISUAL_ORDER = [1, 0, 2] as const;
const RANK_STYLE: Record<number, { medal: string; pedestal: string; name: string }> = {
  0: { medal: '🥇', pedestal: 'h-12 bg-gradient-to-t from-amber-600/60 to-amber-300/30 border-amber-300/70', name: 'text-amber-200' },
  1: { medal: '🥈', pedestal: 'h-9 bg-gradient-to-t from-slate-500/50 to-slate-200/20 border-slate-300/60', name: 'text-slate-100' },
  2: { medal: '🥉', pedestal: 'h-7 bg-gradient-to-t from-orange-800/50 to-orange-400/20 border-orange-400/60', name: 'text-orange-200' },
};

interface PodiumSlotProps {
  player: DPSPlayer;
  rank: number;
  teamProfile: TeamProfile | undefined;
}

const PodiumSlot = ({ player, rank, teamProfile }: PodiumSlotProps) => {
  const style = RANK_STYLE[rank];
  const teamTheme = getTeamTheme(teamProfile?.colorTheme);
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center justify-end">
      <span className="text-base leading-none">{style.medal}</span>
      <div className={clsx('text-[10px] font-black truncate max-w-full px-0.5', style.name)}>{player.userName}</div>
      <div className="text-[9px] font-mono font-bold text-emerald-300">{player.totalDamage.toLocaleString()}</div>
      <span className={clsx('mt-0.5 text-[7.5px] font-black px-1 rounded', teamTheme.badgePillClass)}>
        {teamProfile?.shortTag ?? player.team}
      </span>
      <div className={clsx('w-full mt-0.5 rounded-t-md border', style.pedestal)} />
    </div>
  );
};

interface VictoryPodiumCardProps {
  topPlayers: readonly DPSPlayer[];
  activeTeams: Record<TeamType, TeamProfile>;
}

/** Top 3 viewers of the round on a podium; announces the winner with TTS when TTS is enabled. */
export const VictoryPodiumCard = ({ topPlayers, activeTeams }: VictoryPodiumCardProps) => {
  const { t } = useTranslation();
  const champion = topPlayers[0];

  useEffect(() => {
    if (!champion) return;
    audioService.speak(
      t('LiveHud.podiumShoutout', { defaultValue: 'Chúc mừng {{name}} gây sát thương cao nhất ván đấu!', name: champion.userName })
    );
  }, [champion, t]);

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
          return <PodiumSlot key={player.id} player={player} rank={rank} teamProfile={activeTeams[player.team]} />;
        })}
      </div>
    </div>
  );
};
