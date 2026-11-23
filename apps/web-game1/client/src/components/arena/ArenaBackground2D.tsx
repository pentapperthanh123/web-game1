import React, { type ComponentType } from 'react';
import { useGameStore } from '../../store/gameStore';
import { THEME_CONFIGS, GAME_THEME, TEAM_KEY, GameThemeType } from '../../constants/game';
import { getTeamTheme } from '../../constants/teams';
import { BaronPitOverlay } from './scenes/BaronPitOverlay';
import { VoidRealmBackdrop } from './scenes/VoidRealmBackdrop';

/** Themes whose arena is fully procedural (replaces the painted background). */
const SCENE_BACKDROPS: Partial<Record<GameThemeType, ComponentType>> = {
  [GAME_THEME.VOID_TITAN]: VoidRealmBackdrop,
};

/** Animated layers drawn on top of the painted background for a theme. */
const SCENE_OVERLAYS: Partial<Record<GameThemeType, ComponentType>> = {
  [GAME_THEME.BARON]: BaronPitOverlay,
};

interface PaintedBackdropProps {
  imageWebp: string;
  imagePng: string;
  altText: string;
}

const PaintedBackdrop = ({ imageWebp, imagePng, altText }: PaintedBackdropProps) => (
  <picture className="absolute inset-0 w-full h-full transition-opacity duration-500">
    <source srcSet={imageWebp} type="image/webp" />
    <img
      src={imagePng}
      alt={altText}
      className="w-full h-full object-cover object-center scale-[1.02] transform-gpu"
      loading="eager"
    />
  </picture>
);

export const ArenaBackground2D = React.memo(() => {
  const gameTheme = useGameStore((state) => state.gameTheme);
  const activeTeams = useGameStore((state) => state.activeTeams);

  const leftTheme = getTeamTheme(activeTeams[TEAM_KEY.BLG]?.colorTheme);
  const rightTheme = getTeamTheme(activeTeams[TEAM_KEY.GENG]?.colorTheme);
  const themeConfig = THEME_CONFIGS[gameTheme] || THEME_CONFIGS[GAME_THEME.BARON];
  const SceneBackdrop = SCENE_BACKDROPS[gameTheme];
  const SceneOverlay = SCENE_OVERLAYS[gameTheme];

  // Dynamic light intensity based on which team is currently leading, sampled with hysteresis
  const glowDominance = useGameStore((state) => {
    const left = state.teamScores?.[TEAM_KEY.BLG] ?? state.teamScoreBLG;
    const right = state.teamScores?.[TEAM_KEY.GENG] ?? state.teamScoreGENG;
    const total = left + right;
    if (total === 0) return 'BALANCED';
    const leftRatio = left / total;
    if (leftRatio > 0.55) return 'BLG_LEAD';
    if (leftRatio < 0.45) return 'GENG_LEAD';
    return 'BALANCED';
  });

  const leftGlowOpacity = glowDominance === 'BLG_LEAD' ? 'opacity-55' : glowDominance === 'GENG_LEAD' ? 'opacity-25' : 'opacity-30';
  const rightGlowOpacity = glowDominance === 'GENG_LEAD' ? 'opacity-55' : glowDominance === 'BLG_LEAD' ? 'opacity-25' : 'opacity-30';

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-0">
      {/* 1. Arena backdrop: procedural scene for some themes, painted image + optional animated layers otherwise */}
      {SceneBackdrop ? (
        <SceneBackdrop />
      ) : (
        <PaintedBackdrop
          imageWebp={themeConfig.backgroundImageWebp}
          imagePng={themeConfig.backgroundImagePng}
          altText={themeConfig.nameVi}
        />
      )}
      {SceneOverlay && <SceneOverlay />}

      {/* 2. Dual Team Esports Atmosphere Lighting Overlays */}
      <div
        style={{
          background: `linear-gradient(to right, ${leftTheme.primaryHex}40, ${leftTheme.secondaryHex}1a, transparent)`,
        }}
        className={`absolute inset-y-0 left-0 w-1/2 transition-opacity duration-700 pointer-events-none ${leftGlowOpacity}`}
      />

      <div
        style={{
          background: `linear-gradient(to left, ${rightTheme.primaryHex}40, ${rightTheme.secondaryHex}1a, transparent)`,
        }}
        className={`absolute inset-y-0 right-0 w-1/2 transition-opacity duration-700 pointer-events-none ${rightGlowOpacity}`}
      />

      {/* 3. Floating Atmospheric Mist Layer */}
      <div
        className={`absolute inset-0 bg-gradient-to-b ${themeConfig.ambientMistClass} pointer-events-none animate-mist-drift transition-all duration-700`}
      />

      {/* 4. Radial Vignette for Broadcast HUD Readability */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,6,23,0.7)_85%,rgba(2,6,23,0.95)_100%)] pointer-events-none" />
    </div>
  );
});

ArenaBackground2D.displayName = 'ArenaBackground2D';
