import React, { useState, useMemo } from 'react';
import {
  GitPullRequest, Play, CheckCircle2, AlertTriangle, ShieldCheck,
  ChevronDown, ChevronRight, Zap, Terminal, X, Lock,
  Code2, Box, Globe, Rocket, ShieldAlert, Cpu
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useScans } from '../../hooks/useApi';
import { useUIStore } from '../../stores/uiStore';

// ─── Pipeline Stage Types ───────────────────────────────────────────

export interface PipelineStage {
  id: string;
  name: string;
  category: 'source' | 'ci' | 'sast' | 'secrets' | 'build' | 'container' | 'policy' | 'cd' | 'dast' | 'complete';
  status: 'passed' | 'failed' | 'blocked' | 'running' | 'queued';
  duration: string;
  startTime: string;
  endTime: string;
  icon: any;
  score?: number;
  details: Record<string, any>;
  logs: string[];
  blockReason?: string;
  aiExplanation?: string;
  suggestedFix?: string;
}

export default function PipelinesWorkspace() {
  const { data: rawScans, isLoading } = useScans();
  const { openVoidWithContext } = useUIStore();
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);
  const [expandedStageId, setExpandedStageId] = useState<string | null>('policy');
  const [blockedPanelStage, setBlockedPanelStage] = useState<PipelineStage | null>(null);

  const scans = useMemo(() => rawScans || [], [rawScans]);
  const activeScan = useMemo(() => {
    if (selectedScanId) return scans.find((s) => s.id === selectedScanId) || scans[0];
    return scans[0] || {};
  }, [scans, selectedScanId]);

  // Construct 10 Pipeline Stages from active scan data
  const pipelineStages = useMemo((): PipelineStage[] => {
    if (!activeScan.id) return [];

    const isBlocked = activeScan.action_taken === 'BLOCK';
    const isRunning = activeScan.status === 'running';

    const gitleaksFindings = activeScan.findings?.gitleaks || [];
    const semgrepFindings = activeScan.findings?.semgrep || [];
    const trivyResults = activeScan.findings?.Results || [];
    const trivyVulns = trivyResults.reduce((acc: any[], r: any) => [...acc, ...(r.Vulnerabilities || [])], []);
    const zapAlerts = activeScan.zap_findings?.alerts || activeScan.findings?.zap?.alerts || [];

    return [
      {
        id: 'push',
        name: 'Developer Push',
        category: 'source',
        status: 'passed',
        duration: '1.2s',
        startTime: '10:14:02',
        endTime: '10:14:03',
        icon: GitPullRequest,
        details: {
          repo: activeScan.repo_name || 'abhienix/SecureFlow',
          commit: (activeScan.commit_sha || '8f9b2a14').substring(0, 8),
          author: 'DevSecOps Engineer',
          branch: 'main',
          message: activeScan.commit_message || 'feat: update security policy and container spec',
        },
        logs: ['[Git] Commit 8f9b2a14 pushed to main', '[Webhook] Triggered SecureFlow Orchestrator'],
      },
      {
        id: 'github_actions',
        name: 'GitHub Actions',
        category: 'ci',
        status: 'passed',
        duration: '4.5s',
        startTime: '10:14:03',
        endTime: '10:14:07',
        icon: Cpu,
        details: { workflow: 'security-pipeline.yml', runId: '9841203', runner: 'ubuntu-latest-4-core' },
        logs: ['[CI] Worker acquired runner: ubuntu-latest', '[CI] Checked out repository HEAD'],
      },
      {
        id: 'gitleaks',
        name: 'Secrets Scan (Gitleaks)',
        category: 'secrets',
        status: gitleaksFindings.length > 0 ? (isBlocked ? 'blocked' : 'failed') : 'passed',
        duration: '2.8s',
        startTime: '10:14:07',
        endTime: '10:14:10',
        score: gitleaksFindings.length > 0 ? 30 : 100,
        icon: Lock,
        details: {
          scanner: 'Gitleaks v8.18.2',
          secretsFound: gitleaksFindings.length,
          findings: gitleaksFindings,
        },
        logs: gitleaksFindings.length > 0
          ? [`[Gitleaks] LEAK DETECTED: Secret found in ${gitleaksFindings[0]?.File || 'config.env'}`, '[Gitleaks] RuleID: aws-access-token']
          : ['[Gitleaks] No hardcoded secrets or API tokens detected.'],
        blockReason: gitleaksFindings.length > 0 ? 'Hardcoded AWS API Secret Key detected in repository commit history.' : undefined,
        aiExplanation: gitleaksFindings.length > 0 ? 'Gitleaks flagged an AWS secret key string matching the pattern `AKIAIOSFODNN7EXAMPLE`. Committing secrets directly creates high risk of credential exposure.' : undefined,
        suggestedFix: gitleaksFindings.length > 0 ? 'Remove secret from source code, revoke key in AWS IAM, and use GitHub Secrets or Cloud Key Management System.' : undefined,
      },
      {
        id: 'semgrep',
        name: 'SAST (Semgrep)',
        category: 'sast',
        status: semgrepFindings.length > 0 ? 'failed' : 'passed',
        duration: '6.1s',
        startTime: '10:14:10',
        endTime: '10:14:16',
        score: semgrepFindings.length > 0 ? 65 : 100,
        icon: Code2,
        details: {
          scanner: 'Semgrep Core 1.62.0',
          rulesEvaluated: 142,
          findings: semgrepFindings,
        },
        logs: semgrepFindings.length > 0
          ? [`[Semgrep] Finding: SQL Injection risk in app/db.py:42`, '[Semgrep] Rule: python.sqlalchemy.security.sql-injection']
          : ['[Semgrep] 142 security rules evaluated. 0 vulnerabilities found.'],
      },
      {
        id: 'docker_build',
        name: 'Docker Build',
        category: 'build',
        status: 'passed',
        duration: '12.4s',
        startTime: '10:14:16',
        endTime: '10:14:28',
        icon: Box,
        details: { image: `${activeScan.repo_name || 'secureflow'}:latest`, baseImage: 'node:18-alpine', size: '142 MB' },
        logs: ['[Docker] Building image tag: secureflow:latest', '[Docker] Exporting layers... Done.'],
      },
      {
        id: 'trivy',
        name: 'Container Scan (Trivy)',
        category: 'container',
        status: trivyVulns.length > 0 ? 'failed' : 'passed',
        duration: '8.3s',
        startTime: '10:14:28',
        endTime: '10:14:36',
        score: trivyVulns.length > 0 ? 70 : 100,
        icon: ShieldAlert,
        details: { scanner: 'Trivy v0.49.1', cveCount: trivyVulns.length, vulnerabilities: trivyVulns },
        logs: trivyVulns.length > 0
          ? [`[Trivy] Vulnerability found: ${trivyVulns[0]?.VulnerabilityID || 'CVE-2024-2189'} in ${trivyVulns[0]?.PkgName || 'openssl'}`]
          : ['[Trivy] Container image scanned. 0 Critical vulnerabilities.'],
      },
      {
        id: 'policy',
        name: 'Policy Engine',
        category: 'policy',
        status: isBlocked ? 'blocked' : 'passed',
        duration: '0.4s',
        startTime: '10:14:36',
        endTime: '10:14:37',
        score: isBlocked ? 0 : 100,
        icon: ShieldCheck,
        details: {
          policyVersion: '2.4',
          actionTaken: activeScan.action_taken || 'ALLOW',
          reason: activeScan.ai_explanation || 'Policy evaluation enforced.',
          rulesEvaluated: ['block_gitleaks_secrets', 'block_critical_cve', 'minimum_security_score_75'],
        },
        logs: isBlocked
          ? [`[Policy Engine] EVALUATION: BLOCK`, `[Policy Engine] Reason: ${activeScan.ai_explanation || 'Blocked by security policy'}`]
          : ['[Policy Engine] EVALUATION: ALLOW — All security gates satisfied.'],
        blockReason: isBlocked ? (activeScan.ai_explanation || 'Pipeline blocked by policy engine rule: block_gitleaks_secrets.') : undefined,
        aiExplanation: isBlocked ? 'The policy engine evaluated policy.yaml and determined that hardcoded secrets violate pipeline security requirements, triggering an immediate BLOCK decision.' : undefined,
        suggestedFix: isBlocked ? 'Resolve the flagged secret in Gitleaks stage and re-trigger pipeline.' : undefined,
      },
      {
        id: 'deploy',
        name: 'Deployment (Google Cloud)',
        category: 'cd',
        status: isBlocked ? 'blocked' : isRunning ? 'running' : 'passed',
        duration: isBlocked ? '0.0s' : '15.2s',
        startTime: '10:14:37',
        endTime: '10:14:52',
        icon: Rocket,
        details: { platform: 'Google Cloud Run', region: 'us-central1', url: 'https://secureflow-frontend-1083585992526.us-central1.run.app' },
        logs: isBlocked
          ? ['[GCP Deploy] ABORTED: Policy Engine emitted BLOCK signal. Deployment halted.']
          : ['[GCP Deploy] Deploying to Cloud Run service...', '[GCP Deploy] Traffic allocated 100% to revision v2.'],
      },
      {
        id: 'dast',
        name: 'DAST (OWASP ZAP)',
        category: 'dast',
        status: isBlocked ? 'queued' : zapAlerts.length > 0 ? 'failed' : 'passed',
        duration: isBlocked ? '0.0s' : '9.1s',
        startTime: '10:14:52',
        endTime: '10:15:01',
        score: zapAlerts.length > 0 ? 80 : 100,
        icon: Globe,
        details: { scanner: 'OWASP ZAP 2.14.0', alertsCount: zapAlerts.length, alerts: zapAlerts },
        logs: zapAlerts.length > 0
          ? [`[OWASP ZAP] Alert: ${zapAlerts[0]?.alert || 'Missing Anti-clickjacking Header'}`]
          : ['[OWASP ZAP] Active probe complete. Target endpoint healthy.'],
      },
      {
        id: 'complete',
        name: 'Pipeline Complete',
        category: 'complete',
        status: isBlocked ? 'blocked' : 'passed',
        duration: '42.8s',
        startTime: '10:14:02',
        endTime: '10:15:01',
        icon: CheckCircle2,
        details: { finalDecision: activeScan.action_taken || 'ALLOW' },
        logs: [`[Pipeline] Workflow completed with status: ${activeScan.action_taken || 'ALLOW'}`],
      },
    ];
  }, [activeScan]);

  const getStageStatusBadge = (status: PipelineStage['status']) => {
    switch (status) {
      case 'passed': return <Badge variant="passed">PASSED</Badge>;
      case 'blocked': return <Badge variant="blocked">BLOCKED</Badge>;
      case 'failed': return <Badge variant="failed">FAILED</Badge>;
      case 'running': return <Badge variant="running">RUNNING</Badge>;
      default: return <Badge variant="info">QUEUED</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={300} height={32} />
        <Skeleton height={120} />
        <Skeleton height={400} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>
            DevSecOps Pipeline Orchestration
          </h1>
          <p style={{ fontSize: 13, color: 'var(--sf-ink-low)', marginTop: 4 }}>
            End-to-end security gating: Code Push → Scanners → Policy Engine → GCP Deploy → DAST Validation
          </p>
        </div>

        {/* Scan Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <select
            value={activeScan.id || ''}
            onChange={(e) => setSelectedScanId(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--sf-bg-card)',
              border: '1px solid var(--sf-border)',
              color: 'var(--sf-ink)',
              fontSize: 13,
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                Pipeline #{s.id} — {s.repo_name || 'repo'} ({s.action_taken || 'ALLOW'})
              </option>
            ))}
          </select>

          <Button variant="primary" size="sm">
            <Play size={14} /> Run Pipeline
          </Button>
        </div>
      </div>

      {/* Hero Pipeline Flow Stepper (Visual Horizontal Flow) */}
      <Card style={{ padding: 20 }}>
        <CardHeader
          title={`Pipeline #${activeScan.id || 1} — ${activeScan.repo_name || 'abhienix/SecureFlow'}`}
          subtitle={`Commit SHA: ${(activeScan.commit_sha || '8f9b2a14').substring(0, 8)} | Triggered via GitHub Push`}
          action={<Badge variant={activeScan.action_taken === 'BLOCK' ? 'blocked' : 'passed'}>{activeScan.action_taken || 'ALLOW'}</Badge>}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', padding: '16px 0 8px' }}>
          {pipelineStages.map((stage, idx) => {
            const Icon = stage.icon;
            const isSelected = expandedStageId === stage.id;

            return (
              <React.Fragment key={stage.id}>
                <div
                  onClick={() => setExpandedStageId(isSelected ? null : stage.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 14px',
                    borderRadius: 10,
                    background: isSelected ? 'var(--sf-accent-soft)' : 'var(--sf-bg-surface)',
                    border: `1px solid ${isSelected ? 'var(--sf-accent)' : stage.status === 'blocked' || stage.status === 'failed' ? 'var(--sf-red-border)' : 'var(--sf-border)'}`,
                    cursor: 'pointer',
                    minWidth: 110,
                    transition: 'all 150ms ease',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: stage.status === 'passed' ? 'var(--sf-green-soft)' : stage.status === 'blocked' || stage.status === 'failed' ? 'var(--sf-red-soft)' : 'var(--sf-accent-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={16} color={stage.status === 'passed' ? 'var(--sf-green)' : stage.status === 'blocked' || stage.status === 'failed' ? 'var(--sf-red)' : 'var(--sf-accent)'} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-ink)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {stage.name.split(' ')[0]}
                  </span>
                  {getStageStatusBadge(stage.status)}
                </div>

                {idx < pipelineStages.length - 1 && (
                  <div style={{ width: 16, height: 2, background: 'var(--sf-border)', flexShrink: 0 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* Main Content Layout: Stage Details & Logs */}
      <div className="sf-v2-grid-2">
        {/* Stage Execution List */}
        <Card>
          <CardHeader title="Pipeline Stages & Scanner Output" subtitle="Click any stage to expand detailed scanner telemetry" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pipelineStages.map((stage) => {
              const Icon = stage.icon;
              const isExpanded = expandedStageId === stage.id;

              return (
                <div
                  key={stage.id}
                  style={{
                    borderRadius: 10,
                    border: `1px solid ${stage.status === 'blocked' || stage.status === 'failed' ? 'var(--sf-red-border)' : 'var(--sf-border)'}`,
                    background: 'var(--sf-bg-surface)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Stage Row Header */}
                  <div
                    onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isExpanded ? 'var(--sf-bg-card)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {isExpanded ? <ChevronDown size={16} color="var(--sf-ink-mid)" /> : <ChevronRight size={16} color="var(--sf-ink-mid)" />}
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          background: 'var(--sf-bg-elevated)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Icon size={14} color="var(--sf-ink)" />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>{stage.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--sf-ink-low)' }}>Duration: {stage.duration}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {stage.status === 'blocked' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBlockedPanelStage(stage);
                          }}
                        >
                          <AlertTriangle size={13} /> WHY BLOCKED
                        </Button>
                      )}
                      {getStageStatusBadge(stage.status)}
                    </div>
                  </div>

                  {/* Stage Expansion Body */}
                  {isExpanded && (
                    <div style={{ padding: 16, borderTop: '1px solid var(--sf-border)', background: 'var(--sf-bg-card)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Key Details Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                        {Object.entries(stage.details).map(([k, v]) => {
                          if (typeof v === 'object') return null;
                          return (
                            <div key={k} style={{ padding: 8, borderRadius: 6, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
                              <div style={{ fontSize: 10, color: 'var(--sf-ink-low)', textTransform: 'uppercase', fontWeight: 700 }}>{k}</div>
                              <div style={{ fontSize: 12, color: 'var(--sf-ink)', fontWeight: 600, marginTop: 2, wordBreak: 'break-all' }}>{String(v)}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Live Logs */}
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-ink-mid)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Terminal size={12} /> Scanner Logs & Console Output
                        </div>
                        <div
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            background: '#080c14',
                            border: '1px solid #1e293b',
                            fontFamily: 'var(--sf-font-mono)',
                            fontSize: 11,
                            color: '#38bdf8',
                            lineHeight: 1.6,
                            maxHeight: 140,
                            overflowY: 'auto',
                          }}
                        >
                          {stage.logs.map((l, i) => <div key={i}>{l}</div>)}
                        </div>
                      </div>

                      {/* Action trigger */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openVoidWithContext({ stage: stage.name, details: stage.details, logs: stage.logs })}
                        >
                          <Zap size={13} color="var(--sf-accent)" /> Ask Void About {stage.name}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* Active Scan Telemetry & Logs Summary */}
        <Card>
          <CardHeader title="Pipeline Execution Logs" subtitle="Real-time console stream & policy decision telemetry" />
          <div
            style={{
              padding: 16,
              borderRadius: 8,
              background: '#080c14',
              border: '1px solid #1e293b',
              fontFamily: 'var(--sf-font-mono)',
              fontSize: 12,
              color: '#f8fafc',
              lineHeight: 1.7,
              height: 480,
              overflowY: 'auto',
            }}
          >
            <div style={{ color: '#64748b' }}>[10:14:02] Initializing SecureFlow Enterprise Orchestration Worker...</div>
            <div style={{ color: '#10b981' }}>[10:14:03] ✔ GitHub Webhook Verified: Push to refs/heads/main</div>
            <div style={{ color: '#10b981' }}>[10:14:07] ✔ CI Workflow #9841203 running on runner ubuntu-latest</div>
            <div style={{ color: '#ef4444' }}>[10:14:10] ❌ Gitleaks Scanner: AWS API Secret Key found in config/env.sample:14</div>
            <div style={{ color: '#38bdf8' }}>[10:14:16] ℹ Semgrep SAST: 142 rules evaluated. 1 warning found.</div>
            <div style={{ color: '#10b981' }}>[10:14:28] ✔ Docker Build: Compiled secureflow:latest (142 MB)</div>
            <div style={{ color: '#f59e0b' }}>[10:14:36] ⚠️ Trivy Container: 1 Medium CVE detected in openssl layer</div>
            <div style={{ color: '#ef4444', fontWeight: 800 }}>[10:14:37] ⛔ POLICY ENGINE: BLOCK SIGNAL EMITTED</div>
            <div style={{ color: '#ef4444' }}>[10:14:37] Reason: Policy rule 'block_gitleaks_secrets' triggered. Pipeline execution aborted.</div>
            <div style={{ color: '#64748b' }}>[10:14:37] Slack Notification sent to #devsecops-alerts</div>
          </div>
        </Card>
      </div>

      {/* "WHY BLOCKED" Side Investigation Drawer */}
      {blockedPanelStage && (
        <div
          onClick={() => setBlockedPanelStage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9990,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="fade-in"
            style={{
              width: 520,
              maxWidth: '92vw',
              height: '100vh',
              background: 'var(--sf-bg-card)',
              borderLeft: '1px solid var(--sf-border)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              padding: 24,
              gap: 16,
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--sf-border)', paddingBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--sf-red-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <AlertTriangle size={20} color="var(--sf-red)" />
                </div>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>
                    Why Blocked: {blockedPanelStage.name}
                  </h2>
                  <span style={{ fontSize: 11, color: 'var(--sf-red)', fontWeight: 700 }}>
                    Security Policy Violation
                  </span>
                </div>
              </div>
              <button onClick={() => setBlockedPanelStage(null)} style={{ background: 'none', border: 'none', color: 'var(--sf-ink-low)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Block Reason */}
            <div style={{ padding: 14, borderRadius: 10, background: 'var(--sf-red-soft)', border: '1px solid var(--sf-red-border)' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--sf-red)', textTransform: 'uppercase', marginBottom: 4 }}>
                Primary Block Reason
              </div>
              <div style={{ fontSize: 13, color: 'var(--sf-ink)', fontWeight: 600 }}>
                {blockedPanelStage.blockReason || 'Blocked by policy engine evaluation.'}
              </div>
            </div>

            {/* AI Explanation */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} color="var(--sf-accent)" /> Void AI Diagnosis
              </h3>
              <p style={{ fontSize: 13, color: 'var(--sf-ink-mid)', lineHeight: 1.5, background: 'var(--sf-bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--sf-border)' }}>
                {blockedPanelStage.aiExplanation || 'Void AI analyzed the scanner output and confirmed a critical security rule breach.'}
              </p>
            </div>

            {/* Suggested Fix */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-green)', marginBottom: 6 }}>
                🛠️ Suggested Remediation Fix
              </h3>
              <div style={{ fontSize: 12, color: 'var(--sf-ink-mid)', lineHeight: 1.5, background: 'var(--sf-bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--sf-border)' }}>
                {blockedPanelStage.suggestedFix || 'Remove sensitive credentials and push a updated commit.'}
              </div>
            </div>

            {/* Scanner Logs */}
            <div>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink-mid)', marginBottom: 6 }}>
                Scanner Output & Logs
              </h3>
              <div style={{ padding: 12, borderRadius: 8, background: '#080c14', border: '1px solid #1e293b', fontFamily: 'var(--sf-font-mono)', fontSize: 11, color: '#ef4444', lineHeight: 1.6 }}>
                {blockedPanelStage.logs.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--sf-border)', display: 'flex', gap: 10 }}>
              <Button
                variant="primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setBlockedPanelStage(null);
                  openVoidWithContext({
                    stage: blockedPanelStage.name,
                    blockReason: blockedPanelStage.blockReason,
                    logs: blockedPanelStage.logs,
                  });
                }}
              >
                <Zap size={14} /> Open in Void Assistant
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
