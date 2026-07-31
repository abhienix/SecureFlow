import { create } from "zustand";
import type { ScanBroadcast, EventNotification } from "../lib/types";

interface AppState {
  wsConnected: boolean;
  lastBroadcast: ScanBroadcast | null;
  activityFeed: EventNotification[];
  pushEvent: (e: EventNotification) => void;
  setWsConnected: (v: boolean) => void;
}

let counter = 0;

export const useAppStore = create<AppState>((set) => ({
  wsConnected: false,
  lastBroadcast: null,
  activityFeed: [],

  pushEvent: (e) =>
    set((s) => ({
      activityFeed: [{ ...e, id: e.id ?? `evt-${++counter}` }, ...s.activityFeed].slice(0, 50),
    })),

  setWsConnected: (v) => set({ wsConnected: v }),
}));

export function broadcastToEvent(b: ScanBroadcast): EventNotification {
  const type = b.type ?? "scan.update";
  const sev =
    b.type === "pipeline.stage_update"
      ? "info"
      : b.status === "running"
        ? "info"
        : b.action_taken === "BLOCK"
          ? "critical"
          : (b.severity ?? "info").toLowerCase();
  return {
    type,
    message: [
      b.repo_name ? `[${b.repo_name}]` : "",
      b.commit_message || b.commit_sha || "scan update",
      b.action_taken ? `→ ${b.action_taken}` : "",
    ]
      .filter(Boolean)
      .join(" "),
    source_link: b.id ? `/pipelines?run=${b.id}` : null,
    severity: sev,
    created_at: b.created_at ?? new Date().toISOString(),
  };
}
