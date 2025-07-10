import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in an ESM-compatible way
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Keep 'root' here for local dev environment and general Vite config
  // However, for Render, 'build.rollupOptions.input' will take precedence
  root: './client',
  build: {
    // Output directory for the production build, relative to the project root
    outDir: '../dist/public',
    emptyOutDir: true, // Clear the output directory before building
    rollupOptions: { // Add this block
      input: path.resolve(__dirname, './client/index.html'), // Explicitly define the entry HTML file for Rollup
    }
  },
  resolve: {
    alias: {
      // Explicitly configure the alias for "@/" to point to "./client/src"
      '@': path.resolve(__dirname, './client/src'),
    },
  },
})