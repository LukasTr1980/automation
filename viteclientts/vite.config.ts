import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    cors: {
      origin: ['http://localhost:5173', 'https://automation.charts.cx', 'http://localhost:8523'],
      allowedHeaders: 'Content-Type,Authorization',
      credentials: true
    }
  }
})
