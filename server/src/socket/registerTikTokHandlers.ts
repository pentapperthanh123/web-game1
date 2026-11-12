import type { Socket } from 'socket.io';
import { TikTokConnectionService } from '../services/tiktokConnectionService.js';

/**
 * Registers socket handlers for TikTok Live score-balance hints and event simulation.
 */
export function registerTikTokHandlers(
  socket: Socket,
  tiktokService: TikTokConnectionService
): void {
  socket.on('admin:sync-score-hint', (payload: { leftScore?: number; rightScore?: number }) => {
    tiktokService.updateScoreHint(
      Number(payload?.leftScore) || 0,
      Number(payload?.rightScore) || 0
    );
  });

  socket.on('admin:simulate-tiktok', (payload: unknown) => {
    const src = (payload || {}) as Record<string, unknown>;
    if (src.action === 'resetStats') {
      tiktokService.resetStats();
      return;
    }
    const result = tiktokService.runSimulation(payload);
    if (result) {
      socket.emit('tiktok:simulate-result', result);
    }
  });
}
