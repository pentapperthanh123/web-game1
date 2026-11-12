import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { THEME_CONFIGS, GAME_THEME, TEAM_KEY } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';

export const ArenaBackground2D = () => {
  const teamScoreBLG = useGameStore((state) => state.teamScoreBLG);
  const teamScoreGENG = useGameStore((state) => state.teamScoreGENG);
  const gameTheme = useGameStore((state) => state.gameTheme);
  const activeTeams = useGameStore((state) => state.activeTeams);

  const leftTheme = getTeamTheme(activeTeams[TEAM_KEY.BLG]?.colorTheme);
  const rightTheme = getTeamTheme(activeTeams[TEAM_KEY.GENG]?.colorTheme);
  const themeConfig = THEME_CONFIGS[gameTheme] || THEME_CONFIGS[GAME_THEME.BARON];

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
      {/* 1. Dynamic Arena Background based on selected Game Theme */}
      <picture className="absolute inset-0 w-full h-full transition-opacity duration-500">
        <source srcSet={themeConfig.backgroundImageWebp} type="image/webp" />
        <img
          src={themeConfig.backgroundImagePng}
          alt={themeConfig.nameVi}
          className="w-full h-full object-cover object-center scale-[1.02] transform-gpu"
          loading="eager"
        />
      </picture>

      {/* 2. Dual Team Esports Atmosphere Lighting Overlays */}
      <div
        style={{
          background: `linear-gradient(to right, ${leftTheme.primaryHex}40, ${leftTheme.secondaryHex}1a, transparent)`,
        }}
        className={`absolute inset-y-0 left-0 w-1/2 transition-opacity duration-700 pointer-events-none ${blgGlowOpacity}`}
      />

      <div
        style={{
          background: `linear-gradient(to left, ${rightTheme.primaryHex}40, ${rightTheme.secondaryHex}1a, transparent)`,
        }}
        className={`absolute inset-y-0 right-0 w-1/2 transition-opacity duration-700 pointer-events-none ${gengGlowOpacity}`}
      />

      {/* 3. Floating Atmospheric Mist Layer */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${themeConfig.ambientMistClass} pointer-events-none animate-mist-drift transition-all duration-700`}
      />

      {/* 4. Radial Vignette for Broadcast HUD Readability */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,6,23,0.7)_85%,rgba(2,6,23,0.95)_100%)] pointer-events-none" />
    </div>
  );
};
