import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path';
import { fileURLToPath } from 'url'; // Import fileURLToPath from the 'url' module

// Get the directory name in an ESM-compatible way
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Specify the root directory of your client-side application
  root: './client',
  build: {
    // Output directory for the production build, relative to the new root
    outDir: '../dist/public',
    emptyOutDir: true, // Clear the output directory before building
  },
  resolve: {
    alias: {
      // Explicitly configure the alias for "@/" to point to "./client/src"
      // This now uses the ESM-compatible __dirname
      '@': path.resolve(__dirname, './client/src'),
    },
  },
})