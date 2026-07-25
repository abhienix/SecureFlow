import { create } from 'zustand';
import type { Persona } from '../types';

interface UIState {
  isCmdPaletteOpen: boolean;
  setCmdPaletteOpen: (open: boolean) => void;
  toggleCmdPalette: () => void;
  isCopilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  toggleCopilot: () => void;
  activeVoidContext: Record<string, unknown> | null;
  setVoidContext: (context: Record<string, unknown> | null) => void;
  openVoidWithContext: (context: Record<string, unknown>) => void;
  isNotificationOpen: boolean;
  setNotificationOpen: (open: boolean) => void;
  toggleNotification: () => void;
  persona: Persona;
  setPersona: (persona: Persona) => void;
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;
  notifications: NotificationItem[];
  addNotification: (notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) => void;
  dismissNotification: (id: number) => void;
}

export interface NotificationItem {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  category?: 'pipelines' | 'security' | 'deployments' | 'slack' | 'system';
  link?: string;
  timestamp: Date;
  read?: boolean;
}

/** UI-only state. Server state is owned by TanStack Query. */
export const useUIStore = create<UIState>((set) => ({
  isCmdPaletteOpen: false,
  setCmdPaletteOpen: (open) => set({ isCmdPaletteOpen: open }),
  toggleCmdPalette: () => set((state) => ({ isCmdPaletteOpen: !state.isCmdPaletteOpen })),
  isCopilotOpen: false,
  setCopilotOpen: (open) => set({ isCopilotOpen: open }),
  toggleCopilot: () => set((state) => ({ isCopilotOpen: !state.isCopilotOpen })),
  activeVoidContext: null,
  setVoidContext: (context) => set({ activeVoidContext: context }),
  openVoidWithContext: (context) => set({ activeVoidContext: context, isCopilotOpen: true }),
  isNotificationOpen: false,
  setNotificationOpen: (open) => set({ isNotificationOpen: open }),
  toggleNotification: () => set((state) => ({ isNotificationOpen: !state.isNotificationOpen })),
  persona: 'secops',
  setPersona: (persona) => set({ persona }),
  wsConnected: false,
  setWsConnected: (wsConnected) => set({ wsConnected }),
  notifications: [],
  addNotification: (notification) => set((state) => ({
    notifications: [
      { ...notification, id: Date.now(), timestamp: new Date(), read: false },
      ...state.notifications,
    ].slice(0, 50),
  })),
  dismissNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((notification) => notification.id !== id),
  })),
}));
