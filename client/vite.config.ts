// client/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM for absolute path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vite's root is now implicitly the directory where this config file resides (i.e., './client')
  // So, Vite will automatically find 'index.html' here.
  build: {
    // Output should go one level up from 'client' into the 'dist' folder.
    // This makes 'dist' appear at the main project's root.
    outDir: path.resolve(__dirname, "../dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // Alias for client-side imports, relative to the 'client/src' directory.
      // Since __dirname is 'client', path.resolve(__dirname, './src') becomes 'client/src'.
      "@": path.resolve(__dirname, "./src"),
    },
  },
});