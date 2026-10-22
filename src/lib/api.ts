// DevPulse Client API Client
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
}

const TOKEN_KEY = 'devpulse_auth_token';
const ORG_KEY = 'devpulse_active_org_id';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // localStorage may be disabled in some sandboxes
  }
}

export function getStoredOrgId(): string | null {
  try {
    return localStorage.getItem(ORG_KEY);
  } catch {
    return null;
  }
}

export function setStoredOrgId(orgId: string | null) {
  try {
    if (orgId) {
      localStorage.setItem(ORG_KEY, orgId);
    } else {
      localStorage.removeItem(ORG_KEY);
    }
  } catch {
    // ignore
  }
}

let autoAuthPromise: Promise<string | null> | null = null;

async function getOrAcquireToken(endpoint: string): Promise<string | null> {
  const existing = getStoredToken();
  if (existing) return existing;

  // Do not auto-login if the request itself is to auth endpoints
  if (endpoint.includes('/auth/login') || endpoint.includes('/auth/register')) {
    return null;
  }

  if (!autoAuthPromise) {
    autoAuthPromise = (async () => {
      try {
        const res = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'alex@devpulse.io', password: 'Devpulse123!' }),
        });
        const json = await res.json();
        if (json.success && json.data?.token) {
          setStoredToken(json.data.token);
          if (json.data.memberships?.[0]?.organizationId) {
            setStoredOrgId(json.data.memberships[0].organizationId);
          }
          return json.data.token as string;
        }
      } catch (e) {
        console.warn('[API] Auto-authentication skipped:', e);
      } finally {
        autoAuthPromise = null;
      }
      return null;
    })();
  }

  return autoAuthPromise;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getOrAcquireToken(endpoint);
  const orgId = getStoredOrgId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (orgId) {
    headers['X-Organization-Id'] = orgId;
  }

  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: { message: `HTTP ${response.status}: ${response.statusText}` },
  }));

  if (!response.ok || !data.success) {
    const errorMsg = data.error?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }

  return data.data as T;
}
