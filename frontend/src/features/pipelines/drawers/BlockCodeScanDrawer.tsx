import React from 'react';
import { ExternalLink, ShieldCheck, Bot } from 'lucide-react';
import { PipelineRun } from '../types/pipeline.types';
import { useVoidStore } from '../../../stores/voidStore';

interface BlockCodeScanDrawerProps {
  run: PipelineRun;
  onNavigateToSecurity: () => void;
}

export function BlockCodeScanDrawer({ run, onNavigateToSecurity }: BlockCodeScanDrawerProps) {
  const step = run.pipeline_steps?.code_scan;
  const detail = step?.detail || 'Security scan policy block.';
  
  // Safely extract findings arrays
  const gitleaks = run.gitleaks || run.findings?.gitleaks || [];
  const semgrepResults = run.semgrep?.results || run.findings?.semgrep || [];

  const githubUrl = `https://github.com/${run.repo_name}/actions`;

  // Render scan findings
  const renderFindings = () => {
    if (gitleaks.length > 0) {
      return (
        <div>
          <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            What Was Found (Gitleaks)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {gitleaks.slice(0, 5).map((g: any, i: number) => (
              <div key={i} style={{
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                <div style={{ fontWeight: 700, color: '#FCA5A5', marginBottom: '4px' }}>
                  Scanner: Gitleaks
                </div>
                <div style={{ color: '#E2E8F0', marginBottom: '2px' }}>
                  <strong>Rule:</strong> {g.RuleID || g.rule || 'Hardcoded Secret'}
                </div>
                <div style={{ color: '#E2E8F0', marginBottom: '2px' }}>
                  <strong>File:</strong> <code>{g.File || g.file}</code>:{g.StartLine || g.line}
                </div>
                <div style={{ color: '#94A3B8', fontFamily: 'var(--sf-font-mono)', fontSize: '11px' }}>
                  Commit: {String(g.Commit || run.commit_sha).slice(0, 7)}
                </div>
              </div>
            ))}
            {gitleaks.length > 5 && (
              <div style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
                + {gitleaks.length - 5} more secret findings (see Security Center)
              </div>
            )}
          </div>
        </div>
      );
    }

    if (semgrepResults.length > 0) {
      return (
        <div>
          <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            What Was Found (Semgrep)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {semgrepResults.slice(0, 5).map((s: any, i: number) => (
              <div key={i} style={{
                backgroundColor: 'rgba(239, 68, 68, 0.05)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
                padding: '12px',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                <div style={{ fontWeight: 700, color: '#FCA5A5', marginBottom: '4px' }}>
                  Scanner: Semgrep
                </div>
                <div style={{ color: '#E2E8F0', marginBottom: '2px' }}>
                  <strong>Rule:</strong> {s.check_id || s.rule_id || 'SAST Rule'}
                </div>
                <div style={{ color: '#E2E8F0', marginBottom: '2px' }}>
                  <strong>File:</strong> <code>{s.path || s.file}</code>:{s.start?.line || s.line}
                </div>
                <div style={{ color: '#E2E8F0', fontStyle: 'italic', marginTop: '4px', backgroundColor: '#0F172A', padding: '6px', borderRadius: '4px' }}>
                  {s.extra?.message || s.message}
                </div>
              </div>
            ))}
            {semgrepResults.length > 5 && (
              <div style={{ fontSize: '12px', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
                + {semgrepResults.length - 5} more SAST findings (see Security Center)
              </div>
            )}
          </div>
        </div>
      );
    }

    // Default fallback if both are empty
    return (
      <div>
        <div style={{ fontSize: '11px', color: '#EF4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
          What Was Found
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
          wordBreak: 'break-all'
        }}>
          {detail}
        </div>
      </div>
    );
  };

  // Render remediation guide
  const renderRemediation = () => {
    if (gitleaks.length > 0) {
      return (
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
            lineHeight: '1.6'
          }}>
            A secret or credential was detected in your commit.
            You must:
            <ol style={{ paddingLeft: '20px', margin: '8px 0 0 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li><strong>Remove the secret</strong> from the file immediately.</li>
              <li><strong>Rotate the exposed credential</strong> right now (invalidate the old token/key/password).</li>
              <li>Use an <strong>environment variable or GitHub Secret</strong> instead of hardcoding the value.</li>
              <li>Rewrite git history if the secret was in a previous commit:
                <code style={{ display: 'block', backgroundColor: '#0F172A', padding: '4px', borderRadius: '4px', marginTop: '4px', fontFamily: 'var(--sf-font-mono)' }}>git commit --amend # for latest commit</code>
                <code style={{ display: 'block', backgroundColor: '#0F172A', padding: '4px', borderRadius: '4px', marginTop: '4px', fontFamily: 'var(--sf-font-mono)' }}>git rebase -i # for older commits</code>
              </li>
              <li><strong>Force-push</strong> the cleaned branch.</li>
            </ol>
            The pipeline will re-run automatically.
          </div>
        </div>
      );
    }

    // Default Semgrep remediation
    const firstSemgrep = semgrepResults[0] || {};
    return (
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
          lineHeight: '1.6'
        }}>
          An insecure code pattern was detected.
          <div style={{ marginTop: '8px', marginBottom: '8px' }}>
            • <strong>File:</strong> <code>{firstSemgrep.path || 'unknown'}</code>:{firstSemgrep.start?.line || '0'}
            <br />
            • <strong>Rule violated:</strong> <code>{firstSemgrep.check_id || 'unknown'}</code>
          </div>
          See Security Center → SAST Findings for full details and remediation guidance.
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {renderFindings()}
      {renderRemediation()}

      {/* Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <button
          onClick={() => {
            const prompt = `Explain why the Code Scan stage blocked in pipeline run #${run.id} for commit "${run.commit_message}". What Gitleaks/Semgrep findings caused it and how can I resolve them?`;
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
          View in Security Center <ShieldCheck size={14} />
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
export default BlockCodeScanDrawer;
