import type { Express } from 'express';
import { getSeriesFormatSpecs, SeriesFormat } from '../constants/series.js';
import { sanitizeTeamConfigState } from '../constants/teams.js';
import {
  saveOverlayVisibilityToDisk,
  saveSeriesConfigToDisk,
  saveTeamConfigToDisk,
} from '../storage/jsonFileStore.js';
import { ServerContext } from '../types/serverState.js';
import { extractSenderId, pickOverlayVisibilityPatch } from '../utils/payloadSanitizers.js';

const VALID_SERIES_FORMATS: readonly SeriesFormat[] = ['BO1', 'BO3', 'BO5'];

/**
 * Registers REST API routes for overlay visibility, teams, series format, and server status.
 */
export function registerConfigRoutes(app: Express, ctx: ServerContext): void {
  app.get('/api/overlay-visibility', (_req, res) => {
    res.json(ctx.state.overlayVisibility);
  });

  app.post('/api/overlay-visibility', (req, res) => {
    const cleanPatch = pickOverlayVisibilityPatch(req.body);
    if (Object.keys(cleanPatch).length > 0) {
      ctx.state.overlayVisibility = { ...ctx.state.overlayVisibility, ...cleanPatch };
      saveOverlayVisibilityToDisk(ctx.state.overlayVisibility);
      ctx.io.emit('game:overlay-visibility', {
        ...ctx.state.overlayVisibility,
        senderId: extractSenderId(req.body),
      });
    }
    res.json({ success: true, visibility: ctx.state.overlayVisibility });
  });

  app.get('/api/teams', (_req, res) => {
    res.json(ctx.state.teamConfig);
  });

  app.post('/api/teams', (req, res) => {
    const cleanConfig = sanitizeTeamConfigState(req.body);
    if (!cleanConfig) {
      res.status(400).json({ error: 'Invalid team configuration payload' });
      return;
    }
    ctx.state.teamConfig = cleanConfig;
    saveTeamConfigToDisk(ctx.state.teamConfig);
    const resetMatch = Boolean(req.body?.resetMatch);
    const senderId = extractSenderId(req.body);
    ctx.io.emit('game:team-config', {
      ...ctx.state.teamConfig,
      resetMatch,
      senderId,
    });
    res.json({ success: true, config: ctx.state.teamConfig });
  });

  app.get('/api/series-format', (_req, res) => {
    res.json(ctx.state.seriesConfig);
  });

  app.post('/api/series-format', (req, res) => {
    const format = req.body?.format as SeriesFormat;
    if (!format || !VALID_SERIES_FORMATS.includes(format)) {
      res.status(400).json({ error: 'Invalid series format. Must be BO1, BO3, or BO5' });
      return;
    }
    const specs = getSeriesFormatSpecs(format);
    const resetScore = Boolean(req.body?.resetScore);
    ctx.state.seriesConfig = {
      format,
      targetWins: specs.targetWins,
      maxRounds: specs.maxRounds,
      blgScore: resetScore ? 0 : Math.min(specs.targetWins, ctx.state.seriesConfig.blgScore),
      gengScore: resetScore ? 0 : Math.min(specs.targetWins, ctx.state.seriesConfig.gengScore),
      currentRound: resetScore
        ? 1
        : Math.min(specs.maxRounds, ctx.state.seriesConfig.currentRound),
    };
    saveSeriesConfigToDisk(ctx.state.seriesConfig);
    ctx.io.emit('game:series-format', ctx.state.seriesConfig);
    res.json({ success: true, config: ctx.state.seriesConfig });
  });

  app.get('/api/status', (_req, res) => {
    res.json({
      status: ctx.state.connectionStatus,
      username: ctx.state.tiktokUsername,
      error: ctx.state.lastErrorMessage,
      connectedClients: ctx.io.engine.clientsCount,
    });
  });
}
