import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from 'url'; // Import fileURLToPath

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the absolute path to the project root (where vite.config.ts is)
const projectRoot = path.resolve(__dirname);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Set Vite's root to the 'client' directory, where index.html is located
  root: path.resolve(projectRoot, "client"),
  build: {
    // Output should go into the 'dist' folder at the main project's root.
    // This needs to be an absolute path relative to where Node.js process starts,
    // or relative to the project root.
    outDir: path.resolve(projectRoot, "dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // Alias for client-side imports, relative to the 'client' root
      "@": path.resolve(projectRoot, "client/src"),
    },
  },
});