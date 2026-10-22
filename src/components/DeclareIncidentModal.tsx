import React, { useState } from 'react';
import { apiRequest } from '../lib/api';
import { X, AlertCircle } from 'lucide-react';

interface DeclareIncidentModalProps {
  isOpen: boolean;
  services: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeclareIncidentModal: React.FC<DeclareIncidentModalProps> = ({
  isOpen,
  services,
  onClose,
  onSuccess,
}) => {
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'SEV1_CRITICAL' | 'SEV2_MAJOR' | 'SEV3_MINOR' | 'SEV4_LOW'>(
    'SEV2_MAJOR'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId && services.length > 0) {
      setServiceId(services[0].id);
    }
    setIsSubmitting(true);
    setError(null);

    try {
      await apiRequest('/api/v1/incidents', {
        method: 'POST',
        body: JSON.stringify({
          serviceId: serviceId || services[0]?.id,
          title,
          description,
          severity,
        }),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to declare incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Declare Manual Incident</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Alert on-call team and open audit timeline</p>
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
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Affected Service *
            </label>
            <select
              value={serviceId || (services[0]?.id ?? '')}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Severity Level *
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'SEV1_CRITICAL', label: 'SEV1 Critical', desc: 'Total outage' },
                { id: 'SEV2_MAJOR', label: 'SEV2 Major', desc: 'Severe degradation' },
                { id: 'SEV3_MINOR', label: 'SEV3 Minor', desc: 'Partial impact' },
                { id: 'SEV4_LOW', label: 'SEV4 Low', desc: 'Low urgency' },
              ].map((lvl) => (
                <button
                  type="button"
                  key={lvl.id}
                  onClick={() => setSeverity(lvl.id as any)}
                  className={`p-2.5 rounded-md border text-left transition-colors ${
                    severity === lvl.id
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900 shadow-sm'
                      : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="text-xs font-semibold leading-tight">{lvl.label}</div>
                  <div className={`text-[10px] mt-0.5 ${severity === lvl.id ? 'opacity-80' : 'text-neutral-400'}`}>
                    {lvl.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Incident Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Memory pressure on indexing cluster"
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Initial Investigation Summary *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Symptoms observed, customer impact, initial triage steps..."
              className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 resize-none"
            />
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
              className="px-4 py-2 text-xs font-medium text-white bg-rose-600 rounded-md hover:bg-rose-700 transition-colors"
            >
              {isSubmitting ? 'Declaring...' : 'Declare Incident & Page On-Call'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
