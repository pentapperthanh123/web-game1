import React, { useState, useEffect, useRef } from 'react';
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
import { ROUND_HOLD_REASON } from '../../store/roundIntroStore';
import { previewNextMatchup } from '../../store/matchRotation';
import { useGiftVfxStore } from '../../store/giftVfxStore';
import { useRoseGratitudeStore } from '../../store/roseGratitudeStore';
import { hideCombatDeployBanner } from '../../store/combatDeployBannerStore';
import { workerSetTimeout } from '../../services/workerScheduler';
import {
  VICTORY_CELEBRATION_STARS,
  resolveEffectiveWinner,
} from './victory/victoryHelpers';

const VictoryOverlayContent = () => {
  const { t } = useTranslation();
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

  useEffect(() => {
    // Silence combat synths and speech
    audioService.setCombatMuted(true);

    const { bossDefeatedTimestamp, finisherGiftName: latestGift, finisherCoins: latestCoins } =
      useGameStore.getState();
    const isDonorFinisher = isDonorFinisherCheck(latestGift, latestCoins);
    // Anchored to the moment the boss died (like the finisher cinematic and the caster), not to
    // when this effect happened to run, so a slow render cannot push the screen out of sync.
    const sinceDefeatMs = bossDefeatedTimestamp > 0 ? Date.now() - bossDefeatedTimestamp : 0;
    const victoryDelay = Math.max(0, resolveDefeatShowcaseMs(isDonorFinisher) - sinceDefeatMs);

    // Reveal the Victory screen after finisher showcase
    const cancelRevealTimer = workerSetTimeout(() => {
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
      cancelRevealTimer();
      audioService.setCombatMuted(false);
      useGiftVfxStore.getState().setPodiumOrbitActive(false);
      useGiftVfxStore.getState().setContinuousFireworksActive(false);
    };
  }, []);

  if (!isVictoryVisible) return null;

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
    <div className="flex items-center justify-center h-screen w-full absolute inset-0 z-50 pointer-events-none select-none overflow-hidden px-3 py-4 animate-in fade-in duration-700">
      {/* Fullscreen Cinematic Broadcast Backdrop */}
      <div className="absolute inset-0 bg-slate-950/86 pointer-events-none" />
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] rounded-full blur-[120px] opacity-25 pointer-events-none ${winnerTheme.glowOrbClass}`}
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

      {/* SINGLE UNIFIED CENTER HEXTECH CARD */}
      <div
        style={{
          borderColor: `${winnerTheme.primaryHex}99`,
          boxShadow: `0 16px 48px rgba(0, 0, 0, 0.95), 0 0 36px ${winnerTheme.primaryHex}40, inset 0 0 24px ${winnerTheme.primaryHex}22`,
          background:
            'linear-gradient(180deg, rgba(15, 23, 42, 0.96) 0%, rgba(2, 6, 23, 0.98) 100%)',
        }}
        className="relative z-10 max-w-sm w-full p-4 sm:p-5 rounded-3xl border-2 pointer-events-auto flex flex-col items-center space-y-3 overflow-hidden animate-in zoom-in-95 duration-500"
      >
        {/* Top Golden Shimmer Accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent shadow-[0_0_12px_#fbbf24]" />

        {/* 1. Winner Header & Champion Crest */}
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

        {/* 2. Series Scoreboard */}
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

        {/* 3. Next Queued Matchup (when series ended) */}
        {isSeriesEnded && previewMatch && (
          <div className="w-full p-2.5 rounded-2xl bg-gradient-to-r from-amber-950/85 via-slate-900/95 to-amber-950/85 border border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.25)] flex flex-col items-center gap-1 text-center">
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

        {/* 4. Team Damage Summary Bar */}
        <div className="w-full pt-2.5 border-t border-white/10">
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
        </div>

        {/* 5. Primary Action Button & Countdown */}
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

export const VictoryOverlay = React.memo(() => {
  const isDefeated = useGameStore(
    (state) => state.bossStatus === BOSS_STATUS.DEFEATED || state.isRoundIntermission
  );

  if (!isDefeated) return null;
  return <VictoryOverlayContent />;
});

VictoryOverlay.displayName = 'VictoryOverlay';
