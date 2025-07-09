import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // FIX: Explicitly set the root to the client directory
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    // Output should still go into 'dist' at the project root level
    // This path is relative to the 'root' setting now.
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // Alias needs to be adjusted because root is now 'client'
      // If client/src, then @ should resolve to src within the client root
      "@": path.resolve(import.meta.dirname, "client/src"), // Adjusted based on new root
    },
  },
});