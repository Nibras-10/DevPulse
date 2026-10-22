import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, UserCheck, Shield, KeyRound, Building2 } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, quickLoginAs, user } = useAuth();
  const [mode, setMode] = useState<'quick' | 'login' | 'register'>('quick');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleQuickSwitch = async (preset: 'owner' | 'admin' | 'external') => {
    setLoading(true);
    setError(null);
    try {
      await quickLoginAs(preset);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password, orgName || undefined);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              {mode === 'quick' ? 'Persona & Tenant Access' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">Role-based access control and tenant isolation</p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-md text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg mb-4 text-xs font-medium">
            <button
              onClick={() => {
                setMode('quick');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                mode === 'quick'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Demo Personas
            </button>
            <button
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Register
            </button>
          </div>

          {mode === 'quick' ? (
            <div className="space-y-2.5">
              <p className="text-xs text-neutral-500 mb-2">
                Click any role to test permissions, RBAC, and multi-tenant isolation:
              </p>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickSwitch('owner')}
                className="w-full text-left p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white transition-all bg-neutral-50 dark:bg-neutral-800/40 hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-xs">
                    AR
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      Alex Rivers
                      <span className="text-[10px] text-neutral-400 font-mono font-normal">OWNER</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">Acme Cloud Platform · Full admin permissions</div>
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white" />
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickSwitch('admin')}
                className="w-full text-left p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white transition-all bg-neutral-50 dark:bg-neutral-800/40 hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                    SC
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      Sarah Chen
                      <span className="text-[10px] text-neutral-400 font-mono font-normal">ADMIN</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">Acme Cloud Platform · On-Call Lead & Responder</div>
                  </div>
                </div>
                <Shield className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white" />
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickSwitch('external')}
                className="w-full text-left p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-white transition-all bg-neutral-50 dark:bg-neutral-800/40 hover:bg-white dark:hover:bg-neutral-800 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-700 text-white flex items-center justify-center font-bold text-xs">
                    ER
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      Elena Rostova
                      <span className="text-[10px] text-neutral-400 font-mono font-normal">ISOLATED TENANT</span>
                    </div>
                    <div className="text-[11px] text-neutral-500">Stripeflow Payments · Tests cross-tenant isolation</div>
                  </div>
                </div>
                <Building2 className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleCustomSubmit} className="space-y-3.5">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                      Organization Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g. NextGen Microservices"
                      className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Password (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
                >
                  {loading ? 'Authenticating...' : mode === 'login' ? 'Sign In with Password' : 'Create Organization'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
