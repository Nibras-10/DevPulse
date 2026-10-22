import bcrypt from 'bcryptjs';
import { db } from './database';

export async function seedDatabase() {
  const existingUsers = await db.listUsers();
  if (existingUsers.length > 0) {
    console.log('[Seed] Database already contains data, skipping seed.');
    return;
  }

  console.log('[Seed] Seeding DevPulse with realistic engineering data...');

  // 1. Users
  const passwordHash = await bcrypt.hash('Devpulse123!', 10);

  const alex = await db.createUser({
    name: 'Alex Rivers',
    email: 'alex@devpulse.io',
    passwordHash,
  });

  const sarah = await db.createUser({
    name: 'Sarah Chen',
    email: 'sarah@devpulse.io',
    passwordHash,
  });

  const marcus = await db.createUser({
    name: 'Marcus Vance',
    email: 'marcus@devpulse.io',
    passwordHash,
  });

  // Isolated user for multi-tenant check
  const externalUser = await db.createUser({
    name: 'Elena Rostova',
    email: 'elena@stripeflow.com',
    passwordHash,
  });

  // 2. Organizations
  const acmeOrg = await db.createOrganization({
    name: 'Acme Cloud Platform',
    slug: 'acme-cloud',
  });

  const stripeflowOrg = await db.createOrganization({
    name: 'Stripeflow Payments',
    slug: 'stripeflow',
  });

  // 3. Memberships
  await db.createMembership({
    userId: alex.id,
    organizationId: acmeOrg.id,
    role: 'OWNER',
  });

  await db.createMembership({
    userId: sarah.id,
    organizationId: acmeOrg.id,
    role: 'ADMIN',
  });

  await db.createMembership({
    userId: marcus.id,
    organizationId: acmeOrg.id,
    role: 'MEMBER',
  });

  await db.createMembership({
    userId: externalUser.id,
    organizationId: stripeflowOrg.id,
    role: 'OWNER',
  });

  // 4. Services for Acme Cloud
  const authService = await db.createService({
    organizationId: acmeOrg.id,
    name: 'Authentication API',
    description: 'Core JWT issuance, session validation, and OAuth provider gateway',
    healthCheckUrl: 'https://httpbin.org/status/200',
    httpMethod: 'GET',
    checkIntervalSec: 60,
    timeoutMs: 3000,
    expectedStatusCode: 200,
    failureThreshold: 3,
    status: 'OPERATIONAL',
    isActive: true,
    isPaused: false,
    lastCheckedAt: new Date(Date.now() - 30 * 1000).toISOString(),
    lastSuccessfulCheckAt: new Date(Date.now() - 30 * 1000).toISOString(),
  });

  const paymentsService = await db.createService({
    organizationId: acmeOrg.id,
    name: 'Payments & Billing Gateway',
    description: 'Stripe webhook listener, ledger balance verification, and subscription sync',
    healthCheckUrl: 'https://httpbin.org/status/200',
    httpMethod: 'GET',
    checkIntervalSec: 30,
    timeoutMs: 4000,
    expectedStatusCode: 200,
    failureThreshold: 2,
    status: 'OPERATIONAL',
    isActive: true,
    isPaused: false,
    lastCheckedAt: new Date(Date.now() - 15 * 1000).toISOString(),
    lastSuccessfulCheckAt: new Date(Date.now() - 15 * 1000).toISOString(),
  });

  const searchService = await db.createService({
    organizationId: acmeOrg.id,
    name: 'Search Indexer Cluster',
    description: 'Elasticsearch document pipeline, faceted catalogue indexing, and query router',
    healthCheckUrl: 'https://httpbin.org/status/503',
    httpMethod: 'GET',
    checkIntervalSec: 60,
    timeoutMs: 5000,
    expectedStatusCode: 200,
    failureThreshold: 3,
    status: 'DOWN',
    isActive: true,
    isPaused: false,
    lastCheckedAt: new Date(Date.now() - 10 * 1000).toISOString(),
    lastSuccessfulCheckAt: new Date(Date.now() - 1800 * 1000).toISOString(),
    lastFailedCheckAt: new Date(Date.now() - 10 * 1000).toISOString(),
  });

  const notificationService = await db.createService({
    organizationId: acmeOrg.id,
    name: 'Notification Dispatcher',
    description: 'Transactional email, SMS delivery, and WebSocket push stream',
    healthCheckUrl: 'https://httpbin.org/status/200',
    httpMethod: 'GET',
    checkIntervalSec: 60,
    timeoutMs: 4000,
    expectedStatusCode: 200,
    failureThreshold: 3,
    status: 'DEGRADED',
    isActive: true,
    isPaused: false,
    lastCheckedAt: new Date(Date.now() - 45 * 1000).toISOString(),
    lastSuccessfulCheckAt: new Date(Date.now() - 45 * 1000).toISOString(),
  });

  const portalService = await db.createService({
    organizationId: acmeOrg.id,
    name: 'Customer Portal GraphQL',
    description: 'Public GraphQL gateway for tenant dashboard and developer settings',
    healthCheckUrl: 'https://httpbin.org/status/200',
    httpMethod: 'GET',
    checkIntervalSec: 120,
    timeoutMs: 5000,
    expectedStatusCode: 200,
    failureThreshold: 3,
    status: 'OPERATIONAL',
    isActive: true,
    isPaused: false,
    lastCheckedAt: new Date(Date.now() - 50 * 1000).toISOString(),
    lastSuccessfulCheckAt: new Date(Date.now() - 50 * 1000).toISOString(),
  });

  // Service for Stripeflow (Tenant Isolation)
  await db.createService({
    organizationId: stripeflowOrg.id,
    name: 'Stripeflow Core Ledger',
    description: 'Double-entry transaction processing microservice',
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

  // 5. Seed Historical Monitoring Checks (last 24 hours)
  const now = Date.now();
  const servicesList = [authService, paymentsService, notificationService, portalService];

  for (const s of servicesList) {
    const checkCount = 30;
    for (let i = checkCount; i >= 0; i--) {
      const checkTime = new Date(now - i * 15 * 60 * 1000).toISOString();
      const baseLatency = s.id === notificationService.id ? 280 : 55;
      const jitter = Math.floor(Math.random() * 35);
      const isDegradedPoint = s.id === notificationService.id && i < 4;
      const responseTime = isDegradedPoint ? 1450 : baseLatency + jitter;

      await db.recordMonitoringCheck({
        serviceId: s.id,
        organizationId: acmeOrg.id,
        statusCode: 200,
        responseTimeMs: responseTime,
        isHealthy: true,
      });
    }
  }

  // Seed failing checks for the Search Indexer (status DOWN)
  for (let i = 25; i >= 0; i--) {
    const isFailing = i <= 6;
    const checkTime = new Date(now - i * 5 * 60 * 1000).toISOString();
    await db.recordMonitoringCheck({
      serviceId: searchService.id,
      organizationId: acmeOrg.id,
      statusCode: isFailing ? 503 : 200,
      responseTimeMs: isFailing ? 5200 : 85 + Math.floor(Math.random() * 20),
      isHealthy: !isFailing,
      errorMessage: isFailing ? 'HTTP 503 Service Unavailable: cluster node pool exhausted' : undefined,
    });
  }

  // 6. Incidents
  // Active Incident on Search Indexer
  const activeIncident = await db.createIncident({
    organizationId: acmeOrg.id,
    serviceId: searchService.id,
    title: 'Elevated 503 latency & Elasticsearch cluster timeout',
    description:
      'Search indexing workers experiencing connection timeouts against the primary Elasticsearch cluster. Multiple nodes reporting memory pressure above 92%.',
    severity: 'SEV1_CRITICAL',
    status: 'INVESTIGATING',
    assignedToUserId: sarah.id,
    acknowledgedAt: new Date(now - 25 * 60 * 1000).toISOString(),
    isAutoCreated: true,
  });

  await db.createIncidentEvent({
    incidentId: activeIncident.id,
    eventType: 'CREATED',
    message: 'Incident automatically declared after 3 consecutive health check failures (HTTP 503).',
  });

  await db.createIncidentEvent({
    incidentId: activeIncident.id,
    userId: alex.id,
    eventType: 'ASSIGNMENT',
    message: 'Assigned incident to Sarah Chen (On-Call Infrastructure Lead).',
  });

  await db.createIncidentEvent({
    incidentId: activeIncident.id,
    userId: sarah.id,
    eventType: 'NOTE',
    message:
      'Identified high heap usage on data nodes 3 and 4 during reindexing. Throttling non-essential write ingestion to stabilize node heartbeats.',
  });

  // Resolved Incident 1
  const resolvedIncident1 = await db.createIncident({
    organizationId: acmeOrg.id,
    serviceId: authService.id,
    title: 'Redis Session Store Failover Latency Spike',
    description:
      'Primary Redis sentinel triggered automatic replica failover following kernel TCP socket drop. Token validation experienced transient 800ms delays.',
    severity: 'SEV2_MAJOR',
    status: 'RESOLVED',
    assignedToUserId: alex.id,
    acknowledgedAt: new Date(now - 14 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(now - 13 * 60 * 60 * 1000 - 32 * 60 * 1000).toISOString(),
    durationMinutes: 28,
    isAutoCreated: true,
  });

  await db.createIncidentEvent({
    incidentId: resolvedIncident1.id,
    eventType: 'CREATED',
    message: 'Incident opened due to consecutive response timeout alerts.',
  });

  await db.createIncidentEvent({
    incidentId: resolvedIncident1.id,
    userId: alex.id,
    eventType: 'STATUS_CHANGE',
    message: 'Status changed from INVESTIGATING to IDENTIFIED. Primary replica promoted.',
  });

  await db.createIncidentEvent({
    incidentId: resolvedIncident1.id,
    userId: alex.id,
    eventType: 'STATUS_CHANGE',
    message: 'Status changed to RESOLVED. Connection pool stabilized and p99 latency returned to 32ms.',
  });

  // Resolved Incident 2
  const resolvedIncident2 = await db.createIncident({
    organizationId: acmeOrg.id,
    serviceId: paymentsService.id,
    title: 'Payment Gateway Webhook SSL Handshake Dropped',
    description:
      'Intermediate CA certificate expiration in legacy proxy caused payment confirmation webhooks to reject TLS handshakes.',
    severity: 'SEV3_MINOR',
    status: 'RESOLVED',
    assignedToUserId: marcus.id,
    acknowledgedAt: new Date(now - 36 * 60 * 60 * 1000).toISOString(),
    resolvedAt: new Date(now - 36 * 60 * 60 * 1000 + 14 * 60 * 1000).toISOString(),
    durationMinutes: 14,
    isAutoCreated: false,
  });

  await db.createIncidentEvent({
    incidentId: resolvedIncident2.id,
    userId: marcus.id,
    eventType: 'STATUS_CHANGE',
    message: 'Manual incident opened during scheduled certificate bundle rotation.',
  });

  await db.createIncidentEvent({
    incidentId: resolvedIncident2.id,
    userId: marcus.id,
    eventType: 'STATUS_CHANGE',
    message: 'Status changed to RESOLVED. Root trust store updated across ingress pods.',
  });

  // 7. Notification Channels & Deliveries
  const emailChannel = await db.createNotificationChannel({
    organizationId: acmeOrg.id,
    name: 'Primary SRE On-Call Email',
    type: 'EMAIL',
    destination: 'oncall@acme-cloud.internal',
    isEnabled: true,
  });

  const slackChannel = await db.createNotificationChannel({
    organizationId: acmeOrg.id,
    name: 'Slack #incidents-prod',
    type: 'SLACK',
    destination: 'https://hooks.slack.com/services/T000/B000/XXXXX',
    isEnabled: true,
  });

  await db.recordNotificationDelivery({
    organizationId: acmeOrg.id,
    incidentId: activeIncident.id,
    channelId: emailChannel.id,
    idempotencyKey: `incident:${activeIncident.id}:INVESTIGATING:${emailChannel.id}`,
    status: 'DELIVERED',
    attempts: 1,
    payload: {
      subject: `[SEV1 CRITICAL] Elevated 503 latency & Elasticsearch cluster timeout`,
      service: 'Search Indexer Cluster',
      status: 'INVESTIGATING',
    },
    deliveredAt: new Date(now - 24 * 60 * 1000).toISOString(),
  });

  await db.recordNotificationDelivery({
    organizationId: acmeOrg.id,
    incidentId: activeIncident.id,
    channelId: slackChannel.id,
    idempotencyKey: `incident:${activeIncident.id}:INVESTIGATING:${slackChannel.id}`,
    status: 'DELIVERED',
    attempts: 1,
    payload: {
      text: `🚨 *[SEV1 CRITICAL]* Search Indexer Cluster is DOWN. Investigation in progress. Assigned: Sarah Chen`,
    },
    deliveredAt: new Date(now - 24 * 60 * 1000).toISOString(),
  });

  // 8. GitHub Webhooks Deliveries
  await db.recordWebhookDelivery({
    organizationId: acmeOrg.id,
    deliveryId: 'gh-deliv-8f921a4e-128a-493a-bc12-9214a1120091',
    event: 'deployment_status',
    sender: 'github-actions[bot]',
    status: 'PROCESSED',
    payload: {
      deployment: {
        environment: 'production',
        ref: 'v2.18.4',
        sha: '7a12b4e89f2',
        description: 'Deploy Search Indexer microservice with memory leak patch',
      },
      deployment_status: {
        state: 'in_progress',
      },
    },
    responseMessage: 'Deployment status recorded and correlated with Search Indexer Cluster',
  });

  await db.recordWebhookDelivery({
    organizationId: acmeOrg.id,
    deliveryId: 'gh-deliv-33bc812a-098e-423c-a991-8812c7711299',
    event: 'push',
    sender: 'alexrivers',
    status: 'PROCESSED',
    payload: {
      ref: 'refs/heads/main',
      commits: [
        {
          id: 'b45f12a9e3',
          message: 'fix(auth): tune token cache expiration to 300 seconds',
        },
      ],
    },
    responseMessage: 'Push webhook verified and processed',
  });

  // 9. Audit Logs
  await db.logAudit({
    organizationId: acmeOrg.id,
    userId: alex.id,
    action: 'SERVICE_CREATED',
    targetType: 'Service',
    targetId: authService.id,
    details: { name: 'Authentication API' },
  });

  await db.logAudit({
    organizationId: acmeOrg.id,
    userId: sarah.id,
    action: 'INCIDENT_ACKNOWLEDGED',
    targetType: 'Incident',
    targetId: activeIncident.id,
    details: { title: activeIncident.title },
  });

  console.log('[Seed] DevPulse demo data successfully populated.');
}
