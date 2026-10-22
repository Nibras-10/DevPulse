import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { env } from './server/config/env';
import { seedDatabase } from './server/db/seed';
import { monitoringScheduler } from './server/modules/monitoring/scheduler';
import { notificationQueue } from './server/modules/notifications/queue';
import { authRouter } from './server/modules/auth/auth.controller';
import { orgRouter } from './server/modules/organizations/org.controller';
import { serviceRouter } from './server/modules/services/service.controller';
import { incidentRouter } from './server/modules/incidents/incident.controller';
import { notificationRouter } from './server/modules/notifications/notification.controller';
import { webhookRouter } from './server/modules/webhooks/github.controller';
import { metricsRouter } from './server/modules/metrics/metrics.controller';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || env.PORT || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Seed sample data
  await seedDatabase();

  // Middleware
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());

  // Store raw body buffer on request for HMAC signature verification
  app.use(
    express.json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true }));

  // Health and readiness check
  app.get('/api/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'devpulse-api',
      version: '1.0.0',
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // REST API v1 routes
  const v1 = express.Router();
  v1.use('/auth', authRouter);
  v1.use('/organizations', orgRouter);
  v1.use('/services', serviceRouter);
  v1.use('/incidents', incidentRouter);
  v1.use('/notifications', notificationRouter);
  v1.use('/webhooks', webhookRouter);
  v1.use('/metrics', metricsRouter);

  app.use('/api/v1', v1);

  // Centralized Error Handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[API Error]', err);
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: isProd ? 'An unexpected internal error occurred' : err.message || 'Internal Server Error',
      },
    });
  });

  // Frontend integration: Vite middleware in dev, static files in production
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[DevPulse] Vite development middlewares attached.');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start background monitoring scheduler
  monitoringScheduler.start(10000); // Polls every 10 seconds for due health checks

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DevPulse] Server running on http://0.0.0.0:${PORT} (environment: ${process.env.NODE_ENV || 'development'})`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('[DevPulse] Shutting down gracefully...');
    monitoringScheduler.stop();
    notificationQueue.stop();
    server.close(() => {
      console.log('[DevPulse] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('[DevPulse] Fatal server startup failure:', err);
  process.exit(1);
});
