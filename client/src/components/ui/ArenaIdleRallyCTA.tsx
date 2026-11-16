import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, MessageSquare, Zap } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, TEAM_KEY, TeamType } from '../../constants/game';
import { useRoundIntroStore } from '../../store/roundIntroStore';

export const ArenaIdleRallyCTA: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const isIntroActive = useRoundIntroStore((state) => state.isActive);
  const bossHp = useGameStore((state) => state.bossHp);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const minions = useGameStore((state) => state.minions);
  const activeTeams = useGameStore((state) => state.activeTeams);

  const isBattlePaused =
    isIntroActive ||
    bossHp <= 0 ||
    bossStatus === BOSS_STATUS.DEFEATED ||
    isRoundIntermission ||
    roundWinner !== null;

  // Only display when the arena has few or zero viewer minions and battle is in progress
  if (isBattlePaused || minions.length >= 3) {
    return null;
  }

  const teamKeys = Object.keys(activeTeams) as TeamType[];
  const leftKey = teamKeys[0] ?? TEAM_KEY.BLG;
  const rightKey = teamKeys[1] ?? TEAM_KEY.GENG;
  const leftTag = activeTeams[leftKey]?.shortTag || leftKey;
  const rightTag = activeTeams[rightKey]?.shortTag || rightKey;

  return (
    <div className="w-full flex flex-col items-center pointer-events-none select-none animate-in fade-in zoom-in-95 duration-300">
      {/* Capped to the gap between the roster wings (~330 px on a 480 px portrait overlay) */}
      <div
        className="relative flex items-center gap-2 max-w-[300px] px-2.5 py-1 rounded-xl border backdrop-blur-xl bg-slate-950/90 overflow-hidden shadow-lg"
        style={{
          borderColor: '#f59e0b',
          boxShadow: '0 0 12px rgba(245, 158, 11, 0.35)',
        }}
      >
        {/* Shimmer light bar across banner */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] animate-gold-shimmer pointer-events-none" />

        {/* Pulsing Double-Tap Finger / Heart Icon */}
        <div className="relative flex items-center justify-center shrink-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow-md border border-amber-300/60 animate-bounce">
            <Heart className="w-3 h-3 text-white fill-white" />
          </div>
          <Zap className="absolute -top-1 -right-1 w-2 h-2 text-amber-300 fill-amber-300" />
        </div>

        {/* CTA Text Details */}
        <div className="flex flex-col items-start leading-tight min-w-0">
          <div className="flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-400 drop-shadow">
            <span>
              {t('IdleRally.doubleTapToHeart', 'Chạm 2 lần để thả tim tiếp viện!')}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-0.5 max-w-full text-[9px] sm:text-[9.5px] font-bold text-slate-300">
            <MessageSquare className="w-2.5 h-2.5 text-amber-400 shrink-0" />
            <span className="truncate">
              {t('IdleRally.typeToSummon', {
                teamA: leftTag,
                teamB: rightTag,
                defaultValue: `Chat tên tướng kèm ${leftTag} hoặc ${rightTag} để xung trận ngay!`,
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

ArenaIdleRallyCTA.displayName = 'ArenaIdleRallyCTA';
