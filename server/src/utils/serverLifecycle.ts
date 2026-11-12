import { execSync } from 'child_process';
import type { Server as HttpServer } from 'http';
import type { Server as SocketIOServer } from 'socket.io';

const PORT_RELEASE_RETRY_DELAY_MS = 1000;
const SHUTDOWN_FORCE_EXIT_MS = 1500;
const MAX_PORT_BIND_RETRIES = 2;

export function logServerListeningBanner(port: number): void {
  console.log(`===============================================`);
  console.log(`🎮 TikTok Live Game Server running on port ${port}`);
  console.log(`📡 WebSocket Gateway ready for Client & Admin`);
  console.log(`===============================================`);
}

function releaseBusyPortListener(port: number): void {
  if (process.platform === 'win32') {
    execSync(
      `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Where-Object { $_.OwningProcess -gt 0 -and $_.OwningProcess -ne ${process.pid} } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
      { stdio: 'ignore' }
    );
    return;
  }
  execSync(`fuser -k ${port}/tcp || true`, { stdio: 'ignore' });
}

/**
 * Attaches graceful shutdown handlers and EADDRINUSE auto-recovery to the HTTP server.
 */
export function attachServerLifecycle(
  httpServer: HttpServer,
  io: SocketIOServer,
  port: number,
  onBeforeShutdown: () => void
): void {
  let portBindRetryCount = 0;
  let isShuttingDown = false;

  const shutdownGracefully = (signal: string): void => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    console.log(`[Server] Received ${signal}, shutting down gracefully...`);
    onBeforeShutdown();

    const forceExitTimer = setTimeout(() => {
      process.exit(0);
    }, SHUTDOWN_FORCE_EXIT_MS);
    forceExitTimer.unref();

    io.close(() => {
      httpServer.closeAllConnections?.();
      httpServer.close(() => {
        clearTimeout(forceExitTimer);
        process.exit(0);
      });
    });
  };

  process.on('SIGINT', () => shutdownGracefully('SIGINT'));
  process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code !== 'EADDRINUSE') {
      console.error('[Server Error]', err);
      return;
    }
    if (isShuttingDown || portBindRetryCount >= MAX_PORT_BIND_RETRIES) {
      console.error(`❌ Cổng ${port} vẫn đang bận sau ${portBindRetryCount} lần thử lại.`);
      process.exit(1);
    }
    portBindRetryCount += 1;
    console.warn(
      `\n⚠️ [Server Error] Cổng ${port} đang bị tiến trình khác chiếm dụng (EADDRINUSE). Đang giải phóng (lần ${portBindRetryCount}/${MAX_PORT_BIND_RETRIES})...`
    );
    try {
      releaseBusyPortListener(port);
      setTimeout(() => {
        console.log(`🔄 [Server] Thử kích hoạt lại cổng ${port}...`);
        httpServer.listen(port, () => logServerListeningBanner(port));
      }, PORT_RELEASE_RETRY_DELAY_MS);
    } catch (releaseErr) {
      console.error(`❌ Không thể tự động giải phóng cổng ${port}:`, releaseErr);
      process.exit(1);
    }
  });
}
