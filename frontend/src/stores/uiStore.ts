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

  // AI Copilot / Void Assistant drawer
  isCopilotOpen: boolean;
  setCopilotOpen: (open: boolean) => void;
  toggleCopilot: () => void;
  activeVoidContext: Record<string, unknown> | null;
  setVoidContext: (context: Record<string, unknown> | null) => void;
  openVoidWithContext: (context: Record<string, unknown>) => void;

  // Notification drawer
  isNotificationOpen: boolean;
  setNotificationOpen: (open: boolean) => void;
  toggleNotification: () => void;

  // Persona mode
  persona: Persona;
  setPersona: (p: Persona) => void;

  // WebSocket connection status
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // Notifications (toast queue & activity history)
  notifications: NotificationItem[];
  addNotification: (n: Omit<NotificationItem, 'id' | 'timestamp'>) => void;
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

export const useUIStore = create<UIState>((set) => ({
  isCmdPaletteOpen: false,
  setCmdPaletteOpen: (open) => set({ isCmdPaletteOpen: open }),
  toggleCmdPalette: () => set((s) => ({ isCmdPaletteOpen: !s.isCmdPaletteOpen })),

  isCopilotOpen: false,
  setCopilotOpen: (open) => set({ isCopilotOpen: open }),
  toggleCopilot: () => set((s) => ({ isCopilotOpen: !s.isCopilotOpen })),
  activeVoidContext: null,
  setVoidContext: (context) => set({ activeVoidContext: context }),
  openVoidWithContext: (context) => set({ activeVoidContext: context, isCopilotOpen: true }),

  isNotificationOpen: false,
  setNotificationOpen: (open) => set({ isNotificationOpen: open }),
  toggleNotification: () => set((s) => ({ isNotificationOpen: !s.isNotificationOpen })),

  persona: 'secops',
  setPersona: (persona) => set({ persona }),

  wsConnected: false,
  setWsConnected: (wsConnected) => set({ wsConnected }),

  notifications: [
    {
      id: 101,
      type: 'error',
      title: 'Pipeline Blocked',
      message: 'main-api — 8f9b2a14 blocked by Gitleaks policy',
      category: 'pipelines',
      link: '/pipelines',
      timestamp: new Date(Date.now() - 300000),
      read: false,
    },
    {
      id: 102,
      type: 'warning',
      title: 'Critical Vulnerability Detected',
      message: 'CVE-2026-2189 found in Docker container image',
      category: 'security',
      link: '/security-center',
      timestamp: new Date(Date.now() - 900000),
      read: false,
    },
    {
      id: 103,
      type: 'success',
      title: 'Deployment Completed',
      message: 'Production deployment to Google Cloud (us-central1) passed health check',
      category: 'deployments',
      link: '/pipelines',
      timestamp: new Date(Date.now() - 1800000),
      read: true,
    },
  ],
  addNotification: (n) =>
    set((s) => ({
      notifications: [
        { ...n, id: Date.now(), timestamp: new Date(), read: false },
        ...s.notifications,
      ].slice(0, 50),
    })),
  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));
