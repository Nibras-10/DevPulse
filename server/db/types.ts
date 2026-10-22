export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';
export type ServiceStatus = 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
export type IncidentStatus = 'INVESTIGATING' | 'IDENTIFIED' | 'MONITORING' | 'RESOLVED';
export type IncidentSeverity = 'SEV1_CRITICAL' | 'SEV2_MAJOR' | 'SEV3_MINOR' | 'SEV4_LOW';
export type ChannelType = 'EMAIL' | 'WEBHOOK' | 'SLACK';
export type WebhookStatus = 'PENDING' | 'PROCESSED' | 'REJECTED' | 'FAILED';

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  healthCheckUrl: string;
  httpMethod: 'GET' | 'POST' | 'HEAD';
  checkIntervalSec: number;
  timeoutMs: number;
  expectedStatusCode: number;
  failureThreshold: number;
  consecutiveFailures: number;
  status: ServiceStatus;
  isActive: boolean;
  isPaused: boolean;
  lastCheckedAt?: string;
  lastSuccessfulCheckAt?: string;
  lastFailedCheckAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringCheckResult {
  id: string;
  serviceId: string;
  organizationId: string;
  statusCode?: number;
  responseTimeMs: number;
  isHealthy: boolean;
  errorMessage?: string;
  timestamp: string;
}

export interface Incident {
  id: string;
  organizationId: string;
  serviceId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  assignedToUserId?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  durationMinutes?: number;
  isAutoCreated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentTimelineEvent {
  id: string;
  incidentId: string;
  userId?: string;
  eventType: 'STATUS_CHANGE' | 'NOTE' | 'ASSIGNMENT' | 'DEPLOYMENT' | 'ALERT' | 'CREATED';
  message: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface NotificationChannel {
  id: string;
  organizationId: string;
  name: string;
  type: ChannelType;
  destination: string;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliveryAttempt {
  id: string;
  organizationId: string;
  incidentId: string;
  channelId: string;
  idempotencyKey: string;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  attempts: number;
  payload: Record<string, any>;
  response?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface WebhookDelivery {
  id: string;
  organizationId: string;
  deliveryId: string;
  event: string;
  sender?: string;
  status: WebhookStatus;
  payload: Record<string, any>;
  responseMessage?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  organizationId: string;
  userId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}
