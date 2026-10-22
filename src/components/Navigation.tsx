import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  Layers,
  AlertTriangle,
  Bell,
  GitBranch,
  Settings,
  FileCode,
  ChevronDown,
  LogOut,
  UserCheck,
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'services' | 'incidents' | 'alerts' | 'webhooks' | 'settings' | 'docs';

interface NavigationProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onTabChange, onOpenAuth }) => {
  const { user, activeOrg, role, memberships, switchOrg, logout } = useAuth();
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navItems: { id: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Overview', icon: Activity },
    { id: 'services', label: 'Services', icon: Layers },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'webhooks', label: 'Webhooks', icon: GitBranch },
    { id: 'settings', label: 'Team', icon: Settings },
    { id: 'docs', label: 'API Reference', icon: FileCode },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => onTabChange('dashboard')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold text-sm tracking-tighter">
              DP
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap">
                DevPulse
              </span>
              <span className="hidden sm:inline-block text-[11px] text-neutral-400 font-mono ml-2">
                v1.0.4
              </span>
            </div>
          </button>

          {/* Org Switcher */}
          {activeOrg && (
            <div className="relative ml-2 pl-3 border-l border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
                className="flex items-center gap-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 py-1 px-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors whitespace-nowrap"
              >
                <span className="max-w-[140px] truncate">{activeOrg.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {isOrgMenuOpen && (
                <div className="absolute left-0 mt-1 w-56 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                    Organizations
                  </div>
                  {memberships.map((m) => (
                    <button
                      key={m.organizationId}
                      onClick={() => {
                        switchOrg(m.organizationId);
                        setIsOrgMenuOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors ${
                        m.organizationId === activeOrg.id ? 'font-semibold text-neutral-900 dark:text-white' : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <span className="truncate">{m.organization.name}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">{m.role}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-neutral-900 dark:text-white font-semibold bg-neutral-100 dark:bg-neutral-800'
                    : 'hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-neutral-900 dark:text-white' : 'text-neutral-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Account & Persona Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 py-1 px-2.5 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
              >
                <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-semibold text-xs text-neutral-700 dark:text-neutral-300">
                  {user.name[0]}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-medium text-neutral-900 dark:text-white leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[10px] text-neutral-500 capitalize">
                    {role.toLowerCase()}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg py-1 z-50">
                  <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800">
                    <p className="text-xs font-semibold text-neutral-900 dark:text-white">{user.name}</p>
                    <p className="text-[11px] text-neutral-500 font-mono truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onOpenAuth();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Switch Persona / Tenant</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav row */}
      <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 border-t border-neutral-100 dark:border-neutral-800 gap-1 scrollbar-none">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`px-3 py-1 rounded text-xs whitespace-nowrap shrink-0 ${
              activeTab === item.id
                ? 'font-semibold text-neutral-900 bg-neutral-100 dark:text-white dark:bg-neutral-800'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
