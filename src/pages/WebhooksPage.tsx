import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import {
  GitBranch,
  ShieldCheck,
  Send,
  RefreshCw,
  Copy,
  Check,
  Terminal,
  Code2,
  CheckCircle2,
} from 'lucide-react';

export const WebhooksPage: React.FC = () => {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEvent, setTestEvent] = useState('deployment_status');
  const [testRef, setTestRef] = useState('v2.19.2-prod');
  const [testDesc, setTestDesc] = useState('Production release with memory leak resolution');
  const [dispatching, setDispatching] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const loadDeliveries = async () => {
    try {
      const data = await apiRequest('/api/v1/webhooks/deliveries');
      setDeliveries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDeliveries();
  }, []);

  const handleTestDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setDispatching(true);
    setTestResult(null);

    try {
      const res = await apiRequest('/api/v1/webhooks/test-dispatch', {
        method: 'POST',
        body: JSON.stringify({
          event: testEvent,
          ref: testRef,
          description: testDesc,
        }),
      });

      setTestResult(res);
      await loadDeliveries();
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setDispatching(false);
    }
  };

  const webhookUrl = `${window.location.origin}/api/v1/webhooks/github`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
          GitHub Webhook Integration
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          HMAC SHA-256 verified deployment tracking, deduplication, and service timeline correlation
        </p>
      </div>

      {/* Integration Credentials Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-white">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Webhook Ingress Endpoint & Security Contract</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Payload URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md select-all"
              />
              <button
                type="button"
                onClick={copyUrl}
                className="p-2 border border-neutral-200 dark:border-neutral-700 rounded-md hover:bg-neutral-50 text-neutral-600 dark:text-neutral-300"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1">
              Signature Algorithm
            </label>
            <input
              type="text"
              readOnly
              value="HMAC SHA-256 (header: X-Hub-Signature-256, raw body buffered)"
              className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-600 dark:text-neutral-400"
            />
          </div>
        </div>

        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg text-xs font-mono text-neutral-600 dark:text-neutral-400 space-y-1">
          <p className="font-semibold text-neutral-800 dark:text-neutral-200">
            curl verification test snippet:
          </p>
          <p className="text-[11px] break-all select-all">
            curl -X POST "{webhookUrl}" -H "X-GitHub-Event: deployment_status" -H "X-GitHub-Delivery: 8fa21-test" -H "X-Hub-Signature-256: sha256=..." -H "Content-Type: application/json" -d '{`{"event":"deployment"}`}'
          </p>
        </div>
      </div>

      {/* Interactive Webhook Simulator */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
              <Code2 className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
              <span>Interactive Signed Webhook Dispatcher</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Generates a real HMAC SHA-256 signature against the raw payload and dispatches it through the ingestion pipeline
            </p>
          </div>
        </div>

        <form onSubmit={handleTestDispatch} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Event Header
            </label>
            <select
              value={testEvent}
              onChange={(e) => setTestEvent(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
            >
              <option value="deployment_status">deployment_status</option>
              <option value="deployment">deployment</option>
              <option value="push">push</option>
              <option value="release">release</option>
              <option value="ping">ping</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Git Ref / Release Tag
            </label>
            <input
              type="text"
              value={testRef}
              onChange={(e) => setTestRef(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Deployment Note
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testDesc}
                onChange={(e) => setTestDesc(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
              />
              <button
                type="submit"
                disabled={dispatching}
                className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 whitespace-nowrap"
              >
                {dispatching ? 'Dispatching...' : 'Dispatch'}
              </button>
            </div>
          </div>
        </form>

        {testResult && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              <span>HMAC SHA-256 Signature Verified & Delivery Logged</span>
            </div>
            <div className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400 break-all">
              Calculated Signature: <span className="text-neutral-900 dark:text-white font-semibold">{testResult.testSignature}</span>
            </div>
            <div className="text-[11px] text-neutral-600 dark:text-neutral-400">
              {testResult.record.responseMessage}
            </div>
          </div>
        )}
      </div>

      {/* Webhook Deliveries Log */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight">
            Webhook Delivery Audit Log
          </h3>
          <button
            onClick={loadDeliveries}
            className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-sm">
          {deliveries.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No webhook events received yet. Dispatch a test delivery above to verify.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50/80 dark:bg-neutral-800/40 text-neutral-500 font-medium border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Event</th>
                    <th className="py-3 px-4">Delivery ID (Idempotency)</th>
                    <th className="py-3 px-4">Sender</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Status & Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-normal">
                  {deliveries.map((w) => (
                    <tr key={w.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                      <td className="py-2.5 px-4 font-mono font-medium text-neutral-900 dark:text-white">
                        {w.event}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-500 truncate max-w-xs">
                        {w.deliveryId}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-700 dark:text-neutral-300">
                        {w.sender || 'system'}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-400 font-mono text-[11px]">
                        {new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-4 text-neutral-600 dark:text-neutral-300">
                        <span className="text-emerald-600 font-semibold mr-1.5">Processed:</span>
                        {w.responseMessage || 'OK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
