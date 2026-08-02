import React from 'react';
import { Bug, ExternalLink, ShieldCheck, Lock, Bot } from 'lucide-react';
import { PipelineRun } from '../types/pipeline.types';
import { useVoidStore } from '../../../stores/voidStore';
import { AutomatedRemediationCard } from '../components/AutomatedRemediationCard';

interface BlockZapGateDrawerProps {
  run: PipelineRun;
  onNavigateToSecurity: () => void;
  onNavigateToPolicies: () => void;
}

export function BlockZapGateDrawer({
  run,
  onNavigateToSecurity,
  onNavigateToPolicies
}: BlockZapGateDrawerProps) {
  const steps = run.pipeline_steps || {};
  const zapGateDetail = steps.zap_gate?.detail || 'Production deploy blocked due to exploitable staging vulnerability.';
  const zapDetail = steps.zap?.detail;
  
  // Extract ZAP findings
  const zapFindings = run.zap_findings || run.findings?.zap || [];
  const topFinding = zapFindings[0];

  // Extract staging URL from deploy_staging step
  const stagingUrl = steps.deploy_staging?.detail || 'secureflow-backend-staging-1083585992526.us-central1.run.app';

  const githubUrl = `https://github.com/${run.repo_name}/actions`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Why production is blocked */}
      <div>
        <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
          Why Production Is Blocked
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '12px',
            color: '#FCA5A5',
            lineHeight: '1.5'
          }}>
            The OWASP ZAP DAST scan found an exploitable vulnerability on the LIVE STAGING environment.
            <div style={{ marginTop: '8px', color: '#ffffff', fontFamily: 'var(--sf-font-mono)' }}>
              <strong>Gate Detail:</strong> {zapGateDetail}
            </div>
            {zapDetail && (
              <div style={{ marginTop: '6px', color: '#94A3B8', fontFamily: 'var(--sf-font-mono)' }}>
                <strong>ZAP Output:</strong> {zapDetail}
              </div>
            )}
          </div>

          {topFinding && (
            <div style={{
              backgroundColor: '#1E293B',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '12px',
              lineHeight: '1.4'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#EF4444', marginBottom: '4px' }}>
                <Bug size={14} />
                <span>Top Vulnerability Finding</span>
              </div>
              <div style={{ color: '#E2E8F0', marginBottom: '2px' }}>
                <strong>Type:</strong> {topFinding.title || topFinding.alert || 'DAST Finding'}
              </div>
              <div style={{ color: '#E2E8F0', marginBottom: '2px' }}>
                <strong>URL:</strong> <code>{topFinding.file || topFinding.url}</code>
              </div>
              <div style={{ color: '#FCD34D', marginBottom: '2px' }}>
                <strong>Risk Level:</strong> {topFinding.severity || topFinding.risk || 'Medium'}
              </div>
              <div style={{ color: '#94A3B8', fontStyle: 'italic', marginTop: '4px', borderTop: '1px solid #334155', paddingTop: '4px' }}>
                {topFinding.ai_explanation || topFinding.description || 'OWASP ZAP active scanner detected potential security exposure.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Automated Remediation Card */}
      <AutomatedRemediationCard
        type="zap"
        run={run}
        onAskVoid={(prompt) => {
          useVoidStore.getState().setTriggerPrompt(prompt);
        }}
      />

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <button
          onClick={() => {
            const prompt = `Explain why the ZAP Gate blocked in pipeline run #${run.id} for commit "${run.commit_message}". What DAST findings caused it and how can I resolve them?`;
            useVoidStore.getState().setTriggerPrompt(prompt);
          }}
          style={{
            padding: '10px',
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 200ms ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.45)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          Ask Void to Explain & Fix <Bot size={14} />
        </button>

        <button
          onClick={onNavigateToSecurity}
          style={{
            padding: '10px',
            backgroundColor: '#EF4444',
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
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
        >
          View DAST Findings <ShieldCheck size={14} />
        </button>

        <button
          onClick={onNavigateToPolicies}
          style={{
            padding: '10px',
            backgroundColor: '#3B82F6',
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
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
        >
          View Policies <Lock size={14} />
        </button>

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
      </div>
    </div>
  );
}
export default BlockZapGateDrawer;
