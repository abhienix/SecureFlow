import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '../api/metrics';

export function useMetricsQuery(queryStr: string, enabled = true) {
  return useQuery({
    queryKey: ['metrics', 'query', queryStr],
    queryFn: () => metricsApi.query(queryStr),
    enabled,
    refetchInterval: 30000,
  });
}

export function useMetricsRange(queryStr: string, start: number, end: number, step = 15, enabled = true) {
  return useQuery({
    queryKey: ['metrics', 'range', queryStr, start, end, step],
    queryFn: () => metricsApi.range(queryStr, start, end, step),
    enabled,
    refetchInterval: 30000,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ['alerts'],
    queryFn: () => metricsApi.getAlerts(),
    refetchInterval: 30000,
  });
}

export function useTopology() {
  return useQuery({
    queryKey: ['topology'],
    queryFn: () => metricsApi.getTopology(),
    refetchInterval: 30000,
  });
}
