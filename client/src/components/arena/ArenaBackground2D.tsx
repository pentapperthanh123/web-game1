import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { ASSET_PATHS } from '../../constants/game';

export const ArenaBackground2D = () => {
  const teamScoreBLG = useGameStore((state) => state.teamScoreBLG);
  const teamScoreGENG = useGameStore((state) => state.teamScoreGENG);

  // Dynamic light intensity based on which team is currently dealing more damage
  const { blgGlowOpacity, gengGlowOpacity } = useMemo(() => {
    const total = teamScoreBLG + teamScoreGENG;
    if (total === 0) {
      return { blgGlowOpacity: 'opacity-30', gengGlowOpacity: 'opacity-30' };
    }
    const blgRatio = teamScoreBLG / total;
    const gengRatio = teamScoreGENG / total;

    const blgClass = blgRatio > 0.55 ? 'opacity-55' : 'opacity-25';
    const gengClass = gengRatio > 0.55 ? 'opacity-55' : 'opacity-25';
    return { blgGlowOpacity: blgClass, gengGlowOpacity: gengClass };
  }, [teamScoreBLG, teamScoreGENG]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Main High-Resolution 2D Summoner's Rift Baron Pit Digital Art */}
      <picture className="absolute inset-0 w-full h-full">
        <source srcSet={ASSET_PATHS.ARENA_BACKGROUND_WEBP} type="image/webp" />
        <img
          src={ASSET_PATHS.ARENA_BACKGROUND_PNG}
          alt="Summoner's Rift Baron Pit Arena"
          className="w-full h-full object-cover object-center scale-[1.02] transform-gpu"
          loading="eager"
        />
      </picture>

      {/* 2. Dual Team Esports Atmosphere Lighting Overlays */}
      {/* Left Side: Cyan Mist (BLG) */}
      <div
        className={`absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-cyan-500/25 via-cyan-900/10 to-transparent transition-opacity duration-700 pointer-events-none ${blgGlowOpacity}`}
      />

      {/* Right Side: Gold/Amber Glow (GEN.G) */}
      <div
        className={`absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-amber-500/25 via-amber-900/10 to-transparent transition-opacity duration-700 pointer-events-none ${gengGlowOpacity}`}
      />

      {/* 3. Floating Atmospheric Void Mist Layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/20 to-slate-950/40 pointer-events-none animate-mist-drift" />

      {/* 4. Radial Vignette for Broadcast HUD Readability */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,6,23,0.7)_85%,rgba(2,6,23,0.95)_100%)] pointer-events-none" />
    </div>
  );
};
