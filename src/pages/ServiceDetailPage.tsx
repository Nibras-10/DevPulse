import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { StatusIndicator } from '../components/StatusIndicator';
import { LatencyChart } from '../components/LatencyChart';
import {
  ArrowLeft,
  RefreshCw,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';

interface ServiceDetailPageProps {
  serviceId: string;
  onBack: () => void;
  onNavigateToIncident: (incidentId: string) => void;
}

export const ServiceDetailPage: React.FC<ServiceDetailPageProps> = ({
  serviceId,
  onBack,
  onNavigateToIncident,
}) => {
  const [data, setData] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  const loadDetails = async () => {
    try {
      const [serviceRes, metricsRes] = await Promise.all([
        apiRequest(`/api/v1/services/${serviceId}`),
        apiRequest(`/api/v1/metrics/services/${serviceId}`),
      ]);
      setData(serviceRes);
      setMetrics(metricsRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [serviceId]);

  const handleRunCheck = async () => {
    setChecking(true);
    try {
      await apiRequest(`/api/v1/services/${serviceId}/check`, { method: 'POST' });
      await loadDetails();
    } catch (err: any) {
      alert(`Check error: ${err.message}`);
    } finally {
      setChecking(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
        <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
        <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
        <div className="h-64 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
      </div>
    );
  }

  const { service, recentChecks, activeIncident } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Services</span>
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
              {service.name}
            </h1>
            <StatusIndicator status={service.status} />
          </div>
          <p className="text-xs text-neutral-500 mt-1 font-mono flex items-center gap-2">
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">{service.httpMethod}</span>
            <span>{service.healthCheckUrl}</span>
          </p>
          {service.description && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{service.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRunCheck}
            disabled={checking}
            className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Endpoint...' : 'Execute Health Check'}</span>
          </button>
        </div>
      </div>

      {/* Active Incident Warning if exists */}
      {activeIncident && (
        <div
          onClick={() => onNavigateToIncident(activeIncident.id)}
          className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between cursor-pointer hover:border-rose-400 transition-all"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                Active Incident Declared: {activeIncident.title}
              </div>
              <div className="text-[11px] text-rose-700 dark:text-rose-400">
                Consecutive failures reached threshold ({service.failureThreshold}). Click to inspect triage timeline.
              </div>
            </div>
          </div>
          <span className="text-xs font-semibold text-rose-700 hover:underline shrink-0">
            View Incident →
          </span>
        </div>
      )}

      {/* Reliability KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-500 font-medium">Uptime Percentage</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
            {metrics?.uptimePercentage}%
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            {metrics?.healthyCount} of {metrics?.totalChecks} checks nominal
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-500 font-medium">Average Response Time</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
            {metrics?.avgLatency} <span className="text-xs font-sans font-normal text-neutral-400">ms</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Timeout limit: {service.timeoutMs}ms
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-500 font-medium">Check Cadence</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
            {service.checkIntervalSec} <span className="text-xs font-sans font-normal text-neutral-400">sec</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Expected HTTP: {service.expectedStatusCode}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-500 font-medium">Failure Threshold</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
            {service.failureThreshold} <span className="text-xs font-sans font-normal text-neutral-400">checks</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Consecutive failures: {service.consecutiveFailures}
          </div>
        </div>
      </div>

      {/* Latency History Chart */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight">
            Response Time Trend (ms)
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">Latency measurements per health check cycle</p>
        </div>
        <LatencyChart data={metrics?.points || []} height={240} />
      </div>

      {/* Detailed Check History Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight">
            Execution Log
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">Most recent checks recorded by background workers</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 dark:bg-neutral-800/40 text-neutral-500 font-medium border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">HTTP Code</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Diagnostic Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-normal">
              {recentChecks.map((c: any) => (
                <tr key={c.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                  <td className="py-2.5 px-4">
                    {c.isHealthy ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Nominal</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-rose-600 font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Failed</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                    {c.statusCode || 'N/A'}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                    {c.responseTimeMs} ms
                  </td>
                  <td className="py-2.5 px-4 text-neutral-500 font-mono text-[11px]">
                    {new Date(c.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 px-4 text-neutral-500 font-mono text-[11px] truncate max-w-xs">
                    {c.errorMessage || 'HTTP OK'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
