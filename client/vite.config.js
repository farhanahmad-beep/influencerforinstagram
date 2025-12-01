import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0", // Accept connections from network
    port: 4323,
    strictPort: true,
    allowedHosts: ["6929a3b2a8441ee7d05f75ae.icod.ai"], // restrict allowed hosts
    watch:{
        usePolling: true,
        interval: 10
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'utils-vendor': ['axios', 'react-hot-toast']
        }
      }
    },
    chunkSizeWarningLimit: 2500
  }
});
