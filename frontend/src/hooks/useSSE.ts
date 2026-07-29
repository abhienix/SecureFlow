import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

/**
 * SSE-based polling fallback that only runs when WebSocket is disconnected.
 * Uses EventSource with a low polling rate (10s) and never overwrites
 * data already received via WebSocket (tracks last seen event from WS).
 */
export function useSSE() {
  const qc = useQueryClient();
  const lastEventTime = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const BACKEND_URL =
      process.env.REACT_APP_API_URL ||
      (typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? 'http://localhost:8000'
        : typeof window !== 'undefined'
        ? window.location.origin.replace('frontend', 'backend')
        : 'http://localhost:8000');

    // Listen for WebSocket events to update lastEventTime
    const wsHandler = () => { lastEventTime.current = Date.now(); };
    window.addEventListener('sf_ws_event', wsHandler);

    // Connect EventSource as fallback
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${BACKEND_URL}/events/stream`);
    } catch {
      // SSE not available — fallback to polling
    }

    if (eventSource) {
      eventSource.onmessage = (event) => {
        // Only process if no WebSocket event in last 5s
        if (Date.now() - lastEventTime.current > 5000) {
          try {
            const data = JSON.parse(event.data);
            if (data.type?.startsWith('pipeline.') || data.type?.startsWith('scan.')) {
              qc.invalidateQueries({ queryKey: ['pipelines'] });
              qc.invalidateQueries({ queryKey: ['scans'] });
            }
            if (data.type?.startsWith('deploy.')) {
              qc.invalidateQueries({ queryKey: ['deployments'] });
            }
          } catch {
            // ignore
          }
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
      };
    }

    // Additional polling fallback (every 15s)
    intervalRef.current = setInterval(() => {
      if (Date.now() - lastEventTime.current > 10000) {
        qc.invalidateQueries({ queryKey: ['pipelines'] });
        qc.invalidateQueries({ queryKey: ['scans'] });
        qc.invalidateQueries({ queryKey: ['events', 'feed'] });
      }
    }, 15000);

    return () => {
      window.removeEventListener('sf_ws_event', wsHandler);
      if (eventSource) eventSource.close();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [qc]);
}
