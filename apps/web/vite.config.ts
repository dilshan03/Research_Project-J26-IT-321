import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const decisionApiTarget = process.env.DECISION_API_URL || 'http://localhost:5002'
const authApiTarget = process.env.AUTH_API_URL || 'http://localhost:5000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    proxy: {
      '/api/telemetry': {
        target: decisionApiTarget,
        changeOrigin: true,
      },
      '/api': {
        target: authApiTarget,
        changeOrigin: true,
      },
    },
  },
})
