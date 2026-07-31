import { useEffect, useRef, useState } from 'react';
import { PipelineRun } from '../types/pipeline.types';

export interface ToastData {
  id: string;
  runNumber: number;
  branch: string;
  repo: string;
}

export function usePipelinePolling(runs: PipelineRun[]) {
  const seenIds = useRef<Set<number>>(new Set());
  const isInitial = useRef<boolean>(true);
  const [newRunToast, setNewRunToast] = useState<ToastData | null>(null);

  useEffect(() => {
    if (runs.length === 0) return;

    if (isInitial.current) {
      runs.forEach(r => seenIds.current.add(r.id));
      isInitial.current = false;
      return;
    }

    let detectedNew: PipelineRun | null = null;
    runs.forEach(r => {
      if (!seenIds.current.has(r.id)) {
        seenIds.current.add(r.id);
        detectedNew = r;
      }
    });

    if (detectedNew) {
      const run: PipelineRun = detectedNew;
      setNewRunToast({
        id: String(run.id),
        runNumber: run.id,
        branch: run.branch || 'main',
        repo: run.repo_name || 'abhienix/SecureFlow',
      });
    }
  }, [runs]);

  return {
    newRunToast,
    clearToast: () => setNewRunToast(null),
  };
}
