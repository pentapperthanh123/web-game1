import { useEffect, useRef } from 'react';
import { ArenaBackground2D } from './components/arena/ArenaBackground2D';
import { Boss2D } from './components/arena/Boss2D';
import { GameCanvas } from './components/canvas/GameCanvas';
import { HUDOverlay } from './components/ui/HUDOverlay';
import { useGameStore } from './store/gameStore';
import {
  SIMULATION_PRESETS,
  BOSS_STATUS,
  APP_TITLE,
  TEAM_KEY,
  AUTO_PRO_BATTLE_CONSTANTS,
  AUTO_SUMMON_CONSTANTS,
  BOSS_ENRAGED_CONSTANTS,
} from './constants/game';
import { TEAM_ROSTERS } from './constants/roster';
import { getRandomChampion } from './constants/champions';
import { gameSocket } from './services/socket'; // Auto-connects to Socket.io backend on port 4000

export function App() {
  const isSimulationActive = useGameStore((state) => state.isSimulationActive);
  const botSpeedMs = useGameStore((state) => state.botSpeedMs);
  const autoProBattleConfig = useGameStore((state) => state.autoProBattleConfig);
  const autoSummonConfig = useGameStore((state) => state.autoSummonConfig);
  const summonMinion = useGameStore((state) => state.summonMinion);
  const triggerGiftExplosion = useGameStore((state) => state.triggerGiftExplosion);
  const addLikes = useGameStore((state) => state.addLikes);
  const triggerAutoProAttack = useGameStore((state) => state.triggerAutoProAttack);
  const screenShakeTimestamp = useGameStore((state) => state.screenShakeTimestamp);
  const pruneEntities = useGameStore((state) => state.pruneEntities);
  const tickBossMechanics = useGameStore((state) => state.tickBossMechanics);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const isRoundIntermission = useGameStore((state) => state.isRoundIntermission);
  const roundWinner = useGameStore((state) => state.roundWinner);
  const bossSkillConfig = useGameStore((state) => state.bossSkillConfig);

  const nextFireAtRef = useRef<Record<string, number>>({});
  const autoSummonTickRef = useRef(0);
  const isBossDefeated = bossStatus === BOSS_STATUS.DEFEATED;
  const isBossEnraged = bossStatus === BOSS_STATUS.ENRAGED;
  const isBattlePaused = isBossDefeated || isRoundIntermission || roundWinner !== null;

  // Enforce document title to strictly match user branding
  useEffect(() => {
    document.title = APP_TITLE;
  }, []);

  // Periodic Boss Retaliation Loop (Roar shockwave & lightning arcs)
  useEffect(() => {
    if (isBattlePaused) return;

    const retaliationInterval = isBossEnraged
      ? BOSS_ENRAGED_CONSTANTS.RETALIATION_INTERVAL_MS
      : BOSS_ENRAGED_CONSTANTS.NORMAL_RETALIATION_INTERVAL_MS;

    const interval = setInterval(() => {
      const state = useGameStore.getState();
      if (
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
  }, [isBattlePaused, isBossEnraged]);

  // Periodic Boss Counterattack Loop with 4 Configurable Skills targeting Champions
  useEffect(() => {
    if (isBattlePaused || !bossSkillConfig.autoAttackEnabled) {
      return;
    }

    let timerId: ReturnType<typeof setTimeout>;

    const runAttackCycle = () => {
      const state = useGameStore.getState();
      const isEnraged = state.bossStatus === BOSS_STATUS.ENRAGED;
      // When enraged: attacks occur ~1.54x faster (interval multiplied by 0.65)
      const speedMultiplier = isEnraged
        ? BOSS_ENRAGED_CONSTANTS.ATTACK_INTERVAL_MULTIPLIER
        : 1.0;
      const baseInterval = (bossSkillConfig.intervalMs || 4000) * speedMultiplier;
      const nextDelay = bossSkillConfig.randomIntervalEnabled
        ? Math.round(baseInterval * (0.7 + Math.random() * 0.6))
        : Math.round(baseInterval);

      timerId = setTimeout(() => {
        const latestState = useGameStore.getState();
        if (
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
    bossSkillConfig.autoAttackEnabled,
    bossSkillConfig.intervalMs,
    bossSkillConfig.randomIntervalEnabled,
  ]);

  // Expose store for debugging and prevent mobile browser scroll offset
  useEffect(() => {
    (window as any).__GAME_STORE__ = useGameStore;
    window.scrollTo(0, 0);
  }, []);

  const isScreenShaking = Date.now() - screenShakeTimestamp < 350;

  // Background entity cleanup & Boss Phase/Shield/WeakPoint tick
  useEffect(() => {
    const pruneInterval = setInterval(() => {
      pruneEntities();
      tickBossMechanics();
    }, 250);
    return () => clearInterval(pruneInterval);
  }, [pruneEntities, tickBossMechanics]);

  // Background bot simulation runner (pauses automatically when Boss is defeated or during round intermission)
  useEffect(() => {
    if (!isSimulationActive || isBattlePaused) return;

    const intervalId = setInterval(() => {
      const currentState = useGameStore.getState();
      if (
        currentState.bossStatus === BOSS_STATUS.DEFEATED ||
        currentState.bossHp <= 0 ||
        currentState.isRoundIntermission ||
        currentState.roundWinner !== null
      ) {
        return;
      }

      const randomPreset =
        SIMULATION_PRESETS[Math.floor(Math.random() * SIMULATION_PRESETS.length)];
      const randomViewerNumber = Math.floor(Math.random() * 900) + 100;
      const viewerName = `Viewer_${randomViewerNumber}`;

      summonMinion(viewerName, randomPreset.champion, randomPreset.team);

      // Random Likes
      addLikes(Math.floor(Math.random() * 3) + 1, randomPreset.team, viewerName);

      // 15% chance to send gift
      if (Math.random() < 0.15) {
        triggerGiftExplosion('Rồng Thần CKTG 🐉', randomPreset.team, viewerName, 1000);
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

    const allPlayers = [...TEAM_ROSTERS[TEAM_KEY.BLG], ...TEAM_ROSTERS[TEAM_KEY.GENG]];
    const baseIntervalMs =
      autoProBattleConfig.intervalMs || AUTO_PRO_BATTLE_CONSTANTS.DEFAULT_INTERVAL_MS;
    const startNow = Date.now();

    allPlayers.forEach((player, idx) => {
      const teamOffset = player.team === TEAM_KEY.BLG ? 0 : Math.round(AUTO_PRO_BATTLE_CONSTANTS.INITIAL_STAGGER_MS / 2);
      const laneIndex = idx % TEAM_ROSTERS[player.team].length;
      nextFireAtRef.current[player.id] =
        startNow + laneIndex * AUTO_PRO_BATTLE_CONSTANTS.INITIAL_STAGGER_MS + teamOffset;
    });

    const intervalId = setInterval(() => {
      const state = useGameStore.getState();
      if (
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
      for (const team of [TEAM_KEY.BLG, TEAM_KEY.GENG]) {
        const roster = TEAM_ROSTERS[team];
        for (let playerIndex = 0; playerIndex < roster.length; playerIndex++) {
          const player = roster[playerIndex];
          const scheduledAt = nextFireAtRef.current[player.id] ?? now;
          if (now < scheduledAt) continue;

          triggerAutoProAttack(team, playerIndex);

          const roleFactor = AUTO_PRO_BATTLE_CONSTANTS.ROLE_COOLDOWN_FACTOR[player.role] ?? 1.0;
          const jitter = 0.85 + Math.random() * 0.3;
          nextFireAtRef.current[player.id] =
            now + Math.round(baseIntervalMs * roleFactor * jitter);
        }
      }
    }, AUTO_PRO_BATTLE_CONSTANTS.TICK_MS);

    return () => clearInterval(intervalId);
  }, [
    autoProBattleConfig.enabled,
    autoProBattleConfig.onlyWhenIdle,
    autoProBattleConfig.intervalMs,
    isBattlePaused,
    triggerAutoProAttack,
  ]);

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
        currentState.bossStatus === BOSS_STATUS.DEFEATED ||
        currentState.bossHp <= 0 ||
        currentState.isRoundIntermission ||
        currentState.roundWinner !== null
      ) {
        return;
      }

      const batchSize = Math.max(1, autoSummonConfig.batchSize || AUTO_SUMMON_CONSTANTS.DEFAULT_BATCH_SIZE);
      for (let i = 0; i < batchSize; i += 1) {
        const tickIdx = autoSummonTickRef.current;
        autoSummonTickRef.current += 1;

        let targetTeam = autoSummonConfig.team;
        if (autoSummonConfig.alternateTeams) {
          targetTeam = tickIdx % 2 === 0 ? TEAM_KEY.BLG : TEAM_KEY.GENG;
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

        summonMinion(viewerName, championName, targetTeam);
        gameSocket.sendSummon(viewerName, championName, targetTeam, false);
      }
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
    summonMinion,
  ]);

  return (
    <main className="fixed inset-0 w-full h-full bg-slate-950 overflow-hidden font-sans select-none">
      {/* 100% Fullscreen on all mobile devices and browsers, zero letterboxing */}
      <div
        className={`relative w-full h-full overflow-hidden bg-slate-950 transition-transform ${
          isScreenShaking ? 'animate-screen-shake' : ''
        }`}
      >
        {/* Layer 0: High-Resolution 2D Arena Background */}
        <ArenaBackground2D />

        {/* Layer 1: High-Definition Animated 2D Boss Character */}
        <Boss2D />

        {/* Layer 2: 3D VFX, Minions, Projectiles & Particles */}
        <GameCanvas />

        {/* Layer 3: Broadcast HUD Interface */}
        <HUDOverlay />
      </div>
    </main>
  );
}

export default App;
