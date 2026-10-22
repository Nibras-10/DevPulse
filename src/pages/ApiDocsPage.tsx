import React, { useState } from 'react';
import { FileCode, Copy, Check, Terminal, Shield, Lock } from 'lucide-react';

export const ApiDocsPage: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const endpoints = [
    {
      category: 'Authentication',
      method: 'POST',
      path: '/api/v1/auth/login',
      description: 'Authenticate user with email and password, return JWT token and memberships',
      auth: false,
      body: '{\n  "email": "alex@devpulse.io",\n  "password": "Devpulse123!"\n}',
      response: '{\n  "success": true,\n  "data": {\n    "token": "eyJhbGciOi...",\n    "user": { "id": "uuid", "email": "alex@devpulse.io", "name": "Alex Rivers" }\n  }\n}',
    },
    {
      category: 'Services',
      method: 'GET',
      path: '/api/v1/services',
      description: 'List all monitored services in the active tenant organization',
      auth: true,
      response: '{\n  "success": true,\n  "data": [\n    {\n      "id": "uuid",\n      "name": "Authentication API",\n      "status": "OPERATIONAL",\n      "healthCheckUrl": "https://httpbin.org/status/200",\n      "checkIntervalSec": 60\n    }\n  ]\n}',
    },
    {
      category: 'Services',
      method: 'POST',
      path: '/api/v1/services',
      description: 'Register a new monitored endpoint with SSRF validation',
      auth: true,
      body: '{\n  "name": "Payments API",\n  "healthCheckUrl": "https://api.example.com/health",\n  "httpMethod": "GET",\n  "checkIntervalSec": 60,\n  "timeoutMs": 4000,\n  "expectedStatusCode": 200,\n  "failureThreshold": 3\n}',
      response: '{\n  "success": true,\n  "data": { "id": "uuid", "name": "Payments API", "status": "OPERATIONAL" }\n}',
    },
    {
      category: 'Services',
      method: 'POST',
      path: '/api/v1/services/:id/check',
      description: 'Trigger an immediate on-demand health check',
      auth: true,
      response: '{\n  "success": true,\n  "data": {\n    "checkResult": {\n      "isHealthy": true,\n      "responseTimeMs": 48,\n      "statusCode": 200\n    }\n  }\n}',
    },
    {
      category: 'Incidents',
      method: 'GET',
      path: '/api/v1/incidents',
      description: 'List incidents for organization with optional status and severity filtering',
      auth: true,
      response: '{\n  "success": true,\n  "data": [\n    {\n      "id": "uuid",\n      "title": "Elevated 503 latency",\n      "severity": "SEV1_CRITICAL",\n      "status": "INVESTIGATING",\n      "durationMinutes": 24\n    }\n  ]\n}',
    },
    {
      category: 'Incidents',
      method: 'POST',
      path: '/api/v1/incidents/:id/status',
      description: 'Transition incident state machine (Investigating -> Identified -> Monitoring -> Resolved)',
      auth: true,
      body: '{\n  "status": "RESOLVED",\n  "note": "Primary replica failover stabilized connection pool"\n}',
      response: '{\n  "success": true,\n  "data": { "id": "uuid", "status": "RESOLVED", "resolvedAt": "2026-10-15T00:00:00Z" }\n}',
    },
    {
      category: 'Webhooks',
      method: 'POST',
      path: '/api/v1/webhooks/github',
      description: 'Ingest GitHub deployment and push webhooks with HMAC SHA-256 verification',
      auth: false,
      headers: 'X-Hub-Signature-256: sha256=...\nX-GitHub-Delivery: 8fa12-uuid\nX-GitHub-Event: deployment_status',
      body: '{\n  "deployment_status": { "state": "success" },\n  "repository": { "name": "auth-service" }\n}',
      response: '{\n  "success": true,\n  "message": "Deployment event recorded and linked to services"\n}',
    },
    {
      category: 'Metrics',
      method: 'GET',
      path: '/api/v1/metrics/overview?hours=24',
      description: 'Calculates system-wide uptime %, average latency, percentiles, and MTTR',
      auth: true,
      response: '{\n  "success": true,\n  "data": {\n    "systemUptimePercentage": 99.85,\n    "averageResponseTimeMs": 68,\n    "medianResponseTimeMs": 52,\n    "p95ResponseTimeMs": 142,\n    "mttrMinutes": 21\n  }\n}',
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
          REST API Reference (v1)
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Versioned JSON API endpoints for automation, monitoring probes, and CI/CD integrations
        </p>
      </div>

      {/* Auth Guidelines */}
      <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl flex items-start gap-3 shadow-sm text-xs">
        <Lock className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-neutral-900 dark:text-white">Authentication Protocol:</span>
          <p className="text-neutral-600 dark:text-neutral-400 mt-0.5">
            Include the JWT access token in the <code className="font-mono text-neutral-900 dark:text-white">Authorization: Bearer &lt;token&gt;</code> header.
            To specify tenant scope across multi-org memberships, include <code className="font-mono text-neutral-900 dark:text-white">X-Organization-Id: &lt;org_id&gt;</code>.
          </p>
        </div>
      </div>

      {/* Endpoints List */}
      <div className="space-y-4">
        {endpoints.map((ep, idx) => {
          let badgeColor = 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300';
          if (ep.method === 'POST') badgeColor = 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900';
          if (ep.method === 'PATCH') badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200';
          if (ep.method === 'DELETE') badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200';

          return (
            <div
              key={idx}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 space-y-3 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2 py-0.5 font-mono text-[11px] font-bold rounded ${badgeColor}`}>
                    {ep.method}
                  </span>
                  <span className="font-mono text-xs font-semibold text-neutral-900 dark:text-white">
                    {ep.path}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span>{ep.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{ep.auth ? 'Requires Bearer Token' : 'Public / Signature'}</span>
                </div>
              </div>

              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                {ep.description}
              </p>

              {ep.body && (
                <div>
                  <div className="text-[11px] text-neutral-400 mb-1 font-mono">Request Body (application/json):</div>
                  <pre className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-md text-[11px] font-mono text-neutral-800 dark:text-neutral-200 overflow-x-auto">
                    {ep.body}
                  </pre>
                </div>
              )}

              <div>
                <div className="text-[11px] text-neutral-400 mb-1 font-mono">Response Schema (200 OK):</div>
                <pre className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-md text-[11px] font-mono text-neutral-800 dark:text-neutral-200 overflow-x-auto">
                  {ep.response}
                </pre>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
