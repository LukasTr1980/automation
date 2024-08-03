import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest: {
        "short_name": "Automation",
        "name": "Automation",
        "icons": [
          {
            "src": "favicon.ico",
            "sizes": "48x48 32x32",
            "type": "image/x-icon"
          },
          {
            "src": "android-chrome-192x192.webp",
            "type": "image/webp",
            "sizes": "192x192",
          },
          {
            "src": "android-chrome-512x512.webp",
            "type": "image/webp",
            "sizes": "512x512",
            "purpose": "maskable"
          },
          {
            "src": "apple-touch-icon.webp",
            "type": "image/webp",
            "sizes": "180x180"
          },
          {
            "src": "favicon-32x32.webp",
            "type": "image/webp",
            "sizes": "32x32"
          },
          {
            "src": "favicon-16x16.webp",
            "type": "image/webp",
            "sizes": "16x16"
          },
          {
            "src": "mstile-150x150.webp",
            "type": "image/webp",
            "sizes": "150x150"
          },
          {
            "src": "logo-512x512.png",
            "type": "image/png",
            "sizes": "512x512",
            "purpose": "maskable"
          }
        ],
        "start_url": "/",
        "display": "standalone",
        "theme_color": "#2596b6",
        "background_color": "#ffffff"
      }
    })
  ],
  server: {
    host: '192.168.1.185',
    cors: {
      origin: ['http://192.168.1.185:5173', 'http://localhost:5173', 'https://automation.charts.cx', 'http://localhost:8523', 'https://charts.cx'],
      allowedHeaders: 'Content-Type,Authorization',
      credentials: true
    }
  },
  build: {
    assetsInlineLimit: 0
  },
})
