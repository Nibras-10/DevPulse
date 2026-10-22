import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { StatusIndicator } from '../components/StatusIndicator';
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  User,
  CheckCircle2,
  Send,
  GitCommit,
  Bell,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

interface IncidentDetailPageProps {
  incidentId: string;
  onBack: () => void;
}

export const IncidentDetailPage: React.FC<IncidentDetailPageProps> = ({ incidentId, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteMessage, setNoteMessage] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDetails = async () => {
    try {
      const [incidentRes, membersRes] = await Promise.all([
        apiRequest(`/api/v1/incidents/${incidentId}`),
        apiRequest('/api/v1/organizations/members'),
      ]);
      setData(incidentRes);
      setMembers(membersRes);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [incidentId]);

  const handleStatusChange = async (newStatus: string) => {
    setActionError(null);
    try {
      await apiRequest(`/api/v1/incidents/${incidentId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus }),
      });
      await loadDetails();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleAcknowledge = async () => {
    setActionError(null);
    try {
      await apiRequest(`/api/v1/incidents/${incidentId}/acknowledge`, { method: 'POST' });
      await loadDetails();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleAssign = async (userId: string) => {
    setActionError(null);
    try {
      await apiRequest(`/api/v1/incidents/${incidentId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      });
      await loadDetails();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteMessage.trim()) return;
    setSubmittingNote(true);
    setActionError(null);

    try {
      await apiRequest(`/api/v1/incidents/${incidentId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ message: noteMessage }),
      });
      setNoteMessage('');
      await loadDetails();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setSubmittingNote(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
        <div className="h-6 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
        <div className="h-28 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
        <div className="h-64 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
      </div>
    );
  }

  const { incident, service, assignedUser, timeline } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Incidents</span>
      </button>

      {/* Header and Incident State Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
        {actionError && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-md text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs">
              <StatusIndicator status={incident.severity} size="sm" />
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
              <StatusIndicator status={incident.status} size="sm" />
              <span aria-hidden="true" className="text-neutral-300 dark:text-neutral-700">·</span>
              <span className="font-semibold text-neutral-900 dark:text-white">
                {service?.name || 'Service'}
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white mt-1">
              {incident.title}
            </h1>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 max-w-3xl">
              {incident.description}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Incident Duration / MTTR */}
            <div className="text-right">
              <div className="text-[11px] text-neutral-400">Recovery Duration</div>
              <div className="font-mono tabular-nums text-sm font-bold text-neutral-900 dark:text-white">
                {incident.durationMinutes ? `${incident.durationMinutes} minutes` : 'Ongoing Investigation'}
              </div>
            </div>

            {/* Assignee Picker */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400">Assignee:</span>
              <select
                value={incident.assignedToUserId || ''}
                onChange={(e) => handleAssign(e.target.value)}
                className="px-2 py-1 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-xs focus:outline-none"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* State Machine Action Controls */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>State Machine Transition:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!incident.acknowledgedAt && (
              <button
                type="button"
                onClick={handleAcknowledge}
                className="px-3 py-1.5 text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors"
              >
                Acknowledge Incident
              </button>
            )}

            {incident.status === 'INVESTIGATING' && (
              <button
                type="button"
                onClick={() => handleStatusChange('IDENTIFIED')}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 rounded-md transition-colors"
              >
                Mark as Identified
              </button>
            )}

            {(incident.status === 'INVESTIGATING' || incident.status === 'IDENTIFIED') && (
              <button
                type="button"
                onClick={() => handleStatusChange('MONITORING')}
                className="px-3 py-1.5 text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 rounded-md transition-colors"
              >
                Mark as Monitoring
              </button>
            )}

            {incident.status !== 'RESOLVED' ? (
              <button
                type="button"
                onClick={() => handleStatusChange('RESOLVED')}
                className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 rounded-md transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Resolve Incident</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStatusChange('INVESTIGATING')}
                className="px-3 py-1.5 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-md transition-colors"
              >
                Reopen Incident
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chronological Event Timeline */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight">
            Investigation & Audit Timeline
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Deduplicated log of telemetry alerts, diagnostics, and team responses
          </p>
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-neutral-200 dark:before:bg-neutral-800">
          {timeline.map((event: any) => {
            let Icon = AlertTriangle;
            let dotColor = 'bg-neutral-400';

            if (event.eventType === 'STATUS_CHANGE') {
              Icon = RefreshCw;
              dotColor = 'bg-amber-500';
            } else if (event.eventType === 'ALERT') {
              Icon = Bell;
              dotColor = 'bg-rose-500';
            } else if (event.eventType === 'DEPLOYMENT') {
              Icon = GitCommit;
              dotColor = 'bg-sky-500';
            } else if (event.eventType === 'ASSIGNMENT') {
              Icon = User;
              dotColor = 'bg-neutral-700';
            } else if (event.eventType === 'CREATED') {
              Icon = AlertTriangle;
              dotColor = 'bg-rose-600';
            }

            return (
              <div key={event.id} className="relative group">
                {/* Timeline node dot */}
                <div
                  className={`absolute -left-[27px] top-1 w-2.5 h-2.5 rounded-full ${dotColor} ring-4 ring-white dark:ring-neutral-900`}
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-neutral-900 dark:text-white">
                      {event.user ? event.user.name : 'System Automated Guard'}
                    </span>
                    <span className="text-neutral-400 font-mono text-[11px]">
                      {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {new Date(event.createdAt).toLocaleDateString()}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
                      {event.eventType}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {event.message}
                  </p>

                  {event.metadata && (
                    <div className="mt-1 p-2 bg-neutral-50 dark:bg-neutral-800/60 rounded text-[11px] font-mono text-neutral-600 dark:text-neutral-400">
                      {JSON.stringify(event.metadata)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Investigation Note */}
        <form onSubmit={handleAddNote} className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-3">
          <label className="block text-xs font-semibold text-neutral-900 dark:text-white">
            Add Investigation Note or Mitigation Update
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={noteMessage}
              onChange={(e) => setNoteMessage(e.target.value)}
              placeholder="Record diagnostic findings, root cause analysis, or stabilization steps..."
              className="flex-1 px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
            <button
              type="submit"
              disabled={submittingNote}
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingNote ? 'Posting...' : 'Post Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
