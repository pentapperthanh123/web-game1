import type { Express } from 'express';
import { PlayerProfileService } from '../services/playerProfileService.js';

const PLAYER_LEADERBOARD_PATH = '/api/player-leaderboard';

/** Registers the public read-only player leaderboard endpoint. */
export function registerPlayerLeaderboardRoutes(
  app: Express,
  playerProfileService: PlayerProfileService
): void {
  app.get(PLAYER_LEADERBOARD_PATH, (_req, res) => {
    res.json(playerProfileService.getLeaderboard());
  });
}
