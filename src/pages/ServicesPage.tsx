import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { StatusIndicator } from '../components/StatusIndicator';
import {
  Layers,
  Search,
  Plus,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface ServicesPageProps {
  onSelectService: (serviceId: string) => void;
  onOpenCreateService: () => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({
  onSelectService,
  onOpenCreateService,
}) => {
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const loadServices = async () => {
    try {
      const data = await apiRequest('/api/v1/services');
      setServices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleRunCheck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckingId(id);
    try {
      await apiRequest(`/api/v1/services/${id}/check`, { method: 'POST' });
      await loadServices();
    } catch (err: any) {
      alert(`Check failed: ${err.message}`);
    } finally {
      setCheckingId(null);
    }
  };

  const handleTogglePause = async (id: string, currentPaused: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiRequest(`/api/v1/services/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPaused: !currentPaused }),
      });
      await loadServices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${name}"? This will delete all historic check records and associated incident links.`)) {
      return;
    }
    try {
      await apiRequest(`/api/v1/services/${id}`, { method: 'DELETE' });
      await loadServices();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.healthCheckUrl.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Monitored Services
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time HTTP health check configuration and failure threshold monitoring
          </p>
        </div>

        <button
          onClick={onOpenCreateService}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Service</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Status Filter Tabs (functional segmented control) */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg text-xs font-medium self-start">
          {[
            { id: 'ALL', label: 'All Services' },
            { id: 'OPERATIONAL', label: 'Operational' },
            { id: 'DEGRADED', label: 'Degraded' },
            { id: 'DOWN', label: 'Down' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service or URL..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-400">Loading monitored endpoints...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Layers className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700 mb-2" />
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">No services found</h4>
            <p className="text-xs text-neutral-500 mt-1">Register a new service to start automated health monitoring.</p>
            <button
              onClick={onOpenCreateService}
              className="mt-4 px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-md"
            >
              Register Service
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/80 dark:bg-neutral-800/40 text-neutral-500 font-medium border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Interval</th>
                  <th className="py-3 px-4">Threshold</th>
                  <th className="py-3 px-4">Last Check</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-normal">
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => onSelectService(s.id)}
                    className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {s.name}
                        </span>
                        {s.isPaused && (
                          <span className="text-[10px] font-mono text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                            PAUSED
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono truncate max-w-sm mt-0.5">
                        <span className="font-semibold text-neutral-600 dark:text-neutral-300 mr-1.5">{s.httpMethod}</span>
                        {s.healthCheckUrl}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <StatusIndicator status={s.status} size="sm" />
                      {s.consecutiveFailures > 0 && (
                        <div className="text-[10px] text-rose-600 font-mono mt-0.5">
                          {s.consecutiveFailures} consecutive fail
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                      {s.checkIntervalSec}s
                    </td>

                    <td className="py-3 px-4 font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                      {s.failureThreshold} fails
                    </td>

                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                      {s.lastCheckedAt ? new Date(s.lastCheckedAt).toLocaleTimeString() : 'Pending'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={checkingId === s.id}
                          onClick={(e) => handleRunCheck(s.id, e)}
                          title="Run check now"
                          className="px-2.5 py-1 text-[11px] font-medium border border-neutral-200 dark:border-neutral-700 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
                        >
                          {checkingId === s.id ? 'Pinging...' : 'Check'}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleTogglePause(s.id, s.isPaused, e)}
                          title={s.isPaused ? 'Resume monitoring' : 'Pause monitoring'}
                          className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded"
                        >
                          {s.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(s.id, s.name, e)}
                          title="Delete service"
                          className="p-1.5 text-neutral-400 hover:text-rose-600 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
