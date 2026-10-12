import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    host: '0.0.0.0',
    // The Arena preview uses a proxied host. Vite should accept it in development.
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@supabase') || id.includes('node_modules/@realtime') || id.includes('node_modules/@gotrue')) return 'supabase'
          if (id.includes('node_modules/react') || id.includes('node_modules/@remix-run')) return 'react-vendor'
          if (id.includes('node_modules/@radix-ui')) return 'ui-vendor'
          return undefined
        },
      },
    },
  },
})
