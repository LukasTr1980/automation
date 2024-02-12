import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    cors: {
      origin: ['http://localhost:5173', 'https://automation.charts.cx', 'http://localhost:8523', 'https://charts.cx', 'http://192.168.1.83'],
      allowedHeaders: 'Content-Type,Authorization',
      credentials: true
    }
  }
})
