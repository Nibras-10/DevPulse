import { db } from '../../db/database';
import { validateStatusTransition } from './incident.state-machine';
import { notificationQueue } from '../notifications/queue';
import type { Incident, IncidentSeverity, IncidentStatus, Service, MonitoringCheckResult } from '../../db/types';

export class IncidentService {
  public static async handleServiceFailure(service: Service, checkResult: MonitoringCheckResult): Promise<Incident | null> {
    // 1. Check if an active (unresolved) incident already exists for this service
    const existing = await db.findOpenIncidentForService(service.id);

    if (existing) {
      // Deduplicate: append alert event rather than creating duplicate open incident
      await db.createIncidentEvent({
        incidentId: existing.id,
        eventType: 'ALERT',
        message: `Persistent failure detected: HTTP ${checkResult.statusCode || 0} (${checkResult.errorMessage || 'Unknown error'})`,
        metadata: {
          statusCode: checkResult.statusCode,
          responseTimeMs: checkResult.responseTimeMs,
          timestamp: checkResult.timestamp,
        },
      });
      return existing;
    }

    // 2. Create new incident
    const severity: IncidentSeverity = service.status === 'DOWN' ? 'SEV1_CRITICAL' : 'SEV2_MAJOR';
    const title = `Service Outage: ${service.name} is ${service.status}`;
    const description = `Automated incident declared after ${service.consecutiveFailures} consecutive health check failures. Last error: ${
      checkResult.errorMessage || `HTTP ${checkResult.statusCode}`
    }`;

    const incident = await db.createIncident({
      organizationId: service.organizationId,
      serviceId: service.id,
      title,
      description,
      severity,
      status: 'INVESTIGATING',
      isAutoCreated: true,
    });

    await db.createIncidentEvent({
      incidentId: incident.id,
      eventType: 'CREATED',
      message: `Incident opened automatically following ${service.consecutiveFailures} failed health checks.`,
      metadata: {
        statusCode: checkResult.statusCode,
        responseTimeMs: checkResult.responseTimeMs,
        failureThreshold: service.failureThreshold,
      },
    });

    // Enqueue alerts to all active notification channels for this organization
    const channels = await db.listNotificationChannels(service.organizationId);
    for (const channel of channels.filter((c) => c.isEnabled)) {
      notificationQueue.enqueueAlert({
        incident,
        channel,
        serviceName: service.name,
      });
    }

    return incident;
  }

  public static async createManualIncident(data: {
    organizationId: string;
    serviceId: string;
    title: string;
    description: string;
    severity: IncidentSeverity;
    userId?: string;
  }): Promise<Incident> {
    const service = await db.findServiceById(data.serviceId, data.organizationId);
    if (!service) {
      throw new Error('Service not found or unauthorized');
    }

    const incident = await db.createIncident({
      organizationId: data.organizationId,
      serviceId: data.serviceId,
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: 'INVESTIGATING',
      assignedToUserId: data.userId,
      isAutoCreated: false,
    });

    await db.createIncidentEvent({
      incidentId: incident.id,
      userId: data.userId,
      eventType: 'CREATED',
      message: 'Incident manually declared by team member.',
    });

    // Alert channels
    const channels = await db.listNotificationChannels(data.organizationId);
    for (const channel of channels.filter((c) => c.isEnabled)) {
      notificationQueue.enqueueAlert({
        incident,
        channel,
        serviceName: service.name,
      });
    }

    return incident;
  }

  public static async transitionStatus(
    incidentId: string,
    organizationId: string,
    newStatus: IncidentStatus,
    userId?: string,
    note?: string
  ): Promise<Incident> {
    const incident = await db.findIncidentById(incidentId, organizationId);
    if (!incident) {
      throw new Error('Incident not found or unauthorized');
    }

    validateStatusTransition(incident.status, newStatus);

    const now = new Date();
    const updates: Partial<Incident> = {
      status: newStatus,
    };

    if (newStatus === 'RESOLVED') {
      updates.resolvedAt = now.toISOString();
      const createdTime = new Date(incident.createdAt).getTime();
      updates.durationMinutes = Math.max(1, Math.round((now.getTime() - createdTime) / 60000));
    }

    const updated = await db.updateIncident(incidentId, organizationId, updates);

    await db.createIncidentEvent({
      incidentId,
      userId,
      eventType: 'STATUS_CHANGE',
      message: note || `Status transitioned from ${incident.status} to ${newStatus}.`,
    });

    // Enqueue resolution alerts if resolved
    if (newStatus === 'RESOLVED') {
      const service = await db.findServiceById(incident.serviceId, organizationId);
      const channels = await db.listNotificationChannels(organizationId);
      for (const channel of channels.filter((c) => c.isEnabled)) {
        notificationQueue.enqueueAlert({
          incident: updated,
          channel,
          serviceName: service?.name || 'Monitored Service',
        });
      }
    }

    return updated;
  }

  public static async acknowledgeIncident(
    incidentId: string,
    organizationId: string,
    userId: string
  ): Promise<Incident> {
    const incident = await db.findIncidentById(incidentId, organizationId);
    if (!incident) {
      throw new Error('Incident not found or unauthorized');
    }

    const updated = await db.updateIncident(incidentId, organizationId, {
      acknowledgedAt: new Date().toISOString(),
      assignedToUserId: incident.assignedToUserId || userId,
    });

    await db.createIncidentEvent({
      incidentId,
      userId,
      eventType: 'NOTE',
      message: 'Incident acknowledged by team on-call engineer.',
    });

    return updated;
  }

  public static async assignIncident(
    incidentId: string,
    organizationId: string,
    assigneeUserId: string,
    actorUserId: string
  ): Promise<Incident> {
    const incident = await db.findIncidentById(incidentId, organizationId);
    if (!incident) {
      throw new Error('Incident not found or unauthorized');
    }

    const assignee = await db.findUserById(assigneeUserId);
    if (!assignee) {
      throw new Error('Assignee user not found');
    }

    const updated = await db.updateIncident(incidentId, organizationId, {
      assignedToUserId: assigneeUserId,
    });

    await db.createIncidentEvent({
      incidentId,
      userId: actorUserId,
      eventType: 'ASSIGNMENT',
      message: `Assigned to ${assignee.name} (${assignee.email}).`,
    });

    return updated;
  }

  public static async addNote(
    incidentId: string,
    organizationId: string,
    userId: string,
    message: string
  ) {
    const incident = await db.findIncidentById(incidentId, organizationId);
    if (!incident) {
      throw new Error('Incident not found or unauthorized');
    }

    return await db.createIncidentEvent({
      incidentId,
      userId,
      eventType: 'NOTE',
      message,
    });
  }
}
