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
    'http://localhost:4000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 8000,
      host: !isPublicDisabled,
      allowedHosts: true,
      proxy: {
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
        },
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  };
});

