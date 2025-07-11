// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: './client',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, './client/src'),
    },
  },
  build: {
    outDir: '../dist/public',
    rollupOptions: {
      external: ['react-router-dom'], // Re-added 'react-router-dom' to external
    },
  },
});