import { Router } from 'express';
import { authenticate, type AuthenticatedRequest } from '../auth/auth.middleware';
import { MetricsService } from './metrics.service';

export const metricsRouter = Router();

// Overview metrics for organization dashboard
metricsRouter.get('/overview', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const metrics = await MetricsService.getOverviewMetrics(req.organizationId!, hours);
    return res.status(200).json({ success: true, data: metrics });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Single service reliability metrics and latency trend points
metricsRouter.get('/services/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const metrics = await MetricsService.getServiceMetrics(req.params.id, req.organizationId!, limit);
    return res.status(200).json({ success: true, data: metrics });
  } catch (err: any) {
    return res.status(404).json({ success: false, error: { message: err.message } });
  }
});
