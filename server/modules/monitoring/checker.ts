import { validateSafeUrl } from './ssrf.guard';
import type { Service } from '../../db/types';

export interface CheckExecutionResult {
  statusCode?: number;
  responseTimeMs: number;
  isHealthy: boolean;
  errorMessage?: string;
}

export async function executeHealthCheck(service: Service): Promise<CheckExecutionResult> {
  const urlValidation = validateSafeUrl(service.healthCheckUrl);
  if (!urlValidation.valid) {
    return {
      statusCode: 0,
      responseTimeMs: 0,
      isHealthy: false,
      errorMessage: `Security policy blocked request: ${urlValidation.reason}`,
    };
  }

  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), service.timeoutMs);

  try {
    const response = await fetch(service.healthCheckUrl, {
      method: service.httpMethod || 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'DevPulse-HealthChecker/1.0 (+https://devpulse.io)',
        Accept: '*/*',
      },
    });

    clearTimeout(timeoutId);
    const end = performance.now();
    const duration = Math.round(end - start);

    const isExpectedStatus =
      service.expectedStatusCode > 0
        ? response.status === service.expectedStatusCode
        : response.status >= 200 && response.status < 300;

    return {
      statusCode: response.status,
      responseTimeMs: duration,
      isHealthy: isExpectedStatus,
      errorMessage: isExpectedStatus
        ? undefined
        : `Expected HTTP ${service.expectedStatusCode}, received HTTP ${response.status} ${response.statusText}`,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const end = performance.now();
    const duration = Math.round(end - start);

    let message = err.message || 'Unknown network error';
    if (err.name === 'AbortError' || message.includes('aborted')) {
      message = `Request timed out after ${service.timeoutMs}ms`;
    }

    return {
      statusCode: 0,
      responseTimeMs: duration,
      isHealthy: false,
      errorMessage: message,
    };
  }
}
