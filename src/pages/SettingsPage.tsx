import React, { useState, useEffect } from 'react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Shield,
  UserPlus,
  KeyRound,
  Building2,
  FileText,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { activeOrg, role, user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembers = async () => {
    try {
      const data = await apiRequest('/api/v1/organizations/members');
      setMembers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setInviteMsg(null);

    try {
      await apiRequest('/api/v1/organizations/members', {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      setInviteMsg(`Invitation sent to ${inviteEmail} with role ${inviteRole}`);
      setInviteEmail('');
      await loadMembers();
    } catch (err: any) {
      alert(`Invite failed: ${err.message}`);
    } finally {
      setInviting(false);
    }
  };

  const isOwnerOrAdmin = role === 'OWNER' || role === 'ADMIN';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Organization & Team Settings
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Role-based access control, tenant isolation, and security policies
        </p>
      </div>

      {/* Tenant Profile Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 dark:text-white">
          <Building2 className="w-4 h-4 text-neutral-500" />
          <span>Active Organization Context</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-neutral-400 block mb-0.5">Organization Name</span>
            <span className="font-semibold text-neutral-900 dark:text-white text-sm">
              {activeOrg?.name}
            </span>
          </div>

          <div>
            <span className="text-neutral-400 block mb-0.5">Tenant Slug Identifier</span>
            <span className="font-mono text-neutral-700 dark:text-neutral-300">
              {activeOrg?.slug}
            </span>
          </div>

          <div>
            <span className="text-neutral-400 block mb-0.5">Your Active Role</span>
            <span className="font-mono font-semibold text-neutral-900 dark:text-white">
              {role}
            </span>
          </div>
        </div>
      </div>

      {/* Team Members Management */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white tracking-tight flex items-center gap-2">
              <Users className="w-4 h-4 text-neutral-500" />
              <span>Team Members & Roles</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Strict RBAC: Owners administer tenant, Admins configure services, Members triage incidents
            </p>
          </div>
        </div>

        {/* Invite Form */}
        {isOwnerOrAdmin && (
          <form onSubmit={handleInvite} className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-lg space-y-3">
            <div className="text-xs font-semibold text-neutral-900 dark:text-white flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite New Engineer</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md focus:outline-none"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="MEMBER">MEMBER</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 rounded-md hover:bg-neutral-800 whitespace-nowrap"
              >
                {inviting ? 'Inviting...' : 'Send Invitation'}
              </button>
            </div>

            {inviteMsg && (
              <div className="text-xs text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{inviteMsg}</span>
              </div>
            )}
          </form>
        )}

        {/* Members Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/80 dark:bg-neutral-800/40 text-neutral-500 font-medium border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="py-2.5 px-4">Member</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 font-normal">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-neutral-50/80 dark:hover:bg-neutral-800/40">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-neutral-900 dark:text-white">
                      {m.user.name} {m.userId === user?.id && <span className="text-[10px] text-neutral-400 font-normal ml-1">(You)</span>}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono">{m.user.email}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] font-semibold text-neutral-700 dark:text-neutral-300">
                    {m.role}
                  </td>
                  <td className="py-3 px-4 text-neutral-400 font-mono text-[11px]">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Architecture Box */}
      <div className="p-5 bg-neutral-100 dark:bg-neutral-800/60 rounded-xl space-y-2 text-xs">
        <div className="flex items-center gap-2 font-semibold text-neutral-900 dark:text-white">
          <Lock className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
          <span>Security & Isolation Invariants</span>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
          DevPulse strictly isolates organization data at the database query layer. Every API request requires a verified JWT and enforces an explicit membership check before querying services, check history, or incidents. Cross-tenant queries are blocked with <code className="font-mono text-neutral-900 dark:text-white">403 Forbidden</code>.
        </p>
      </div>
    </div>
  );
};
