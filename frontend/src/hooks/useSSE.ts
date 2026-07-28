import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '../stores/uiStore';

export function useSSE() {
  const qc = useQueryClient();
  const { addNotification } = useUIStore();

  useEffect(() => {
    const BACKEND_URL =
      process.env.REACT_APP_API_URL ||
      'http://localhost:8000';

    const eventSource = new EventSource(`${BACKEND_URL}/events/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type) {
          // Invalidate pipelines query on new pipeline events
          if (data.type.startsWith('pipeline.') || data.type.startsWith('scan.')) {
            qc.invalidateQueries({ queryKey: ['pipelines'] });
            qc.invalidateQueries({ queryKey: ['scans'] });
          }
          if (data.type.startsWith('deploy.')) {
            qc.invalidateQueries({ queryKey: ['deployments'] });
          }

          // Trigger toast notification
          window.dispatchEvent(
            new CustomEvent('sf_toast', {
              detail: {
                type: data.type.includes('failed') ? 'error' : 'success',
                title: data.type,
                message: data.message,
              },
            })
          );

          // Add in-app notification
          addNotification({
            type: data.type.includes('failed') ? 'error' : 'info',
            title: data.type,
            message: data.message,
            category: data.type.split('.')[0] as any,
            link: data.source_link,
          });
        }
      } catch (e) {
        // ignore
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [qc, addNotification]);
}
