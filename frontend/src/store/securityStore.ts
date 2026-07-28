import { create } from 'zustand';

interface SecurityState {
  findings: any[];
  summary: any | null;
  trends: any[];
  activeFinding: any | null;
  filters: {
    severity: string;
    scanner: string;
    repo: string;
    status: string;
  };
  setFindings: (findings: any[]) => void;
  setSummary: (summary: any) => void;
  setTrends: (trends: any[]) => void;
  setActiveFinding: (finding: any) => void;
  setFilters: (filters: any) => void;
  resetFilters: () => void;
}

const defaultFilters = {
  severity: '',
  scanner: '',
  repo: '',
  status: '',
};

export const useSecurityStore = create<SecurityState>((set) => ({
  findings: [],
  summary: null,
  trends: [],
  activeFinding: null,
  filters: defaultFilters,
  setFindings: (findings) => set({ findings }),
  setSummary: (summary) => set({ summary }),
  setTrends: (trends) => set({ trends }),
  setActiveFinding: (activeFinding) => set({ activeFinding }),
  setFilters: (newFilters) => set((state) => ({ filters: { ...state.filters, ...newFilters } })),
  resetFilters: () => set({ filters: defaultFilters }),
}));
