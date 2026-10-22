# DevPulse — Developer Incident & Reliability Platform

DevPulse is a high-availability incident management and service reliability platform designed for engineering teams. It continuously monitors the availability of HTTP microservices, executes scheduled health checks, detects failures using configurable threshold policies, prevents noisy duplicate alerts, and orchestrates incident triage with real-time audit event timelines.

---

## 1. Product Overview & Problem Statement

Engineering teams frequently encounter critical reliability pitfalls:
- **Delayed Outage Discovery**: Teams find out about API outages from frustrated customers instead of proactive monitoring.
- **Alert Fatigue & Noise**: Transient network blips create repeated notification noise. DevPulse solves this with **configurable consecutive-failure thresholds** (e.g. 3 consecutive fails before declaring an incident) and strict **incident deduplication**.
- **Ambiguous Triage & Resolution Timelines**: DevPulse maintains a chronological audit timeline of state transitions, investigation notes, team assignments, and correlated GitHub deployments.
- **Silent Background Worker Failures**: Asynchronous alert dispatch is powered by persistent retry queues with exponential backoff and idempotency keys (`incident:<id>:<status>:<channel>`), preventing duplicate alert spam across worker retries.

---

## 2. Technology Stack

### Backend
- **Node.js & TypeScript** (strict mode)
- **Express.js** REST API architecture under `/api/v1`
- **Zod**: Runtime schema validation for request payloads and environment variables
- **Prisma ORM**: Relational schema definitions (`prisma/schema.prisma`) and PostgreSQL migrations (`prisma/migrations/20261015000000_init/migration.sql`)
- **Persistent Storage Engine**: Relational engine supporting foreign key cascades, tenant isolation, and atomic state synchronization
- **Bcrypt**: Password hashing with 10 salt rounds
- **JSON Web Tokens (JWT)**: Secure Bearer tokens & HTTP-only cookies
- **SSRF Protection**: Kernel-level blocking of RFC 1918 private ranges, link-local metadata endpoints (`169.254.169.254`), and loopback addresses
- **HMAC SHA-256 Signature Verification**: Verification of GitHub webhook deliveries against buffered raw request bodies using `crypto.timingSafeEqual`
- **Vitest**: Automated test suite covering auth, tenant isolation, state machine, deduplication, and metrics

### Frontend
- **React 19 & TypeScript**
- **Vite & Tailwind CSS v4**
- **Apple-Inspired Minimal Design**: Restrained monochrome surfaces (`#FAFAFA` / `#0F1117`), zero-pill metadata discipline with unboxed text and status indicators, strict single-line controls (`whitespace-nowrap shrink-0`)
- **Lucide Icons**: Accessible, crisp iconography
- **Recharts**: Responsive response time trend areas with clean tabular numeric tooltips (`font-mono tabular-nums`)

---

## 3. Architecture & System Lifecycle

```
[ Developer Browser / Client ]
            │  HTTPS / JWT Bearer + Tenant Scope (X-Organization-Id)
            ▼
┌──────────────────────────────────────────────────────────────┐
│                    DevPulse Node.js Server                   │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    REST API v1                         │  │
│  │  - /auth          - /organizations   - /services       │  │
│  │  - /incidents     - /notifications   - /webhooks       │  │
│  │  - /metrics       - /health                            │  │
│  └────────────────────────────────────────────────────────┘  │
│                               │                              │
│       ┌───────────────────────┴───────────────────────┐      │
│       ▼                                               ▼      │
│  ┌─────────────────────────┐             ┌────────────────┐  │
│  │  SSRF Security Guard    │             │  HMAC SHA-256  │  │
│  │  - Blocks 127.0.0.1     │             │  Webhook Gate  │  │
│  │  - Blocks 169.254.*     │             │  (GitHub Raw)  │  │
│  │  - Blocks RFC1918       │             └────────────────┘  │
│  └─────────────────────────┘                                 │
│               │                                              │
│               ▼                                              │
│  ┌─────────────────────────┐             ┌────────────────┐  │
│  │  Health Check Prober    │             │ Alert Delivery │  │
│  │  - performance.now() ms │             │ Queue Worker   │  │
│  │  - HTTP Status verify   │             │ - Exp. Backoff │  │
│  │  - AbortSignal timeout  │             │ - Idempotency  │  │
│  └─────────────────────────┘             └────────────────┘  │
│               │                                   │          │
│               ▼                                   ▼          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                Persistent Relational DB                │  │
│  │  - Users, Orgs, Services, CheckResults, Incidents      │  │
│  │  - IncidentTimelineEvents, Deliveries, AuditLogs       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Database Entity Relationships

- **User**: `id`, `email`, `name`, `passwordHash`, `createdAt`, `updatedAt`
- **Organization**: `id`, `name`, `slug`, `createdAt`, `updatedAt`
- **Membership**: `userId` -> `User.id`, `organizationId` -> `Organization.id`, `role` (`OWNER`, `ADMIN`, `MEMBER`)
- **Service**: `id`, `organizationId` -> `Organization.id`, `name`, `healthCheckUrl`, `httpMethod`, `checkIntervalSec`, `timeoutMs`, `expectedStatusCode`, `failureThreshold`, `consecutiveFailures`, `status` (`OPERATIONAL`, `DEGRADED`, `DOWN`)
- **MonitoringCheckResult**: `id`, `serviceId` -> `Service.id`, `statusCode`, `responseTimeMs`, `isHealthy`, `errorMessage`, `timestamp`
- **Incident**: `id`, `organizationId`, `serviceId` -> `Service.id`, `title`, `description`, `severity` (`SEV1`..`SEV4`), `status` (`INVESTIGATING`, `IDENTIFIED`, `MONITORING`, `RESOLVED`), `assignedToUserId`, `acknowledgedAt`, `resolvedAt`, `durationMinutes`, `isAutoCreated`
- **IncidentTimelineEvent**: `id`, `incidentId` -> `Incident.id`, `userId`, `eventType` (`CREATED`, `STATUS_CHANGE`, `ALERT`, `NOTE`, `DEPLOYMENT`, `ASSIGNMENT`), `message`, `metadata`, `createdAt`
- **NotificationChannel**: `id`, `organizationId`, `name`, `type` (`EMAIL`, `SLACK`, `WEBHOOK`), `destination`, `isEnabled`
- **NotificationDeliveryAttempt**: `id`, `idempotencyKey`, `status`, `attempts`, `payload`, `response`, `deliveredAt`
- **WebhookDelivery**: `id`, `deliveryId` (GitHub `X-GitHub-Delivery`), `event`, `status`, `payload`, `responseMessage`
- **AuditLog**: `id`, `organizationId`, `userId`, `action`, `targetType`, `targetId`, `ipAddress`, `createdAt`

---

## 5. Security Architecture & SSRF Guard

Health check systems risk becoming unrestricted Server-Side Request Proxies if left unshielded. DevPulse enforces:
1. **SSRF Guard (`server/modules/monitoring/ssrf.guard.ts`)**:
   - Only `http:` and `https:` schemes allowed.
   - Loopback IPs blocked: `127.0.0.1`, `localhost`, `0.0.0.0`, `::1`.
   - Cloud instance metadata blocked: `169.254.169.254`, `metadata.google.internal`.
   - Private RFC 1918 subnets blocked: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`.
2. **Tenant Isolation**: Every organization-scoped resource requires user membership verification. Cross-tenant access attempts immediately fail with `403 Forbidden`.
3. **Constant-Time HMAC Verification**: Webhook payloads are verified using `crypto.timingSafeEqual` against buffered raw request bytes.

---

## 6. Local Setup & Windows Development (No Docker Required)

DevPulse is designed to install and run natively on Windows, Linux, and macOS without Docker.

### Prerequisites
- Node.js `v18.0.0` or higher (`node -v`)
- npm `v9.0.0` or higher (`npm -v`)

### Steps
1. **Clone the repository and install dependencies**:
   ```bash
   git clone <repo_url>
   cd devpulse
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Run Automated Tests**:
   ```bash
   npm test
   ```
   Runs 14 Vitest unit and integration tests verifying authentication, tenant isolation, SSRF prevention, incident state machine transitions, deduplication, and HMAC verification.

4. **Start the Fullstack Development Server**:
   ```bash
   npm run dev
   ```
   DevPulse starts on `http://localhost:3000`. Demo data is automatically seeded on startup with realistic microservices, historical checks, active incidents, and webhook records.

### Optional: Native PostgreSQL & Redis Setup for Production
If you wish to point DevPulse to a local native PostgreSQL instance:
1. Install PostgreSQL natively on Windows via the installer or `winget install PostgreSQL.PostgreSQL`.
2. Create database:
   ```sql
   CREATE DATABASE devpulse;
   ```
3. Set `DATABASE_URL="postgresql://postgres:password@localhost:5432/devpulse?schema=public"` in `.env`.
4. Apply the Prisma migration:
   ```bash
   npx prisma migrate deploy
   ```

---

## 7. Demo Accounts & Personas

For immediate evaluation, the seed script provisions three personas:
- **Alex Rivers** (`alex@devpulse.io` / `Devpulse123!`): Owner of *Acme Cloud Platform*. Full administrative permissions.
- **Sarah Chen** (`sarah@devpulse.io` / `Devpulse123!`): Admin & On-Call Lead of *Acme Cloud Platform*. Assigned to active Elasticsearch SEV1 incident.
- **Elena Rostova** (`elena@stripeflow.com` / `Devpulse123!`): Owner of *Stripeflow Payments*. Verifies complete multi-tenant data isolation.

Switch between personas with 1 click using the **Switch Role / Persona** button in the header or footer!
