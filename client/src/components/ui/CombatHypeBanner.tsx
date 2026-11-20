import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Swords, Flame, Zap } from 'lucide-react';
import { useCombatHypeStore, COMBAT_HYPE_CONSTANTS } from '../../store/combatHypeStore';
import { useGameStore } from '../../store/gameStore';
import { getTeamTheme } from '../../constants/teams';

/**
 * Unified Hype Moments Banner:
 * 1. First Blood (Khai hoả ván mới)
 * 2. Summon Streak (Sóng triệu hồi dồn dập 5+ lượt)
 * 3. Overtime Surge (15s cuối / Hiệp phụ báo động đỏ)
 */
export const CombatHypeBanner = React.memo(() => {
  const { t } = useTranslation();
  const firstBlood = useCombatHypeStore((state) => state.firstBlood);
  const streak = useCombatHypeStore((state) => state.streak);
  const isOvertimeAlertActive = useCombatHypeStore((state) => state.isOvertimeAlertActive);
  const overtimeAlertStartedAt = useCombatHypeStore((state) => state.overtimeAlertStartedAt);
  const activeTeams = useGameStore((state) => state.activeTeams);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);

  // Periodic tick for visibility checks
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 200);
    return () => clearInterval(timer);
  }, []);

  if (roundWinner !== null || isRoundIntermission) {
    return null;
  }

  const now = Date.now();
  const isFirstBloodVisible =
    Boolean(firstBlood) &&
    now - (firstBlood?.timestamp ?? 0) < COMBAT_HYPE_CONSTANTS.FIRST_BLOOD_DURATION_MS;

  const isStreakVisible =
    Boolean(streak) &&
    now - (streak?.timestamp ?? 0) < COMBAT_HYPE_CONSTANTS.STREAK_DURATION_MS;

  const isOvertimeVisible =
    isOvertimeAlertActive &&
    now - overtimeAlertStartedAt < COMBAT_HYPE_CONSTANTS.OVERTIME_BANNER_DURATION_MS;

  if (!isFirstBloodVisible && !isStreakVisible && !isOvertimeVisible) {
    return null;
  }

  // 1. Overtime Surge Warning (Pulsing Red Vignette & Banner)
  if (isOvertimeVisible) {
    return (
      <div className="fixed inset-0 z-[64] pointer-events-none select-none flex items-center justify-center">
        {/* Screen Edge Pulsing Red Warning Vignette */}
        <div className="absolute inset-0 border-4 border-rose-500/80 shadow-[inset_0_0_50px_rgba(244,63,94,0.4)] animate-pulse" />

        <div className="relative flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 border-rose-500 bg-slate-950/95 shadow-[0_0_30px_rgba(244,63,94,0.7)] animate-in zoom-in-90 fade-in duration-200 max-w-[92%]">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-500/30 border border-rose-400 text-rose-300 shrink-0 animate-bounce">
            <Zap className="w-4 h-4 fill-rose-300" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-sm sm:text-base font-black italic uppercase tracking-wider text-rose-300">
              {t('CombatHype.overtimeTitle', '⚡ 15S CUỐI: GẤP BỘI SÁT THƯƠNG!')}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">
              {t('CombatHype.overtimeSubtitle', 'Dồn sát thương lật kèo ngay trước khi hết giờ!')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. First Blood Banner
  if (isFirstBloodVisible && firstBlood) {
    const teamProfile = activeTeams[firstBlood.team];
    const teamTag = teamProfile?.shortTag || firstBlood.team;
    const theme = getTeamTheme(teamProfile?.colorTheme);

    return (
      <div className="fixed inset-0 z-[63] pointer-events-none select-none flex items-center justify-center">
        <div
          className="relative flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 bg-slate-950/95 shadow-lg animate-in zoom-in-90 fade-in duration-200 max-w-[92%]"
          style={{ borderColor: theme.primaryHex, boxShadow: `0 0 20px ${theme.primaryHex}66` }}
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0"
            style={{ backgroundColor: `${theme.primaryHex}30`, border: `1px solid ${theme.primaryHex}` }}
          >
            <Swords className={`w-4 h-4 ${theme.textClass}`} />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className={`text-sm sm:text-base font-black italic uppercase tracking-wide ${theme.textClass}`}>
              {t('CombatHype.firstBloodTitle', '⚔️ KHAI HOẢ VÁN {{round}}!', { round: firstBlood.round })}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 truncate">
              {t('CombatHype.firstBloodSubtitle', '@{{name}} gọi {{champ}} mở màn cho {{team}}!', {
                name: firstBlood.summonerName,
                champ: firstBlood.championName,
                team: teamTag,
              })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. Summon Streak Surge Banner
  if (isStreakVisible && streak) {
    const teamProfile = activeTeams[streak.team];
    const teamTag = teamProfile?.shortTag || streak.team;
    const theme = getTeamTheme(teamProfile?.colorTheme);

    return (
      <div className="fixed inset-0 z-[62] pointer-events-none select-none flex items-center justify-center">
        <div
          className="relative flex items-center gap-2.5 px-4 py-2 rounded-2xl border-2 bg-slate-950/95 shadow-lg animate-in zoom-in-90 fade-in duration-150 max-w-[92%]"
          style={{ borderColor: theme.primaryHex, boxShadow: `0 0 20px ${theme.primaryHex}66` }}
        >
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl shrink-0 animate-bounce"
            style={{ backgroundColor: `${theme.primaryHex}30`, border: `1px solid ${theme.primaryHex}` }}
          >
            <Flame className={`w-4 h-4 ${theme.textClass} fill-current`} />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className={`text-sm sm:text-base font-black italic uppercase tracking-wider ${theme.textClass}`}>
              {t('CombatHype.streakTitle', '🔥 SÓNG TRIỆU HỒI {{team}} x{{count}}!', {
                team: teamTag,
                count: streak.count,
              })}
            </span>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-200">
              {t('CombatHype.streakSubtitle', 'Khán giả {{team}} đang dồn quân ồ ạt!', { team: teamTag })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
});

CombatHypeBanner.displayName = 'CombatHypeBanner';
