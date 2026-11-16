import type { Socket } from 'socket.io';
import { SESSION_LEADERBOARD_EVENT } from '../constants/sessionLeaderboard.js';
import { ServerContext } from '../types/serverState.js';
import { extractSenderId } from '../utils/payloadSanitizers.js';

/** Remote "new live session": every overlay empties its session damage board. */
export const registerSessionLeaderboardHandlers = (socket: Socket, ctx: ServerContext): void => {
  socket.on(SESSION_LEADERBOARD_EVENT.ADMIN_RESET, (payload: unknown) => {
    ctx.io.emit(SESSION_LEADERBOARD_EVENT.GAME_RESET, { senderId: extractSenderId(payload) });
  });
};
