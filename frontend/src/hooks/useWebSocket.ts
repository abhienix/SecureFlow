import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../stores/uiStore';

export function useWebSocket() {
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
        if (!mounted) return;
        try {
          const res = await fetch(`${BACKEND_URL}/health`);
          if (mounted) {
            setWsConnected(res.ok);
            if (res.ok) setLastApiResponse(Date.now());
          }
        } catch {
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
            const data = JSON.parse(event.data);
            if (data.type === 'ping') return;

            // Invalidate queries on message
            qc.invalidateQueries({ queryKey: ['pipelines'] });
            qc.invalidateQueries({ queryKey: ['scans'] });
            qc.invalidateQueries({ queryKey: ['findings'] });
            qc.invalidateQueries({ queryKey: ['deployments'] });
            qc.invalidateQueries({ queryKey: ['topology'] });
            qc.invalidateQueries({ queryKey: ['events', 'feed'] });
            qc.invalidateQueries({ queryKey: ['observability', 'overview'] });
            window.dispatchEvent(new CustomEvent('sf_ws_event', { detail: data }));
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
  }, [qc, setWsConnected, setLastApiResponse]);
}
