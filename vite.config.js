import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: "public",
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    open: true,
    proxy: {
      // In dev, send /api to the backend so login/auth works without VITE_API_URL
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      // Backend serves uploads at /Public and /uploads – proxy so product/vendor images load
      '/Public': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
})
