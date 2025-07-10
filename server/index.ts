// server/index.ts
import express from 'express';
import { registerRoutes } from './routes';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function startServer() {
  const app = express();
  const port = process.env.PORT || 5000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Trust the first proxy in front of the app (e.g., Render's load balancer)
  // This is crucial for correctly handling secure cookies and recognizing HTTPS connections
  app.set('trust proxy', 1); // Add this line

  // Register all API routes and authentication
  const httpServer = await registerRoutes(app);

  // Serve static files from the client's build directory in production
  if (process.env.NODE_ENV === 'production') {
    const clientBuildPath = path.join(__dirname, 'public');
    app.use(express.static(clientBuildPath));

    // For any other GET request, serve the index.html from the client build
    // This allows client-side routing to work
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  }

  httpServer.listen(port, () => {
    console.log(`5:${new Date().getMinutes()}:${new Date().getSeconds()} [express] serving on port ${port}`);
  });
}

startServer().catch(error => {
  console.error("Failed to start server:", error);
  process.exit(1);
});