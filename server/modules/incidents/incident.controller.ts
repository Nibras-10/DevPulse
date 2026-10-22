import { Router } from 'express';
import { z } from 'zod';
import { authenticate, type AuthenticatedRequest } from '../auth/auth.middleware';
import { IncidentService } from './incident.service';
import { db } from '../../db/database';

export const incidentRouter = Router();

const createManualIncidentSchema = z.object({
  serviceId: z.string().uuid(),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  severity: z.enum(['SEV1_CRITICAL', 'SEV2_MAJOR', 'SEV3_MINOR', 'SEV4_LOW']),
});

const transitionStatusSchema = z.object({
  status: z.enum(['INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED']),
  note: z.string().optional(),
});

const assignSchema = z.object({
  userId: z.string().uuid(),
});

const addNoteSchema = z.object({
  message: z.string().min(2, 'Note cannot be empty'),
});

// List incidents
incidentRouter.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const status = req.query.status as string | undefined;
    const incidents = await db.listIncidents(req.organizationId!, status);

    // Enrich with service name and assigned user
    const enriched = await Promise.all(
      incidents.map(async (inc) => {
        const service = await db.findServiceById(inc.serviceId, req.organizationId!);
        const user = inc.assignedToUserId ? await db.findUserById(inc.assignedToUserId) : null;
        return {
          ...inc,
          serviceName: service?.name || 'Unknown Service',
          assignedUser: user ? { id: user.id, name: user.name, email: user.email } : null,
        };
      })
    );

    return res.status(200).json({ success: true, data: enriched });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Create manual incident
incidentRouter.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const data = createManualIncidentSchema.parse(req.body);
    const incident = await IncidentService.createManualIncident({
      organizationId: req.organizationId!,
      serviceId: data.serviceId,
      title: data.title,
      description: data.description,
      severity: data.severity,
      userId: req.user!.id,
    });

    await db.logAudit({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'INCIDENT_CREATED_MANUAL',
      targetType: 'Incident',
      targetId: incident.id,
      details: { title: incident.title, severity: incident.severity },
      ipAddress: req.ip,
    });

    return res.status(201).json({ success: true, data: incident });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Get single incident with full timeline
incidentRouter.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const incident = await db.findIncidentById(req.params.id, req.organizationId!);
    if (!incident) {
      return res.status(404).json({ success: false, error: { message: 'Incident not found' } });
    }

    const service = await db.findServiceById(incident.serviceId, req.organizationId!);
    const assignedUser = incident.assignedToUserId ? await db.findUserById(incident.assignedToUserId) : null;
    const timeline = await db.listIncidentEvents(incident.id);

    return res.status(200).json({
      success: true,
      data: {
        incident,
        service,
        assignedUser: assignedUser ? { id: assignedUser.id, name: assignedUser.name, email: assignedUser.email } : null,
        timeline,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Acknowledge incident
incidentRouter.post('/:id/acknowledge', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const updated = await IncidentService.acknowledgeIncident(req.params.id, req.organizationId!, req.user!.id);
    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Assign incident
incidentRouter.post('/:id/assign', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const data = assignSchema.parse(req.body);
    const updated = await IncidentService.assignIncident(
      req.params.id,
      req.organizationId!,
      data.userId,
      req.user!.id
    );
    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Transition incident status
incidentRouter.post('/:id/status', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const data = transitionStatusSchema.parse(req.body);
    const updated = await IncidentService.transitionStatus(
      req.params.id,
      req.organizationId!,
      data.status,
      req.user!.id,
      data.note
    );

    await db.logAudit({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'INCIDENT_STATUS_CHANGED',
      targetType: 'Incident',
      targetId: updated.id,
      details: { fromStatus: updated.status, toStatus: data.status },
      ipAddress: req.ip,
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// Add investigation note
incidentRouter.post('/:id/notes', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const data = addNoteSchema.parse(req.body);
    const event = await IncidentService.addNote(req.params.id, req.organizationId!, req.user!.id, data.message);
    return res.status(201).json({ success: true, data: event });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});
