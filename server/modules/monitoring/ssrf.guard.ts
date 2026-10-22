import { URL } from 'url';
import { env } from '../../config/env';

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  '169.254.169.254', // AWS/GCP instance metadata
]);

// IP regex for private ranges (RFC 1918 & link local)
const PRIVATE_IP_REGEX = /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3})$/;

export function validateSafeUrl(urlString: string): { valid: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: `Disallowed protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.` };
    }

    if (env.ALLOW_PRIVATE_IPS_FOR_MONITORING) {
      return { valid: true };
    }

    const hostname = parsed.hostname.toLowerCase();

    if (BLOCKED_HOSTS.has(hostname)) {
      return { valid: false, reason: `Host "${hostname}" is blocked to prevent server-side request forgery (SSRF).` };
    }

    if (hostname.endsWith('.internal') || hostname.endsWith('.local') || hostname.endsWith('.localhost')) {
      return { valid: false, reason: `Internal domain names are blocked to prevent SSRF.` };
    }

    if (PRIVATE_IP_REGEX.test(hostname)) {
      return { valid: false, reason: `Private/reserved IP ranges are blocked to prevent SSRF.` };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `Invalid URL format: ${err.message}` };
  }
}
