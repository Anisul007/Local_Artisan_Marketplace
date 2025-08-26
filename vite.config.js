import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,          // always try port 5173
    strictPort: true,    // fail instead of switching to another port
    proxy: {
      '/api': 'http://localhost:4000',  // backend API
    }
  }
})

