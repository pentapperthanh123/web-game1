import type { Socket } from 'socket.io';
import {
  CHAMPIONSHIP_TALLY_EVENT,
  CHAMPIONSHIP_TALLY_LIMITS,
  ChampionshipTallyReport,
} from '../constants/championshipTally.js';
import { ServerContext } from '../types/serverState.js';
import { extractSenderId } from '../utils/payloadSanitizers.js';

const sanitizeTitles = (value: unknown): number | null => {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) return null;
  return Math.min(CHAMPIONSHIP_TALLY_LIMITS.MAX_TITLES, count);
};

const sanitizeTeamId = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.length === 0) return null;
  return value.slice(0, CHAMPIONSHIP_TALLY_LIMITS.MAX_TEAM_ID_LENGTH);
};

/** The report is display-only (the counts stay in the overlay), but it is still validated. */
const toTallyReport = (rawPayload: unknown): ChampionshipTallyReport | null => {
  if (!rawPayload || typeof rawPayload !== 'object') return null;
  const payload = rawPayload as Record<string, unknown>;
  const leftTeamId = sanitizeTeamId(payload.leftTeamId);
  const rightTeamId = sanitizeTeamId(payload.rightTeamId);
  const leftTitles = sanitizeTitles(payload.leftTitles);
  const rightTitles = sanitizeTitles(payload.rightTitles);
  if (leftTeamId === null || rightTeamId === null || leftTitles === null || rightTitles === null) return null;
  return { leftTeamId, rightTeamId, leftTitles, rightTitles };
};

/** Remote reset of the matchup's series titles, plus the overlay → admin report of the current counts. */
export const registerChampionshipTallyHandlers = (socket: Socket, ctx: ServerContext): void => {
  if (ctx.state.championshipTally) {
    socket.emit(CHAMPIONSHIP_TALLY_EVENT.GAME_REPORT, ctx.state.championshipTally);
  }

  socket.on(CHAMPIONSHIP_TALLY_EVENT.ADMIN_RESET, (payload: unknown) => {
    ctx.io.emit(CHAMPIONSHIP_TALLY_EVENT.GAME_RESET, { senderId: extractSenderId(payload) });
  });

  socket.on(CHAMPIONSHIP_TALLY_EVENT.OVERLAY_REPORT, (payload: unknown) => {
    const report = toTallyReport(payload);
    if (!report) return;
    ctx.state.championshipTally = report;
    ctx.io.emit(CHAMPIONSHIP_TALLY_EVENT.GAME_REPORT, report);
  });
};
