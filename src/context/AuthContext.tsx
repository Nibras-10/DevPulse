import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest, setStoredToken, setStoredOrgId, getStoredToken, getStoredOrgId } from '../lib/api';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  organization: Organization;
}

interface AuthContextType {
  user: User | null;
  activeOrg: Organization | null;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  memberships: Membership[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, organizationName?: string) => Promise<void>;
  logout: () => void;
  switchOrg: (orgId: string) => void;
  quickLoginAs: (preset: 'owner' | 'admin' | 'external') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER'>('MEMBER');
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = async () => {
    try {
      const data = await apiRequest<{
        user: User;
        activeMembership?: Membership;
        memberships: Membership[];
      }>('/api/v1/auth/me');

      setUser(data.user);
      setMemberships(data.memberships);

      const storedOrg = getStoredOrgId();
      const current = data.memberships.find((m) => m.organizationId === storedOrg) || data.memberships[0];

      if (current) {
        setActiveOrg(current.organization);
        setRole(current.role);
        setStoredOrgId(current.organizationId);
      }
    } catch {
      // If token expired or invalid, attempt automatic login as demo user for instant live demo experience
      try {
        await quickLoginAs('owner');
      } catch {
        setUser(null);
        setActiveOrg(null);
        setStoredToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{
        user: User;
        memberships: Membership[];
        token: string;
      }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setStoredToken(res.token);
      setUser(res.user);
      setMemberships(res.memberships);

      if (res.memberships.length > 0) {
        setActiveOrg(res.memberships[0].organization);
        setRole(res.memberships[0].role);
        setStoredOrgId(res.memberships[0].organizationId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, organizationName?: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest<{
        user: User;
        organization: Organization;
        token: string;
      }>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, organizationName }),
      });

      setStoredToken(res.token);
      setUser(res.user);
      setActiveOrg(res.organization);
      setRole('OWNER');
      setStoredOrgId(res.organization.id);
      await fetchSession();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setStoredToken(null);
    setStoredOrgId(null);
    setUser(null);
    setActiveOrg(null);
    setMemberships([]);
    apiRequest('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
  };

  const switchOrg = (orgId: string) => {
    const mem = memberships.find((m) => m.organizationId === orgId);
    if (mem) {
      setActiveOrg(mem.organization);
      setRole(mem.role);
      setStoredOrgId(mem.organizationId);
      // Reload page state
      window.location.reload();
    }
  };

  const quickLoginAs = async (preset: 'owner' | 'admin' | 'external') => {
    const credentials = {
      owner: { email: 'alex@devpulse.io', password: 'Devpulse123!' },
      admin: { email: 'sarah@devpulse.io', password: 'Devpulse123!' },
      external: { email: 'elena@stripeflow.com', password: 'Devpulse123!' },
    }[preset];

    await login(credentials.email, credentials.password);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeOrg,
        role,
        memberships,
        isLoading,
        login,
        register,
        logout,
        switchOrg,
        quickLoginAs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
