import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { DRINK_BAR_PORTS } from '../shared/config';
import { drinkBarGoogleTtsPlugin } from '../shared/viteTtsPlugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget =
    process.env.VITE_SERVER_URL ||
    env.VITE_SERVER_URL ||
    `http://127.0.0.1:${DRINK_BAR_PORTS.SERVER}`;

  const proxy = {
    '/socket.io': {
      target: backendTarget,
      ws: true,
      changeOrigin: true,
      proxyTimeout: 1500,
      timeout: 1500,
    },
    '/api': {
      target: backendTarget,
      changeOrigin: true,
      proxyTimeout: 1500,
      timeout: 1500,
    },
  };

  return {
    plugins: [react(), tailwindcss(), drinkBarGoogleTtsPlugin()],
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },
    server: {
      port: DRINK_BAR_PORTS.CLIENT,
      host: true,
      allowedHosts: true,
      proxy,
      watch: {
        ignored: ['**/dist/**', '**/node_modules/**'],
      },
    },
    preview: {
      port: DRINK_BAR_PORTS.CLIENT,
      host: true,
      allowedHosts: true,
      proxy,
    },
  };
});
