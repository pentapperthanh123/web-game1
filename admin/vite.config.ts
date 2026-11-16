import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isPublicDisabled =
    process.env.PUBLIC_NETWORK === 'false' ||
    process.env.VITE_PUBLIC_NETWORK === 'false' ||
    env.PUBLIC_NETWORK === 'false' ||
    env.VITE_PUBLIC_NETWORK === 'false';

  const backendTarget =
    process.env.VITE_SERVER_URL ||
    env.VITE_SERVER_URL ||
    'http://127.0.0.1:4000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 8001,
      host: !isPublicDisabled,
      allowedHosts: true,
      proxy: {
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
          timeout: 60000,
        },
        '/api': {
          target: backendTarget,
          changeOrigin: true,
          timeout: 60000,
          proxyTimeout: 60000,
          configure: (proxy) => {
            proxy.on('error', (err, _req, res) => {
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'PROXY_ERROR', message: err.message }));
              }
            });
          },
        },
      },
    },
  };
});

