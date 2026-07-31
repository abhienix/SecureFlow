import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { PipelineRun } from '../types/pipeline.types';

export function usePipelineRuns(initialLimit = 20) {
  const [limit, setLimit] = useState(initialLimit);

  const query = useQuery({
    queryKey: ['pipelines', limit],
    queryFn: async () => {
      const data = await api.getScans(limit);
      const sorted = (data.scans || []).sort((a: PipelineRun, b: PipelineRun) => b.id - a.id);
      return {
        scans: sorted,
        total: data.total
      };
    },
    staleTime: 0,
    refetchInterval: 5000,
  });

  const loadMore = () => {
    setLimit(prev => prev + 20);
  };

  return {
    runs: query.data?.scans || [],
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    limit,
    loadMore,
    hasMore: (query.data?.total || 0) > limit,
  };
}
