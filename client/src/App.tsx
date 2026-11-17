import { useEffect, useRef, type CSSProperties } from 'react';
import { ArenaBackground2D } from './components/arena/ArenaBackground2D';
import { Boss2D } from './components/arena/Boss2D';
import { GameCanvas } from './components/canvas/GameCanvas';
import { HUDOverlay } from './components/ui/HUDOverlay';
import { AudioController } from './components/audio/AudioController';
import { useGameStore } from './store/gameStore';
import { useScreenRumbleAmplitudePx } from './hooks/useScreenRumbleAmplitude';
import { useMatchSnapshotPersistence } from './store/matchSnapshot';
import { useRoundClockTicker } from './store/roundClockTicker';
import { useSessionLeaderboardPersistence } from './store/sessionLeaderboardStore';
import { VANGUARD_ACTOR_LABEL } from './constants/sessionLeaderboard';
import {
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
  BACKGROUND_PERF_CONSTANTS,
  DAMAGE_SOURCE,
  DAMAGE_TYPE,
} from './constants/game';

import { getRandomChampion } from './constants/champions';
import { gameSocket } from './services/socket'; // Auto-connects to Socket.io backend on port 4000
import { startCasterDirector } from './services/caster/casterDirector';
import { getBossPhaseRule } from './constants/bossPhases';
import { STATUS_EFFECT_CONSTANTS } from './constants/bossStatusEffects';
import { useRoundIntroStore, isCurrentRoundIntroActive } from './store/roundIntroStore';

/** Read by the `screenRumble` keyframes in index.css. */
const SCREEN_RUMBLE_CSS_VAR = '--screen-rumble-px';
const SCREEN_MOTION_CLASS = {
  RUMBLE: 'animate-screen-rumble',
  SHAKE: 'animate-screen-shake',
  NONE: '',
} as const;

const resolveScreenMotionClass = (isRumbling: boolean, isShaking: boolean): string => {
  if (isRumbling) return SCREEN_MOTION_CLASS.RUMBLE;
  if (isShaking) return SCREEN_MOTION_CLASS.SHAKE;
  return SCREEN_MOTION_CLASS.NONE;
};

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
  const screenShakeTimestamp = useGameStore((state) => state.screenShakeTimestamp);
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

    const interval = setInterval(() => {
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

    return () => clearInterval(interval);
  }, [isBattlePaused, isBossEnraged, gameTheme]);

  // Periodic Boss Counterattack Loop with 4 Configurable Skills targeting Champions
  useEffect(() => {
    if (isBattlePaused || !bossSkillConfig.autoAttackEnabled) {
      return;
    }

    let timerId: ReturnType<typeof setTimeout>;

    const runAttackCycle = () => {
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

      timerId = setTimeout(() => {
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

    return () => clearTimeout(timerId);
  }, [
    isBattlePaused,
    isBossEnraged,
    gameTheme,
    bossSkillConfig.autoAttackEnabled,
    bossSkillConfig.intervalMs,
    bossSkillConfig.randomIntervalEnabled,
  ]);

  // AI caster: watches game events and speaks through the server TTS route
  useEffect(() => startCasterDirector(), []);

  // Expose store for debugging and prevent mobile browser scroll offset
  useEffect(() => {
    (window as any).__GAME_STORE__ = useGameStore;
    window.scrollTo(0, 0);
  }, []);

  const isScreenShaking = Date.now() - screenShakeTimestamp < 350;
  const screenRumblePx = useScreenRumbleAmplitudePx();
  // A running quake wins over the short kick: both animate the same transform
  const screenMotionClass = resolveScreenMotionClass(screenRumblePx > 0, isScreenShaking);

  // Background entity cleanup & Boss Phase/Shield/WeakPoint tick
  useEffect(() => {
    const pruneInterval = setInterval(() => {
      pruneEntities();
      tickBossMechanics();
      tickStatusEffects();
      syncBossPhase();
    }, STATUS_EFFECT_CONSTANTS.LOOP_INTERVAL_MS);
    return () => clearInterval(pruneInterval);
  }, [pruneEntities, tickBossMechanics, tickStatusEffects, syncBossPhase]);

  // Background bot simulation runner (pauses automatically when Boss is defeated or during round intermission)
  useEffect(() => {
    if (!isSimulationActive || isBattlePaused) return;

    const intervalId = setInterval(() => {
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

      // 15% chance to send gift
      if (Math.random() < 0.15) {
        triggerGiftExplosion('Rồng Thần CKTG 🐉', botSlot, viewerName, 1000);
      }
    }, botSpeedMs);

    return () => clearInterval(intervalId);
  }, [isSimulationActive, isBattlePaused, botSpeedMs, summonMinion, triggerGiftExplosion, addLikes]);

  // Manual-toggled Auto Pro-Player Combat: all 10 pro players fire continuously by role speed
  useEffect(() => {
    if (!autoProBattleConfig.enabled || isBattlePaused) {
      nextFireAtRef.current = {};
      return;
    }

    const activeTeamKeys = Object.keys(activeTeams) as TeamType[];
    const leftTeamKey = activeTeamKeys[0] ?? TEAM_KEY.BLG;
    const rightTeamKey = activeTeamKeys[1] ?? TEAM_KEY.GENG;
    const leftRoster = activeTeams[leftTeamKey]?.roster ?? [];
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

    const intervalId = setInterval(() => {
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

    return () => clearInterval(intervalId);
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

            setTimeout(() => {
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

    return () => unsubscribe();
  }, [isBattlePaused, triggerAutoProAttack]);

  // Continuous Auto-Summon Loop configured from Admin Panel
  useEffect(() => {
    if (!autoSummonConfig.enabled || isBattlePaused) return;

    const clampedSpeed = Math.max(
      AUTO_SUMMON_CONSTANTS.MIN_SPEED_MS,
      autoSummonConfig.speedMs || AUTO_SUMMON_CONSTANTS.DEFAULT_SPEED_MS
    );

    const intervalId = setInterval(() => {
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

    return () => clearInterval(intervalId);
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

    const intervalId = setInterval(() => {
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
        setTimeout(() => {
          summonMinion(`⚔️ ${VANGUARD_ACTOR_LABEL} ${rightTag}`, rightChamp, rightTeam, false);
        }, 1200);
      }
    }, 4500);

    return () => clearInterval(intervalId);
  }, [isBattlePaused, summonMinion]);

  // Background Combat Ticker: Keeps minion combat and turn queues moving smoothly even when the tab is in background / unfocused
  useEffect(() => {
    const backgroundCombatInterval = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden || isBattlePaused) return;
      const state = useGameStore.getState();
      if (state.bossHp <= 0 || state.bossStatus === BOSS_STATUS.DEFEATED) return;

      const livingMinions = state.minions.filter((m) => (m.hp ?? 1) > 0);
      if (livingMinions.length === 0) return;

      const teamDamageMap: Record<TeamType, number> = {
        [TEAM_KEY.BLG]: 0,
        [TEAM_KEY.GENG]: 0,
      };

      for (const minion of livingMinions) {
        teamDamageMap[minion.team] = (teamDamageMap[minion.team] ?? 0) + Math.round(minion.dps);
      }

      for (const team of Object.keys(teamDamageMap) as TeamType[]) {
        const dmg = teamDamageMap[team];
        if (dmg > 0) {
          const teamTag = state.activeTeams[team]?.shortTag ?? team;
          state.damageBoss(dmg, team, `Đội hình ${teamTag}`, DAMAGE_TYPE.NORMAL, {
            source: DAMAGE_SOURCE.CHAMPION,
          });
        }
      }

      state.advanceSummonTurnQueue();
    }, BACKGROUND_PERF_CONSTANTS.COMBAT_TICK_INTERVAL_MS);

    return () => clearInterval(backgroundCombatInterval);
  }, [isBattlePaused]);

  return (
    <main className="fixed inset-0 w-full h-full bg-slate-950 overflow-hidden font-sans select-none">
      {/* 100% Fullscreen on all mobile devices and browsers, zero letterboxing */}
      <div
        style={{ [SCREEN_RUMBLE_CSS_VAR]: `${screenRumblePx}px` } as CSSProperties}
        className={`relative w-full h-full overflow-hidden bg-slate-950 transition-transform ${screenMotionClass}`}
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
