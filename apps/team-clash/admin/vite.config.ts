import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { ServerResponse } from 'node:http';
import { CLASH_NGROK, CLASH_PORTS } from '../shared/constants/clashConfig';

/** Game server (/api: TikTok connect, pipeline stats); override with VITE_SERVER_URL. */
const DEFAULT_GAME_SERVER_URL = `http://127.0.0.1:${CLASH_PORTS.GAME_SERVER}`;

interface NgrokTunnel {
  name?: string;
  public_url?: string;
}

export interface ClashPublicUrls {
  clientUrl: string | null;
  adminUrl: string | null;
}

/** Public URLs of the Team Clash tunnels from the local ngrok agent (nulls when ngrok is off). */
async function readNgrokPublicUrls(): Promise<ClashPublicUrls> {
  try {
    const response = await fetch(CLASH_NGROK.AGENT_API_URL, {
      signal: AbortSignal.timeout(CLASH_NGROK.AGENT_TIMEOUT_MS),
    });
    if (!response.ok) return { clientUrl: null, adminUrl: null };
    const data = (await response.json()) as { tunnels?: NgrokTunnel[] };
    const tunnels = data.tunnels ?? [];
    const findUrl = (name: string): string | null => {
      const matches = tunnels.filter((tunnel) => tunnel.name === name && tunnel.public_url);
      const https = matches.find((tunnel) => tunnel.public_url?.startsWith('https://'));
      return (https ?? matches[0])?.public_url ?? null;
    };
    return {
      clientUrl: findUrl(CLASH_NGROK.CLIENT_TUNNEL),
      adminUrl: findUrl(CLASH_NGROK.ADMIN_TUNNEL),
    };
  } catch {
    return { clientUrl: null, adminUrl: null };
  }
}

async function sendPublicUrls(res: ServerResponse): Promise<void> {
  const urls = await readNgrokPublicUrls();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(urls));
}

/** Serves CLASH_NGROK.PUBLIC_URLS_PATH from the admin's own origin (works through the tunnel). */
function clashPublicUrlsPlugin(): Plugin {
  return {
    name: 'clash-ngrok-public-urls',
    configureServer(server) {
      server.middlewares.use(CLASH_NGROK.PUBLIC_URLS_PATH, (_req, res) => {
        void sendPublicUrls(res);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(CLASH_NGROK.PUBLIC_URLS_PATH, (_req, res) => {
        void sendPublicUrls(res);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gameServerTarget = process.env.VITE_SERVER_URL || env.VITE_SERVER_URL || DEFAULT_GAME_SERVER_URL;

  // The admin calls /api on its own origin; Vite forwards it to the game server, so the
  // TikTok connect panel also works from a LAN IP or the ngrok tunnel.
  const proxy: Record<string, ProxyOptions> = {
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
          console.warn('[vite] admin api proxy:', err.message);
        });
      },
    },
  };

  return {
    plugins: [react(), tailwindcss(), clashPublicUrlsPlugin()],
    server: {
      port: CLASH_PORTS.ADMIN,
      host: true,
      // Accept ngrok / LAN host headers (Vite blocks unknown hosts by default).
      allowedHosts: true,
      proxy,
    },
    preview: {
      port: CLASH_PORTS.ADMIN,
      host: true,
      allowedHosts: true,
      proxy,
    },
  };
});
