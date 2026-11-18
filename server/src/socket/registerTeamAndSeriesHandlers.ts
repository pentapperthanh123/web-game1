import type { Socket } from 'socket.io';
import {
  DECIDER_DUEL_DURATION_SEC,
  DuelLaneKey,
  getBossThemeForRound,
  getSeriesFormatSpecs,
  isDeciderRound,
  isStaleNextRoundRequest,
  SERIES_EVENT,
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
  /** nextRound only: the round the sender just finished (makes the request idempotent). */
  fromRound?: number;
}

interface SilverScrapesDuelPayload {
  action: 'start' | 'stop' | 'extend' | 'setLane' | 'skipIntro';
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
  /** A decider round (e.g. 1-1 in BO3) opens with the Silver Scrapes duel. */
  const startDeciderDuelIfNeeded = (): void => {
    const series = ctx.state.seriesConfig;
    const duel = ctx.state.silverScrapesDuelState;
    if (duel.isActive || !isDeciderRound(series.blgScore, series.gengScore, series.targetWins)) return;
    duelService.startDuel(duel.selectedLane, DECIDER_DUEL_DURATION_SEC);
  };

  socket.on('admin:bo5-control', (payload: Bo5ControlPayload) => {
    const series = ctx.state.seriesConfig;
    if (payload?.action === 'reset') {
      series.blgScore = 0;
      series.gengScore = 0;
      series.currentRound = 1;
      const theme = getBossThemeForRound(1, series.format);
      ctx.state.gameTheme = theme;
      saveSeriesConfigToDisk(series);
      ctx.io.emit('game:series-format', series);
      ctx.io.emit('game:theme', { theme });
      duelService.stopDuel();
    } else if (payload?.action === 'nextRound') {
      const isSeriesEnded =
        series.blgScore >= series.targetWins || series.gengScore >= series.targetWins;
      if (isSeriesEnded) {
        // Series already concluded (e.g. 2-0 sweep in BO3). Do not advance to an unplayed round 3!
        socket.emit('game:series-format', series);
        return;
      }
      if (isStaleNextRoundRequest(series.currentRound, payload.fromRound)) {
        // Someone already moved past that round: re-sync the sender to the real round instead of advancing again
        socket.emit('game:series-format', series);
        socket.emit('game:bo5-control', { action: 'nextRound', currentRound: series.currentRound });
        return;
      }
      series.currentRound = Math.min(series.maxRounds, series.currentRound + 1);
      const theme = getBossThemeForRound(series.currentRound, series.format);
      ctx.state.gameTheme = theme;
      saveSeriesConfigToDisk(series);
      ctx.io.emit('game:series-format', series);
      ctx.io.emit('game:theme', { theme });
      // Overlays move to exactly this round instead of adding +1 to what they already received
      ctx.io.emit('game:bo5-control', { ...payload, currentRound: series.currentRound });
      // Automatic series flow: the overlay reports results, then asks for the next round
      startDeciderDuelIfNeeded();
      return;
    } else if (payload?.action === 'setScore') {
      const nextBlg = Math.max(0, Math.min(series.targetWins, payload.blg ?? series.blgScore));
      const nextGeng = Math.max(0, Math.min(series.targetWins, payload.geng ?? series.gengScore));
      const nextRound =
        payload.currentRound ?? Math.min(series.maxRounds, nextBlg + nextGeng + 1);
      series.blgScore = nextBlg;
      series.gengScore = nextGeng;
      series.currentRound = nextRound;
      const theme = getBossThemeForRound(series.currentRound, series.format);
      ctx.state.gameTheme = theme;
      saveSeriesConfigToDisk(series);
      ctx.io.emit('game:series-format', series);
      ctx.io.emit('game:theme', { theme });
      startDeciderDuelIfNeeded();
    }
    ctx.io.emit('game:bo5-control', payload);
  });

  // Display-safe: only one side may gain exactly one round win, so a stray client cannot rewrite the score
  socket.on(SERIES_EVENT.OVERLAY_ROUND_RESULT, (payload: Bo5ControlPayload) => {
    const series = ctx.state.seriesConfig;
    const blg = Number(payload?.blg);
    const geng = Number(payload?.geng);
    const playedRound = Number(payload?.currentRound);
    const isNormalIncrement =
      (blg === series.blgScore + 1 && geng === series.gengScore) ||
      (geng === series.gengScore + 1 && blg === series.blgScore);
    const isRoundOneFirstWin =
      playedRound === 1 &&
      series.currentRound === 1 &&
      ((blg === 1 && geng === 0) || (geng === 1 && blg === 0));
    const isValidWin = isNormalIncrement || isRoundOneFirstWin;
    if (!isValidWin || blg > series.targetWins || geng > series.targetWins) return;
    series.blgScore = blg;
    series.gengScore = geng;
    if (Number.isInteger(playedRound) && playedRound >= 1) {
      series.currentRound = Math.min(series.maxRounds, playedRound);
    }
    const theme = getBossThemeForRound(series.currentRound, series.format);
    ctx.state.gameTheme = theme;
    saveSeriesConfigToDisk(series);
    ctx.io.emit('game:series-format', series);
    ctx.io.emit('game:theme', { theme });
  });

  socket.on('admin:set-series-format', (payload: { format: SeriesFormat; resetScore?: boolean }) => {
    const format = payload?.format;
    if (!format || !VALID_SERIES_FORMATS.includes(format)) return;

    const specs = getSeriesFormatSpecs(format);
    const resetScore = Boolean(payload?.resetScore);
    const targetRound = resetScore
      ? 1
      : Math.min(specs.maxRounds, ctx.state.seriesConfig.currentRound);
    ctx.state.seriesConfig = {
      format,
      targetWins: specs.targetWins,
      maxRounds: specs.maxRounds,
      blgScore: resetScore ? 0 : Math.min(specs.targetWins, ctx.state.seriesConfig.blgScore),
      gengScore: resetScore ? 0 : Math.min(specs.targetWins, ctx.state.seriesConfig.gengScore),
      currentRound: targetRound,
    };
    const theme = getBossThemeForRound(targetRound, format);
    ctx.state.gameTheme = theme;
    saveSeriesConfigToDisk(ctx.state.seriesConfig);
    ctx.io.emit('game:series-format', ctx.state.seriesConfig);
    ctx.io.emit('game:theme', { theme });
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
    } else if (payload.action === 'skipIntro') {
      duelService.skipIntro();
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
    const resetMatch = Boolean(src.resetMatch);

    if (resetMatch) {
      const series = ctx.state.seriesConfig;
      series.blgScore = 0;
      series.gengScore = 0;
      series.currentRound = 1;
      const theme = getBossThemeForRound(1, series.format);
      ctx.state.gameTheme = theme;
      saveSeriesConfigToDisk(series);
      ctx.io.emit('game:series-format', series);
      ctx.io.emit('game:theme', { theme });
      duelService.stopDuel();
    }

    ctx.io.emit('game:team-config', {
      ...ctx.state.teamConfig,
      resetMatch,
      senderId: extractSenderId(payload),
    });
  });
}
