-- DevPulse PostgreSQL Migration: Initial Schema
-- Enums
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "ServiceStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'DOWN');
CREATE TYPE "IncidentStatus" AS ENUM ('INVESTIGATING', 'IDENTIFIED', 'MONITORING', 'RESOLVED');
CREATE TYPE "IncidentSeverity" AS ENUM ('SEV1_CRITICAL', 'SEV2_MAJOR', 'SEV3_MINOR', 'SEV4_LOW');
CREATE TYPE "ChannelType" AS ENUM ('EMAIL', 'WEBHOOK', 'SLACK');
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'PROCESSED', 'REJECTED', 'FAILED');

-- Users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Organizations table
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL UNIQUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Memberships table
CREATE TABLE "memberships" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "memberships_user_org_unique" UNIQUE ("user_id", "organization_id")
);
CREATE INDEX "memberships_organization_id_idx" ON "memberships"("organization_id");
CREATE INDEX "memberships_user_id_idx" ON "memberships"("user_id");

-- Services table
CREATE TABLE "services" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "health_check_url" TEXT NOT NULL,
    "http_method" VARCHAR(10) NOT NULL DEFAULT 'GET',
    "check_interval_sec" INTEGER NOT NULL DEFAULT 60,
    "timeout_ms" INTEGER NOT NULL DEFAULT 5000,
    "expected_status_code" INTEGER NOT NULL DEFAULT 200,
    "failure_threshold" INTEGER NOT NULL DEFAULT 3,
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "status" "ServiceStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "is_paused" BOOLEAN NOT NULL DEFAULT FALSE,
    "last_checked_at" TIMESTAMP(3),
    "last_successful_check_at" TIMESTAMP(3),
    "last_failed_check_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "services_organization_id_idx" ON "services"("organization_id");
CREATE INDEX "services_status_idx" ON "services"("status");

-- Monitoring check results table
CREATE TABLE "monitoring_check_results" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "service_id" TEXT NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
    "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "status_code" INTEGER,
    "response_time_ms" INTEGER NOT NULL,
    "is_healthy" BOOLEAN NOT NULL,
    "error_message" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "monitoring_checks_service_timestamp_idx" ON "monitoring_check_results"("service_id", "timestamp");
CREATE INDEX "monitoring_checks_org_timestamp_idx" ON "monitoring_check_results"("organization_id", "timestamp");

-- Incidents table
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "service_id" TEXT NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'SEV2_MAJOR',
    "status" "IncidentStatus" NOT NULL DEFAULT 'INVESTIGATING',
    "assigned_to_user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "is_auto_created" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "incidents_org_status_idx" ON "incidents"("organization_id", "status");
CREATE INDEX "incidents_service_status_idx" ON "incidents"("service_id", "status");

-- Incident timeline events
CREATE TABLE "incident_timeline_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incident_id" TEXT NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE,
    "user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "event_type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "incident_timeline_incident_idx" ON "incident_timeline_events"("incident_id", "created_at");

-- Notification channels
CREATE TABLE "notification_channels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL DEFAULT 'EMAIL',
    "destination" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Notification delivery attempts
CREATE TABLE "notification_delivery_attempts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "incident_id" TEXT NOT NULL REFERENCES "incidents"("id") ON DELETE CASCADE,
    "channel_id" TEXT NOT NULL REFERENCES "notification_channels"("id") ON DELETE CASCADE,
    "idempotency_key" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "response" TEXT,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Webhook deliveries
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "delivery_id" TEXT NOT NULL UNIQUE,
    "event" TEXT NOT NULL,
    "sender" TEXT,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PROCESSED',
    "payload" JSONB NOT NULL,
    "response_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "webhooks_org_created_idx" ON "webhook_deliveries"("organization_id", "created_at");

-- Audit logs
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization_id" TEXT NOT NULL REFERENCES "organizations"("id") ON DELETE CASCADE,
    "user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "audit_logs_org_idx" ON "audit_logs"("organization_id", "created_at");
