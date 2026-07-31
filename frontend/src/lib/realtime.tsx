import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useAppStore, broadcastToEvent } from "./store";
import { queryKeys } from "./queries";
import type { ScanBroadcast } from "./types";

interface RealtimeContextValue {
  connected: boolean;
}

const RealtimeContext = createContext<RealtimeContextValue>({ connected: false });

export function useRealtime(): RealtimeContextValue {
  return useContext(RealtimeContext);
}

/**
 * Single real-time channel for the entire app: /ws/scans.
 * Backend ConnectionManager broadcasts every scan lifecycle + pipeline.stage_update
 * message to all connected WebSocket clients, so one channel is authoritative.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const pushEvent = useAppStore((s) => s.pushEvent);
  const setWsConnected = useAppStore((s) => s.setWsConnected);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const url = api.websocketUrl("/ws/scans");
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setWsConnected(true);
      };

      ws.onmessage = (ev) => {
        if (typeof ev.data !== "string") return;
        try {
          const payload = JSON.parse(ev.data) as ScanBroadcast;
          if (payload.type === "ping") return;
          pushEvent(broadcastToEvent(payload));

          // Invalidate cached lists so fresh data is pulled immediately.
          if (payload.type.startsWith("pipeline.")) {
            queryClient.invalidateQueries({ queryKey: queryKeys.pipelines });
            queryClient.invalidateQueries({ queryKey: queryKeys.latestPipeline });
          } else {
            queryClient.invalidateQueries({ queryKey: queryKeys.scans });
            queryClient.invalidateQueries({ queryKey: queryKeys.observability });
            queryClient.invalidateQueries({ queryKey: queryKeys.v1Observability });
            queryClient.invalidateQueries({ queryKey: queryKeys.repositories });
            queryClient.invalidateQueries({ queryKey: queryKeys.deployments });
            queryClient.invalidateQueries({ queryKey: queryKeys.findings });
          }
        } catch {
          // ignore malformed frames
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (disposed) return;
        const delay = Math.min(1000 * 2 ** retryRef.current, 30_000);
        retryRef.current += 1;
        window.setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    return () => {
      disposed = true;
      wsRef.current?.close();
    };
  }, [pushEvent, setWsConnected, queryClient]);

  const connected = useAppStore((s) => s.wsConnected);
  return <RealtimeContext.Provider value={{ connected }}>{children}</RealtimeContext.Provider>;
}
