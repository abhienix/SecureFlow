import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type {
  CopilotResponse,
  DeploymentsResponse,
  Finding,
  FindingsResponse,
  LatestPipeline,
  ObservabilityOverview,
  PipelineDetail,
  PipelineProgress,
  PipelineRun,
  PolicyResponse,
  RepositoriesResponse,
  ScanResultsResponse,
  ScannerComparison,
  SearchResponse,
  SecuritySummary,
  SlackStatus,
  SystemHealth,
  SystemInfo,
  TrendPoint,
  V1ObservabilityOverview,
} from "../lib/types";

export const queryKeys = {
  scans: ["scans"] as const,
  observability: ["observability"] as const,
  v1Observability: ["v1-observability"] as const,
  repositories: ["repositories"] as const,
  deployments: ["deployments"] as const,
  findings: ["findings"] as const,
  policies: ["policies"] as const,
  pipelines: ["pipelines"] as const,
  pipelineDetail: (id: string) => ["pipeline", id] as const,
  latestPipeline: ["pipeline-latest"] as const,
  securitySummary: ["security-summary"] as const,
  trends: ["security-trends"] as const,
  scannerComparison: ["scanner-comparison"] as const,
  health: ["health"] as const,
  systemInfo: ["system-info"] as const,
  slack: ["slack"] as const,
  search: ["search"] as const,
  progress: (runId: number) => ["progress", runId] as const,
};

export function useScanResults(limit = 200) {
  return useQuery({
    queryKey: [...queryKeys.scans, limit],
    queryFn: () => api.get<ScanResultsResponse>("/api/scan-results", { limit }),
  });
}

export function useObservability() {
  return useQuery({
    queryKey: queryKeys.observability,
    queryFn: () => api.get<ObservabilityOverview>("/api/observability/overview"),
  });
}

export function useV1Observability() {
  return useQuery({
    queryKey: queryKeys.v1Observability,
    queryFn: () => api.get<V1ObservabilityOverview>("/api/v1/observability/overview"),
  });
}

export function useRepositories() {
  return useQuery({
    queryKey: queryKeys.repositories,
    queryFn: () => api.get<RepositoriesResponse>("/api/repositories"),
  });
}

export function useDeployments() {
  return useQuery({
    queryKey: queryKeys.deployments,
    queryFn: () => api.get<DeploymentsResponse>("/api/deployments"),
  });
}

export function useFindings(params?: {
  severity?: string;
  scanner?: string;
  repo?: string;
}) {
  return useQuery({
    queryKey: [...queryKeys.findings, params?.severity ?? "", params?.scanner ?? "", params?.repo ?? ""],
    queryFn: () => api.get<FindingsResponse>("/api/findings", params),
  });
}

export function usePolicies() {
  return useQuery({
    queryKey: queryKeys.policies,
    queryFn: () => api.get<PolicyResponse>("/api/policies"),
  });
}

export function usePipelines(limit = 200) {
  return useQuery({
    queryKey: [...queryKeys.pipelines, limit],
    queryFn: () => api.get<PipelineRun[]>("/api/v1/pipelines", { limit }),
  });
}

export function usePipelineDetail(runId: string | null) {
  return useQuery({
    queryKey: queryKeys.pipelineDetail(runId ?? ""),
    queryFn: () => api.get<PipelineDetail>(`/api/v1/pipelines/${runId}`),
    enabled: Boolean(runId),
  });
}

export function useLatestPipeline() {
  return useQuery({
    queryKey: queryKeys.latestPipeline,
    queryFn: () => api.get<LatestPipeline>("/api/v1/pipelines/latest"),
  });
}

export function useSecuritySummary() {
  return useQuery({
    queryKey: queryKeys.securitySummary,
    queryFn: () => api.get<SecuritySummary>("/api/v1/security/summary"),
  });
}

export function useSecurityTrends(days = 14) {
  return useQuery({
    queryKey: [...queryKeys.trends, days],
    queryFn: () => api.get<TrendPoint[]>("/api/v1/security/trends", { days }),
  });
}

export function useScannerComparison() {
  return useQuery({
    queryKey: queryKeys.scannerComparison,
    queryFn: () => api.get<ScannerComparison>("/api/v1/security/scanners/comparison"),
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.get<SystemHealth>("/api/health/system"),
  });
}

export function useSystemInfo() {
  return useQuery({
    queryKey: queryKeys.systemInfo,
    queryFn: () => api.get<SystemInfo>("/api/system/info"),
  });
}

export function useSlackStatus() {
  return useQuery({
    queryKey: queryKeys.slack,
    queryFn: () => api.get<SlackStatus>("/api/slack/status"),
  });
}

export function usePipelineProgress(runId: number | null) {
  return useQuery({
    queryKey: queryKeys.progress(runId ?? 0),
    queryFn: () => api.get<PipelineProgress>(`/api/scan-results/${runId}/progress`),
    enabled: runId !== null,
    refetchInterval: 15_000,
  });
}

export function useGlobalSearch(q: string) {
  return useQuery({
    queryKey: [...queryKeys.search, q],
    queryFn: () => api.get<SearchResponse>("/api/search", { q }),
    enabled: q.trim().length >= 2,
  });
}

export function useCopilotAsk() {
  return useMutation({
    mutationFn: (body: { question: string; scan_id?: number; context?: Record<string, unknown>; history?: unknown[] }) =>
      api.post<CopilotResponse>("/api/copilot/ask", body),
  });
}

export function useFindingUpdate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ findingId, status }: { findingId: string; status: string }) =>
      api.patch<Finding>(`/api/v1/security/findings/${findingId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.findings });
      queryClient.invalidateQueries({ queryKey: queryKeys.securitySummary });
    },
  });
}
