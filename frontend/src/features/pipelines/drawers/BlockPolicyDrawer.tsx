import React, { useEffect, useState } from 'react';
import { ShieldAlert, ExternalLink, Lock, Bot } from 'lucide-react';
import { PipelineRun } from '../types/pipeline.types';
import { API_BASE } from '../../../lib/api';
import { useVoidStore } from '../../../stores/voidStore';
import { AutomatedRemediationCard } from '../components/AutomatedRemediationCard';

interface BlockPolicyDrawerProps {
  run: PipelineRun;
  onNavigateToSecurity: () => void;
  onNavigateToPolicies: () => void;
}

interface PolicyViolation {
  policy_name: string;
  rule_criteria: string;
  scanner: string;
  actual_value: string;
  threshold: string;
}

export function BlockPolicyDrawer({ 
  run, 
  onNavigateToSecurity, 
  onNavigateToPolicies 
}: BlockPolicyDrawerProps) {
  const step = run.pipeline_steps?.policy;
  const detail = step?.detail || 'Policy scan gate enforcement action.';
  const reason = run.reason || run.ai_explanation || 'Vulnerability threshold exceeded.';

  const [violations, setViolations] = useState<PolicyViolation[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetch(`${API_BASE}/api/v1/policies/violations?pipeline_run_id=${run.id}`)
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (active) setViolations(data.violations || []);
        } else {
          if (active) setViolations(null);
        }
      })
      .catch(() => {
        if (active) setViolations(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [run.id]);

  const githubUrl = `https://github.com/${run.repo_name}/actions`;

  // Render violations list or fallback
  const renderViolationsContent = () => {
    if (isLoading) {
      return (
        <div style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic' }}>
          Querying policy rules violations...
        </div>
      );
    }

    if (violations && violations.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {violations.map((v, i) => (
            <div key={i} style={{
              backgroundColor: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '6px',
              padding: '12px',
              fontSize: '12px',
              lineHeight: '1.4'
            }}>
              <div style={{ fontWeight: 700, color: '#FCD34D', marginBottom: '4px' }}>
                Policy: {v.policy_name}
              </div>
              <div style={{ color: '#E2E8F0', marginBottom: '2px' }}>
                <strong>Rule:</strong> {v.rule_criteria}
              </div>
              <div style={{ color: '#E2E8F0', marginBottom: '2px' }}>
                <strong>Scanner:</strong> {v.scanner}
              </div>
              <div style={{ color: '#EF4444', marginBottom: '2px' }}>
                <strong>Found Value:</strong> {v.actual_value}
              </div>
              <div style={{ color: '#10B981' }}>
                <strong>Threshold:</strong> {v.threshold}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Fallback if no violations are returned or API fails (404)
    return (
      <div style={{
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        border: '1px solid rgba(245, 158, 11, 0.2)',
        borderRadius: '6px',
        padding: '12px',
        fontSize: '12px',
        color: '#FCD34D',
        fontFamily: 'var(--sf-font-mono)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        lineHeight: '1.4'
      }}>
        <div style={{ fontWeight: 700, marginBottom: '6px' }}>Enforcement Details:</div>
        {detail}
        <div style={{ marginTop: '8px', color: '#E2E8F0' }}>
          <strong>Reason:</strong> {reason}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Why the gate blocked */}
      <div>
        <div style={{ fontSize: '11px', color: '#F59E0B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
          Why the Gate Blocked
        </div>
        {renderViolationsContent()}
      </div>

      {/* Automated Remediation Card */}
      <AutomatedRemediationCard
        type="policy"
        run={run}
        onAskVoid={(prompt) => {
          useVoidStore.getState().setTriggerPrompt(prompt);
        }}
      />

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <button
          onClick={() => {
            const prompt = `Explain why the Policy Gate blocked in pipeline run #${run.id} for commit "${run.commit_message}". What policy violations occurred and how can I resolve or bypass them?`;
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
          View Security Center <ShieldAlert size={14} />
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
export default BlockPolicyDrawer;
