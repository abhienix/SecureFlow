import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { WS_URL } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { useUIStore } from '../stores/uiStore';
import type { WSEvent } from '../types';

/**
 * WebSocket hook with exponential backoff reconnection.
 * On scan events, invalidates the relevant TanStack Query caches
 * so the UI updates in real-time without manual polling.
 *
 * Replaces the old AppContext WebSocket logic which:
 * - Used a fixed 5s reconnect (no backoff)
 * - Directly mutated local state (now handled by query invalidation)
 * - Had no cleanup on unmount (now properly cleaned up)
 */
export function useScanWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const { setWsConnected, addNotification } = useUIStore();

  useEffect(() => {
    let mounted = true;

    const connect = () => {
      if (!mounted) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted) return;
          attemptRef.current = 0;
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data: WSEvent = JSON.parse(event.data);
            if (data.type === 'ping') return;

            // Invalidate the scans query so TanStack refetches fresh data
            if (
              data.type === 'scan_complete' ||
              data.type === 'scan_started' ||
              data.type === 'scan_timeout' ||
              data.type === 'scan_progress' ||
              data.type === 'scan_reanalyzed'
            ) {
              qc.invalidateQueries({ queryKey: queryKeys.scans });

              if (data.type === 'scan_complete') {
                addNotification({
                  type: data.action_taken === 'BLOCK' ? 'error' : 'success',
                  title: `Pipeline ${data.action_taken === 'BLOCK' ? 'Blocked' : 'Passed'}`,
                  message: `${data.repo_name || 'Unknown'} — ${(data.commit_sha || '').substring(0, 8)}`,
                });
              }
            }

            if (data.type === 'dast_update') {
              qc.invalidateQueries({ queryKey: queryKeys.scans });
              qc.invalidateQueries({ queryKey: queryKeys.metrics });
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          if (!mounted) return;
          setWsConnected(false);
          wsRef.current = null;
          // Exponential backoff: 1s, 2s, 4s, 8s, capped at 30s
          const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 30000);
          attemptRef.current++;
          reconnectTimer.current = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          setWsConnected(false);
        };
      } catch {
        setWsConnected(false);
        const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 30000);
        attemptRef.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    connect();

    return () => {
      mounted = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [qc, setWsConnected, addNotification]);
}
