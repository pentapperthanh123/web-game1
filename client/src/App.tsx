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
} from './constants/game';
import { TEAM_ROSTERS } from './constants/roster';
import './services/socket'; // Auto-connects to Socket.io backend on port 4000

export function App() {
  const isSimulationActive = useGameStore((state) => state.isSimulationActive);
  const botSpeedMs = useGameStore((state) => state.botSpeedMs);
  const autoProBattleConfig = useGameStore((state) => state.autoProBattleConfig);
  const summonMinion = useGameStore((state) => state.summonMinion);
  const triggerGiftExplosion = useGameStore((state) => state.triggerGiftExplosion);
  const addLikes = useGameStore((state) => state.addLikes);
  const triggerAutoProAttack = useGameStore((state) => state.triggerAutoProAttack);
  const screenShakeTimestamp = useGameStore((state) => state.screenShakeTimestamp);
  const pruneEntities = useGameStore((state) => state.pruneEntities);
  const bossStatus = useGameStore((state) => state.bossStatus);
  const bossSkillConfig = useGameStore((state) => state.bossSkillConfig);

  const proTurnRef = useRef(0);
  const isBossDefeated = bossStatus === BOSS_STATUS.DEFEATED;

  // Enforce document title to strictly match user branding
  useEffect(() => {
    document.title = APP_TITLE;
  }, []);

  // Periodic Boss Retaliation Loop (Roar shockwave & lightning arcs)
  useEffect(() => {
    if (isBossDefeated) return;

    const interval = setInterval(() => {
      const state = useGameStore.getState();
      if (state.bossStatus !== BOSS_STATUS.DEFEATED && state.minions.length > 0) {
        state.triggerBossAttack();
      }
    }, 7500);

    return () => clearInterval(interval);
  }, [isBossDefeated]);

  // Periodic Boss Counterattack Loop with 4 Configurable Skills targeting Champions
  useEffect(() => {
    if (isBossDefeated || !bossSkillConfig.autoAttackEnabled) {
      return;
    }

    let timerId: ReturnType<typeof setTimeout>;

    const runAttackCycle = () => {
      const baseInterval = bossSkillConfig.intervalMs || 4000;
      const nextDelay = bossSkillConfig.randomIntervalEnabled
        ? Math.round(baseInterval * (0.7 + Math.random() * 0.6))
        : baseInterval;

      timerId = setTimeout(() => {
        const state = useGameStore.getState();
        if (state.bossStatus !== BOSS_STATUS.DEFEATED && state.minions.length > 0) {
          state.castBossSkill();
        }
        runAttackCycle();
      }, nextDelay);
    };

    runAttackCycle();

    return () => clearTimeout(timerId);
  }, [
    isBossDefeated,
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

  // Background entity cleanup tick (clears expired meteors, shockwaves, slashes, hearts)
  useEffect(() => {
    const pruneInterval = setInterval(() => {
      pruneEntities();
    }, 250);
    return () => clearInterval(pruneInterval);
  }, [pruneEntities]);

  // Background bot simulation runner (when triggered via Socket or Admin)
  useEffect(() => {
    if (!isSimulationActive) return;

    const intervalId = setInterval(() => {
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
  }, [isSimulationActive, botSpeedMs, summonMinion, triggerGiftExplosion, addLikes]);

  // Manual-toggled Auto Pro-Player Combat: shoots signature skills from roster portraits when idle
  useEffect(() => {
    if (!autoProBattleConfig.enabled || isBossDefeated) return;

    const intervalMs = autoProBattleConfig.intervalMs || AUTO_PRO_BATTLE_CONSTANTS.DEFAULT_INTERVAL_MS;
    const intervalId = setInterval(() => {
      const state = useGameStore.getState();
      if (state.bossStatus === BOSS_STATUS.DEFEATED || state.bossHp <= 0) return;
      if (autoProBattleConfig.onlyWhenIdle && state.minions.length > 0) return;

      const step = proTurnRef.current;
      proTurnRef.current += 1;

      const team = step % 2 === 0 ? TEAM_KEY.BLG : TEAM_KEY.GENG;
      const rosterIndex = Math.floor(step / 2) % TEAM_ROSTERS[team].length;

      triggerAutoProAttack(team, rosterIndex);
    }, intervalMs);

    return () => clearInterval(intervalId);
  }, [
    autoProBattleConfig.enabled,
    autoProBattleConfig.onlyWhenIdle,
    autoProBattleConfig.intervalMs,
    isBossDefeated,
    triggerAutoProAttack,
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
