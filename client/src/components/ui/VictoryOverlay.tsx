import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Swords } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import {
  BOSS_STATUS,
  isDonorFinisherCheck,
  resolveDefeatShowcaseMs,
  TEAM_KEY,
} from '../../constants/game';
import { playSound } from '../../services/soundManager';
import { audioService } from '../../services/audioService';
import { SFX_EVENT } from '../../constants/sfx';
import { gameSocket } from '../../services/socket';
import { getTeamTheme } from '../../constants/teams';
import { VictoryHeaderStage } from './victory/VictoryHeaderStage';
import { VictorySeriesScoreCard } from './victory/VictorySeriesScoreCard';
import { VictoryDamageSummaryCard } from './victory/VictoryDamageSummaryCard';
import { VictoryActionControls } from './victory/VictoryActionControls';
import { VictoryStageCenterBackdrop } from './victory/VictoryStageCenterBackdrop';
import { ROUND_HOLD_REASON } from '../../store/roundIntroStore';
import { previewNextMatchup } from '../../store/matchRotation';
import { useGiftVfxStore } from '../../store/giftVfxStore';
import { useRoseGratitudeStore } from '../../store/roseGratitudeStore';
import { hideCombatDeployBanner } from '../../store/combatDeployBannerStore';
import {
  VICTORY_CELEBRATION_STARS,
  resolveEffectiveWinner,
} from './victory/victoryHelpers';

export const VictoryOverlay = () => {
  const { t } = useTranslation();
  const bossStatus = useGameStore((state) => state.bossStatus);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const leftScore = useGameStore((state) => state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG);
  const rightScore = useGameStore((state) => state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG);
  const bo5Score = useGameStore((state) => state.bo5Score);
  const currentRound = useGameStore((state) => state.currentRound);
  const seriesFormat = useGameStore((state) => state.seriesFormat);
  const bo5TargetWins = useGameStore((state) => state.bo5TargetWins);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const isSeriesEnded = useGameStore((state) => state.isSeriesEnded);
  const seriesWinner = useGameStore((state) => state.seriesWinner);
  const finisherPlayerName = useGameStore((state) => state.finisherPlayerName);
  const finisherTeam = useGameStore((state) => state.finisherTeam);
  const finisherGiftName = useGameStore((state) => state.finisherGiftName);
  const finisherCoins = useGameStore((state) => state.finisherCoins);
  const startNextRound = useGameStore((state) => state.startNextRound);
  const resetBO5Match = useGameStore((state) => state.resetBO5Match);
  const advanceNextMatchQueue = useGameStore((state) => state.advanceNextMatchQueue);
  const matchQueue = useGameStore((state) => state.matchQueue);
  const teamCatalog = useGameStore((state) => state.teamCatalog);
  const matchRotationMode = useGameStore(
    (state) => state.participationRuleConfig.matchRotationMode
  );
  const activeTeams = useGameStore((state) => state.activeTeams);
  const gameTheme = useGameStore((state) => state.gameTheme);

  const [isVictoryVisible, setIsVictoryVisible] = useState<boolean>(false);
  const [isAdvancing, setIsAdvancing] = useState<boolean>(false);
  /** Set synchronously: two calls in the same tick both still see the old `isAdvancing` state. */
  const isAdvancingRef = useRef(false);

  const isDefeated = bossStatus === BOSS_STATUS.DEFEATED || isRoundIntermission;

  useEffect(() => {
    if (!isDefeated) {
      setIsVictoryVisible(false);
      setIsAdvancing(false);
      isAdvancingRef.current = false;
      audioService.setCombatMuted(false);
      return;
    }

    // Silence combat synths and speech
    audioService.setCombatMuted(true);

    const isDonorFinisher = isDonorFinisherCheck(finisherGiftName, finisherCoins);
    // Anchored to the moment the boss died (like the finisher cinematic and the caster), not to
    // when this effect happened to run, so a slow render cannot push the screen out of sync.
    const { bossDefeatedTimestamp } = useGameStore.getState();
    const sinceDefeatMs = bossDefeatedTimestamp > 0 ? Date.now() - bossDefeatedTimestamp : 0;
    const victoryDelay = Math.max(0, resolveDefeatShowcaseMs(isDonorFinisher) - sinceDefeatMs);

    // Start playing Victory sound and reveal the Victory screen after finisher showcase
    const revealTimer = setTimeout(() => {
      setIsVictoryVisible(true);
      playSound(SFX_EVENT.VICTORY);
      useGiftVfxStore.getState().setPodiumOrbitActive(true);
      useGiftVfxStore.getState().setContinuousFireworksActive(true);

      // Clean up lingering combat toasts, deployment banners and skill tags immediately
      useRoseGratitudeStore.getState().clearAllToasts();
      hideCombatDeployBanner();
      useGameStore.getState().clearBossSkillBanner?.();
    }, victoryDelay);

    return () => {
      clearTimeout(revealTimer);
      audioService.setCombatMuted(false);
      useGiftVfxStore.getState().setPodiumOrbitActive(false);
      useGiftVfxStore.getState().setContinuousFireworksActive(false);
    };
  }, [isDefeated]);

  if (!isDefeated || !isVictoryVisible) return null;

  const effectiveWinner = resolveEffectiveWinner(
    isSeriesEnded,
    seriesWinner,
    roundWinner,
    bo5Score,
    leftScore,
    rightScore
  );

  const leftTeam = activeTeams[TEAM_KEY.BLG];
  const rightTeam = activeTeams[TEAM_KEY.GENG];
  const leftTheme = getTeamTheme(leftTeam.colorTheme);
  const rightTheme = getTeamTheme(rightTeam.colorTheme);
  const winnerProfile = activeTeams[effectiveWinner];
  const winnerTheme = getTeamTheme(winnerProfile?.colorTheme);

  const currentPair = {
    leftTeamId: leftTeam.id,
    rightTeamId: rightTeam.id,
  };
  const previewMatch = previewNextMatchup(
    matchQueue,
    teamCatalog,
    currentPair,
    matchRotationMode
  );

  const handleStartNextRound = () => {
    if (isAdvancing || isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setIsAdvancing(true);
    useGiftVfxStore.getState().setPodiumOrbitActive(false);
    useGiftVfxStore.getState().setContinuousFireworksActive(false);
    const finishedRound = useGameStore.getState().currentRound;
    startNextRound();
    // Says which round just ended: a duplicate request (another overlay's countdown) is ignored by the server
    gameSocket.requestNextRound(finishedRound);
  };

  const handleResetSeriesMatch = () => {
    if (isAdvancing || isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setIsAdvancing(true);
    useGiftVfxStore.getState().setPodiumOrbitActive(false);
    useGiftVfxStore.getState().setContinuousFireworksActive(false);
    resetBO5Match(ROUND_HOLD_REASON.NEW_SERIES);
    gameSocket.sendBO5Control('reset');
  };

  const handleAdvanceQueuedMatch = () => {
    if (isAdvancing || isAdvancingRef.current || !previewMatch) return;
    isAdvancingRef.current = true;
    setIsAdvancing(true);
    useGiftVfxStore.getState().setPodiumOrbitActive(false);
    useGiftVfxStore.getState().setContinuousFireworksActive(false);
    const didAdvance = advanceNextMatchQueue(previewMatch);
    if (!didAdvance) return;

    const latest = useGameStore.getState();
    gameSocket.sendTeamConfig(
      {
        activeTeams: latest.activeTeams,
        teamCatalog: latest.teamCatalog,
        matchQueue: latest.matchQueue,
      },
      true
    );
    gameSocket.sendBO5Control('reset');
  };

  return (
    <div className="flex flex-col justify-between h-screen w-full absolute inset-0 z-50 pointer-events-none select-none overflow-hidden animate-in fade-in duration-700">
      {/* Top and Bottom Cinematic Broadcast Vignettes (keeps 3D Canvas center visible) */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-transparent to-slate-950/90 pointer-events-none" />
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] rounded-full blur-[130px] opacity-20 pointer-events-none ${winnerTheme.glowOrbClass}`}
      />

      {VICTORY_CELEBRATION_STARS.map((star) => (
        <div
          key={`star-${star.id}`}
          style={{ top: star.top, left: star.left, right: star.right, animationDelay: star.delay }}
          className={`absolute pointer-events-none text-amber-300 animate-pulse ${star.size} ${star.opacity}`}
        >
          <Sparkles className="w-full h-full drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        </div>
      ))}

      {/* TOP SECTION: Winner Header, Team Logo & Series Score at flex-start */}
      <div className="relative z-10 max-w-sm w-full mx-auto space-y-1.5 pt-3 px-3 pointer-events-auto flex flex-col items-center">
        <VictoryHeaderStage
          winnerProfile={winnerProfile}
          winnerSlot={effectiveWinner}
          winnerTheme={winnerTheme}
          isSeriesEnded={isSeriesEnded}
          seriesFormat={seriesFormat}
          leftScore={bo5Score[TEAM_KEY.BLG]}
          rightScore={bo5Score[TEAM_KEY.GENG]}
          currentRound={currentRound}
          gameTheme={gameTheme}
        />

        <VictorySeriesScoreCard
          leftTeam={leftTeam}
          rightTeam={rightTeam}
          leftTheme={leftTheme}
          rightTheme={rightTheme}
          leftScore={bo5Score[TEAM_KEY.BLG]}
          rightScore={bo5Score[TEAM_KEY.GENG]}
          targetWins={bo5TargetWins}
          seriesFormat={seriesFormat}
        />

        {isSeriesEnded && previewMatch && (
          <div className="w-full p-2.5 rounded-xl bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/80 border border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.35)] backdrop-blur-md flex flex-col items-center gap-1 text-center animate-in zoom-in-95 fade-in duration-300">
            <div className="flex items-center gap-1.5 text-amber-300 text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider">
              <Swords className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{t('Victory.nextMatchupAnnouncement', 'CẶP ĐẤU TIẾP THEO')}</span>
              <Swords className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            </div>
            <div className="text-sm sm:text-base font-black tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-2">
              <span className="text-cyan-300 font-extrabold">{previewMatch.label.split(' vs ')[0] || 'Đội 1'}</span>
              <span className="text-amber-400 text-xs font-bold">VS</span>
              <span className="text-rose-300 font-extrabold">{previewMatch.label.split(' vs ')[1] || 'Đội 2'}</span>
            </div>
            <div className="text-[10px] text-slate-300">
              {t('Victory.nextMatchupSub', 'Chuẩn bị chuyển sang cặp đấu mới (Ván 1 / {{format}})', { format: seriesFormat })}
            </div>
          </div>
        )}
      </div>

      {/* MIDDLE SECTION: Elegant Champion Seal Backdrop to fill vertical empty space while 3D Podium & fireworks play */}
      <div className="flex-1 flex flex-col justify-center items-center pointer-events-none px-4 z-10 w-full max-w-lg mx-auto">
        <VictoryStageCenterBackdrop
          winnerProfile={winnerProfile}
          winnerSlot={effectiveWinner}
          winnerTheme={winnerTheme}
          isSeriesEnded={isSeriesEnded}
          seriesFormat={seriesFormat}
        />
      </div>

      {/* BOTTOM SECTION: Damage Summary Bar & Glassmorphic Action Controls at flex-end */}
      <div className="relative z-10 max-w-sm w-full mx-auto space-y-2 pb-10 px-3 pointer-events-auto flex flex-col items-center">
        <VictoryDamageSummaryCard
          leftTeam={leftTeam}
          rightTeam={rightTeam}
          leftTheme={leftTheme}
          rightTheme={rightTheme}
          leftDamage={leftScore ?? 0}
          rightDamage={rightScore ?? 0}
          finisherPlayerName={finisherPlayerName}
          finisherTeam={finisherTeam}
          activeTeams={activeTeams}
        />

        <VictoryActionControls
          isSeriesEnded={isSeriesEnded}
          seriesFormat={seriesFormat}
          isAdvancing={isAdvancing}
          nextQueuedMatchLabel={previewMatch?.label ?? null}
          remainingQueueCount={matchQueue.length}
          onStartNextRound={handleStartNextRound}
          onResetSeriesMatch={handleResetSeriesMatch}
          onAdvanceQueuedMatch={handleAdvanceQueuedMatch}
          teamColor={winnerTheme.primaryHex}
        />
      </div>
    </div>
  );
};
