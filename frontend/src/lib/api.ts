/**
 * SecureFlow — API Client
 * Centralized fetch wrapper with typed responses and error handling.
 */

const BACKEND_URL =
  process.env.REACT_APP_API_URL ||
  'https://secureflow-backend-1083585992526.us-central1.run.app';

export const API_BASE = BACKEND_URL;
export const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws/scans';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  getScans: (limit = 200) =>
    apiFetch<{ total: number; limit: number; scans: any[] }>(`/api/scan-results?limit=${limit}`),

  getRepositories: () =>
    apiFetch<{ repositories: any[]; total: number }>(`/api/repositories`),

  getDeployments: () =>
    apiFetch<{ deployments: any[]; total: number }>(`/api/deployments`),

  getFindings: (params?: { severity?: string; scanner?: string; repo?: string }) => {
    const qs = new URLSearchParams();
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.scanner) qs.set('scanner', params.scanner);
    if (params?.repo) qs.set('repo', params.repo);
    const query = qs.toString();
    return apiFetch<{ findings: any[]; total: number }>(`/api/findings${query ? `?${query}` : ''}`);
  },

  getMetrics: () =>
    apiFetch<any>(`/api/observability/metrics`),

  getCopilotAnswer: (question: string, scanId?: number, context?: Record<string, unknown>) =>
    apiFetch<{ answer: string }>(`/api/copilot/ask`, {
      method: 'POST',
      body: JSON.stringify({ question, scan_id: scanId, context }),
    }),

  submitFeedback: (scanId: number, feedback: string) =>
    apiFetch<{ status: string }>(`/api/scan-results/${scanId}/feedback`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    }),

  getPolicies: () =>
    apiFetch<any>(`/api/policies`),

  registerRepository: (repoName: string, owner: string, defaultBranch = 'main') =>
    apiFetch<{ repository: any }>(`/api/repositories`, {
      method: 'POST',
      body: JSON.stringify({ repo_name: repoName, owner, default_branch: defaultBranch }),
    }),

  exportReport: (reportType: string, format: string) =>
    apiFetch<any>(`/api/reports/export`, {
      method: 'POST',
      body: JSON.stringify({ report_type: reportType, format }),
    }),
};

export { ApiError };
