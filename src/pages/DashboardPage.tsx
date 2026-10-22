import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { StatusIndicator } from '../components/StatusIndicator';
import { UptimeBar } from '../components/UptimeBar';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  GitCommit,
  Plus,
} from 'lucide-react';

interface DashboardPageProps {
  onNavigateToService: (serviceId: string) => void;
  onNavigateToIncident: (incidentId: string) => void;
  onOpenCreateService: () => void;
  onOpenDeclareIncident: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToService,
  onNavigateToIncident,
  onOpenCreateService,
  onOpenDeclareIncident,
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingServiceId, setCheckingServiceId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoadError(null);
      const [m, s, inc, w] = await Promise.all([
        apiRequest('/api/v1/metrics/overview?hours=24'),
        apiRequest('/api/v1/services'),
        apiRequest('/api/v1/incidents'),
        apiRequest('/api/v1/webhooks/deliveries'),
      ]);

      setMetrics(m);
      setServices(s);
      setIncidents(inc);
      setWebhooks(w);
    } catch (err: any) {
      console.warn('Dashboard data fetch notification:', err.message);
      setLoadError(err.message || 'Failed to load telemetry data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 15s to show live health checks
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRunCheck = async (serviceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckingServiceId(serviceId);
    try {
      await apiRequest(`/api/v1/services/${serviceId}/check`, { method: 'POST' });
      await loadData();
    } catch (err: any) {
      alert(`Check failed: ${err.message}`);
    } finally {
      setCheckingServiceId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
        <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
          <div className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
          <div className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
          <div className="h-24 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    );
  }

  if (loadError && !metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <div className="p-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl max-w-md mx-auto text-xs text-neutral-700 dark:text-neutral-300">
          <p className="font-semibold mb-1">Connecting to DevPulse telemetry...</p>
          <p className="text-neutral-500">{loadError}</p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            loadData();
          }}
          className="px-4 py-2 text-xs font-semibold bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const activeIncidents = incidents.filter((i) => i.status !== 'RESOLVED');
  const hasOutages = metrics?.downServices > 0;
  const hasDegraded = metrics?.degradedServices > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. System Health Status Banner answering "Is anything broken?" */}
      <div
        className={`p-5 rounded-xl border transition-all ${
          hasOutages
            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
            : hasDegraded
            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
            : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full mt-1 sm:mt-0 shrink-0 ${
                hasOutages ? 'bg-rose-500 animate-pulse' : hasDegraded ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
            />
            <div>
              <h2 className="text-base font-semibold text-neutral-900 dark:text-white tracking-tight">
                {hasOutages
                  ? `${metrics.downServices} Service Outage Detected — Immediate Investigation Required`
                  : hasDegraded
                  ? `${metrics.degradedServices} Service Experiencing Elevated Latency`
                  : 'All Systems Fully Operational'}
              </h2>
              <div className="flex items-center gap-2 text-xs text-neutral-500 mt-0.5">
                <span>24h System Uptime:</span>
                <span className="font-mono tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">
                  {metrics?.systemUptimePercentage}%
                </span>
                <span aria-hidden="true">·</span>
                <span>Active Incidents:</span>
                <span className="font-mono tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">
                  {activeIncidents.length}
                </span>
                <span aria-hidden="true">·</span>
                <span>MTTR:</span>
                <span className="font-mono tabular-nums text-neutral-800 dark:text-neutral-200">
                  {metrics?.mttrMinutes} min
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => {
                setRefreshing(true);
                loadData();
              }}
              title="Refresh telemetry"
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onOpenDeclareIncident}
              className="px-3.5 py-2 text-xs font-medium text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-900 rounded-md transition-colors whitespace-nowrap"
            >
              Declare Incident
            </button>
            <button
              onClick={onOpenCreateService}
              className="px-3.5 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Service</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Structured Metric Grid (Tabular Numerals, Zero Pill) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-500">Service Availability</div>
          <div className="text-2xl font-semibold text-neutral-900 dark:text-white font-mono tabular-nums mt-1">
            {metrics?.operationalServices}
            <span className="text-xs font-normal text-neutral-400 font-sans ml-1">/ {metrics?.totalServices} Nominal</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{metrics?.operationalServices} operational</span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-600 font-semibold">{metrics?.downServices} down</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-500">Mean Latency (p50)</div>
          <div className="text-2xl font-semibold text-neutral-900 dark:text-white font-mono tabular-nums mt-1">
            {metrics?.medianResponseTimeMs}
            <span className="text-xs font-normal text-neutral-400 font-sans ml-1">ms</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-2">
            Average: <span className="font-mono tabular-nums text-neutral-700 dark:text-neutral-300">{metrics?.averageResponseTimeMs}ms</span> · p95: <span className="font-mono tabular-nums text-neutral-700 dark:text-neutral-300">{metrics?.p95ResponseTimeMs}ms</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-500">Active Incidents</div>
          <div className="text-2xl font-semibold text-neutral-900 dark:text-white font-mono tabular-nums mt-1">
            {activeIncidents.length}
            <span className="text-xs font-normal text-neutral-400 font-sans ml-1">open</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-2">
            Total declared: <span className="font-mono tabular-nums text-neutral-700 dark:text-neutral-300">{metrics?.totalIncidentsCount}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="text-xs font-medium text-neutral-500">Mean Recovery Time (MTTR)</div>
          <div className="text-2xl font-semibold text-neutral-900 dark:text-white font-mono tabular-nums mt-1">
            {metrics?.mttrMinutes}
            <span className="text-xs font-normal text-neutral-400 font-sans ml-1">min</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-2">
            Calculated across resolved incidents in 24h
          </div>
        </div>
      </div>

      {/* 3. Active Incidents Callout answering "Where should I investigate?" */}
      {activeIncidents.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span>Active Incidents Under Investigation</span>
            </h3>
            <span className="text-xs text-neutral-500">
              {activeIncidents.length} open
            </span>
          </div>

          <div className="space-y-2.5">
            {activeIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => onNavigateToIncident(inc.id)}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 rounded-xl p-4 transition-all cursor-pointer shadow-sm hover:shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-xs">
                      <StatusIndicator status={inc.severity} size="sm" />
                      <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                      <StatusIndicator status={inc.status} size="sm" />
                      <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                      <span className="text-neutral-500 font-mono text-[11px]">
                        {inc.serviceName}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-neutral-900 dark:text-white mt-1">
                      {inc.title}
                    </h4>
                    <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
                      {inc.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs text-neutral-500">
                    <div>
                      {inc.assignedUser ? (
                        <span>Assigned: <strong className="text-neutral-800 dark:text-neutral-200 font-medium">{inc.assignedUser.name}</strong></span>
                      ) : (
                        <span className="text-rose-600 font-medium">Unassigned</span>
                      )}
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Monitored Services Grid & Live Health */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight">
              Monitored Endpoints
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">Automated health checks, uptime ribbons, and response times</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          {services.map((svc) => (
            <div
              key={svc.id}
              onClick={() => onNavigateToService(svc.id)}
              className="p-4 hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-medium px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 rounded">
                    {svc.httpMethod}
                  </span>
                  <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                    {svc.name}
                  </h4>
                  <StatusIndicator status={svc.status} size="sm" />
                </div>
                <div className="text-xs text-neutral-500 font-mono truncate mt-1">
                  {svc.healthCheckUrl}
                </div>
              </div>

              {/* Uptime and Check Status */}
              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right hidden sm:block">
                  <div className="text-xs text-neutral-400">Health History</div>
                  <div className="text-xs font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                    Every {svc.checkIntervalSec}s
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-mono tabular-nums text-neutral-900 dark:text-white font-medium">
                    {svc.consecutiveFailures > 0 ? (
                      <span className="text-rose-600">{svc.consecutiveFailures} failures</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">100% Up</span>
                    )}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono">
                    {svc.lastCheckedAt ? new Date(svc.lastCheckedAt).toLocaleTimeString() : 'Pending'}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={checkingServiceId === svc.id}
                  onClick={(e) => handleRunCheck(svc.id, e)}
                  title="Run check immediately"
                  className="px-3 py-1.5 text-xs font-medium border border-neutral-200 dark:border-neutral-700 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-700 dark:text-neutral-300 whitespace-nowrap"
                >
                  {checkingServiceId === svc.id ? 'Pinging...' : 'Ping Now'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. What Changed Recently: GitHub Deployment Activity & Timeline */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-neutral-400" />
              <span>Recent Deployments & Webhook Activity</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">Correlated deployment timeline events</p>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
          {webhooks.length === 0 ? (
            <div className="p-6 text-center text-xs text-neutral-400">
              No webhook events received yet. Configure GitHub repository webhooks to trace deployments.
            </div>
          ) : (
            webhooks.slice(0, 4).map((wh) => (
              <div key={wh.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                    <GitCommit className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-neutral-900 dark:text-white mr-2">
                      {wh.event}
                    </span>
                    <span className="text-neutral-500 font-mono text-[11px]">
                      {wh.responseMessage || wh.deliveryId}
                    </span>
                  </div>
                </div>

                <div className="text-neutral-400 font-mono text-[11px] shrink-0">
                  {new Date(wh.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
