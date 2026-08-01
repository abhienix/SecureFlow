import { create } from 'zustand';

interface MetricsState {
  metricsData: Record<string, any>;
  alerts: any[];
  topology: any | null;
  setMetricsData: (key: string, data: any) => void;
  setAlerts: (alerts: any[]) => void;
  setTopology: (topology: any) => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  metricsData: {},
  alerts: [],
  topology: null,
  setMetricsData: (key, data) =>
    set((state) => ({
      metricsData: { ...state.metricsData, [key]: data },
    })),
  setAlerts: (alerts) => set({ alerts }),
  setTopology: (topology) => set({ topology }),
}));
