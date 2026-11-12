import { DuelService } from '../services/duelService.js';
import { TikTokConnectionService } from '../services/tiktokConnectionService.js';
import { ServerContext } from '../types/serverState.js';
import { registerAdminHandlers } from './registerAdminHandlers.js';
import { registerTeamAndSeriesHandlers } from './registerTeamAndSeriesHandlers.js';
import { registerTikTokHandlers } from './registerTikTokHandlers.js';

/**
 * Registers the Socket.IO connection hub, initial state sync, and all domain handlers.
 */
export function registerSocketHub(
  ctx: ServerContext,
  duelService: DuelService,
  tiktokService: TikTokConnectionService
): void {
  ctx.io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.emit('game:team-config', ctx.state.teamConfig);
    socket.emit('game:overlay-visibility', ctx.state.overlayVisibility);
    socket.emit('game:theme', { theme: ctx.state.gameTheme });
    socket.emit('game:boss-skill-config', ctx.state.bossSkillConfig);
    socket.emit('game:auto-pro-battle', ctx.state.autoProBattleConfig);
    socket.emit('game:champion-damage-config', {
      multiplier: ctx.state.championDamageMultiplier,
    });
    socket.emit('game:user-avatar-config', {
      enabled: ctx.state.useUserAvatar,
    });
    socket.emit('game:participation-rules', ctx.state.participationRuleConfig);
    socket.emit('game:series-format', ctx.state.seriesConfig);
    socket.emit('game:silver-scrapes-state', ctx.state.silverScrapesDuelState);
    socket.emit('tiktok:pipeline-stats', tiktokService.getStats());
    socket.emit('tiktok:status', {
      status: ctx.state.connectionStatus,
      username: ctx.state.tiktokUsername,
      error: ctx.state.lastErrorMessage,
    });

    registerAdminHandlers(socket, ctx, duelService);
    registerTeamAndSeriesHandlers(socket, ctx, duelService);
    registerTikTokHandlers(socket, tiktokService);

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}
