import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthenticatedRequest } from '../auth/auth.middleware';
import { db } from '../../db/database';
import { MonitoringService } from '../monitoring/monitoring.service';
import { validateSafeUrl } from '../monitoring/ssrf.guard';

export const serviceRouter = Router();

const createServiceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  healthCheckUrl: z.string().url('Must be a valid URL'),
  httpMethod: z.enum(['GET', 'POST', 'HEAD']).default('GET'),
  checkIntervalSec: z.number().int().min(10, 'Minimum interval is 10s').max(3600).default(60),
  timeoutMs: z.number().int().min(500, 'Minimum timeout is 500ms').max(30000).default(5000),
  expectedStatusCode: z.number().int().min(100).max(599).default(200),
  failureThreshold: z.number().int().min(1).max(10).default(3),
});

const updateServiceSchema = createServiceSchema.partial().extend({
  isPaused: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// List services
serviceRouter.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const services = await db.listServices(req.organizationId!);
    return res.status(200).json({ success: true, data: services });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Create service
serviceRouter.post('/', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const data = createServiceSchema.parse(req.body);

    const safeUrlCheck = validateSafeUrl(data.healthCheckUrl);
    if (!safeUrlCheck.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SSRF_BLOCKED',
          message: safeUrlCheck.reason,
        },
      });
    }

    const service = await db.createService({
      organizationId: req.organizationId!,
      name: data.name,
      description: data.description,
      healthCheckUrl: data.healthCheckUrl,
      httpMethod: data.httpMethod,
      checkIntervalSec: data.checkIntervalSec,
      timeoutMs: data.timeoutMs,
      expectedStatusCode: data.expectedStatusCode,
      failureThreshold: data.failureThreshold,
      status: 'OPERATIONAL',
      isActive: true,
      isPaused: false,
    });

    await db.logAudit({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'SERVICE_CREATED',
      targetType: 'Service',
      targetId: service.id,
      details: { name: service.name, url: service.healthCheckUrl },
      ipAddress: req.ip,
    });

    // Optionally trigger initial check immediately
    try {
      await MonitoringService.checkService(service);
    } catch {
      // initial check error logged internally
    }

    const refreshed = await db.findServiceById(service.id, req.organizationId!);
    return res.status(201).json({ success: true, data: refreshed || service });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: { message: err.message, details: err.errors },
    });
  }
});

// Get single service
serviceRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const service = await db.findServiceById(req.params.id, req.organizationId!);
    if (!service) {
      return res.status(404).json({ success: false, error: { message: 'Service not found or unauthorized' } });
    }

    const checks = await db.listMonitoringChecks(service.id, req.organizationId!, 50);
    const openIncident = await db.findOpenIncidentForService(service.id);

    return res.status(200).json({
      success: true,
      data: {
        service,
        recentChecks: checks,
        activeIncident: openIncident,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Update service
serviceRouter.patch('/:id', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const data = updateServiceSchema.parse(req.body);

    if (data.healthCheckUrl) {
      const safeUrlCheck = validateSafeUrl(data.healthCheckUrl);
      if (!safeUrlCheck.valid) {
        return res.status(400).json({
          success: false,
          error: { code: 'SSRF_BLOCKED', message: safeUrlCheck.reason },
        });
      }
    }

    const updated = await db.updateService(req.params.id, req.organizationId!, data);

    await db.logAudit({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'SERVICE_UPDATED',
      targetType: 'Service',
      targetId: updated.id,
      details: data,
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Delete service
serviceRouter.delete('/:id', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    await db.deleteService(req.params.id, req.organizationId!);

    await db.logAudit({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'SERVICE_DELETED',
      targetType: 'Service',
      targetId: req.params.id,
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, message: 'Service deleted successfully' });
  } catch (err: any) {
    return res.status(404).json({ success: false, error: { message: err.message } });
  }
});

// Trigger immediate manual check
serviceRouter.post('/:id/check', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await MonitoringService.runManualCheck(req.params.id, req.organizationId!);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// List service check history
serviceRouter.get('/:id/checks', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const checks = await db.listMonitoringChecks(req.params.id, req.organizationId!, limit);
    return res.status(200).json({ success: true, data: checks });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});
