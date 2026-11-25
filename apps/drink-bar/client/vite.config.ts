import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { DRINK_BAR_PORTS } from '../shared/config';

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
    },
    '/api': {
      target: backendTarget,
      changeOrigin: true,
    },
  };

  return {
    plugins: [react(), tailwindcss()],
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
    },
    preview: {
      port: DRINK_BAR_PORTS.CLIENT,
      host: true,
      allowedHosts: true,
      proxy,
    },
  };
});
