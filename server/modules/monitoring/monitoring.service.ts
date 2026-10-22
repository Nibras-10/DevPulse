import { db } from '../../db/database';
import { executeHealthCheck } from './checker';
import { IncidentService } from '../incidents/incident.service';
import type { Service, MonitoringCheckResult, ServiceStatus } from '../../db/types';

export class MonitoringService {
  public static async checkService(service: Service): Promise<{
    service: Service;
    checkResult: MonitoringCheckResult;
  }> {
    const exec = await executeHealthCheck(service);
    const now = new Date().toISOString();

    const checkResult = await db.recordMonitoringCheck({
      serviceId: service.id,
      organizationId: service.organizationId,
      statusCode: exec.statusCode,
      responseTimeMs: exec.responseTimeMs,
      isHealthy: exec.isHealthy,
      errorMessage: exec.errorMessage,
    });

    let newStatus: ServiceStatus = service.status;
    let consecutiveFailures = service.consecutiveFailures;
    let lastSuccessfulCheckAt = service.lastSuccessfulCheckAt;
    let lastFailedCheckAt = service.lastFailedCheckAt;

    if (exec.isHealthy) {
      consecutiveFailures = 0;
      lastSuccessfulCheckAt = now;
      // High latency degraded threshold: > 1200ms
      newStatus = exec.responseTimeMs > 1200 ? 'DEGRADED' : 'OPERATIONAL';

      // If the service was previously DOWN, check if an open incident exists and log recovery progress
      if (service.status === 'DOWN') {
        const openIncident = await db.findOpenIncidentForService(service.id);
        if (openIncident) {
          await db.createIncidentEvent({
            incidentId: openIncident.id,
            eventType: 'ALERT',
            message: `Service heartbeat recovered: HTTP ${exec.statusCode} responded in ${exec.responseTimeMs}ms. Monitoring for stability.`,
          });
        }
      }
    } else {
      consecutiveFailures += 1;
      lastFailedCheckAt = now;

      if (consecutiveFailures >= service.failureThreshold) {
        newStatus = 'DOWN';
      } else {
        newStatus = 'DEGRADED';
      }
    }

    const updatedService = await db.updateService(service.id, service.organizationId, {
      status: newStatus,
      consecutiveFailures,
      lastCheckedAt: now,
      lastSuccessfulCheckAt,
      lastFailedCheckAt,
    });

    // If new status is DOWN or threshold exceeded, trigger incident handling
    if (!exec.isHealthy && consecutiveFailures >= service.failureThreshold) {
      await IncidentService.handleServiceFailure(updatedService, checkResult);
    }

    return { service: updatedService, checkResult };
  }

  public static async runManualCheck(serviceId: string, organizationId: string) {
    const service = await db.findServiceById(serviceId, organizationId);
    if (!service) {
      throw new Error('Service not found or unauthorized');
    }
    return this.checkService(service);
  }
}
