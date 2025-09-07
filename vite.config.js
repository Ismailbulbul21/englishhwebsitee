import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Ensure PWA files are copied to dist
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'manifest.json') {
            return 'manifest.json';
          }
          if (assetInfo.name === 'sw.js') {
            return 'sw.js';
          }
          if (assetInfo.name && assetInfo.name.includes('favicon')) {
            return assetInfo.name;
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    }
  },
  // Ensure PWA files are served correctly
  server: {
    headers: {
      'Service-Worker-Allowed': '/'
    }
  }
})
