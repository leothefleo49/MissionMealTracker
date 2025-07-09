// server/vite.ts
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config"; // This import path will need to change
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  // FIX: Adjust path to vite.config.ts since it moved
  const viteConfigPath = path.resolve(import.meta.dirname, "../client/vite.config.ts");
  const vite = await createViteServer({
    configFile: viteConfigPath, // Use the adjusted path
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    // Only serve index.html for non-API routes
    if (url.startsWith("/api")) {
      return next(); // Skip to next middleware (API routes)
    }

    try {
      // FIX: Adjust path to index.html since vite.config.ts moved
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../client", // Go up to project root, then down to client
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // This path should still be correct: from project root (process.cwd()) to 'dist'
  const publicAssetsPath = path.resolve(process.cwd(), "dist");

  if (!fs.existsSync(publicAssetsPath)) {
    throw new Error(
      `Could not find the build directory: ${publicAssetsPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(publicAssetsPath));

  app.use("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.resolve(publicAssetsPath, "index.html"));
  });
}