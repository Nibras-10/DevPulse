import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthenticatedRequest } from '../auth/auth.middleware';
import { db } from '../../db/database';
import { notificationQueue } from './queue';

export const notificationRouter = Router();

const createChannelSchema = z.object({
  name: z.string().min(2, 'Channel name is required'),
  type: z.enum(['EMAIL', 'WEBHOOK', 'SLACK']),
  destination: z.string().min(3, 'Destination address/URL is required'),
});

notificationRouter.get('/channels', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const channels = await db.listNotificationChannels(req.organizationId!);
    return res.status(200).json({ success: true, data: channels });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

notificationRouter.post('/channels', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const data = createChannelSchema.parse(req.body);
    const channel = await db.createNotificationChannel({
      organizationId: req.organizationId!,
      name: data.name,
      type: data.type,
      destination: data.destination,
      isEnabled: true,
    });

    await db.logAudit({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'NOTIFICATION_CHANNEL_CREATED',
      targetType: 'NotificationChannel',
      targetId: channel.id,
      details: { name: channel.name, type: channel.type },
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: channel });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

notificationRouter.patch('/channels/:id', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const channel = await db.findNotificationChannelById(req.params.id, req.organizationId!);
    if (!channel) {
      return res.status(404).json({ success: false, error: { message: 'Channel not found' } });
    }

    const updated = await db.updateNotificationChannel(req.params.id, req.organizationId!, req.body);
    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

notificationRouter.delete('/channels/:id', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    await db.deleteNotificationChannel(req.params.id, req.organizationId!);
    return res.status(200).json({ success: true, message: 'Channel deleted' });
  } catch (err: any) {
    return res.status(404).json({ success: false, error: { message: err.message } });
  }
});

notificationRouter.get('/deliveries', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const deliveries = await db.listNotificationDeliveries(req.organizationId!);
    return res.status(200).json({ success: true, data: deliveries });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

notificationRouter.get('/queue/status', authenticate, (req: AuthenticatedRequest, res) => {
  const jobs = notificationQueue.getJobs().filter((j) => j.organizationId === req.organizationId);
  return res.status(200).json({
    success: true,
    data: {
      totalJobs: jobs.length,
      pending: jobs.filter((j) => j.status === 'PENDING').length,
      processing: jobs.filter((j) => j.status === 'PROCESSING').length,
      completed: jobs.filter((j) => j.status === 'COMPLETED').length,
      failed: jobs.filter((j) => j.status === 'FAILED').length,
      jobs,
    },
  });
});

notificationRouter.post('/queue/retry/:jobId', authenticate, (req: AuthenticatedRequest, res) => {
  const success = notificationQueue.retryJob(req.params.jobId);
  if (!success) {
    return res.status(404).json({ success: false, error: { message: 'Job not found in queue' } });
  }
  return res.status(200).json({ success: true, message: 'Job queued for retry' });
});
