import { useState, useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
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
import { VictoryMvpCard } from './victory/VictoryMvpCard';
import { PODIUM_SIZE, VictoryPodiumCard } from './victory/VictoryPodiumCard';
import { VictoryDamageSummaryCard } from './victory/VictoryDamageSummaryCard';
import { VictoryActionControls } from './victory/VictoryActionControls';
import {
  VICTORY_CELEBRATION_STARS,
  resolveEffectiveWinner,
} from './victory/victoryHelpers';

export const VictoryOverlay = () => {
  const bossStatus = useGameStore((state) => state.bossStatus);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const leftScore = useGameStore((state) => state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG);
  const rightScore = useGameStore((state) => state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG);
  const leaderboard = useGameStore((state) => state.leaderboard);
  const proLeaderboard = useGameStore((state) => state.proLeaderboard);
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
    }, victoryDelay);

    return () => {
      clearTimeout(revealTimer);
      audioService.setCombatMuted(false);
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

  const viewerTopPlayers = leaderboard.slice(0, PODIUM_SIZE);
  const proMvp = proLeaderboard.length > 0 ? proLeaderboard[0] : null;
  const nextQueuedMatch = matchQueue.length > 0 ? matchQueue[0] : null;

  const handleStartNextRound = () => {
    if (isAdvancing || isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setIsAdvancing(true);
    const finishedRound = useGameStore.getState().currentRound;
    startNextRound();
    // Says which round just ended: a duplicate request (another overlay's countdown) is ignored by the server
    gameSocket.requestNextRound(finishedRound);
  };

  const handleResetSeriesMatch = () => {
    if (isAdvancing || isAdvancingRef.current) return;
    isAdvancingRef.current = true;
    setIsAdvancing(true);
    resetBO5Match();
  };

  const handleAdvanceQueuedMatch = () => {
    if (isAdvancing || isAdvancingRef.current || !nextQueuedMatch) return;
    isAdvancingRef.current = true;
    setIsAdvancing(true);
    const didAdvance = advanceNextMatchQueue();
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
  };

  return (
    <div className="absolute inset-0 bg-slate-950/92 backdrop-blur-2xl z-50 flex flex-col items-center justify-center p-2 sm:p-4 text-center animate-in fade-in zoom-in-95 duration-700 pointer-events-auto select-none overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/30 via-slate-950/80 to-slate-950 pointer-events-none" />
      <div
        className={`absolute w-96 h-96 rounded-full blur-[100px] opacity-35 pointer-events-none ${winnerTheme.glowOrbClass}`}
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

      <div className="relative z-10 max-w-sm w-full space-y-2 my-auto py-1 px-2.5">
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

        {viewerTopPlayers.length > 0 ? (
          <VictoryPodiumCard
            topPlayers={viewerTopPlayers}
            activeTeams={activeTeams}
            finisherPlayerName={finisherPlayerName}
          />
        ) : (
          <VictoryMvpCard viewerMvp={null} proMvp={proMvp} activeTeams={activeTeams} />
        )}

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
          nextQueuedMatchLabel={nextQueuedMatch?.label ?? null}
          remainingQueueCount={matchQueue.length}
          onStartNextRound={handleStartNextRound}
          onResetSeriesMatch={handleResetSeriesMatch}
          onAdvanceQueuedMatch={handleAdvanceQueuedMatch}
        />
      </div>
    </div>
  );
};
