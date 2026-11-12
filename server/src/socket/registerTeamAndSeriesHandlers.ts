import type { Socket } from 'socket.io';
import {
  DuelLaneKey,
  getSeriesFormatSpecs,
  isDeciderRound,
  SeriesFormat,
} from '../constants/series.js';
import { sanitizeTeamConfigState } from '../constants/teams.js';
import { DuelService } from '../services/duelService.js';
import { saveSeriesConfigToDisk, saveTeamConfigToDisk } from '../storage/jsonFileStore.js';
import { ServerContext } from '../types/serverState.js';
import { extractSenderId } from '../utils/payloadSanitizers.js';

const VALID_SERIES_FORMATS: readonly SeriesFormat[] = ['BO1', 'BO3', 'BO5'];

interface Bo5ControlPayload {
  action?: string;
  blg?: number;
  geng?: number;
  currentRound?: number;
}

interface SilverScrapesDuelPayload {
  action: 'start' | 'stop' | 'extend' | 'setLane';
  lane?: DuelLaneKey;
  duration?: number;
}

/**
 * Registers socket handlers for team rosters, series format/score, and Silver Scrapes duels.
 */
export function registerTeamAndSeriesHandlers(
  socket: Socket,
  ctx: ServerContext,
  duelService: DuelService
): void {
  socket.on('admin:bo5-control', (payload: Bo5ControlPayload) => {
    const series = ctx.state.seriesConfig;
    if (payload?.action === 'reset') {
      series.blgScore = 0;
      series.gengScore = 0;
      series.currentRound = 1;
      saveSeriesConfigToDisk(series);
      ctx.io.emit('game:series-format', series);
      duelService.stopDuel();
    } else if (payload?.action === 'nextRound') {
      series.currentRound = Math.min(series.maxRounds, series.currentRound + 1);
      saveSeriesConfigToDisk(series);
      ctx.io.emit('game:series-format', series);
    } else if (payload?.action === 'setScore') {
      const nextBlg = Math.max(0, Math.min(series.targetWins, payload.blg ?? series.blgScore));
      const nextGeng = Math.max(0, Math.min(series.targetWins, payload.geng ?? series.gengScore));
      const nextRound =
        payload.currentRound ?? Math.min(series.maxRounds, nextBlg + nextGeng + 1);
      series.blgScore = nextBlg;
      series.gengScore = nextGeng;
      series.currentRound = nextRound;
      saveSeriesConfigToDisk(series);
      ctx.io.emit('game:series-format', series);

      if (
        isDeciderRound(nextBlg, nextGeng, series.targetWins) &&
        !ctx.state.silverScrapesDuelState.isActive
      ) {
        duelService.startDuel(ctx.state.silverScrapesDuelState.selectedLane, 60);
      }
    }
    ctx.io.emit('game:bo5-control', payload);
  });

  socket.on('admin:set-series-format', (payload: { format: SeriesFormat; resetScore?: boolean }) => {
    const format = payload?.format;
    if (!format || !VALID_SERIES_FORMATS.includes(format)) return;

    const specs = getSeriesFormatSpecs(format);
    const resetScore = Boolean(payload?.resetScore);
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
  });

  socket.on('admin:silver-scrapes-duel', (payload: SilverScrapesDuelPayload) => {
    if (!payload?.action) return;
    if (payload.action === 'start') {
      duelService.startDuel(
        payload.lane || ctx.state.silverScrapesDuelState.selectedLane,
        payload.duration || 60
      );
    } else if (payload.action === 'stop') {
      duelService.stopDuel();
    } else if (payload.action === 'extend') {
      duelService.extendDuel(30);
    } else if (payload.action === 'setLane' && payload.lane) {
      duelService.setDuelLane(payload.lane);
    }
  });

  socket.on('admin:set-team-config', (payload: unknown) => {
    const cleanConfig = sanitizeTeamConfigState(payload);
    if (!cleanConfig) return;

    ctx.state.teamConfig = cleanConfig;
    saveTeamConfigToDisk(ctx.state.teamConfig);
    const src = (payload || {}) as Record<string, unknown>;
    ctx.io.emit('game:team-config', {
      ...ctx.state.teamConfig,
      resetMatch: Boolean(src.resetMatch),
      senderId: extractSenderId(payload),
    });
  });
}
