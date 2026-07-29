import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query client configuration.
 * - staleTime: data is considered fresh for 30s (matches old polling interval)
 * - refetchOnWindowFocus: refetch when user returns to the tab
 * - retry: retry failed requests once
 * WebSocket events will trigger invalidation for real-time updates.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
      refetchOnMount: true,
    },
  },
});

/**
 * Query keys are centralized here so invalidation is type-safe and
 * refactor-proof. If a key changes, only this file needs updating.
 */
export const queryKeys = {
  scans: ['scans'] as const,
  repositories: ['repositories'] as const,
  deployments: ['deployments'] as const,
  findings: (params?: Record<string, string>) => ['findings', params] as const,
  metrics: ['metrics'] as const,
  policies: ['policies'] as const,
  pipelines: ['pipelines'] as const,
};
