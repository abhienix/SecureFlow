import { create } from 'zustand';

interface PipelineState {
  runs: any[];
  activeRun: any | null;
  activeLogs: string;
  setRuns: (runs: any[]) => void;
  setActiveRun: (run: any) => void;
  setActiveLogs: (logs: string) => void;
}

export const usePipelineStore = create<PipelineState>((set) => ({
  runs: [],
  activeRun: null,
  activeLogs: '',
  setRuns: (runs) => set({ runs }),
  setActiveRun: (activeRun) => set({ activeRun }),
  setActiveLogs: (activeLogs) => set({ activeLogs }),
}));
