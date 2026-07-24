import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/audit': 'http://localhost:8001',
      '/history': 'http://localhost:8001',
      '/comments': 'http://localhost:8001',
    },
  },
})
