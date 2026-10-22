import { db } from '../../db/database';
import { MonitoringService } from './monitoring.service';

export class MonitoringScheduler {
  private timer: NodeJS.Timeout | null = null;
  private isChecking = false;
  private isRunning = false;

  public start(pollIntervalMs = 5000) {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Scheduler] Background health check worker started (interval: ${pollIntervalMs}ms)`);

    this.timer = setInterval(async () => {
      await this.runDueChecks();
    }, pollIntervalMs);
  }

  public async runDueChecks() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const activeServices = await db.getActiveServicesForMonitoring();
      const now = Date.now();

      for (const service of activeServices) {
        let isDue = false;
        if (!service.lastCheckedAt) {
          isDue = true;
        } else {
          const lastTime = new Date(service.lastCheckedAt).getTime();
          const elapsedSec = (now - lastTime) / 1000;
          if (elapsedSec >= service.checkIntervalSec) {
            isDue = true;
          }
        }

        if (isDue) {
          try {
            await MonitoringService.checkService(service);
          } catch (err: any) {
            console.error(`[Scheduler] Error running check on service ${service.id} (${service.name}):`, err.message);
          }
        }
      }
    } catch (err: any) {
      console.error('[Scheduler] Error in monitoring cycle:', err);
    } finally {
      this.isChecking = false;
    }
  }

  public stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[Scheduler] Background health check worker stopped.');
  }
}

export const monitoringScheduler = new MonitoringScheduler();
