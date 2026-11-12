import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crown, Sparkles } from 'lucide-react';
import { TeamType } from '../../../constants/game';
import { getTeamTheme } from '../../../constants/teams';
import { DPSPlayer, ProDamageRecord } from '../../../types/game';
import { TeamProfile } from '../../../types/team';

interface VictoryMvpCardProps {
  viewerMvp: DPSPlayer | null;
  proMvp: ProDamageRecord | null;
  activeTeams: Record<TeamType, TeamProfile>;
}

export const VictoryMvpCard = ({ viewerMvp, proMvp, activeTeams }: VictoryMvpCardProps) => {
  const { t } = useTranslation();
  const [proAvatarFailed, setProAvatarFailed] = useState<boolean>(false);

  if (!viewerMvp && !proMvp) {
    return null;
  }

  if (viewerMvp) {
    const teamProfile = activeTeams[viewerMvp.team];
    const teamTheme = getTeamTheme(teamProfile?.colorTheme);

    return (
      <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border border-amber-500/40 shadow-xl space-y-1.5">
        <div className="flex items-center justify-center space-x-1.5 text-[10px] sm:text-[11px] font-black text-amber-300 uppercase tracking-wider whitespace-nowrap">
          <Crown className="w-3.5 h-3.5 fill-current text-amber-400 shrink-0" />
          <span>{t('Victory.mvpTitle', 'MVP CỦA TRẬN ĐẤU')}</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
        </div>

        <div className="text-sm sm:text-base font-black text-white truncate px-2">
          {viewerMvp.userName}
        </div>

        <div className="flex justify-center items-center space-x-2 text-xs whitespace-nowrap">
          <span className={`text-[9px] font-black px-2 py-0.5 rounded shrink-0 ${teamTheme.badgePillClass}`}>
            {teamProfile?.shortTag || viewerMvp.team}
          </span>
          <span className="font-mono text-emerald-400 font-black text-xs sm:text-sm">
            {(viewerMvp.totalDamage ?? 0).toLocaleString()} {t('Victory.damage', 'SÁT THƯƠNG')}
          </span>
        </div>
      </div>
    );
  }

  if (!proMvp) {
    return null;
  }

  const proTeamProfile = activeTeams[proMvp.team];
  const proTeamTheme = getTeamTheme(proTeamProfile?.colorTheme);

  return (
    <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border border-amber-500/40 shadow-xl space-y-1.5">
      <div className="flex items-center justify-center space-x-1.5 text-[10px] sm:text-[11px] font-black text-amber-300 uppercase tracking-wider whitespace-nowrap">
        <Crown className="w-3.5 h-3.5 fill-current text-amber-400 shrink-0" />
        <span>{t('Victory.proMvpTitle', 'MVP TUYỂN THỦ')}</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      </div>

      <div className="flex items-center justify-center space-x-3">
        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400/80 bg-slate-800 shrink-0 flex items-center justify-center shadow-lg">
          {!proAvatarFailed ? (
            <img
              src={proMvp.avatarUrl}
              alt={proMvp.playerName}
              className="w-full h-full object-cover object-top"
              onError={() => setProAvatarFailed(true)}
            />
          ) : (
            <span className="text-xs font-black text-amber-300">
              {proMvp.playerName.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        <div className="text-left min-w-0">
          <div className="text-sm sm:text-base font-black text-white flex items-center space-x-1.5 whitespace-nowrap">
            <span className="truncate">{proMvp.playerName}</span>
            <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
              {proMvp.role}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-semibold truncate">
            {proMvp.championName}
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center space-x-2 text-xs pt-0.5 whitespace-nowrap">
        <span className={`text-[9px] font-black px-2 py-0.5 rounded shrink-0 ${proTeamTheme.badgePillClass}`}>
          {proTeamProfile?.shortTag || proMvp.team}
        </span>
        <span className="font-mono text-emerald-400 font-black text-xs sm:text-sm">
          {(proMvp.totalDamage ?? 0).toLocaleString()} {t('Victory.damage', 'SÁT THƯƠNG')}
        </span>
      </div>
    </div>
  );
};
