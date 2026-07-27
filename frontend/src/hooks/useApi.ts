import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { useUIStore } from '../stores/uiStore';

/**
 * Server-state hooks powered by TanStack Query.
 * Each hook caches, deduplicates, and background-refetches automatically.
 * WebSocket events (see useScanWebSocket) invalidate these queries
 * for real-time updates without manual polling.
 */

export function useScans(limit = 200) {
  const { setWsConnected, setLastApiResponse } = useUIStore();
  return useQuery({
    queryKey: queryKeys.scans,
    queryFn: async () => {
      const data = await api.getScans(limit);
      setWsConnected(true);
      setLastApiResponse(Date.now());
      return data;
    },
    select: (data) => data.scans,
    staleTime: 0,
    refetchInterval: 5000,
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 15000),
  });
}

export function useRepositories() {
  return useQuery({
    queryKey: queryKeys.repositories,
    queryFn: () => api.getRepositories(),
    select: (data) => data.repositories,
  });
}

export function useDeployments() {
  return useQuery({
    queryKey: queryKeys.deployments,
    queryFn: () => api.getDeployments(),
    select: (data) => data.deployments,
  });
}

export function useFindings(params?: { severity?: string; scanner?: string; repo?: string }) {
  return useQuery({
    queryKey: queryKeys.findings(params),
    queryFn: () => api.getFindings(params),
    select: (data) => data.findings,
  });
}

export function useMetrics() {
  return useQuery({
    queryKey: queryKeys.metrics,
    queryFn: () => api.getMetrics(),
  });
}

export function usePolicies() {
  return useQuery({
    queryKey: queryKeys.policies,
    queryFn: () => api.getPolicies(),
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system', 'health'],
    queryFn: () => api.getSystemHealth(),
    refetchInterval: 15000,
  });
}

export function useSystemInfo() {
  return useQuery({
    queryKey: ['system', 'info'],
    queryFn: () => api.getSystemInfo(),
  });
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => api.searchGlobal(query),
    enabled: query.length >= 2,
  });
}

export function useRegisterRepository() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ repoName, owner }: { repoName: string; owner: string }) =>
      api.registerRepository(repoName, owner),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.repositories }),
  });
}
