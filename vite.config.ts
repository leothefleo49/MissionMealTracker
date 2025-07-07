import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Group major vendor libraries into their own chunks
            if (id.includes('react-dom')) {
              return 'vendor-react-dom';
            }
            if (id.includes('recharts')) {
                return 'vendor-recharts';
            }
            if (id.includes('@radix-ui')) {
                return 'vendor-radix';
            }
            if (id.includes('lucide-react')) {
                return 'vendor-lucide';
            }
            // Group other node_modules into a single vendor chunk
            return 'vendor';
          }
        },
      },
    },
  },
});