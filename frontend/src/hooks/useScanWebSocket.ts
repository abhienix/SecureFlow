import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE, WS_URL } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { useUIStore } from '../stores/uiStore';
import type { WSEvent } from '../types';

/**
 * WebSocket hook with exponential backoff reconnection.
 * Falls back to REST health polling if WebSocket cannot connect (e.g. Cloud Run w/o HTTP/2).
 */
export function useScanWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackActive = useRef(false);
  const attemptRef = useRef(0);
  const { setWsConnected, setLastApiResponse, addNotification } = useUIStore();

  useEffect(() => {
    let mounted = true;
    let wsConnectTimeout: ReturnType<typeof setTimeout> | null = null;

    // Debug: log which backend URL we are connecting to
    console.log('[SecureFlow] WS_URL:', WS_URL, 'API_BASE:', API_BASE);

    // REST health polling fallback
    const startHealthPoll = () => {
      if (fallbackActive.current) return;
      fallbackActive.current = true;
      const poll = async () => {
        if (!mounted) return;
        const ac = new AbortController();
        const tid = setTimeout(() => ac.abort(), 5000);
        try {
          const res = await fetch(`${API_BASE}/`, { signal: ac.signal });
          clearTimeout(tid);
          if (mounted) {
            setWsConnected(res.ok);
            if (res.ok) setLastApiResponse(Date.now());
          }
        } catch {
          clearTimeout(tid);
          if (mounted) setWsConnected(false);
        }
      };
      poll();
      healthTimer.current = setInterval(poll, 15000);
    };

    const stopHealthPoll = () => {
      fallbackActive.current = false;
      if (healthTimer.current) {
        clearInterval(healthTimer.current);
        healthTimer.current = null;
      }
    };

    const connect = () => {
      if (!mounted) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        wsConnectTimeout = setTimeout(() => {
          if (!mounted) return;
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            startHealthPoll();
          }
        }, 8000);

        ws.onopen = () => {
          if (!mounted) return;
          if (wsConnectTimeout) clearTimeout(wsConnectTimeout);
          attemptRef.current = 0;
          stopHealthPoll();
          setWsConnected(true);
          setLastApiResponse(Date.now());
        };

        ws.onmessage = (event) => {
          try {
            const data: WSEvent = JSON.parse(event.data);
            if (data.type === 'ping') return;

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
          if (!fallbackActive.current) setWsConnected(false);
          wsRef.current = null;
          if (wsConnectTimeout) clearTimeout(wsConnectTimeout);
          startHealthPoll();
          const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 30000);
          attemptRef.current++;
          reconnectTimer.current = setTimeout(connect, delay);
        };

        ws.onerror = () => {
          if (!fallbackActive.current) setWsConnected(false);
          startHealthPoll();
        };
      } catch {
        if (!fallbackActive.current) setWsConnected(false);
        startHealthPoll();
        const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 30000);
        attemptRef.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };

    connect();

    return () => {
      mounted = false;
      if (wsConnectTimeout) clearTimeout(wsConnectTimeout);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      stopHealthPoll();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [qc, setWsConnected, addNotification]);
}
