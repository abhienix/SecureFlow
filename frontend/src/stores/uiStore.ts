import { create } from 'zustand';
import type { Persona } from '../types';

/**
 * UI-only state (no server data — that's in TanStack Query).
 * This replaces the UI portions of the old AppContext.
 */
interface UIState {
  // Command palette
  isCmdPaletteOpen: boolean;
  setCmdPaletteOpen: (open: boolean) => void;
  toggleCmdPalette: () => void;

  // AI Copilot drawer
  isCopilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  toggleCopilot: () => void;

  // Persona mode for Mission Control
  persona: Persona;
  setPersona: (p: Persona) => void;

  // WebSocket connection status
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // Notifications (toast queue)
  notifications: NotificationItem[];
  addNotification: (n: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
  dismissNotification: (id: number) => void;
}

export interface NotificationItem {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
}

export const useUIStore = create<UIState>((set) => ({
  isCmdPaletteOpen: false,
  setCmdPaletteOpen: (open) => set({ isCmdPaletteOpen: open }),
  toggleCmdPalette: () => set((s) => ({ isCmdPaletteOpen: !s.isCmdPaletteOpen })),

  isCopilotOpen: false,
  setCopilotOpen: (open) => set({ isCopilotOpen: open }),
  toggleCopilot: () => set((s) => ({ isCopilotOpen: !s.isCopilotOpen })),

  persona: 'secops',
  setPersona: (persona) => set({ persona }),

  wsConnected: false,
  setWsConnected: (wsConnected) => set({ wsConnected }),

  notifications: [],
  addNotification: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: Date.now(), timestamp: new Date() },
        ...s.notifications,
      ].slice(0, 50),
    })),
  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));
