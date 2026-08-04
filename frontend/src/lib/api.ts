/**
 * SecureFlow — API Client
 * Centralized fetch wrapper with typed responses and error handling.
 * All routes target the versioned /api/v1/ prefix.
 */

const BACKEND_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : typeof window !== 'undefined' && window.location.port === '3000'
    ? 'http://localhost:8000'
    : typeof window !== 'undefined' && window.location.origin.includes('frontend')
    ? window.location.origin.replace('frontend', 'backend')
    : 'http://localhost:8000');

export const API_BASE = BACKEND_URL;
export const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws/scans';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
  } catch {
    throw new ApiError(0, 'Unable to reach the SecureFlow backend. Check your network connection and try again.');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = typeof body?.detail === 'string' ? body.detail : res.statusText;
    throw new ApiError(res.status, `API ${res.status}: ${detail}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Scan results — legacy endpoint (no v1 equivalent with same shape)
  getScans: (limit = 200) =>
    apiFetch<{ total: number; limit: number; scans: any[] }>(`/api/scan-results?limit=${limit}`),

  // Repositories — versioned endpoint
  getRepositories: () =>
    apiFetch<{ repositories: any[]; total: number }>(`/api/v1/repositories`),

  // Deployments — versioned endpoint
  getDeployments: () =>
    apiFetch<{ deployments: any[]; total: number }>(`/api/v1/deployments`),

  // Security findings — versioned endpoint
  getFindings: (params?: { severity?: string; scanner?: string; repo?: string }) => {
    const qs = new URLSearchParams();
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.scanner) qs.set('scanner', params.scanner);
    if (params?.repo) qs.set('repo', params.repo);
    const query = qs.toString();
    return apiFetch<{ findings: any[]; total: number }>(`/api/v1/security/findings${query ? `?${query}` : ''}`);
  },

  // Observability metrics — legacy endpoint (v1 returns different shape)
  getMetrics: () =>
    apiFetch<any>(`/api/observability/metrics`),

  // AI Copilot — legacy endpoint
  getCopilotAnswer: (question: string, scanId?: number, context?: Record<string, unknown>) =>
    apiFetch<{ answer: string }>(`/api/copilot/ask`, {
      method: 'POST',
      body: JSON.stringify({ question, scan_id: scanId, context }),
    }),

  // Scan feedback — legacy endpoint
  submitFeedback: (scanId: number, feedback: string) =>
    apiFetch<{ status: string }>(`/api/scan-results/${scanId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }),

  // Policies — versioned endpoint
  getPolicies: () =>
    apiFetch<any>(`/api/v1/policies`),

  // Register repository — versioned endpoint (requires API secret via Authorization header)
  registerRepository: (repoName: string, owner: string, defaultBranch = 'main') =>
    apiFetch<{ repository: any }>(`/api/v1/repositories`, {
      method: 'POST',
      body: JSON.stringify({ repo_name: repoName, owner, default_branch: defaultBranch }),
    }),

  // Report export — legacy endpoint
  exportReport: (reportType: string, format: string) =>
    apiFetch<any>(`/api/reports/export`, {
      method: 'POST',
      body: JSON.stringify({ report_type: reportType, format }),
    }),

  // System health — versioned endpoint
  getSystemHealth: () =>
    apiFetch<any>(`/api/v1/health/system`),

  // System info — legacy endpoint (no v1 equivalent)
  getSystemInfo: () =>
    apiFetch<any>(`/api/system/info`),

  // Global search — legacy endpoint (no v1 equivalent)
  searchGlobal: (query: string) =>
    apiFetch<{ query: string; results: any[] }>(`/api/search?q=${encodeURIComponent(query)}`),
};

export { ApiError };
