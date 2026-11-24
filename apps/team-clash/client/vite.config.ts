import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const CLIENT_PORT = 8030;
/** Game server (socket.io live events + /api); override with VITE_SERVER_URL. */
const DEFAULT_GAME_SERVER_URL = 'http://127.0.0.1:4000';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gameServerTarget = process.env.VITE_SERVER_URL || env.VITE_SERVER_URL || DEFAULT_GAME_SERVER_URL;

  // The stage connects to its own origin; Vite forwards socket.io and /api to the game server.
  // Works the same on localhost, LAN IP and an ngrok tunnel (only port 8030 is exposed).
  const proxy: Record<string, ProxyOptions> = {
    '/socket.io': {
      target: gameServerTarget,
      ws: true,
      changeOrigin: true,
      configure: (proxyReq) => {
        proxyReq.on('error', (err) => {
          // Gracefully suppress noisy ECONNREFUSED stack while game server is booting up
          const code = (err as NodeJS.ErrnoException).code;
          if (code === 'ECONNREFUSED' || code === 'ECONNRESET') {
            return;
          }
          console.warn('[vite] ws proxy:', err.message);
        });
      },
    },
    '/api': {
      target: gameServerTarget,
      changeOrigin: true,
      configure: (proxyReq) => {
        proxyReq.on('error', (err, _req, res) => {
          const code = (err as NodeJS.ErrnoException).code;
          if (code === 'ECONNREFUSED') {
            if (res && 'writeHead' in res && !res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'GAME_SERVER_STARTING' }));
            }
            return;
          }
          console.warn('[vite] api proxy:', err.message);
        });
      },
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: CLIENT_PORT,
      host: true,
      // Accept ngrok / LAN host headers (Vite blocks unknown hosts by default).
      allowedHosts: true,
      proxy,
    },
    preview: {
      port: CLIENT_PORT,
      host: true,
      allowedHosts: true,
      proxy,
    },
  };
});
