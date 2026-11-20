import { useEffect, useRef } from 'react';
import { ArenaBackground2D } from './components/arena/ArenaBackground2D';
import { Boss2D } from './components/arena/Boss2D';
import { GameCanvas } from './components/canvas/GameCanvas';
import { HUDOverlay } from './components/ui/HUDOverlay';
import { AudioController } from './components/audio/AudioController';
import { useGameStore } from './store/gameStore';
import { useMatchSnapshotPersistence } from './store/matchSnapshot';
import { useRoundClockTicker } from './store/roundClockTicker';
import { useSessionLeaderboardPersistence } from './store/sessionLeaderboardStore';
import { VANGUARD_ACTOR_LABEL } from './constants/sessionLeaderboard';
import {
  SIMULATION_BOT_GIFT,
  SIMULATION_PRESETS,
  BOSS_STATUS,
  APP_TITLE,
  TEAM_KEY,
  TeamType,
  GAME_CONSTANTS,
  AUTO_PRO_BATTLE_CONSTANTS,
  AUTO_SUMMON_CONSTANTS,
  BOSS_ENRAGED_CONSTANTS,
  BOSS_DIFFICULTY_SCALE,
} from './constants/game';
import { SCREEN_RUMBLE_CONSTANTS } from './constants/bossUltimateFeedback';
import { getRandomChampion } from './constants/champions';
import { gameSocket } from './services/socket'; // Auto-connects to Socket.io backend on port 4000
import { startCasterDirector } from './services/caster/casterDirector';
import { CommentaryDirector } from './services/caster/CommentaryDirector';
import { getBossPhaseRule } from './constants/bossPhases';
import { STATUS_EFFECT_CONSTANTS } from './constants/bossStatusEffects';
import { useRoundIntroStore, isCurrentRoundIntroActive } from './store/roundIntroStore';
import { CancelTimer, workerSetInterval, workerSetTimeout } from './services/workerScheduler';

/** Read by the `screenRumble` keyframes in index.css. */
const SCREEN_RUMBLE_CSS_VAR = '--screen-rumble-px';
const SCREEN_SHAKE_DURATION_MS = 350;
const VANGUARD_CHECK_INTERVAL_MS = 4500;
const VANGUARD_STAGGER_MS = 1200;
const SCREEN_MOTION_CLASS = {
  RUMBLE: 'animate-screen-rumble',
  SHAKE: 'animate-screen-shake',
} as const;

export function App() {
  useMatchSnapshotPersistence();
  useRoundClockTicker();
  useSessionLeaderboardPersistence();
  const isSimulationActive = useGameStore((state) => state.isSimulationActive);
  const botSpeedMs = useGameStore((state) => state.botSpeedMs);
  const autoProBattleConfig = useGameStore((state) => state.autoProBattleConfig);
  const autoSummonConfig = useGameStore((state) => state.autoSummonConfig);
  const summonMinion = useGameStore((state) => state.summonMinion);
  const summonMinionsBatch = useGameStore((state) => state.summonMinionsBatch);
  const triggerGiftExplosion = useGameStore((state) => state.triggerGiftExplosion);
  const addLikes = useGameStore((state) => state.addLikes);
  const triggerAutoProAttack = useGameStore((state) => state.triggerAutoProAttack);
  const pruneEntities = useGameStore((state) => state.pruneEntities);
  const tickBossMechanics = useGameStore((state) => state.tickBossMechanics);
  const tickStatusEffects = useGameStore((state) => state.tickStatusEffects);
  const syncBossPhase = useGameStore((state) => state.syncBossPhase);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const bossSkillConfig = useGameStore((state) => state.bossSkillConfig);
  const activeTeams = useGameStore((state) => state.activeTeams);
  const gameTheme = useGameStore((state) => state.gameTheme);

  const stageRef = useRef<HTMLDivElement>(null);
  const nextFireAtRef = useRef<Record<string, number>>({});
  const autoUltQueuedRef = useRef<Set<string>>(new Set());
  const autoSummonTickRef = useRef(0);
  const isIntroActive = useRoundIntroStore((state) => state.isActive);
  const isBossDefeated = bossStatus === BOSS_STATUS.DEFEATED;
  const isBossEnraged = bossStatus === BOSS_STATUS.ENRAGED;
  const isBattlePaused = isIntroActive || isBossDefeated || isRoundIntermission || roundWinner !== null;

  // Enforce dynamic document title matching active teams
  useEffect(() => {
    const leftTag = activeTeams[TEAM_KEY.BLG]?.shortTag;
    const rightTag = activeTeams[TEAM_KEY.GENG]?.shortTag;
    document.title = leftTag && rightTag ? `${APP_TITLE} | ${leftTag} vs ${rightTag}` : APP_TITLE;
  }, [activeTeams]);

  // Periodic Boss Retaliation Loop (Roar shockwave & lightning arcs)
  useEffect(() => {
    if (isBattlePaused) return;

    const phaseSpeedMultiplier = BOSS_DIFFICULTY_SCALE[gameTheme]?.phaseSpeedMultiplier ?? 1.0;
    const baseRetaliation = isBossEnraged
      ? BOSS_ENRAGED_CONSTANTS.RETALIATION_INTERVAL_MS
      : BOSS_ENRAGED_CONSTANTS.NORMAL_RETALIATION_INTERVAL_MS;
    const retaliationInterval = Math.round(baseRetaliation / phaseSpeedMultiplier);

    return workerSetInterval(() => {
      const state = useGameStore.getState();
      if (
        isCurrentRoundIntroActive() ||
        state.bossStatus === BOSS_STATUS.DEFEATED ||
        state.isRoundIntermission ||
        state.roundWinner !== null ||
        state.bossHp <= 0
      ) {
        return;
      }
      if (state.minions.length > 0) {
        state.triggerBossAttack();
      }
    }, retaliationInterval);
  }, [isBattlePaused, isBossEnraged, gameTheme]);

  // Periodic Boss Counterattack Loop with 4 Configurable Skills targeting Champions
  useEffect(() => {
    if (isBattlePaused || !bossSkillConfig.autoAttackEnabled) {
      return;
    }

    let cancelTimer: CancelTimer | null = null;
    let isDisposed = false;

    const runAttackCycle = () => {
      if (isDisposed) return;
      const state = useGameStore.getState();
      const isEnraged = state.bossStatus === BOSS_STATUS.ENRAGED;
      const phaseSpeedMultiplier = BOSS_DIFFICULTY_SCALE[state.gameTheme]?.phaseSpeedMultiplier ?? 1.0;
      // When enraged: attacks occur ~1.54x faster (interval multiplied by 0.65)
      const speedMultiplier = isEnraged
        ? BOSS_ENRAGED_CONSTANTS.ATTACK_INTERVAL_MULTIPLIER
        : 1.0;
      const phaseIntervalMultiplier = getBossPhaseRule(state.bossPhase).intervalMultiplier;
      const baseInterval =
        ((bossSkillConfig.intervalMs || 10000) * speedMultiplier * phaseIntervalMultiplier) /
        phaseSpeedMultiplier;
      const nextDelay = bossSkillConfig.randomIntervalEnabled
        ? Math.round(baseInterval * (0.7 + Math.random() * 0.6))
        : Math.round(baseInterval);

      cancelTimer = workerSetTimeout(() => {
        if (isDisposed) return;
        const latestState = useGameStore.getState();
        if (
          !isCurrentRoundIntroActive() &&
          latestState.bossStatus !== BOSS_STATUS.DEFEATED &&
          !latestState.isRoundIntermission &&
          latestState.roundWinner === null &&
          latestState.bossHp > 0 &&
          latestState.minions.length > 0
        ) {
          latestState.castBossSkill();
        }
        runAttackCycle();
      }, nextDelay);
    };

    runAttackCycle();

    return () => {
      isDisposed = true;
      cancelTimer?.();
    };
  }, [
    isBattlePaused,
    isBossEnraged,
    gameTheme,
    bossSkillConfig.autoAttackEnabled,
    bossSkillConfig.intervalMs,
    bossSkillConfig.randomIntervalEnabled,
  ]);

  // AI caster: watches game events and speaks through the server TTS route
  useEffect(() => {
    const stopCaster = startCasterDirector();
    const stopCommentary = CommentaryDirector.start();
    return () => {
      stopCaster();
      stopCommentary();
    };
  }, []);

  // Expose store for debugging and prevent mobile browser scroll offset
  useEffect(() => {
    (window as unknown as { __GAME_STORE__?: typeof useGameStore }).__GAME_STORE__ = useGameStore;
    window.scrollTo(0, 0);
  }, []);

  // Drive DOM screen shake & rumble directly via ref so hits never re-render the App root
  useEffect(() => {
    let isShaking = false;
    let rumblePx = 0;
    let cancelShakeTimer: CancelTimer | null = null;
    let cancelRumbleTailTimer: CancelTimer | null = null;
    let cancelRumbleIdleTimer: CancelTimer | null = null;

    const syncStageMotion = (): void => {
      const stageEl = stageRef.current;
      if (!stageEl) return;
      stageEl.style.setProperty(SCREEN_RUMBLE_CSS_VAR, `${rumblePx}px`);
      stageEl.classList.toggle(SCREEN_MOTION_CLASS.RUMBLE, rumblePx > 0);
      stageEl.classList.toggle(SCREEN_MOTION_CLASS.SHAKE, rumblePx === 0 && isShaking);
    };

    const applyShake = (timestamp: number): void => {
      cancelShakeTimer?.();
      cancelShakeTimer = null;
      const remainingMs = timestamp + SCREEN_SHAKE_DURATION_MS - Date.now();
      if (remainingMs <= 0) {
        isShaking = false;
        syncStageMotion();
        return;
      }
      isShaking = true;
      syncStageMotion();
      cancelShakeTimer = workerSetTimeout(() => {
        cancelShakeTimer = null;
        isShaking = false;
        syncStageMotion();
      }, remainingMs);
    };

    const applyRumble = (startedAt: number, durationMs: number, intensity: number): void => {
      cancelRumbleTailTimer?.();
      cancelRumbleTailTimer = null;
      cancelRumbleIdleTimer?.();
      cancelRumbleIdleTimer = null;

      const remainingMs = startedAt + durationMs - Date.now();
      if (remainingMs <= 0) {
        rumblePx = 0;
        syncStageMotion();
        return;
      }

      const tailMs = durationMs * SCREEN_RUMBLE_CONSTANTS.RELEASE_RATIO;
      const fullPx = Math.round(intensity * SCREEN_RUMBLE_CONSTANTS.DOM_PX_PER_INTENSITY);
      const tailPx = Math.round(fullPx * SCREEN_RUMBLE_CONSTANTS.DOM_TAIL_SCALE);

      rumblePx = remainingMs > tailMs ? fullPx : tailPx;
      syncStageMotion();

      if (remainingMs > tailMs) {
        cancelRumbleTailTimer = workerSetTimeout(() => {
          cancelRumbleTailTimer = null;
          rumblePx = tailPx;
          syncStageMotion();
        }, remainingMs - tailMs);
      }

      cancelRumbleIdleTimer = workerSetTimeout(() => {
        cancelRumbleIdleTimer = null;
        rumblePx = 0;
        syncStageMotion();
      }, remainingMs);
    };

    const initialState = useGameStore.getState();
    applyShake(initialState.screenShakeTimestamp);
    applyRumble(
      initialState.screenRumbleStartedAt,
      initialState.screenRumbleDurationMs,
      initialState.screenRumbleIntensity
    );

    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      if (state.screenShakeTimestamp !== prevState.screenShakeTimestamp) {
        applyShake(state.screenShakeTimestamp);
      }
      if (
        state.screenRumbleStartedAt !== prevState.screenRumbleStartedAt ||
        state.screenRumbleDurationMs !== prevState.screenRumbleDurationMs ||
        state.screenRumbleIntensity !== prevState.screenRumbleIntensity
      ) {
        applyRumble(
          state.screenRumbleStartedAt,
          state.screenRumbleDurationMs,
          state.screenRumbleIntensity
        );
      }
    });

    return () => {
      unsubscribe();
      cancelShakeTimer?.();
      cancelRumbleTailTimer?.();
      cancelRumbleIdleTimer?.();
    };
  }, []);

  // Background entity cleanup & Boss Phase/Shield/WeakPoint tick
  useEffect(() => {
    return workerSetInterval(() => {
      pruneEntities();
      tickBossMechanics();
      tickStatusEffects();
      syncBossPhase();
    }, STATUS_EFFECT_CONSTANTS.LOOP_INTERVAL_MS);
  }, [pruneEntities, tickBossMechanics, tickStatusEffects, syncBossPhase]);

  // Background bot simulation runner (pauses automatically when Boss is defeated or during round intermission)
  useEffect(() => {
    if (!isSimulationActive || isBattlePaused) return;

    return workerSetInterval(() => {
      const currentState = useGameStore.getState();
      if (
        isCurrentRoundIntroActive() ||
        currentState.bossStatus === BOSS_STATUS.DEFEATED ||
        currentState.bossHp <= 0 ||
        currentState.isRoundIntermission ||
        currentState.roundWinner !== null
      ) {
        return;
      }

      const currentTeamKeys = Object.keys(currentState.activeTeams) as TeamType[];
      const botSlot = currentTeamKeys.length > 0
        ? currentTeamKeys[Math.floor(Math.random() * currentTeamKeys.length)]
        : TEAM_KEY.BLG;
      const slotRoster = currentState.activeTeams[botSlot]?.roster ?? [];
      const randomProChamp =
        slotRoster.length > 0 && Math.random() < 0.65
          ? slotRoster[Math.floor(Math.random() * slotRoster.length)].signatureChampion
          : SIMULATION_PRESETS[Math.floor(Math.random() * SIMULATION_PRESETS.length)].champion;
      const randomViewerNumber = Math.floor(Math.random() * 900) + 100;
      const viewerName = `Viewer_${randomViewerNumber}`;

      summonMinion(viewerName, randomProChamp, botSlot);

      // Random Likes
      addLikes(Math.floor(Math.random() * 3) + 1, botSlot, viewerName);

      if (Math.random() < SIMULATION_BOT_GIFT.CHANCE_PER_TICK) {
        const isClimax = currentState.bossHp <= currentState.bossMaxHp * SIMULATION_BOT_GIFT.CLIMAX_BOSS_HP_RATIO;
        const gift = isClimax ? SIMULATION_BOT_GIFT.CLIMAX : SIMULATION_BOT_GIFT.REGULAR;
        triggerGiftExplosion(gift.name, botSlot, viewerName, gift.coins);
      }
    }, botSpeedMs);
  }, [isSimulationActive, isBattlePaused, botSpeedMs, summonMinion, triggerGiftExplosion, addLikes]);

  // Manual-toggled Auto Pro-Player Combat: all 10 pro players fire continuously by role speed
  useEffect(() => {
    if (!autoProBattleConfig.enabled || isBattlePaused) {
      nextFireAtRef.current = {};
      return;
    }

    const activeTeamKeys = Object.keys(activeTeams) as TeamType[];
    const leftTeamKey = activeTeamKeys[0] ?? TEAM_KEY.BLG;
    const leftRoster = activeTeams[leftTeamKey]?.roster ?? [];
    const rightTeamKey = activeTeamKeys[1] ?? TEAM_KEY.GENG;
    const rightRoster = activeTeams[rightTeamKey]?.roster ?? [];
    const allPlayers = [...leftRoster, ...rightRoster];
    const baseIntervalMs =
      autoProBattleConfig.intervalMs || AUTO_PRO_BATTLE_CONSTANTS.DEFAULT_INTERVAL_MS;
    const startNow = Date.now();

    allPlayers.forEach((player, idx) => {
      const slotRoster = activeTeams[player.team]?.roster ?? [];
      const teamOffset = player.team === leftTeamKey ? 0 : Math.round(AUTO_PRO_BATTLE_CONSTANTS.INITIAL_STAGGER_MS / 2);
      const laneIndex = idx % Math.max(1, slotRoster.length);
      nextFireAtRef.current[player.id] =
        startNow + laneIndex * AUTO_PRO_BATTLE_CONSTANTS.INITIAL_STAGGER_MS + teamOffset;
    });

    return workerSetInterval(() => {
      const state = useGameStore.getState();
      if (
        isCurrentRoundIntroActive() ||
        state.bossStatus === BOSS_STATUS.DEFEATED ||
        state.bossHp <= 0 ||
        state.isRoundIntermission ||
        state.roundWinner !== null
      ) {
        return;
      }

      if (autoProBattleConfig.onlyWhenIdle && state.minions.length > 0) {
        return;
      }

      const now = Date.now();
      const currentTeamKeys = Object.keys(state.activeTeams) as TeamType[];
      for (const team of currentTeamKeys) {
        const roster = state.activeTeams[team]?.roster ?? [];
        for (let playerIndex = 0; playerIndex < roster.length; playerIndex++) {
          const player = roster[playerIndex];
          const scheduledAt = nextFireAtRef.current[player.id] ?? now;
          if (now < scheduledAt) continue;

          triggerAutoProAttack(team, playerIndex);

          const roleFactor = AUTO_PRO_BATTLE_CONSTANTS.ROLE_COOLDOWN_FACTOR[player.role] ?? 1.0;
          const jitter = 0.85 + Math.random() * 0.3;
          const teamMomentum = state.teamHeartMomentum[team];
          const isFrenzy = Boolean(teamMomentum?.frenzyUntil && now < teamMomentum.frenzyUntil);
          const frenzyFactor = isFrenzy ? 0.6 : 1.0;
          nextFireAtRef.current[player.id] =
            now + Math.round(baseIntervalMs * roleFactor * jitter * frenzyFactor);
        }
      }
    }, AUTO_PRO_BATTLE_CONSTANTS.TICK_MS);
  }, [
    autoProBattleConfig.enabled,
    autoProBattleConfig.onlyWhenIdle,
    autoProBattleConfig.intervalMs,
    activeTeams,
    isBattlePaused,
    triggerAutoProAttack,
  ]);

  // Auto-cast ultimate skill whenever any pro player's power (fury) reaches 100%
  // Subscribes via useGameStore.subscribe to prevent entire App component re-renders
  useEffect(() => {
    if (isBattlePaused) {
      autoUltQueuedRef.current.clear();
      return;
    }

    const pendingUltTimers = new Set<CancelTimer>();

    const checkAndTriggerUlts = (rosterPlayerFury: Record<string, number>) => {
      const state = useGameStore.getState();
      const teams: TeamType[] = Object.keys(state.activeTeams) as TeamType[];
      let staggerDelay = 0;

      for (const team of teams) {
        const roster = state.activeTeams[team]?.roster ?? [];
        roster.forEach((player, playerIndex) => {
          const fury = rosterPlayerFury[player.id] ?? 0;
          if (fury >= GAME_CONSTANTS.PRO_FURY.MAX_FURY && !autoUltQueuedRef.current.has(player.id)) {
            autoUltQueuedRef.current.add(player.id);
            const currentDelay = staggerDelay;
            staggerDelay += 350;

            const cancelUlt = workerSetTimeout(() => {
              pendingUltTimers.delete(cancelUlt);
              autoUltQueuedRef.current.delete(player.id);
              const currentState = useGameStore.getState();
              if (
                isCurrentRoundIntroActive() ||
                currentState.bossStatus === BOSS_STATUS.DEFEATED ||
                currentState.bossHp <= 0 ||
                currentState.isRoundIntermission ||
                currentState.roundWinner !== null
              ) {
                return;
              }
              triggerAutoProAttack(team, playerIndex);
              // Advance next normal auto-attack cooldown so ult and normal attacks never overlap
              if (nextFireAtRef.current) {
                nextFireAtRef.current[player.id] = Date.now() + 1500;
              }
            }, 250 + currentDelay);
            pendingUltTimers.add(cancelUlt);
          }
        });
      }
    };

    // Check initial state
    checkAndTriggerUlts(useGameStore.getState().rosterPlayerFury);

    // Subscribe to store updates without re-rendering App component
    const unsubscribe = useGameStore.subscribe((state, prevState) => {
      if (state.rosterPlayerFury !== prevState.rosterPlayerFury) {
        checkAndTriggerUlts(state.rosterPlayerFury);
      }
    });

    return () => {
      unsubscribe();
      pendingUltTimers.forEach((cancel) => cancel());
      pendingUltTimers.clear();
    };
  }, [isBattlePaused, triggerAutoProAttack]);

  // Continuous Auto-Summon Loop configured from Admin Panel
  useEffect(() => {
    if (!autoSummonConfig.enabled || isBattlePaused) return;

    const clampedSpeed = Math.max(
      AUTO_SUMMON_CONSTANTS.MIN_SPEED_MS,
      autoSummonConfig.speedMs || AUTO_SUMMON_CONSTANTS.DEFAULT_SPEED_MS
    );

    return workerSetInterval(() => {
      const currentState = useGameStore.getState();
      if (
        isCurrentRoundIntroActive() ||
        currentState.bossStatus === BOSS_STATUS.DEFEATED ||
        currentState.bossHp <= 0 ||
        currentState.isRoundIntermission ||
        currentState.roundWinner !== null
      ) {
        return;
      }

      const batchSize = Math.max(1, autoSummonConfig.batchSize || AUTO_SUMMON_CONSTANTS.DEFAULT_BATCH_SIZE);
      const batchItems: Array<{
        summonerName: string;
        championName: string;
        team: typeof autoSummonConfig.team;
        isGiftBypass: boolean;
      }> = [];

      for (let i = 0; i < batchSize; i += 1) {
        const tickIdx = autoSummonTickRef.current;
        autoSummonTickRef.current += 1;

        let targetTeam = autoSummonConfig.team;
        if (autoSummonConfig.alternateTeams) {
          const teamKeys = Object.keys(useGameStore.getState().activeTeams) as TeamType[];
          const leftKey = teamKeys[0] ?? TEAM_KEY.BLG;
          const rightKey = teamKeys[1] ?? TEAM_KEY.GENG;
          targetTeam = tickIdx % 2 === 0 ? leftKey : rightKey;
        }

        const championName = autoSummonConfig.randomChampions
          ? getRandomChampion().name
          : autoSummonConfig.selectedChampion;

        const baseName =
          AUTO_SUMMON_CONSTANTS.VIEWER_NAMES[
            Math.floor(Math.random() * AUTO_SUMMON_CONSTANTS.VIEWER_NAMES.length)
          ];
        const suffix =
          AUTO_SUMMON_CONSTANTS.VIEWER_SUFFIX_MIN +
          Math.floor(Math.random() * AUTO_SUMMON_CONSTANTS.VIEWER_SUFFIX_MOD);
        const viewerName = `${baseName}_${suffix}`;

        batchItems.push({
          summonerName: viewerName,
          championName,
          team: targetTeam,
          isGiftBypass: false,
        });
      }

      summonMinionsBatch(batchItems);
      gameSocket.sendSummonBatch(batchItems);
    }, clampedSpeed);
  }, [
    autoSummonConfig.enabled,
    autoSummonConfig.speedMs,
    autoSummonConfig.batchSize,
    autoSummonConfig.alternateTeams,
    autoSummonConfig.randomChampions,
    autoSummonConfig.selectedChampion,
    autoSummonConfig.team,
    isBattlePaused,
    summonMinionsBatch,
  ]);

  // Auto Vanguard Skirmish: Keeps the battlefield populated and fighting when viewers are not summoning
  useEffect(() => {
    if (isBattlePaused) return;

    const pendingDelayedSummons = new Set<CancelTimer>();

    const cancelVanguardInterval = workerSetInterval(() => {
      const state = useGameStore.getState();
      if (!state.participationRuleConfig.enableAutoVanguard) {
        return;
      }
      if (
        isCurrentRoundIntroActive() ||
        state.bossStatus === BOSS_STATUS.DEFEATED ||
        state.bossHp <= 0 ||
        state.isRoundIntermission ||
        state.roundWinner !== null
      ) {
        return;
      }

      // If arena has fewer than 2 active minions, deploy vanguard skirmishers to clash with boss
      if (state.minions.length < 2) {
        const teamKeys = Object.keys(state.activeTeams) as TeamType[];
        if (teamKeys.length === 0) return;

        const leftTeam = teamKeys[0] ?? TEAM_KEY.BLG;
        const rightTeam = teamKeys[1] ?? TEAM_KEY.GENG;
        const leftProfile = state.activeTeams[leftTeam];
        const rightProfile = state.activeTeams[rightTeam];

        const leftRoster = leftProfile?.roster ?? [];
        const rightRoster = rightProfile?.roster ?? [];
        const leftChamp = leftRoster[Math.floor(Math.random() * leftRoster.length)]?.signatureChampion || 'Garen';
        const rightChamp = rightRoster[Math.floor(Math.random() * rightRoster.length)]?.signatureChampion || 'Darius';

        const leftTag = leftProfile?.shortTag || leftTeam;
        const rightTag = rightProfile?.shortTag || rightTeam;

        summonMinion(`🛡️ ${VANGUARD_ACTOR_LABEL} ${leftTag}`, leftChamp, leftTeam, false);
        const cancelSecond = workerSetTimeout(() => {
          pendingDelayedSummons.delete(cancelSecond);
          summonMinion(`⚔️ ${VANGUARD_ACTOR_LABEL} ${rightTag}`, rightChamp, rightTeam, false);
        }, VANGUARD_STAGGER_MS);
        pendingDelayedSummons.add(cancelSecond);
      }
    }, VANGUARD_CHECK_INTERVAL_MS);

    return () => {
      cancelVanguardInterval();
      pendingDelayedSummons.forEach((cancel) => cancel());
      pendingDelayedSummons.clear();
    };
  }, [isBattlePaused, summonMinion]);

  return (
    <main className="fixed inset-0 w-full h-full bg-slate-950 overflow-hidden font-sans select-none">
      {/* 100% Fullscreen on all mobile devices and browsers, zero letterboxing */}
      <div
        ref={stageRef}
        className="relative w-full h-full overflow-hidden bg-slate-950 transition-transform"
      >
        {/* Layer 0: High-Resolution 2D Arena Background */}
        <ArenaBackground2D />

        {/* Layer 1: High-Definition Animated 2D Boss Character */}
        <Boss2D />

        {/* Layer 2: 3D VFX, Minions, Projectiles & Particles */}
        <GameCanvas />

        {/* Layer 3: Broadcast HUD Interface */}
        <HUDOverlay />

        {/* Layer 4: Boss Speech Bubbles & Skill Callouts (below top-level toast/intro modals) */}
        <div id="boss-notification-layer" className="absolute inset-0 pointer-events-none z-[30]" />

        {/* Headless Audio Controller (Meme Soundboard & Climax Music) */}
        <AudioController />
      </div>
    </main>
  );
}

export default App;
