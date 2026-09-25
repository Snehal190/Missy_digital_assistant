import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // bind 0.0.0.0 so a phone on the same Wi-Fi can reach it
    allowedHosts: true, // also allow a cloudflared/tunnel hostname to reach it
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
