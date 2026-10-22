import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import {
  Bell,
  Mail,
  Webhook,
  MessageSquare,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  RotateCcw,
  X,
  AlertTriangle,
} from 'lucide-react';

export const AlertsPage: React.FC = () => {
  const [channels, setChannels] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'EMAIL' | 'SLACK' | 'WEBHOOK'>('EMAIL');
  const [channelDestination, setChannelDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadAlertData = async () => {
    try {
      const [ch, deliv, q] = await Promise.all([
        apiRequest('/api/v1/notifications/channels'),
        apiRequest('/api/v1/notifications/deliveries'),
        apiRequest('/api/v1/notifications/queue/status'),
      ]);
      setChannels(ch);
      setDeliveries(deliv);
      setQueueStatus(q);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlertData();
  }, []);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);
    try {
      await apiRequest('/api/v1/notifications/channels', {
        method: 'POST',
        body: JSON.stringify({
          name: channelName,
          type: channelType,
          destination: channelDestination,
        }),
      });
      setIsAddModalOpen(false);
      setChannelName('');
      setChannelDestination('');
      await loadAlertData();
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleChannel = async (id: string, currentEnabled: boolean) => {
    try {
      await apiRequest(`/api/v1/notifications/channels/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isEnabled: !currentEnabled }),
      });
      await loadAlertData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm('Delete this notification channel?')) return;
    try {
      await apiRequest(`/api/v1/notifications/channels/${id}`, { method: 'DELETE' });
      await loadAlertData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await apiRequest(`/api/v1/notifications/queue/retry/${jobId}`, { method: 'POST' });
      await loadAlertData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Alert Processing & Notifications
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Asynchronous delivery queues, idempotent deduplication, and exponential backoff
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Channel</span>
        </button>
      </div>

      {/* Notification Queue Telemetry */}
      {queueStatus && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <div className="text-xs text-neutral-500 font-medium">Total Alert Jobs</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
              {queueStatus.totalJobs}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Deduplicated per incident</div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <div className="text-xs text-neutral-500 font-medium">Completed Deliveries</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
              {queueStatus.completed}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Delivered via worker</div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <div className="text-xs text-neutral-500 font-medium">In Queue / Processing</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-neutral-900 dark:text-white mt-1">
              {queueStatus.pending + queueStatus.processing}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Exponential backoff retry pool</div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
            <div className="text-xs text-neutral-500 font-medium">Dead-Letter / Failed</div>
            <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 mt-1">
              {queueStatus.failed}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1">Permanent failures after 3 attempts</div>
          </div>
        </div>
      )}

      {/* Configured Channels Grid */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight">
          Configured Alert Channels
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((ch) => {
            let Icon = Bell;
            if (ch.type === 'EMAIL') Icon = Mail;
            if (ch.type === 'SLACK') Icon = MessageSquare;
            if (ch.type === 'WEBHOOK') Icon = Webhook;

            return (
              <div
                key={ch.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5 text-neutral-700 dark:text-neutral-300" />
                      </div>
                      <span className="text-xs font-mono font-medium text-neutral-500 uppercase">
                        {ch.type}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleChannel(ch.id, ch.isEnabled)}
                      className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                        ch.isEnabled
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'
                      }`}
                    >
                      {ch.isEnabled ? 'Active' : 'Disabled'}
                    </button>
                  </div>

                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white mt-3">
                    {ch.name}
                  </h4>
                  <p className="text-xs font-mono text-neutral-500 truncate mt-1">
                    {ch.destination}
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
                  <span>Created {new Date(ch.createdAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleDeleteChannel(ch.id)}
                    className="text-neutral-400 hover:text-rose-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Delivery Log Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight">
              Recent Delivery Attempts & Audit
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Strict idempotency keys prevent duplicate alerts across worker restarts
            </p>
          </div>
          <button
            onClick={loadAlertData}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
          {deliveries.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No alert deliveries recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/80 dark:bg-neutral-800/40 text-neutral-500 font-medium border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Idempotency Key</th>
                    <th className="py-3 px-4">Attempts</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Payload Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-normal">
                  {deliveries.map((d) => (
                    <tr key={d.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                      <td className="py-2.5 px-4">
                        {d.status === 'DELIVERED' ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Delivered</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-600 font-medium">
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Failed</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-700 dark:text-neutral-300">
                        {d.idempotencyKey}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                        {d.attempts} / 3
                      </td>
                      <td className="py-2.5 px-4 text-neutral-400 font-mono text-[11px]">
                        {new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-500 font-mono text-[11px] truncate max-w-xs">
                        {d.response || JSON.stringify(d.payload)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Add Channel Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Add Alert Channel</h3>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-md text-xs">{modalError}</div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  required
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  placeholder="e.g. SRE Escalation Email"
                  className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Channel Type
                </label>
                <select
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
                >
                  <option value="EMAIL">Email (SMTP / Local Mailer)</option>
                  <option value="SLACK">Slack Webhook</option>
                  <option value="WEBHOOK">Generic HTTP Webhook</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Destination (Email address or Webhook URL)
                </label>
                <input
                  type="text"
                  required
                  value={channelDestination}
                  onChange={(e) => setChannelDestination(e.target.value)}
                  placeholder={channelType === 'EMAIL' ? 'alerts@company.internal' : 'https://hooks.slack.com/...'}
                  className="w-full px-3 py-2 text-sm font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs text-neutral-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-md"
                >
                  {submitting ? 'Adding...' : 'Save Channel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
