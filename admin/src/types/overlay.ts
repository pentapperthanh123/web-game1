export interface OverlayVisibility {
  chat: boolean;
  leaderboard: boolean;
  teamRosters: boolean;
  bossHealth: boolean;
  teamScores: boolean;
  likeCounter: boolean;
  howToPlay: boolean;
}

export const DEFAULT_OVERLAY_VISIBILITY: OverlayVisibility = {
  chat: true,
  leaderboard: true,
  teamRosters: true,
  bossHealth: true,
  teamScores: true,
  likeCounter: true,
  howToPlay: true,
};

export const OVERLAY_STORAGE_KEY = 'lol_overlay_visibility_config';
