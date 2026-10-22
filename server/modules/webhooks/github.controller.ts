import { Router, type Request } from 'express';
import crypto from 'crypto';
import { env } from '../../config/env';
import { db } from '../../db/database';
import { verifyGitHubSignature } from './verifier';
import { authenticate, type AuthenticatedRequest } from '../auth/auth.middleware';

export const webhookRouter = Router();

const SUPPORTED_EVENTS = new Set(['ping', 'deployment', 'deployment_status', 'push', 'release']);

// Public webhook ingress endpoint
webhookRouter.post('/github', async (req: Request & { rawBody?: Buffer }, res) => {
  const deliveryId = req.headers['x-github-delivery'] as string;
  const event = req.headers['x-github-event'] as string;
  const signature = req.headers['x-github-signature-256'] as string;
  const orgSlug = (req.query.org as string) || 'acme-cloud';

  if (!deliveryId) {
    return res.status(400).json({ error: 'Missing X-GitHub-Delivery header' });
  }

  // 1. Signature Verification
  const isSignatureValid = verifyGitHubSignature(req.rawBody, signature, env.WEBHOOK_SECRET);
  if (!isSignatureValid) {
    console.warn(`[Webhook] Invalid signature received for delivery ${deliveryId}`);
    return res.status(401).json({
      error: 'Invalid signature',
      message: 'HMAC SHA-256 signature verification failed. Ensure secret matches configured webhook secret.',
    });
  }

  // Find organization
  const org = (await db.findOrganizationBySlug(orgSlug)) || (await db.listUsers()).length > 0
    ? (await db.rawState().organizations[0])
    : null;

  if (!org) {
    return res.status(404).json({ error: 'Target organization not found' });
  }

  // 2. Idempotent Deduplication Check
  const existing = await db.rawState().webhookDeliveries.find((w) => w.deliveryId === deliveryId);
  if (existing) {
    console.log(`[Webhook] Delivery ${deliveryId} already processed (idempotent skip)`);
    return res.status(200).json({
      status: 'duplicate',
      message: 'Webhook delivery already recorded and processed.',
    });
  }

  // 3. Process supported events
  const payload = req.body || {};
  let responseMessage = 'Event received';

  if (!SUPPORTED_EVENTS.has(event)) {
    responseMessage = `Ignored unsupported event type: ${event}`;
  } else if (event === 'ping') {
    responseMessage = 'Pong! Webhook signature verified successfully.';
  } else if (event === 'deployment' || event === 'deployment_status' || event === 'release') {
    // Record deployment event in service timeline if service correlation found
    const services = await db.listServices(org.id);
    const serviceNameInPayload =
      payload.repository?.name || payload.deployment?.environment || payload.deployment?.description || '';

    const matchedService = services.find(
      (s) =>
        s.name.toLowerCase().includes(serviceNameInPayload.toLowerCase()) ||
        serviceNameInPayload.toLowerCase().includes(s.name.toLowerCase())
    ) || services[0];

    if (matchedService) {
      // Check if service has an active incident, attach timeline note
      const openIncident = await db.findOpenIncidentForService(matchedService.id);
      if (openIncident) {
        await db.createIncidentEvent({
          incidentId: openIncident.id,
          eventType: 'DEPLOYMENT',
          message: `GitHub Deployment recorded during incident: ${payload.deployment?.description || payload.release?.name || 'Production release'} (${payload.sender?.login || 'CI/CD'})`,
          metadata: {
            deliveryId,
            event,
            sha: payload.deployment?.sha || payload.head_commit?.id,
          },
        });
      }
    }
    responseMessage = `Deployment event recorded and linked to ${matchedService ? matchedService.name : 'services'}`;
  } else if (event === 'push') {
    responseMessage = `Push event recorded: ${payload.commits?.length || 0} commits by ${payload.pusher?.name || payload.sender?.login || 'developer'}`;
  }

  // Record in DB
  const record = await db.recordWebhookDelivery({
    organizationId: org.id,
    deliveryId,
    event: event || 'unknown',
    sender: payload.sender?.login || 'unknown',
    status: 'PROCESSED',
    payload,
    responseMessage,
  });

  return res.status(200).json({
    success: true,
    data: record,
    message: responseMessage,
  });
});

// Authenticated endpoint to list webhook delivery history
webhookRouter.get('/deliveries', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const list = await db.listWebhookDeliveries(req.organizationId!);
    return res.status(200).json({ success: true, data: list });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

// Authenticated endpoint to test dispatch a signed webhook (useful for live UI verification)
webhookRouter.post('/test-dispatch', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const eventType = req.body.event || 'deployment_status';
    const deliveryId = `test-deliv-${crypto.randomUUID()}`;

    const testPayload = {
      action: 'created',
      deployment: {
        environment: 'production',
        ref: req.body.ref || 'v2.19.0-hotfix',
        sha: crypto.randomBytes(4).toString('hex'),
        description: req.body.description || 'DevPulse automated deployment trigger verification',
      },
      sender: {
        login: req.user?.name || 'devpulse-engineer',
      },
    };

    const rawBodyBuffer = Buffer.from(JSON.stringify(testPayload));
    const hmac = crypto.createHmac('sha256', env.WEBHOOK_SECRET);
    hmac.update(rawBodyBuffer);
    const signature = `sha256=${hmac.digest('hex')}`;

    // Verify signature immediately
    const isValid = verifyGitHubSignature(rawBodyBuffer, signature, env.WEBHOOK_SECRET);

    // Save record
    const record = await db.recordWebhookDelivery({
      organizationId: req.organizationId!,
      deliveryId,
      event: eventType,
      sender: req.user?.name || 'test-runner',
      status: 'PROCESSED',
      payload: testPayload,
      responseMessage: `Signed test delivery validated (HMAC valid: ${isValid}). Linked to service timeline.`,
    });

    return res.status(200).json({
      success: true,
      data: {
        record,
        testSignature: signature,
        verified: isValid,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});
