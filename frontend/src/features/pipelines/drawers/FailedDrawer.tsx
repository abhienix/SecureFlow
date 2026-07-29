import React from 'react';
import { ExternalLink, ShieldAlert } from 'lucide-react';
import { PipelineRun } from '../types/pipeline.types';

interface FailedDrawerProps {
  stage: string;
  label: string;
  run: PipelineRun;
  onNavigateToSecurity: () => void;
}

const REMEDIES: Record<string, string> = {
  checkout: "GitHub Actions runner failed during checkout. Check the Actions run log for runner errors. Re-run the workflow from GitHub Actions.",
  docker: "Docker build or push failed.\nCommon causes:\n• Syntax error in Dockerfile\n• Missing dependency in requirements.txt\n• GCP_SA_KEY secret expired or missing\n• Artifact Registry quota exceeded\nCheck:\ngcloud run services logs read secureflow-backend --region us-central1",
  trivy: "Trivy CVE scan failed to execute. The image may not be accessible in Artifact Registry, or the Trivy action version changed. Check the Actions run log for the Trivy step.",
  deploy_staging: "Cloud Run staging deployment failed.\nCheck:\ngcloud run services describe secureflow-backend-staging --region us-central1\nCommon causes:\n• Container failed health check\n• Missing environment variable or secret\n• Image build was incomplete",
  zap: "OWASP ZAP DAST scan failed or timed out. The scan runs on the backend worker VM. Check worker logs. The scan has a 10-minute timeout (40 polls × 15s).",
  deploy_prod: "Production Cloud Run deployment failed.\nCheck GCP Console → Cloud Run → secureflow-backend for the failed revision. Inspect container logs for startup errors.",
};

export function FailedDrawer({ stage, label, run, onNavigateToSecurity }: FailedDrawerProps) {
  const step = run.pipeline_steps?.[stage as keyof typeof run.pipeline_steps];
  const detail = step?.detail || 'No failure detail captured in pipeline step logs.';
  const remedy = REMEDIES[stage] || 'Check the primary CI workflow logs on GitHub Actions for details on this failure.';

  const githubUrl = `https://github.com/${run.repo_name}/actions`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Failure Log */}
      <div>
        <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
          Why It Failed
        </div>
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '6px',
          padding: '12px',
          fontSize: '12px',
          color: '#FCA5A5',
          fontFamily: 'var(--sf-font-mono)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          lineHeight: '1.5'
        }}>
          {detail}
        </div>
      </div>

      {/* Remediation steps */}
      <div>
        <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
          How to Fix It
        </div>
        <div style={{
          backgroundColor: '#1E293B',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '16px',
          fontSize: '13px',
          color: '#E2E8F0',
          lineHeight: '1.6',
          whiteSpace: 'pre-line'
        }}>
          {remedy}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <a
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: '10px',
            backgroundColor: '#334155',
            color: '#ffffff',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '12px',
            textAlign: 'center',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'background-color 150ms'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#475569'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#334155'}
        >
          View GitHub Actions Run <ExternalLink size={14} />
        </a>

        {(stage === 'trivy' || stage === 'zap') && (
          <button
            onClick={onNavigateToSecurity}
            style={{
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
            View in Security Center <ShieldAlert size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
export default FailedDrawer;
