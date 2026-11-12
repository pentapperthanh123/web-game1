import type { Express } from 'express';
import { TikTokConnectionService } from '../services/tiktokConnectionService.js';
import { ServerContext } from '../types/serverState.js';
import { getErrorMessage } from '../utils/payloadSanitizers.js';

/**
 * Registers REST API routes for TikTok Live connection, pipeline stats, and simulation.
 */
export function registerTikTokRoutes(
  app: Express,
  ctx: ServerContext,
  tiktokService: TikTokConnectionService
): void {
  app.get('/api/tiktok/pipeline-stats', (_req, res) => {
    res.json(tiktokService.getStats());
  });

  app.post('/api/tiktok/simulate', (req, res) => {
    if (req.body?.action === 'resetStats') {
      const stats = tiktokService.resetStats();
      res.json({ accepted: true, action: 'resetStats', stats });
      return;
    }
    const result = tiktokService.runSimulation(req.body);
    if (!result) {
      res.status(400).json({ error: 'Invalid simulation action' });
      return;
    }
    res.json(result);
  });

  app.post('/api/tiktok/connect', async (req, res) => {
    const username = req.body?.username;
    if (!username || typeof username !== 'string') {
      res.status(400).json({ error: 'Username is required' });
      return;
    }

    try {
      const { cleanUsername } = tiktokService.connectToRoom(username);
      res.json({ message: 'Connecting to TikTok Live...', username: cleanUsername });
    } catch (error: unknown) {
      ctx.state.connectionStatus = 'ERROR';
      ctx.state.lastErrorMessage = getErrorMessage(error, 'Server error');
      res.status(500).json({ error: ctx.state.lastErrorMessage });
    }
  });

  app.post('/api/tiktok/disconnect', (_req, res) => {
    tiktokService.disconnectFromRoom();
    res.json({ message: 'Disconnected from TikTok Live' });
  });
}
