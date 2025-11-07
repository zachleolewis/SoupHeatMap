import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  clearScreen: false,
  // Define Tauri environment variables
  define: {
    // Tauri environment variables
    'import.meta.env.TAURI_PLATFORM': JSON.stringify(process.env.TAURI_PLATFORM || ''),
    'import.meta.env.TAURI_ARCH': JSON.stringify(process.env.TAURI_ARCH || ''),
    'import.meta.env.TAURI_FAMILY': JSON.stringify(process.env.TAURI_FAMILY || ''),
  },
  // Exclude Tauri APIs from bundling during development
  optimizeDeps: {
    exclude: ['@tauri-apps/api'],
  },
  build: {
    // Tauri APIs should be bundled in production
    rollupOptions: {
      // Remove the external configuration for Tauri APIs
    },
  },
})
