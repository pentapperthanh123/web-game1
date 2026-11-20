import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, MessageSquare, Zap, AlertTriangle, Flame } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { BOSS_STATUS, ROUND_CLOCK_PHASE, TEAM_KEY, TeamType } from '../../constants/game';
import { useRoundIntroStore } from '../../store/roundIntroStore';
import { getActiveComebackTeam } from '../../store/comebackRules';
import { getPhaseRemainingMs, useRoundClockStore } from '../../store/roundClockStore';
import { getTeamCommandNumber } from '../../constants/teams';

export const ArenaIdleRallyCTA: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const isIntroActive = useRoundIntroStore((state) => state.isActive);
  const isBossHpAlive = useGameStore((state) => state.bossHp > 0);
  const bossHp = useGameStore((state) => state.bossHp);
  const bossMaxHp = useGameStore((state) => state.bossMaxHp);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const minionCount = useGameStore((state) => state.minions.length);
  const activeTeams = useGameStore((state) => state.activeTeams);

  const clockPhase = useRoundClockStore((state) => state.phase);
  const clockDurationMs = useRoundClockStore((state) => state.durationMs);
  const clockElapsedMs = useRoundClockStore((state) => state.elapsedMs);

  const isBattlePaused =
    isIntroActive ||
    !isBossHpAlive ||
    bossStatus === BOSS_STATUS.DEFEATED ||
    isRoundIntermission ||
    roundWinner !== null;

  if (isBattlePaused) {
    return null;
  }

  const remainingMs = getPhaseRemainingMs({
    elapsedMs: clockElapsedMs,
    durationMs: clockDurationMs,
    phase: clockPhase,
  });

  const isOvertimeOrLast15s =
    clockPhase === ROUND_CLOCK_PHASE.OVERTIME ||
    (clockDurationMs > 0 && remainingMs <= 15_000 && remainingMs > 0);

  const bossHpPercent = bossMaxHp > 0 ? bossHp / bossMaxHp : 1;
  const isBossLow = bossHpPercent <= 0.2 && bossHpPercent > 0;
  const isEmptyField = minionCount === 0;
  const hasFewMinions = minionCount < 3;
  const comebackTeam = getActiveComebackTeam();

  // Show if special urgency event or if arena has few/zero minions
  const shouldDisplay = isOvertimeOrLast15s || isBossLow || Boolean(comebackTeam) || hasFewMinions;
  if (!shouldDisplay) {
    return null;
  }

  const teamKeys = Object.keys(activeTeams) as TeamType[];
  const leftKey = teamKeys[0] ?? TEAM_KEY.BLG;
  const rightKey = teamKeys[1] ?? TEAM_KEY.GENG;
  const leftTag = activeTeams[leftKey]?.shortTag || leftKey;
  const rightTag = activeTeams[rightKey]?.shortTag || rightKey;

  // Resolve contextual prompt
  let title = t('IdleRally.doubleTapToHeart', 'Chạm 2 lần để thả tim tiếp viện!');
  let subtitle = t('IdleRally.typeToSummon', {
    teamA: leftTag,
    teamB: rightTag,
    defaultValue: `Gõ 1 chọn ${leftTag} · Gõ 2 chọn ${rightTag}`,
  });
  let icon = <Heart className="w-3 h-3 text-white fill-white" />;
  let iconBg = 'bg-gradient-to-br from-rose-500 to-amber-500 border-amber-300/60';
  let borderColor = '#f59e0b';
  let shadowColor = 'rgba(245, 158, 11, 0.35)';

  if (isOvertimeOrLast15s) {
    title = t('IdleRally.overtimeTitle', '⚡ 15S CUỐI: GẤP BỘI SÁT THƯƠNG!');
    subtitle = t('IdleRally.overtimeSubtitle', 'Dồn sát thương ngay — Gõ 1 ({{teamA}}) hoặc 2 ({{teamB}})!', {
      teamA: leftTag,
      teamB: rightTag,
    });
    icon = <Zap className="w-3 h-3 text-white fill-white" />;
    iconBg = 'bg-gradient-to-br from-rose-600 to-amber-500 border-rose-400';
    borderColor = '#f43f5e';
    shadowColor = 'rgba(244, 63, 94, 0.55)';
  } else if (isBossLow) {
    title = t('IdleRally.bossLowTitle', '💥 BOSS DƯỚI 20% HP — DỨT ĐIỂM!');
    subtitle = t('IdleRally.bossLowSubtitle', 'Gõ 1 ({{teamA}}) hoặc 2 ({{teamB}}) để dứt điểm & giành MVP!', {
      teamA: leftTag,
      teamB: rightTag,
    });
    icon = <Flame className="w-3 h-3 text-white fill-white" />;
    iconBg = 'bg-gradient-to-br from-orange-600 to-amber-500 border-yellow-300';
    borderColor = '#f97316';
    shadowColor = 'rgba(249, 115, 22, 0.5)';
  } else if (isEmptyField) {
    title = t('IdleRally.emptyFieldTitle', '🚨 SÀN ĐẤU ĐANG TRỐNG!');
    subtitle = t('IdleRally.emptyFieldSubtitle', 'Gõ 1 ({{teamA}}) hoặc 2 ({{teamB}}) để xuất chiến ngay!', {
      teamA: leftTag,
      teamB: rightTag,
    });
    icon = <AlertTriangle className="w-3 h-3 text-white" />;
    iconBg = 'bg-gradient-to-br from-rose-600 to-amber-600 border-amber-300';
    borderColor = '#fbbf24';
    shadowColor = 'rgba(251, 191, 36, 0.45)';
  } else if (comebackTeam) {
    const trailingTag = activeTeams[comebackTeam]?.shortTag || comebackTeam;
    const commandNum = getTeamCommandNumber(comebackTeam, activeTeams);
    title = t('IdleRally.comebackTitle', '⚡ {{team}} ĐANG ĐƯỢC BUFF LẬT KÈO (+15%)!', { team: trailingTag });
    subtitle = t('IdleRally.comebackSubtitle', 'Gõ {{number}} để giúp {{team}} lội ngược dòng ngay!', {
      number: commandNum,
      team: trailingTag,
    });
    icon = <Zap className="w-3 h-3 text-white fill-white" />;
    iconBg = 'bg-gradient-to-br from-cyan-600 to-amber-500 border-cyan-300';
    borderColor = '#38bdf8';
    shadowColor = 'rgba(56, 189, 248, 0.45)';
  }

  return (
    <div className="w-full flex flex-col items-center pointer-events-none select-none animate-in fade-in zoom-in-95 duration-300">
      <div
        className="relative flex items-center gap-2 max-w-[320px] px-2.5 py-1 rounded-xl border bg-slate-950/95 overflow-hidden shadow-lg"
        style={{
          borderColor,
          boxShadow: `0 0 14px ${shadowColor}`,
        }}
      >
        {/* Shimmer light bar across banner */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] animate-gold-shimmer pointer-events-none" />

        {/* Pulsing Icon */}
        <div className="relative flex items-center justify-center shrink-0">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shadow-md border animate-bounce ${iconBg}`}>
            {icon}
          </div>
          <Zap className="absolute -top-1 -right-1 w-2 h-2 text-amber-300 fill-amber-300" />
        </div>

        {/* CTA Text Details */}
        <div className="flex flex-col items-start leading-tight min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[10.5px] font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-amber-400 drop-shadow">
            <span>{title}</span>
          </div>

          <div className="flex items-center gap-1 mt-0.5 max-w-full text-[8.5px] sm:text-[9px] font-bold text-slate-300">
            <MessageSquare className="w-2.5 h-2.5 text-amber-400 shrink-0" />
            <span className="truncate">{subtitle}</span>
          </div>
        </div>
      </div>
    </div>
  );
});

ArenaIdleRallyCTA.displayName = 'ArenaIdleRallyCTA';
