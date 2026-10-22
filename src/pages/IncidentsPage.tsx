import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { StatusIndicator } from '../components/StatusIndicator';
import {
  AlertTriangle,
  Plus,
  Search,
  Clock,
  User,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface IncidentsPageProps {
  onSelectIncident: (incidentId: string) => void;
  onOpenDeclareIncident: () => void;
}

export const IncidentsPage: React.FC<IncidentsPageProps> = ({
  onSelectIncident,
  onOpenDeclareIncident,
}) => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadIncidents = async () => {
    try {
      const data = await apiRequest('/api/v1/incidents');
      setIncidents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const filtered = incidents.filter((i) => {
    const matchesSearch =
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.serviceName.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'OPEN'
        ? i.status !== 'RESOLVED'
        : i.status === statusFilter;

    const matchesSeverity = severityFilter === 'ALL' ? true : i.severity === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Incident Management
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Deduplicated incident tracking, severity grading, and investigation timelines
          </p>
        </div>

        <button
          onClick={onOpenDeclareIncident}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 rounded-md hover:bg-rose-700 transition-colors flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Declare Incident</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status segmented tabs */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-lg text-xs font-medium overflow-x-auto scrollbar-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'OPEN', label: 'Open' },
            { id: 'INVESTIGATING', label: 'Investigating' },
            { id: 'IDENTIFIED', label: 'Identified' },
            { id: 'MONITORING', label: 'Monitoring' },
            { id: 'RESOLVED', label: 'Resolved' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm font-semibold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents or notes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900"
          />
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-xs text-neutral-400">Loading incidents...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-12 text-center">
            <AlertTriangle className="w-8 h-8 mx-auto text-neutral-300 dark:text-neutral-700 mb-2" />
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">No incidents match filter</h4>
            <p className="text-xs text-neutral-500 mt-1">Adjust filters or declare a manual incident if needed.</p>
          </div>
        ) : (
          filtered.map((inc) => (
            <div
              key={inc.id}
              onClick={() => onSelectIncident(inc.id)}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 rounded-xl p-5 transition-all cursor-pointer shadow-sm hover:shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <StatusIndicator status={inc.severity} size="sm" />
                    <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                    <StatusIndicator status={inc.status} size="sm" />
                    <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                      {inc.serviceName}
                    </span>
                    <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {inc.isAutoCreated ? 'Auto-Declared (Consecutive Failures)' : 'Manual Incident'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-neutral-900 dark:text-white tracking-tight">
                    {inc.title}
                  </h3>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                    {inc.description}
                  </p>
                </div>

                <div className="flex items-center gap-6 shrink-0 text-xs text-neutral-500">
                  <div className="text-right">
                    <div className="text-[11px] text-neutral-400">Duration</div>
                    <div className="font-mono tabular-nums font-semibold text-neutral-800 dark:text-neutral-200">
                      {inc.durationMinutes ? `${inc.durationMinutes} min` : 'In Progress'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-neutral-400">Assignee</div>
                    <div className="font-medium text-neutral-800 dark:text-neutral-200">
                      {inc.assignedUser?.name || 'Unassigned'}
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-neutral-400" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
