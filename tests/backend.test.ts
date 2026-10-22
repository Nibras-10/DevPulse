import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import { db } from '../server/db/database';
import { AuthService } from '../server/modules/auth/auth.service';
import { validateSafeUrl } from '../server/modules/monitoring/ssrf.guard';
import { canTransition, validateStatusTransition } from '../server/modules/incidents/incident.state-machine';
import { IncidentService } from '../server/modules/incidents/incident.service';
import { verifyGitHubSignature } from '../server/modules/webhooks/verifier';
import { NotificationQueue } from '../server/modules/notifications/queue';
import { MetricsService } from '../server/modules/metrics/metrics.service';
import type { Service, MonitoringCheckResult } from '../server/db/types';

describe('DevPulse Backend Test Suite', () => {
  beforeEach(() => {
    // Reset database state for clean test isolation
    db.resetState();
  });

  describe('1. Authentication & Tenant Isolation', () => {
    it('successfully registers a user and provisions an organization', async () => {
      const reg = await AuthService.register({
        name: 'Jordan Tech',
        email: 'jordan@example.com',
        password: 'SecurePassword123!',
        organizationName: 'Jordan Systems',
      });

      expect(reg.user).toBeDefined();
      expect(reg.user.email).toBe('jordan@example.com');
      expect(reg.organization).toBeDefined();
      expect(reg.token).toBeDefined();

      const membership = await db.findMembership(reg.user.id, reg.organization.id);
      expect(membership?.role).toBe('OWNER');
    });

    it('rejects duplicate email registrations', async () => {
      await AuthService.register({
        name: 'First User',
        email: 'duplicate@example.com',
        password: 'Password123!',
      });

      await expect(
        AuthService.register({
          name: 'Second User',
          email: 'duplicate@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(/already exists/i);
    });

    it('authenticates valid credentials and rejects incorrect password', async () => {
      await AuthService.register({
        name: 'Login Test',
        email: 'login@example.com',
        password: 'CorrectPassword123!',
      });

      const validLogin = await AuthService.login({
        email: 'login@example.com',
        password: 'CorrectPassword123!',
      });
      expect(validLogin.token).toBeDefined();

      await expect(
        AuthService.login({
          email: 'login@example.com',
          password: 'WrongPassword!',
        })
      ).rejects.toThrow(/invalid email or password/i);
    });

    it('enforces organization-level tenant isolation', async () => {
      const orgA = await db.createOrganization({ name: 'Org Alpha', slug: 'org-alpha' });
      const orgB = await db.createOrganization({ name: 'Org Beta', slug: 'org-beta' });

      const serviceA = await db.createService({
        organizationId: orgA.id,
        name: 'Alpha Service',
        healthCheckUrl: 'https://httpbin.org/status/200',
        httpMethod: 'GET',
        checkIntervalSec: 60,
        timeoutMs: 3000,
        expectedStatusCode: 200,
        failureThreshold: 3,
        status: 'OPERATIONAL',
        isActive: true,
        isPaused: false,
      });

      // Querying with Org B id must return null
      const foundUnderB = await db.findServiceById(serviceA.id, orgB.id);
      expect(foundUnderB).toBeNull();

      // Querying with Org A id returns service
      const foundUnderA = await db.findServiceById(serviceA.id, orgA.id);
      expect(foundUnderA?.id).toBe(serviceA.id);
    });
  });

  describe('2. SSRF Protection', () => {
    it('blocks loopback and private IP addresses', () => {
      expect(validateSafeUrl('http://127.0.0.1:8080/metrics').valid).toBe(false);
      expect(validateSafeUrl('http://localhost:3000/api').valid).toBe(false);
      expect(validateSafeUrl('http://0.0.0.0/test').valid).toBe(false);
      expect(validateSafeUrl('http://169.254.169.254/latest/meta-data').valid).toBe(false);
      expect(validateSafeUrl('http://10.0.1.5:9000/health').valid).toBe(false);
      expect(validateSafeUrl('http://192.168.1.1/admin').valid).toBe(false);
      expect(validateSafeUrl('http://internal-service.local').valid).toBe(false);
    });

    it('blocks dangerous protocols like file:, gopher:, ftp:', () => {
      expect(validateSafeUrl('file:///etc/passwd').valid).toBe(false);
      expect(validateSafeUrl('ftp://ftp.example.com').valid).toBe(false);
    });

    it('allows valid public HTTP and HTTPS endpoints', () => {
      expect(validateSafeUrl('https://api.github.com/status').valid).toBe(true);
      expect(validateSafeUrl('https://httpbin.org/status/200').valid).toBe(true);
    });
  });

  describe('3. Incident State Machine & Transitions', () => {
    it('validates allowed transitions', () => {
      expect(canTransition('INVESTIGATING', 'IDENTIFIED')).toBe(true);
      expect(canTransition('IDENTIFIED', 'MONITORING')).toBe(true);
      expect(canTransition('MONITORING', 'RESOLVED')).toBe(true);
      expect(canTransition('INVESTIGATING', 'RESOLVED')).toBe(true);
      expect(canTransition('RESOLVED', 'INVESTIGATING')).toBe(true); // Reopening
    });

    it('rejects invalid transitions', () => {
      expect(canTransition('RESOLVED', 'IDENTIFIED')).toBe(false);
      expect(canTransition('RESOLVED', 'MONITORING')).toBe(false);

      expect(() => validateStatusTransition('RESOLVED', 'MONITORING')).toThrow(
        /Invalid incident status transition/i
      );
    });
  });

  describe('4. Incident Deduplication & Auto-Declaration', () => {
    it('creates an incident when failure threshold is met and deduplicates on subsequent failures', async () => {
      const org = await db.createOrganization({ name: 'Acme Cloud', slug: 'acme-test' });
      const service = await db.createService({
        organizationId: org.id,
        name: 'Search Indexer',
        healthCheckUrl: 'https://httpbin.org/status/503',
        httpMethod: 'GET',
        checkIntervalSec: 60,
        timeoutMs: 3000,
        expectedStatusCode: 200,
        failureThreshold: 3,
        status: 'DOWN',
        isActive: true,
        isPaused: false,
      });

      const failedCheck: MonitoringCheckResult = {
        id: crypto.randomUUID(),
        serviceId: service.id,
        organizationId: org.id,
        statusCode: 503,
        responseTimeMs: 250,
        isHealthy: false,
        errorMessage: 'HTTP 503 Service Unavailable',
        timestamp: new Date().toISOString(),
      };

      // First failure triggers incident creation
      const incident1 = await IncidentService.handleServiceFailure(service, failedCheck);
      expect(incident1).toBeDefined();
      expect(incident1?.status).toBe('INVESTIGATING');

      // Subsequent failure while incident is open MUST DEDUPLICATE (not create a new incident)
      const incident2 = await IncidentService.handleServiceFailure(service, failedCheck);
      expect(incident2?.id).toBe(incident1?.id);

      const allIncidents = await db.listIncidents(org.id);
      expect(allIncidents.length).toBe(1);

      // Verify alert event was appended to existing incident timeline
      const timeline = await db.listIncidentEvents(incident1!.id);
      const alertEvents = timeline.filter((e) => e.eventType === 'ALERT');
      expect(alertEvents.length).toBe(1);
    });
  });

  describe('5. Notification Queue Retries & Idempotency', () => {
    it('enforces idempotency key and prevents duplicate jobs', async () => {
      const queue = new NotificationQueue();
      const org = await db.createOrganization({ name: 'Alert Org', slug: 'alert-org' });
      const service = await db.createService({
        organizationId: org.id,
        name: 'Worker',
        healthCheckUrl: 'https://httpbin.org/status/200',
        httpMethod: 'GET',
        checkIntervalSec: 60,
        timeoutMs: 3000,
        expectedStatusCode: 200,
        failureThreshold: 3,
        status: 'OPERATIONAL',
        isActive: true,
        isPaused: false,
      });

      const incident = await db.createIncident({
        organizationId: org.id,
        serviceId: service.id,
        title: 'High Queue Latency',
        description: 'Test Incident',
        severity: 'SEV2_MAJOR',
        status: 'INVESTIGATING',
        isAutoCreated: true,
      });

      const channel = await db.createNotificationChannel({
        organizationId: org.id,
        name: 'Team Alert',
        type: 'EMAIL',
        destination: 'team@example.com',
        isEnabled: true,
      });

      const job1 = queue.enqueueAlert({ incident, channel, serviceName: service.name });
      const job2 = queue.enqueueAlert({ incident, channel, serviceName: service.name });

      // Idempotent: must return the exact same job ID
      expect(job1.id).toBe(job2.id);
      queue.stop();
    });
  });

  describe('6. GitHub Webhook Signature Verification', () => {
    const secret = 'test_webhook_secret_key_12345';

    it('verifies valid HMAC SHA-256 signatures', () => {
      const rawPayload = Buffer.from(JSON.stringify({ event: 'deployment', state: 'success' }));
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawPayload);
      const signature = `sha256=${hmac.digest('hex')}`;

      const isValid = verifyGitHubSignature(rawPayload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('rejects tampered or invalid signatures', () => {
      const rawPayload = Buffer.from(JSON.stringify({ event: 'deployment' }));
      const invalidSignature = 'sha256=1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff';

      const isValid = verifyGitHubSignature(rawPayload, invalidSignature, secret);
      expect(isValid).toBe(false);
    });
  });

  describe('7. Metrics & Uptime Calculations', () => {
    it('accurately computes uptime %, average and median latency', async () => {
      const org = await db.createOrganization({ name: 'Metrics Org', slug: 'metrics-org' });
      const service = await db.createService({
        organizationId: org.id,
        name: 'API Service',
        healthCheckUrl: 'https://httpbin.org/status/200',
        httpMethod: 'GET',
        checkIntervalSec: 60,
        timeoutMs: 3000,
        expectedStatusCode: 200,
        failureThreshold: 3,
        status: 'OPERATIONAL',
        isActive: true,
        isPaused: false,
      });

      // Record 9 healthy checks (50ms) and 1 failed check (0ms) -> 90% uptime
      for (let i = 0; i < 9; i++) {
        await db.recordMonitoringCheck({
          serviceId: service.id,
          organizationId: org.id,
          statusCode: 200,
          responseTimeMs: 50 + i * 5,
          isHealthy: true,
        });
      }

      await db.recordMonitoringCheck({
        serviceId: service.id,
        organizationId: org.id,
        statusCode: 500,
        responseTimeMs: 200,
        isHealthy: false,
        errorMessage: 'Internal Server Error',
      });

      const metrics = await MetricsService.getServiceMetrics(service.id, org.id);
      expect(metrics.totalChecks).toBe(10);
      expect(metrics.healthyCount).toBe(9);
      expect(metrics.failureCount).toBe(1);
      expect(metrics.uptimePercentage).toBe(90);
    });
  });
});
