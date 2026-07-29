import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PipelineRun } from '../types/pipeline.types';
import { formatDuration } from '../utils/timeFormatters';

interface RunningDrawerProps {
  stage: string;
  label: string;
  run: PipelineRun;
}

export function RunningDrawer({ stage, label, run }: RunningDrawerProps) {
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    if (stage !== 'zap_gate') return;

    // Use started_at as baseline or default to 30s ago if missing
    const baseTime = run.started_at ? new Date(run.started_at).getTime() : Date.now() - 30000;
    
    const tick = () => {
      const seconds = Math.floor((Date.now() - baseTime) / 1000);
      setElapsed(Math.max(0, seconds));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [stage, run.started_at]);

  const renderContent = () => {
    if (stage === 'zap_gate') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
            Waiting for OWASP ZAP DAST scan to complete on staging.
            The scan polls every 15 seconds, up to 10 minutes.
            Page updates automatically.
          </p>
          <div style={{
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: '6px',
            padding: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#E2E8F0',
            fontWeight: 600
          }}>
            <span>DAST Elapsed Time:</span>
            <span style={{ fontFamily: 'var(--sf-font-mono)', color: '#6366F1' }}>
              {formatDuration(elapsed)}
            </span>
          </div>
        </div>
      );
    }

    if (stage === 'deploy_staging') {
      return (
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
          Deploying backend image to Cloud Run staging service.
          <br />
          <code>secureflow-backend-staging (us-central1)</code>
        </p>
      );
    }

    if (stage === 'deploy_prod') {
      return (
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
          Deploying to production Cloud Run.
          <br />
          <code>secureflow-backend (us-central1)</code>
        </p>
      );
    }

    return (
      <p style={{ fontSize: '13px', color: '#94A3B8', margin: 0, lineHeight: '1.5' }}>
        This stage is currently executing in the GitHub Actions runner environment.
      </p>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366F1' }}>
        <RefreshCw size={18} className="sf-spin-animation" />
        <span style={{ fontSize: '13px', fontWeight: 700 }}>Currently Executing</span>
      </div>

      <div style={{
        backgroundColor: '#1E293B',
        border: '1px solid #334155',
        borderRadius: '6px',
        padding: '16px'
      }}>
        {renderContent()}
      </div>

      <style>{`
        @keyframes sf-spin {
          to { transform: rotate(360deg); }
        }
        .sf-spin-animation {
          animation: sf-spin 1.2s linear infinite;
        }
      `}</style>
    </div>
  );
}
export default RunningDrawer;
