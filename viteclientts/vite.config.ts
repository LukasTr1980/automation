import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    host: '192.168.1.185',
    proxy: {
      '/api': {
        target: 'http://192.168.1.185:8523',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    assetsInlineLimit: 0
  },
})
