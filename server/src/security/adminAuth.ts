import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { Server, Socket } from 'socket.io';

export const ADMIN_EVENT_PREFIX = 'admin:';
export const AUTH_ERROR_EVENT = 'server:auth-error';
export const ADMIN_TOKEN_HEADER = 'x-admin-token';
const API_PATH_PREFIX = '/api/';
const WILDCARD_ORIGIN = '*';
const ORIGIN_LIST_SEPARATOR = ',';
const HTTP_STATUS_UNAUTHORIZED = 401;
const UNAUTHORIZED_MESSAGE = 'Unauthorized: missing or invalid admin token';
const PROTECTED_HTTP_METHODS: ReadonlySet<string> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export type CorsOrigin = string | string[];

function readAdminToken(): string {
  return (process.env.ADMIN_TOKEN ?? '').trim();
}

export function isAdminAuthEnabled(): boolean {
  return readAdminToken().length > 0;
}

/**
 * Constant-time comparison of a candidate token against ADMIN_TOKEN.
 * Returns true for every candidate when auth is disabled (dev mode).
 */
export function isValidAdminToken(candidate: unknown): boolean {
  const expected = readAdminToken();
  if (!expected) return true;
  if (typeof candidate !== 'string') return false;

  const expectedBuffer = Buffer.from(expected, 'utf-8');
  const candidateBuffer = Buffer.from(candidate, 'utf-8');
  if (expectedBuffer.length !== candidateBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, candidateBuffer);
}

export function logAdminAuthMode(): void {
  if (isAdminAuthEnabled()) {
    console.log('[Auth] Admin token protection enabled.');
    return;
  }
  console.warn('[Auth] ADMIN_TOKEN is empty - DEV MODE: all admin events and REST writes are allowed.');
}

/** Parses ALLOWED_ORIGINS (comma list). Empty -> '*'. */
export function resolveCorsOrigin(): CorsOrigin {
  const origins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(ORIGIN_LIST_SEPARATOR)
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  if (origins.length === 0) return WILDCARD_ORIGIN;
  return origins;
}

/** Express middleware: mutating requests under /api/* require x-admin-token. */
export const requireAdminForApiWrites: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!PROTECTED_HTTP_METHODS.has(req.method)) return next();
  if (!req.path.startsWith(API_PATH_PREFIX)) return next();
  if (isValidAdminToken(req.header(ADMIN_TOKEN_HEADER))) return next();
  res.status(HTTP_STATUS_UNAUTHORIZED).json({ error: UNAUTHORIZED_MESSAGE });
};

function attachAdminEventGuard(socket: Socket): void {
  // Rejected packets are dropped by NOT calling next(): this keeps the socket
  // connected (next(err) would emit an 'error' on the socket instead).
  socket.use(([eventName], next) => {
    const isAdminEvent = typeof eventName === 'string' && eventName.startsWith(ADMIN_EVENT_PREFIX);
    if (!isAdminEvent || socket.data.isAdmin === true) {
      next();
      return;
    }
    console.warn(`[Auth] Rejected ${String(eventName)} from non-admin socket ${socket.id}`);
    socket.emit(AUTH_ERROR_EVENT, { event: eventName });
  });
}

/**
 * Installs the handshake auth middleware (sets socket.data.isAdmin) and
 * per-packet guard for `admin:*` events on every connecting socket.
 */
export function installSocketAdminAuth(io: Server): void {
  io.use((socket, next) => {
    const auth = socket.handshake.auth as Record<string, unknown> | undefined;
    socket.data.isAdmin = isValidAdminToken(auth?.adminToken);
    attachAdminEventGuard(socket);
    next();
  });
}
