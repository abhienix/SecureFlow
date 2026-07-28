import { useQuery } from '@tanstack/react-query';
import { pipelinesApi } from '../api/pipelines';

export function usePipelines(limit = 100) {
  return useQuery({
    queryKey: ['pipelines'],
    queryFn: () => pipelinesApi.getPipelines(limit),
  });
}

export function usePipelineDetail(id: string, enabled = true) {
  return useQuery({
    queryKey: ['pipelines', 'detail', id],
    queryFn: () => pipelinesApi.getPipelineDetail(id),
    enabled: !!id && enabled,
  });
}

export function usePipelineLogs(runId: string, stageId: string, enabled = true) {
  return useQuery({
    queryKey: ['pipelines', 'logs', runId, stageId],
    queryFn: () => pipelinesApi.getPipelineLogs(runId, stageId),
    enabled: !!runId && !!stageId && enabled,
  });
}

export function usePipelineFindings(runId: string, enabled = true) {
  return useQuery({
    queryKey: ['pipelines', 'findings', runId],
    queryFn: () => pipelinesApi.getPipelineFindings(runId),
    enabled: !!runId && enabled,
  });
}
