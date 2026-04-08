import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  server: {
    host: true,
    port: 5173,

    // 🔥 ここが重要
    allowedHosts: [
      'localhost',
      '127.0.0.1',

      // Cloudflare Tunnel用（今出ているURL）
      'wildlife-pts-initiative-burn.trycloudflare.com'
    ]
  }
})