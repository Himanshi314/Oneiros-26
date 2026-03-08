import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Added for Oneiros styling
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteCompression(),
  ],
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Keep React separate for better caching
          vendor: ['react', 'react-dom'],
          // Three.js in its own chunk since it's large
          three: ['three'],
          // Motion in its own chunk
          motion: ['motion'],
        },
      },
    },
  },
})
