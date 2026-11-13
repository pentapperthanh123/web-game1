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
    worker: {
      format: 'es',
    },
    build: {
      // Raise warning threshold — three.js is inherently large
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: (id: string) => {
            // Only split third-party code; app source stays in the default chunks
            if (!id.includes('node_modules')) {
              return undefined;
            }
            // Three.js ecosystem — largest chunk, rarely changes
            if (id.includes('node_modules/three') || id.includes('@react-three')) {
              return 'vendor-three';
            }
            // i18n (checked before React so react-i18next is not swallowed)
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-i18n';
            }
            // React core + DOM
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'vendor-react';
            }
            // Socket.io client
            if (id.includes('socket.io-client') || id.includes('engine.io-client')) {
              return 'vendor-socket';
            }
            // Audio (Howler)
            if (id.includes('howler')) {
              return 'vendor-audio';
            }
            // Other node_modules -> vendor-misc
            return 'vendor-misc';
          },
        },
      },
    },
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
