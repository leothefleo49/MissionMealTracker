// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path'; // Import path module

export default defineConfig({
  root: 'client', // Specifies that the client-side application root is the 'client' directory
  plugins: [
    react(),
    nodePolyfills({
      exclude: ['fs'],
      globals: {
        Buffer: true,
        process: true,
      },
      protocolGlobals: true,
    }),
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    outDir: '../dist/public',
    emptyOutDir: true,
  },
  resolve: { // NEW: Add resolve configuration for path aliases
    alias: {
      "@": path.resolve(__dirname, "./client/src"), // Maps @/ to the client's source directory from project root
      "@shared": path.resolve(__dirname, "./shared"), // Maps @shared/ to the shared directory from project root
    },
  },
  optimizeDeps: {
    exclude: ['@hono/node-server'],
  },
});