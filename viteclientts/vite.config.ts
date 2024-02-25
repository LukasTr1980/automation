import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA()
  ],
  server: {
    cors: {
      origin: ['http://localhost:5173', 'https://automation.charts.cx', 'http://localhost:8523', 'https://charts.cx'],
      allowedHeaders: 'Content-Type,Authorization',
      credentials: true
    }
  }
})
