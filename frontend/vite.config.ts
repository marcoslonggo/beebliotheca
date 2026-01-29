import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  plugins: [react(), mkcert()],
  server: {
    host: '0.0.0.0', // Allow access from network
    port: 5173,
    https: true, // Enable HTTPS
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true,
        secure: false
      },
      "/covers": {
        target: "http://localhost:8001",
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split React and related libraries
          'react-vendor': [
            'react',
            'react-dom',
            'react-router-dom'
          ],
          // Split data handling libraries
          'data-libs': [
            '@tanstack/react-query',
            'axios'
          ],
          // Split Lucide icons
          'icons': [
            'lucide-react'
          ],
          // Split barcode scanner (loaded on demand)
          'barcode-scanner': [
            'barcode-detector'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 600
  }
});
