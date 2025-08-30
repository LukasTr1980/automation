import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devHost = env.VITE_DEV_HOST; // e.g. '0.0.0.0' to expose on LAN, or '127.0.0.1'
  const backendOrigin = env.VITE_BACKEND_ORIGIN || 'http://127.0.0.1:8523';

  return {
    plugins: [react()],
    server: {
      host: devHost || true, // true exposes to network; use VITE_DEV_HOST to pin
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    build: {
      assetsInlineLimit: 0,
    },
  };
});
