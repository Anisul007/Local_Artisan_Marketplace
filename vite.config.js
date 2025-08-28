import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false, // ✅ fallback if 5173 is taken
    host: true,
    open: true
  }
})
