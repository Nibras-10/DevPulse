import { db } from '../../db/database';
import type { MonitoringCheckResult, Incident } from '../../db/types';

export interface OverviewMetrics {
  totalServices: number;
  operationalServices: number;
  degradedServices: number;
  downServices: number;
  systemUptimePercentage: number;
  averageResponseTimeMs: number;
  medianResponseTimeMs: number;
  p95ResponseTimeMs: number;
  openIncidentsCount: number;
  totalIncidentsCount: number;
  mttrMinutes: number; // Mean Time To Recovery
  period: string;
}

export class MetricsService {
  public static async getOverviewMetrics(
    organizationId: string,
    periodHours = 24
  ): Promise<OverviewMetrics> {
    const services = await db.listServices(organizationId);
    const incidents = await db.listIncidents(organizationId);

    const now = Date.now();
    const periodStart = new Date(now - periodHours * 60 * 60 * 1000).toISOString();

    // Collect checks within period
    const allChecks: MonitoringCheckResult[] = [];
    for (const s of services) {
      const checks = await db.getRecentChecksForService(s.id, 200);
      for (const c of checks) {
        if (c.timestamp >= periodStart) {
          allChecks.push(c);
        }
      }
    }

    const totalChecks = allChecks.length;
    const healthyChecks = allChecks.filter((c) => c.isHealthy).length;
    const systemUptimePercentage =
      totalChecks > 0 ? Number(((healthyChecks / totalChecks) * 100).toFixed(2)) : 100.0;

    // Response time calculations
    const latencies = allChecks
      .filter((c) => c.responseTimeMs > 0)
      .map((c) => c.responseTimeMs)
      .sort((a, b) => a - b);

    const averageResponseTimeMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((acc, curr) => acc + curr, 0) / latencies.length)
        : 0;

    const medianResponseTimeMs =
      latencies.length > 0 ? latencies[Math.floor(latencies.length / 2)] : 0;

    const p95Index = Math.min(latencies.length - 1, Math.floor(latencies.length * 0.95));
    const p95ResponseTimeMs = latencies.length > 0 ? latencies[p95Index] : 0;

    // Service status counts
    const operationalServices = services.filter((s) => s.status === 'OPERATIONAL').length;
    const degradedServices = services.filter((s) => s.status === 'DEGRADED').length;
    const downServices = services.filter((s) => s.status === 'DOWN').length;

    // Incident metrics & MTTR
    const openIncidents = incidents.filter((i) => i.status !== 'RESOLVED');
    const resolvedIncidents = incidents.filter((i) => i.status === 'RESOLVED' && i.durationMinutes);

    const totalDuration = resolvedIncidents.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);
    const mttrMinutes =
      resolvedIncidents.length > 0 ? Math.round(totalDuration / resolvedIncidents.length) : 0;

    return {
      totalServices: services.length,
      operationalServices,
      degradedServices,
      downServices,
      systemUptimePercentage,
      averageResponseTimeMs,
      medianResponseTimeMs,
      p95ResponseTimeMs,
      openIncidentsCount: openIncidents.length,
      totalIncidentsCount: incidents.length,
      mttrMinutes,
      period: `${periodHours}h`,
    };
  }

  public static async getServiceMetrics(serviceId: string, organizationId: string, limit = 60) {
    const service = await db.findServiceById(serviceId, organizationId);
    if (!service) {
      throw new Error('Service not found or unauthorized');
    }

    const checks = await db.listMonitoringChecks(serviceId, organizationId, limit);
    const totalChecks = checks.length;
    const healthyCount = checks.filter((c) => c.isHealthy).length;
    const uptimePercentage = totalChecks > 0 ? Number(((healthyCount / totalChecks) * 100).toFixed(2)) : 100;

    const validLatencies = checks.filter((c) => c.responseTimeMs > 0).map((c) => c.responseTimeMs);
    const avgLatency =
      validLatencies.length > 0
        ? Math.round(validLatencies.reduce((a, b) => a + b, 0) / validLatencies.length)
        : 0;

    // Build timeline points for sparkline/chart
    const points = checks
      .slice()
      .reverse()
      .map((c) => ({
        time: new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: c.timestamp,
        latency: c.responseTimeMs,
        status: c.isHealthy ? 'Healthy' : 'Error',
        code: c.statusCode,
      }));

    return {
      serviceId,
      uptimePercentage,
      avgLatency,
      totalChecks,
      healthyCount,
      failureCount: totalChecks - healthyCount,
      points,
    };
  }
}
