import React, { useState } from 'react';
import { apiRequest } from '../lib/api';
import { X, ShieldAlert, Check } from 'lucide-react';

interface CreateServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateServiceModal: React.FC<CreateServiceModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [healthCheckUrl, setHealthCheckUrl] = useState('https://httpbin.org/status/200');
  const [httpMethod, setHttpMethod] = useState<'GET' | 'POST' | 'HEAD'>('GET');
  const [checkIntervalSec, setCheckIntervalSec] = useState(60);
  const [timeoutMs, setTimeoutMs] = useState(4000);
  const [expectedStatusCode, setExpectedStatusCode] = useState(200);
  const [failureThreshold, setFailureThreshold] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await apiRequest('/api/v1/services', {
        method: 'POST',
        body: JSON.stringify({
          name,
          description: description || undefined,
          healthCheckUrl,
          httpMethod,
          checkIntervalSec: Number(checkIntervalSec),
          timeoutMs: Number(timeoutMs),
          expectedStatusCode: Number(expectedStatusCode),
          failureThreshold: Number(failureThreshold),
        }),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create service');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Register Monitored Service</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Continuous health check execution and threshold alerting</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-md text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Service Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Identity & OAuth Service"
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary API ingress gateway"
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Method
              </label>
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value as any)}
                className="w-full px-2 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="GET">GET</option>
                <option value="HEAD">HEAD</option>
                <option value="POST">POST</option>
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Health Check URL * (Protected against SSRF)
              </label>
              <input
                type="url"
                required
                value={healthCheckUrl}
                onChange={(e) => setHealthCheckUrl(e.target.value)}
                placeholder="https://api.example.com/health"
                className="w-full px-3 py-2 text-sm font-mono bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Interval (sec)
              </label>
              <input
                type="number"
                min="10"
                max="3600"
                value={checkIntervalSec}
                onChange={(e) => setCheckIntervalSec(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Timeout (ms)
              </label>
              <input
                type="number"
                min="500"
                max="30000"
                step="500"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Expected HTTP
              </label>
              <input
                type="number"
                min="100"
                max="599"
                value={expectedStatusCode}
                onChange={(e) => setExpectedStatusCode(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Consecutive Failure Threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="10"
                value={failureThreshold}
                onChange={(e) => setFailureThreshold(Number(e.target.value))}
                className="w-full accent-neutral-900 dark:accent-white"
              />
              <span className="font-mono text-sm font-semibold tabular-nums w-8 text-right">
                {failureThreshold}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Declares an incident automatically only when {failureThreshold} checks fail consecutively. Single spikes will not generate noisy alerts.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors flex items-center gap-2"
            >
              {isSubmitting ? 'Registering...' : 'Register & Run Initial Check'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
