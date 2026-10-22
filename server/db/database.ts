import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  User,
  Organization,
  Membership,
  Service,
  MonitoringCheckResult,
  Incident,
  IncidentTimelineEvent,
  NotificationChannel,
  NotificationDeliveryAttempt,
  WebhookDelivery,
  AuditLog,
} from './types';

export interface DatabaseState {
  users: User[];
  organizations: Organization[];
  memberships: Membership[];
  services: Service[];
  monitoringChecks: MonitoringCheckResult[];
  incidents: Incident[];
  incidentEvents: IncidentTimelineEvent[];
  notificationChannels: NotificationChannel[];
  notificationDeliveries: NotificationDeliveryAttempt[];
  webhookDeliveries: WebhookDelivery[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DATA_DIR, 'devpulse_db.json');

export class Database {
  private state: DatabaseState = {
    users: [],
    organizations: [],
    memberships: [],
    services: [],
    monitoringChecks: [],
    incidents: [],
    incidentEvents: [],
    notificationChannels: [],
    notificationDeliveries: [],
    webhookDeliveries: [],
    auditLogs: [],
  };

  private isLoaded = false;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (this.isLoaded) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.state = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[DB] Failed to load persistent state, initializing fresh memory state:', err);
    }
    this.isLoaded = true;
  }

  public flush() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DB] Failed to flush state to disk:', err);
    }
  }

  private scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.flush();
    }, 100);
  }

  // --- Users ---
  public async createUser(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const existing = this.state.users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
    if (existing) {
      throw new Error(`User with email "${data.email}" already exists`);
    }
    const now = new Date().toISOString();
    const user: User = {
      id: crypto.randomUUID(),
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash: data.passwordHash,
      createdAt: now,
      updatedAt: now,
    };
    this.state.users.push(user);
    this.scheduleSave();
    return user;
  }

  public async findUserByEmail(email: string): Promise<User | null> {
    return this.state.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public async findUserById(id: string): Promise<User | null> {
    return this.state.users.find((u) => u.id === id) || null;
  }

  public async listUsers(): Promise<User[]> {
    return [...this.state.users];
  }

  // --- Organizations ---
  public async createOrganization(data: { name: string; slug: string }): Promise<Organization> {
    const existing = this.state.organizations.find((o) => o.slug === data.slug);
    if (existing) {
      throw new Error(`Organization slug "${data.slug}" is already taken`);
    }
    const now = new Date().toISOString();
    const org: Organization = {
      id: crypto.randomUUID(),
      name: data.name,
      slug: data.slug,
      createdAt: now,
      updatedAt: now,
    };
    this.state.organizations.push(org);
    this.scheduleSave();
    return org;
  }

  public async findOrganizationById(id: string): Promise<Organization | null> {
    return this.state.organizations.find((o) => o.id === id) || null;
  }

  public async findOrganizationBySlug(slug: string): Promise<Organization | null> {
    return this.state.organizations.find((o) => o.slug === slug) || null;
  }

  // --- Memberships ---
  public async createMembership(data: Omit<Membership, 'id' | 'createdAt' | 'updatedAt'>): Promise<Membership> {
    const existing = this.state.memberships.find(
      (m) => m.userId === data.userId && m.organizationId === data.organizationId
    );
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const membership: Membership = {
      id: crypto.randomUUID(),
      userId: data.userId,
      organizationId: data.organizationId,
      role: data.role,
      createdAt: now,
      updatedAt: now,
    };
    this.state.memberships.push(membership);
    this.scheduleSave();
    return membership;
  }

  public async findMembership(userId: string, organizationId: string): Promise<Membership | null> {
    return this.state.memberships.find((m) => m.userId === userId && m.organizationId === organizationId) || null;
  }

  public async listUserMemberships(userId: string): Promise<(Membership & { organization: Organization })[]> {
    const memberships = this.state.memberships.filter((m) => m.userId === userId);
    return memberships
      .map((m) => {
        const org = this.state.organizations.find((o) => o.id === m.organizationId);
        if (!org) return null;
        return { ...m, organization: org };
      })
      .filter(Boolean) as (Membership & { organization: Organization })[];
  }

  public async listOrgMembers(organizationId: string): Promise<(Membership & { user: Omit<User, 'passwordHash'> })[]> {
    const list = this.state.memberships.filter((m) => m.organizationId === organizationId);
    return list
      .map((m) => {
        const u = this.state.users.find((user) => user.id === m.userId);
        if (!u) return null;
        const { passwordHash, ...safeUser } = u;
        return { ...m, user: safeUser };
      })
      .filter(Boolean) as (Membership & { user: Omit<User, 'passwordHash'> })[];
  }

  // --- Services ---
  public async createService(data: Omit<Service, 'id' | 'consecutiveFailures' | 'createdAt' | 'updatedAt'>): Promise<Service> {
    const now = new Date().toISOString();
    const service: Service = {
      ...data,
      id: crypto.randomUUID(),
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.state.services.push(service);
    this.scheduleSave();
    return service;
  }

  public async findServiceById(id: string, organizationId?: string): Promise<Service | null> {
    const service = this.state.services.find((s) => s.id === id);
    if (!service) return null;
    if (organizationId && service.organizationId !== organizationId) return null;
    return service;
  }

  public async listServices(organizationId: string): Promise<Service[]> {
    return this.state.services.filter((s) => s.organizationId === organizationId);
  }

  public async updateService(id: string, organizationId: string, updates: Partial<Service>): Promise<Service> {
    const idx = this.state.services.findIndex((s) => s.id === id && s.organizationId === organizationId);
    if (idx === -1) {
      throw new Error('Service not found or unauthorized');
    }
    const updated: Service = {
      ...this.state.services[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.state.services[idx] = updated;
    this.scheduleSave();
    return updated;
  }

  public async deleteService(id: string, organizationId: string): Promise<void> {
    const idx = this.state.services.findIndex((s) => s.id === id && s.organizationId === organizationId);
    if (idx === -1) {
      throw new Error('Service not found or unauthorized');
    }
    this.state.services.splice(idx, 1);
    // Cascade delete related records
    this.state.monitoringChecks = this.state.monitoringChecks.filter((c) => c.serviceId !== id);
    this.state.incidents = this.state.incidents.filter((inc) => inc.serviceId !== id);
    this.scheduleSave();
  }

  public async getActiveServicesForMonitoring(): Promise<Service[]> {
    return this.state.services.filter((s) => s.isActive && !s.isPaused);
  }

  // --- Monitoring Check Results ---
  public async recordMonitoringCheck(data: Omit<MonitoringCheckResult, 'id' | 'timestamp'>): Promise<MonitoringCheckResult> {
    const result: MonitoringCheckResult = {
      ...data,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    this.state.monitoringChecks.push(result);

    // Keep memory clean: retain up to last 1000 checks per service
    const serviceChecks = this.state.monitoringChecks.filter((c) => c.serviceId === data.serviceId);
    if (serviceChecks.length > 1000) {
      const idsToRemove = new Set(
        serviceChecks.slice(0, serviceChecks.length - 1000).map((c) => c.id)
      );
      this.state.monitoringChecks = this.state.monitoringChecks.filter((c) => !idsToRemove.has(c.id));
    }

    this.scheduleSave();
    return result;
  }

  public async listMonitoringChecks(
    serviceId: string,
    organizationId: string,
    limit = 100
  ): Promise<MonitoringCheckResult[]> {
    return this.state.monitoringChecks
      .filter((c) => c.serviceId === serviceId && c.organizationId === organizationId)
      .slice(-limit)
      .reverse();
  }

  public async getRecentChecksForService(serviceId: string, limit = 50): Promise<MonitoringCheckResult[]> {
    return this.state.monitoringChecks
      .filter((c) => c.serviceId === serviceId)
      .slice(-limit);
  }

  // --- Incidents ---
  public async createIncident(data: Omit<Incident, 'id' | 'createdAt' | 'updatedAt'>): Promise<Incident> {
    const now = new Date().toISOString();
    const incident: Incident = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.state.incidents.push(incident);
    this.scheduleSave();
    return incident;
  }

  public async findIncidentById(id: string, organizationId?: string): Promise<Incident | null> {
    const inc = this.state.incidents.find((i) => i.id === id);
    if (!inc) return null;
    if (organizationId && inc.organizationId !== organizationId) return null;
    return inc;
  }

  public async findOpenIncidentForService(serviceId: string): Promise<Incident | null> {
    return (
      this.state.incidents.find(
        (i) => i.serviceId === serviceId && i.status !== 'RESOLVED'
      ) || null
    );
  }

  public async listIncidents(organizationId: string, status?: string): Promise<Incident[]> {
    return this.state.incidents
      .filter((i) => {
        if (i.organizationId !== organizationId) return false;
        if (status && i.status !== status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async updateIncident(id: string, organizationId: string, updates: Partial<Incident>): Promise<Incident> {
    const idx = this.state.incidents.findIndex((i) => i.id === id && i.organizationId === organizationId);
    if (idx === -1) {
      throw new Error('Incident not found or unauthorized');
    }
    const updated: Incident = {
      ...this.state.incidents[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.state.incidents[idx] = updated;
    this.scheduleSave();
    return updated;
  }

  // --- Incident Timeline Events ---
  public async createIncidentEvent(data: Omit<IncidentTimelineEvent, 'id' | 'createdAt'>): Promise<IncidentTimelineEvent> {
    const event: IncidentTimelineEvent = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.state.incidentEvents.push(event);
    this.scheduleSave();
    return event;
  }

  public async listIncidentEvents(incidentId: string): Promise<(IncidentTimelineEvent & { user?: { name: string; email: string } })[]> {
    return this.state.incidentEvents
      .filter((e) => e.incidentId === incidentId)
      .map((e) => {
        const u = e.userId ? this.state.users.find((user) => user.id === e.userId) : null;
        return {
          ...e,
          user: u ? { name: u.name, email: u.email } : undefined,
        };
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // --- Notification Channels & Deliveries ---
  public async createNotificationChannel(
    data: Omit<NotificationChannel, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<NotificationChannel> {
    const now = new Date().toISOString();
    const ch: NotificationChannel = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.state.notificationChannels.push(ch);
    this.scheduleSave();
    return ch;
  }

  public async listNotificationChannels(organizationId: string): Promise<NotificationChannel[]> {
    return this.state.notificationChannels.filter((c) => c.organizationId === organizationId);
  }

  public async findNotificationChannelById(id: string, organizationId: string): Promise<NotificationChannel | null> {
    return this.state.notificationChannels.find((c) => c.id === id && c.organizationId === organizationId) || null;
  }

  public async updateNotificationChannel(
    id: string,
    organizationId: string,
    updates: Partial<NotificationChannel>
  ): Promise<NotificationChannel> {
    const idx = this.state.notificationChannels.findIndex((c) => c.id === id && c.organizationId === organizationId);
    if (idx === -1) throw new Error('Channel not found');
    const updated = {
      ...this.state.notificationChannels[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.state.notificationChannels[idx] = updated;
    this.scheduleSave();
    return updated;
  }

  public async deleteNotificationChannel(id: string, organizationId: string): Promise<void> {
    const idx = this.state.notificationChannels.findIndex((c) => c.id === id && c.organizationId === organizationId);
    if (idx === -1) throw new Error('Channel not found');
    this.state.notificationChannels.splice(idx, 1);
    this.scheduleSave();
  }

  public async recordNotificationDelivery(
    data: Omit<NotificationDeliveryAttempt, 'id' | 'createdAt'>
  ): Promise<NotificationDeliveryAttempt> {
    const existing = this.state.notificationDeliveries.find((d) => d.idempotencyKey === data.idempotencyKey);
    if (existing) {
      existing.attempts += 1;
      existing.status = data.status;
      existing.response = data.response;
      existing.deliveredAt = data.deliveredAt || existing.deliveredAt;
      this.scheduleSave();
      return existing;
    }
    const item: NotificationDeliveryAttempt = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.state.notificationDeliveries.push(item);
    this.scheduleSave();
    return item;
  }

  public async listNotificationDeliveries(organizationId: string): Promise<NotificationDeliveryAttempt[]> {
    return this.state.notificationDeliveries
      .filter((d) => d.organizationId === organizationId)
      .slice(-100)
      .reverse();
  }

  // --- Webhook Deliveries ---
  public async recordWebhookDelivery(
    data: Omit<WebhookDelivery, 'id' | 'createdAt'>
  ): Promise<WebhookDelivery> {
    const existing = this.state.webhookDeliveries.find((w) => w.deliveryId === data.deliveryId);
    if (existing) {
      return existing; // idempotent deduplication
    }
    const item: WebhookDelivery = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.state.webhookDeliveries.push(item);
    this.scheduleSave();
    return item;
  }

  public async listWebhookDeliveries(organizationId: string): Promise<WebhookDelivery[]> {
    return this.state.webhookDeliveries
      .filter((w) => w.organizationId === organizationId)
      .slice(-100)
      .reverse();
  }

  // --- Audit Logs ---
  public async logAudit(data: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    const log: AuditLog = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.state.auditLogs.push(log);
    this.scheduleSave();
    return log;
  }

  public async listAuditLogs(organizationId: string): Promise<AuditLog[]> {
    return this.state.auditLogs
      .filter((a) => a.organizationId === organizationId)
      .slice(-100)
      .reverse();
  }

  // Clear/Reset (useful for testing)
  public resetState() {
    this.state = {
      users: [],
      organizations: [],
      memberships: [],
      services: [],
      monitoringChecks: [],
      incidents: [],
      incidentEvents: [],
      notificationChannels: [],
      notificationDeliveries: [],
      webhookDeliveries: [],
      auditLogs: [],
    };
    this.flush();
  }

  public rawState(): DatabaseState {
    return this.state;
  }
}

// Global singleton instance
export const db = new Database();
