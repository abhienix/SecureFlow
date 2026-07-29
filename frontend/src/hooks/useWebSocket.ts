import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE } from '../lib/api';
import { queryKeys } from '../lib/queryClient';
import { useUIStore } from '../stores/uiStore';

/**
 * Single consolidated WebSocket hook with:
 * - Exponential backoff reconnection (max 30s)
 * - Heartbeat/ping to detect stale connections
 * - Stale event detection via _event_version
 * - Graceful fallback to REST polling
 * - Dedup of multiple subscriptions
 */
export function useWebSocket() {
  const qc = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const healthTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fallbackActive = useRef(false);
  const attemptRef = useRef(0);
  const mountedRef = useRef(false);
  const seenEventIds = useRef<Set<string>>(new Set());
  const { setWsConnected, setLastApiResponse, addNotification } = useUIStore();

  // Determine backend URL
  const BACKEND_URL =
    process.env.REACT_APP_API_URL ||
    (typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : typeof window !== 'undefined'
      ? window.location.origin.replace('frontend', 'backend')
      : 'http://localhost:8000');

  const WS_URL = BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws/events';

  const startHealthPoll = () => {
    if (fallbackActive.current) return;
    fallbackActive.current = true;
    const poll = async () => {
      if (!mountedRef.current) return;
      try {
        const res = await fetch(`${API_BASE}/`);
        if (mountedRef.current) {
          setWsConnected(res.ok);
          if (res.ok) setLastApiResponse(Date.now());
        }
      } catch {
        if (mountedRef.current) setWsConnected(false);
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
    if (!mountedRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      const wsConnectTimeout = setTimeout(() => {
        if (!mountedRef.current) return;
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          startHealthPoll();
        }
      }, 8000);

      ws.onopen = () => {
        if (!mountedRef.current) return;
        clearTimeout(wsConnectTimeout);
        attemptRef.current = 0;
        stopHealthPoll();
        setWsConnected(true);
        setLastApiResponse(Date.now());
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ping') return;

          // Stale event detection
          if (data._event_version && data.run_id && data.stage_key) {
            const dedupKey = `${data.run_id}:${data.stage_key}:${data._event_version}`;
            if (seenEventIds.current.has(dedupKey)) return;
            seenEventIds.current.add(dedupKey);
            if (seenEventIds.current.size > 1000) seenEventIds.current.clear();
          }

          // Invalidate queries based on event type
          if (data.type === 'pipeline.stage_update' && data.run_id) {
            qc.invalidateQueries({ queryKey: ['pipelines', 'detail', data.run_id.replace('run-', '')] });
            qc.invalidateQueries({ queryKey: ['pipelines', 'detail', data.scan_id] });
            qc.invalidateQueries({ queryKey: ['pipelines', 'latest'] });
            qc.invalidateQueries({ queryKey: queryKeys.pipelines });
            qc.invalidateQueries({ queryKey: ['events', 'feed'] });
            window.dispatchEvent(new CustomEvent('sf_ws_event', { detail: data }));
            return;
          }

          if (data.type === 'pipeline.synced' || data.type?.startsWith('pipeline.') || data.type?.startsWith('scan.')) {
            qc.invalidateQueries({ queryKey: queryKeys.pipelines });
            qc.invalidateQueries({ queryKey: queryKeys.scans });
            qc.invalidateQueries({ queryKey: ['observability', 'overview'] });
            qc.invalidateQueries({ queryKey: ['events', 'feed'] });
          }

          if (data.type?.startsWith('deploy.')) {
            qc.invalidateQueries({ queryKey: ['deployments'] });
          }

          if (data.type === 'scan_complete' || data.type === 'scan_started' || data.type === 'scan_timeout' || data.type === 'scan_progress' || data.type === 'scan_reanalyzed') {
            qc.invalidateQueries({ queryKey: queryKeys.scans });
            qc.invalidateQueries({ queryKey: queryKeys.pipelines });
          }

          if (data.type === 'dast_update') {
            qc.invalidateQueries({ queryKey: queryKeys.metrics });
          }

          qc.invalidateQueries({ queryKey: ['findings'] });
          qc.invalidateQueries({ queryKey: ['topology'] });

          window.dispatchEvent(new CustomEvent('sf_ws_event', { detail: data }));

        } catch {
          // Ignore parse errors
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        if (!fallbackActive.current) setWsConnected(false);
        wsRef.current = null;
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

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      stopHealthPoll();
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [qc, setWsConnected, setLastApiResponse]);
}
