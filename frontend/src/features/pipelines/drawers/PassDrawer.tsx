import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { PipelineRun } from '../types/pipeline.types';

interface PassDrawerProps {
  stage: string;
  label: string;
  run: PipelineRun;
  onNavigateToSecurity: () => void;
}

export function PassDrawer({ stage, label, run, onNavigateToSecurity }: PassDrawerProps) {
  const step = run.pipeline_steps?.[stage as keyof typeof run.pipeline_steps];
  const detail = step?.detail || 'Execution completed successfully.';

  // Parse Trivy findings if it's the trivy stage
  const renderTrivyFindings = () => {
    if (stage !== 'trivy') return null;

    const findings = run.findings || {};
    const critical = findings.trivy?.critical ?? findings.critical ?? 0;
    const high = findings.trivy?.high ?? findings.high ?? 0;
    const medium = findings.trivy?.medium ?? findings.medium ?? 0;
    const low = findings.trivy?.low ?? findings.low ?? 0;
    const total = critical + high + medium + low;

    return (
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <ShieldCheck size={18} color="#10B981" />
          <span style={{ fontWeight: 700, fontSize: '13px', color: '#E2E8F0' }}>Trivy Scan Results</span>
        </div>
        <p style={{ fontSize: '13px', color: '#94A3B8', margin: '0 0 16px 0' }}>
          {total > 0 ? `${total} vulnerabilities found — see Security Center.` : 'Zero vulnerabilities found.'}
        </p>

        {total > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', backgroundColor: '#1E293B', padding: '8px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#EF4444', fontWeight: 700 }}>CRIT</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#E2E8F0' }}>{critical}</div>
            </div>
            <div style={{ textAlign: 'center', backgroundColor: '#1E293B', padding: '8px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#F59E0B', fontWeight: 700 }}>HIGH</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#E2E8F0' }}>{high}</div>
            </div>
            <div style={{ textAlign: 'center', backgroundColor: '#1E293B', padding: '8px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#3B82F6', fontWeight: 700 }}>MED</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#E2E8F0' }}>{medium}</div>
            </div>
            <div style={{ textAlign: 'center', backgroundColor: '#1E293B', padding: '8px', borderRadius: '4px' }}>
              <div style={{ fontSize: '10px', color: '#94A3B8', fontWeight: 700 }}>LOW</div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#E2E8F0' }}>{low}</div>
            </div>
          </div>
        )}

        <button
          onClick={onNavigateToSecurity}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#10B981',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'background-color 150ms'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10B981'}
        >
          View in Security Center <ArrowRight size={14} />
        </button>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
          Execution Detail
        </div>
        <pre style={{
          backgroundColor: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '6px',
          padding: '12px',
          fontSize: '12px',
          color: '#E2E8F0',
          fontFamily: 'var(--sf-font-mono)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          margin: 0
        }}>
          {detail}
        </pre>
      </div>

      {run.duration && (
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
            Duration
          </div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#E2E8F0' }}>
            {run.duration}s
          </div>
        </div>
      )}

      {renderTrivyFindings()}
    </div>
  );
}
export default PassDrawer;
