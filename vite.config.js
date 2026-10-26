import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Lets ngrok tunnels reach the dev server (free URLs change on every restart).
  server: { allowedHosts: ['.ngrok-free.app'] },
})
