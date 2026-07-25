import React, { useState, useMemo, useRef } from 'react';
import {
  GitPullRequest, CheckCircle2, AlertTriangle, ShieldCheck, ShieldX,
  ChevronDown, ChevronRight, Zap, Terminal, X, Lock, RefreshCw,
  Code2, Box, Globe, Rocket, ShieldAlert, Cpu, Slash, Copy, Search, Clock
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useScans } from '../../hooks/useApi';
import { useUIStore } from '../../stores/uiStore';

export interface PipelineStage {
  id: string;
  name: string;
  category: 'source' | 'ci' | 'sast' | 'secrets' | 'build' | 'container' | 'policy' | 'cd' | 'dast' | 'complete';
  status: 'passed' | 'failed' | 'blocked' | 'running' | 'queued' | 'skipped';
  duration: string;
  startTime: string;
  endTime: string;
  icon: any;
  scannerName?: string;
  scannerVersion?: string;
  findingCount?: number;
  findingBadge?: string;
  details: Record<string, any>;
  logs: Array<{
    timestamp: string;
    type: 'success' | 'error' | 'policy' | 'info' | 'start';
    message: string;
    isCriticalCallout?: boolean;
    calloutDetails?: string;
  }>;
  blockReason?: string;
  aiExplanation?: string;
  suggestedFix?: string;
}

export default function PipelinesWorkspace() {
  const { data: rawScans, isLoading } = useScans();
  const { openVoidWithContext } = useUIStore();

  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStageId, setExpandedStageId] = useState<string | null>('gitleaks');
  const [blockedPanelStage, setBlockedPanelStage] = useState<PipelineStage | null>(null);
  const [consoleFilter, setConsoleFilter] = useState<'all' | 'errors' | 'policy' | 'scanners' | 'starts'>('all');

  const [autoScroll, setAutoScroll] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);
  const [hoveredStage, setHoveredStage] = useState<PipelineStage | null>(null);
  const [copiedLogs, setCopiedLogs] = useState(false);

  const scans = useMemo(() => rawScans || [], [rawScans]);
  const activeScan = useMemo(() => {
    if (selectedScanId) return scans.find((s) => s.id === selectedScanId) || scans[0];
    return scans[0] || {};
  }, [scans, selectedScanId]);

  // Handle console scroll up to pause auto scroll
  const handleConsoleScroll = () => {
    if (!consoleRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = consoleRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  };

  const scrollToBottom = () => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  // Construct 10 Pipeline Stages with Section 1 logic
  const pipelineStages = useMemo((): PipelineStage[] => {
    if (!activeScan.id) return [];

    const isBlocked = activeScan.action_taken === 'BLOCK';
    const isRunning = activeScan.status === 'running';

    const gitleaksFindings = activeScan.findings?.gitleaks || [];
    const semgrepFindings = activeScan.findings?.semgrep || [];
    const trivyResults = activeScan.findings?.Results || [];
    const trivyVulns = trivyResults.reduce((acc: any[], r: any) => [...acc, ...(r.Vulnerabilities || [])], []);
    const zapAlerts = activeScan.zap_findings?.alerts || activeScan.findings?.zap?.alerts || [];

    const rawStages: PipelineStage[] = [
      {
        id: 'push',
        name: 'Developer Push',
        category: 'source',
        status: 'passed',
        duration: '1.2s',
        startTime: '10:14:02',
        endTime: '10:14:03',
        icon: GitPullRequest,
        scannerName: 'Git Webhook',
        scannerVersion: 'v2.4',
        findingCount: 0,
        details: {
          repo: activeScan.repo_name || 'abhienix/SecureFlow',
          commit: (activeScan.commit_sha || '8f9b2a14').substring(0, 8),
          author: 'DevSecOps Engineer',
          branch: 'main',
          message: activeScan.commit_message || 'feat: update security policy and container spec',
        },
        logs: [
          { timestamp: '10:14:02', type: 'start', message: '=== Stage 1: Developer Push Started ===' },
          { timestamp: '10:14:02', type: 'info', message: '[Git] Commit 8f9b2a14 pushed to main by devsecops' },
          { timestamp: '10:14:03', type: 'success', message: '[Git Webhook] Triggered SecureFlow Orchestrator payload' },
        ],
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
        scannerName: 'GitHub Runner',
        scannerVersion: 'ubuntu-latest',
        findingCount: 0,
        details: { workflow: 'security-pipeline.yml', runId: '9841203', runner: 'ubuntu-latest-4-core' },
        logs: [
          { timestamp: '10:14:03', type: 'start', message: '=== Stage 2: GitHub Actions Runner Started ===' },
          { timestamp: '10:14:04', type: 'info', message: '[CI] Worker acquired runner: ubuntu-latest (4 vCPU, 16GB RAM)' },
          { timestamp: '10:14:07', type: 'success', message: '[CI] Checked out repository HEAD cleanly' },
        ],
      },
      {
        id: 'gitleaks',
        name: 'Secrets Scan (Gitleaks)',
        category: 'secrets',
        status: gitleaksFindings.length > 0 ? 'failed' : 'passed',
        duration: '2.8s',
        startTime: '10:14:07',
        endTime: '10:14:10',
        scannerName: 'Gitleaks',
        scannerVersion: 'v8.18.2',
        findingCount: gitleaksFindings.length,
        findingBadge: gitleaksFindings.length > 0 ? '1 secret leaked' : undefined,
        icon: Lock,
        details: {
          scanner: 'Gitleaks v8.18.2',
          secretsFound: gitleaksFindings.length,
          findings: gitleaksFindings,
        },
        logs: gitleaksFindings.length > 0
          ? [
              { timestamp: '10:14:07', type: 'start', message: '=== Stage 3: Gitleaks Secrets Scan Started ===' },
              {
                timestamp: '10:14:09',
                type: 'error',
                message: '[Gitleaks] CRITICAL SECRET LEAK DETECTED: AWS Secret Key string found in config/env.sample:14',
                isCriticalCallout: true,
                calloutDetails: 'AWS Secret Key pattern AKIAIOSFODNN7EXAMPLE found in config/env.sample:14. Subsequent stages skipped automatically.',
              },
              {
                timestamp: '10:14:10',
                type: 'policy',
                message: '[Policy Engine] POLICY ENGINE: BLOCK SIGNAL EMITTED (gitleaks_secret_leak)',
              },
            ]
          : [
              { timestamp: '10:14:07', type: 'start', message: '=== Stage 3: Gitleaks Secrets Scan Started ===' },
              { timestamp: '10:14:10', type: 'success', message: '[Gitleaks] No hardcoded secrets or API tokens detected.' },
            ],
        blockReason: gitleaksFindings.length > 0 ? 'Hardcoded AWS API Secret Key detected in repository commit history.' : undefined,
        aiExplanation: gitleaksFindings.length > 0 ? 'Gitleaks flagged an AWS secret key string matching pattern `AKIAIOSFODNN7EXAMPLE`. Committing secrets creates severe credential exposure risk.' : undefined,
        suggestedFix: gitleaksFindings.length > 0 ? 'Remove secret from source code, revoke key in AWS IAM, and use GitHub Secrets or Cloud KMS.' : undefined,
      },
      {
        id: 'semgrep',
        name: 'SAST (Semgrep)',
        category: 'sast',
        status: semgrepFindings.length > 0 ? 'failed' : 'passed',
        duration: '6.1s',
        startTime: '10:14:10',
        endTime: '10:14:16',
        scannerName: 'Semgrep Core',
        scannerVersion: 'v1.62.0',
        findingCount: semgrepFindings.length,
        findingBadge: semgrepFindings.length > 0 ? '2 findings' : undefined,
        icon: Code2,
        details: {
          scanner: 'Semgrep Core 1.62.0',
          rulesEvaluated: 142,
          findings: semgrepFindings,
        },
        logs: semgrepFindings.length > 0
          ? [
              { timestamp: '10:14:10', type: 'start', message: '=== Stage 4: Semgrep SAST Started ===' },
              { timestamp: '10:14:14', type: 'error', message: '[Semgrep] Finding: SQL Injection vulnerability pattern in app/db.py:42' },
              { timestamp: '10:14:16', type: 'info', message: '[Semgrep] Rule: python.sqlalchemy.security.sql-injection' },
            ]
          : [
              { timestamp: '10:14:10', type: 'start', message: '=== Stage 4: Semgrep SAST Started ===' },
              { timestamp: '10:14:16', type: 'success', message: '[Semgrep] 142 security rules evaluated. 0 vulnerabilities found.' },
            ],
      },
      {
        id: 'docker_build',
        name: 'Docker Build',
        category: 'build',
        status: 'passed',
        duration: '12.4s',
        startTime: '10:14:16',
        endTime: '10:14:28',
        scannerName: 'Docker Engine',
        scannerVersion: 'v25.0',
        findingCount: 0,
        icon: Box,
        details: { image: `${activeScan.repo_name || 'secureflow'}:latest`, baseImage: 'node:18-alpine', size: '142 MB' },
        logs: [
          { timestamp: '10:14:16', type: 'start', message: '=== Stage 5: Docker Build Started ===' },
          { timestamp: '10:14:28', type: 'success', message: '[Docker] Container image built successfully (142 MB)' },
        ],
      },
      {
        id: 'trivy',
        name: 'Container Scan (Trivy)',
        category: 'container',
        status: trivyVulns.length > 0 ? 'failed' : 'passed',
        duration: '8.3s',
        startTime: '10:14:28',
        endTime: '10:14:36',
        scannerName: 'Trivy Container',
        scannerVersion: 'v0.49.1',
        findingCount: trivyVulns.length,
        findingBadge: trivyVulns.length > 0 ? `${trivyVulns.length} CVEs` : undefined,
        icon: ShieldAlert,
        details: { scanner: 'Trivy v0.49.1', cveCount: trivyVulns.length, vulnerabilities: trivyVulns },
        logs: trivyVulns.length > 0
          ? [
              { timestamp: '10:14:28', type: 'start', message: '=== Stage 6: Trivy Container CVE Scan Started ===' },
              { timestamp: '10:14:34', type: 'error', message: `[Trivy] Vulnerability found: ${trivyVulns[0]?.VulnerabilityID || 'CVE-2024-2189'} in ${trivyVulns[0]?.PkgName || 'openssl'}` },
            ]
          : [
              { timestamp: '10:14:28', type: 'start', message: '=== Stage 6: Trivy Container CVE Scan Started ===' },
              { timestamp: '10:14:36', type: 'success', message: '[Trivy] Container image scanned. 0 Critical CVEs found.' },
            ],
      },
      {
        id: 'policy',
        name: 'Policy Engine',
        category: 'policy',
        status: isBlocked ? 'blocked' : 'passed',
        duration: '0.4s',
        startTime: '10:14:36',
        endTime: '10:14:37',
        scannerName: 'Policy Engine',
        scannerVersion: 'policy.yaml v2.4',
        findingCount: isBlocked ? 1 : 0,
        icon: ShieldCheck,
        details: {
          policyVersion: '2.4',
          actionTaken: activeScan.action_taken || 'ALLOW',
          reason: activeScan.ai_explanation || 'Policy evaluation enforced.',
          rulesEvaluated: ['block_gitleaks_secrets', 'block_critical_cve', 'minimum_security_score_75'],
        },
        logs: isBlocked
          ? [
              { timestamp: '10:14:36', type: 'start', message: '=== Stage 7: Policy Engine Evaluation Started ===' },
              { timestamp: '10:14:37', type: 'policy', message: `[Policy Engine] EVALUATION RESULT: BLOCK — ${activeScan.ai_explanation || 'Blocked by security policy'}` },
            ]
          : [
              { timestamp: '10:14:36', type: 'start', message: '=== Stage 7: Policy Engine Evaluation Started ===' },
              { timestamp: '10:14:37', type: 'success', message: '[Policy Engine] EVALUATION RESULT: ALLOW — All security gates satisfied.' },
            ],
      },
      {
        id: 'deploy',
        name: 'Deployment (Google Cloud)',
        category: 'cd',
        status: isRunning ? 'running' : 'passed',
        duration: '15.2s',
        startTime: '10:14:37',
        endTime: '10:14:52',
        scannerName: 'GCP Cloud Run',
        scannerVersion: 'v1.4',
        findingCount: 0,
        icon: Rocket,
        details: { platform: 'Google Cloud Run', region: 'us-central1', url: 'https://secureflow-frontend-1083585992526.us-central1.run.app' },
        logs: [
          { timestamp: '10:14:37', type: 'start', message: '=== Stage 8: GCP Cloud Run Deployment Started ===' },
          { timestamp: '10:14:52', type: 'success', message: '[GCP Deploy] Deployed to Cloud Run service revision v2' },
        ],
      },
      {
        id: 'dast',
        name: 'DAST (OWASP ZAP)',
        category: 'dast',
        status: zapAlerts.length > 0 ? 'failed' : 'passed',
        duration: '9.1s',
        startTime: '10:14:52',
        endTime: '10:15:01',
        scannerName: 'OWASP ZAP',
        scannerVersion: 'v2.14.0',
        findingCount: zapAlerts.length,
        findingBadge: zapAlerts.length > 0 ? `${zapAlerts.length} alerts` : undefined,
        icon: Globe,
        details: { scanner: 'OWASP ZAP 2.14.0', alertsCount: zapAlerts.length, alerts: zapAlerts },
        logs: zapAlerts.length > 0
          ? [
              { timestamp: '10:14:52', type: 'start', message: '=== Stage 9: OWASP ZAP DAST Scan Started ===' },
              { timestamp: '10:15:01', type: 'error', message: `[OWASP ZAP] Alert: ${zapAlerts[0]?.alert || 'Missing Anti-clickjacking Header'}` },
            ]
          : [
              { timestamp: '10:14:52', type: 'start', message: '=== Stage 9: OWASP ZAP DAST Scan Started ===' },
              { timestamp: '10:15:01', type: 'success', message: '[OWASP ZAP] Active probe complete. Target endpoint healthy.' },
            ],
      },
      {
        id: 'complete',
        name: 'Pipeline Complete',
        category: 'complete',
        status: isBlocked ? 'blocked' : 'passed',
        duration: '42.8s',
        startTime: '10:14:02',
        endTime: '10:15:01',
        scannerName: 'Orchestration Engine',
        scannerVersion: 'v2.0',
        findingCount: 0,
        icon: CheckCircle2,
        details: { finalDecision: activeScan.action_taken || 'ALLOW' },
        logs: [
          { timestamp: '10:15:01', type: 'start', message: '=== Stage 10: Workflow Complete ===' },
          { timestamp: '10:15:01', type: 'info', message: `[Pipeline] Workflow finished with decision: ${activeScan.action_taken || 'ALLOW'}` },
        ],
      },
    ];

    // Cascading failure & skip logic:
    let hasFailed = false;
    let failedStageName = '';

    return rawStages.map((stage) => {
      if (hasFailed) {
        return {
          ...stage,
          status: 'skipped' as const,
          duration: '0.0s',
          findingCount: 0,
          findingBadge: undefined,
          logs: [
            {
              timestamp: stage.startTime,
              type: 'info',
              message: `[Pipeline] Stage SKIPPED because previous stage '${failedStageName}' failed or emitted BLOCK signal.`,
            },
          ],
          blockReason: undefined,
          aiExplanation: undefined,
          suggestedFix: undefined,
        };
      }

      if (stage.status === 'blocked' || stage.status === 'failed') {
        hasFailed = true;
        failedStageName = stage.name;
      }

      return stage;
    });
  }, [activeScan]);

  // Aggregate all console log lines across stages
  const allConsoleLogs = useMemo(() => {
    const logs: Array<{
      stageName: string;
      timestamp: string;
      type: 'success' | 'error' | 'policy' | 'info' | 'start';
      message: string;
      isCriticalCallout?: boolean;
      calloutDetails?: string;
    }> = [];

    pipelineStages.forEach((stg) => {
      stg.logs.forEach((l) => {
        logs.push({
          stageName: stg.name.split(' ')[0],
          timestamp: l.timestamp,
          type: l.type,
          message: l.message,
          isCriticalCallout: l.isCriticalCallout,
          calloutDetails: l.calloutDetails,
        });
      });
    });

    return logs;
  }, [pipelineStages]);

  // Safe relative timestamp helper (Item 2 QA Pass)
  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return null;
    const dateMs = new Date(dateStr).getTime();
    if (isNaN(dateMs)) return null;
    const diffMin = Math.floor((Date.now() - dateMs) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin} min ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return `${Math.floor(diffH / 24)}d ago`;
  };

  const filteredConsoleLogs = useMemo(() => {
    switch (consoleFilter) {
      case 'errors': return allConsoleLogs.filter((l) => l.type === 'error' || l.type === 'policy');
      case 'policy': return allConsoleLogs.filter((l) => l.type === 'policy');
      // Item 5 QA Pass: Full scanner regex matching all real engine names
      case 'scanners': return allConsoleLogs.filter((l) =>
        /gitleaks|semgrep|trivy|owasp zap|zap|policy engine|github actions|gcp deploy|developer push|docker build/i.test(l.message)
      );
      case 'starts': return allConsoleLogs.filter((l) => l.type === 'start');
      default: return allConsoleLogs;
    }
  }, [allConsoleLogs, consoleFilter]);

  const handleCopyAllLogs = () => {
    const logText = allConsoleLogs.map((l) => `[${l.timestamp}] [${l.stageName}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(logText);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  // Filter dropdown items
  const filteredDropdownScans = useMemo(() => {
    if (!searchQuery) return scans;
    const q = searchQuery.toLowerCase();
    return scans.filter(
      (s) =>
        String(s.id).includes(q) ||
        (s.repo_name || '').toLowerCase().includes(q) ||
        (s.action_taken || '').toLowerCase().includes(q)
    );
  }, [scans, searchQuery]);

  if (isLoading) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={300} height={32} />
        <Skeleton height={140} />
        <Skeleton height={400} />
      </div>
    );
  }

  const decision = activeScan.action_taken || 'ALLOW';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* SECTION 1B: PROMINENT TOP POLICY BANNER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 20px',
          borderRadius: 12,
          height: 52,
          background: decision === 'ALLOW' ? '#dcfce7' : decision === 'BLOCK' ? '#fee2e2' : '#fef9c3',
          border: `1px solid ${decision === 'ALLOW' ? '#86efac' : decision === 'BLOCK' ? '#fca5a5' : '#fde68a'}`,
          color: decision === 'ALLOW' ? '#15803d' : decision === 'BLOCK' ? '#b91c1c' : '#854d0e',
          animation: decision === 'BLOCK' ? 'pulse 1.5s infinite ease-in-out' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {decision === 'ALLOW' && <ShieldCheck size={22} color="#15803d" />}
          {decision === 'BLOCK' && <ShieldX size={22} color="#b91c1c" />}
          {decision !== 'ALLOW' && decision !== 'BLOCK' && <AlertTriangle size={22} color="#854d0e" />}

          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '0.3px' }}>
              SECURITY POLICY DECISION: {decision}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {decision === 'ALLOW'
                ? 'All scanner gates passed policy checks cleanly. Deployment approved.'
                : 'Pipeline execution halted by policy enforcement gate. Action required.'}
            </div>
          </div>
        </div>

        {/* SECTION 1C: REDESIGNED PIPELINE SELECTOR DROPDOWN */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen((p) => !p)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 8,
              background: 'var(--sf-bg-card)',
              border: '1px solid var(--sf-border)',
              color: 'var(--sf-ink)',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <span>Pipeline #{activeScan.id || 1}</span>
            <ChevronDown size={16} />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 44,
                width: 340,
                maxHeight: 400,
                background: 'var(--sf-bg-card)',
                border: '1px solid var(--sf-border)',
                borderRadius: 12,
                boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Search Bar inside Dropdown */}
              <div style={{ padding: 10, borderBottom: '1px solid var(--sf-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
                  <Search size={14} color="var(--sf-ink-low)" />
                  <input
                    type="text"
                    placeholder="Search pipeline # or repo..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ background: 'none', border: 'none', color: 'var(--sf-ink)', fontSize: 12, outline: 'none', width: '100%' }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredDropdownScans.map((s) => {
                  const isBlk = s.action_taken === 'BLOCK';
                  const isSelected = s.id === activeScan.id;

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedScanId(s.id);
                        setDropdownOpen(false);
                      }}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: isSelected ? 'var(--sf-accent-soft)' : 'var(--sf-bg-surface)',
                        borderLeft: isBlk ? '3px solid #ef4444' : '3px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>#{s.id}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: isBlk ? '#ef4444' : '#10b981' }}>{s.action_taken || 'ALLOW'}</span>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--sf-ink-low)' }}>
                        {s.repo_name || 'abhienix/SecureFlow'} · main
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--sf-ink-muted)' }}>
                        <Clock size={10} /> ⬆ push · {formatRelativeTime(s.created_at || s.timestamp) || `#${s.id}`}
                      </div>

                      {/* Dot preview of stages */}
                      <div style={{ display: 'flex', gap: 3, marginTop: 2 }}>
                        {Array.from({ length: 8 }).map((_, di) => (
                          <span
                            key={di}
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: isBlk && di === 2 ? '#ef4444' : di > 2 && isBlk ? '#64748b' : '#10b981',
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 1A: REDESIGNED PIPELINE STAGE BAR */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>
              Pipeline #{activeScan.id || 1} — Stage Execution View
            </h2>
            <span style={{ fontSize: 12, color: 'var(--sf-ink-low)' }}>
              Commit SHA: {(activeScan.commit_sha || '8f9b2a14').substring(0, 8)} | 10 DevSecOps Security Stages
            </span>
          </div>
        </div>

        {/* Stages Track */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '30px 10px 10px' }}>
          {pipelineStages.map((stage, idx) => {
            const isPassed = stage.status === 'passed';
            const isFailed = stage.status === 'failed' || stage.status === 'blocked';
            const isSkipped = stage.status === 'skipped';
            const isRunning = stage.status === 'running';

            const nextStage = pipelineStages[idx + 1];
            const nextStatus = nextStage?.status;

            return (
              <React.Fragment key={stage.id}>
                {/* Stage Node */}
                <div
                  onMouseEnter={() => setHoveredStage(stage)}
                  onMouseLeave={() => setHoveredStage(null)}
                  onClick={() => setExpandedStageId(stage.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    position: 'relative',
                    cursor: 'pointer',
                    zIndex: 2,
                  }}
                >
                  {/* Tooltip */}
                  {hoveredStage?.id === stage.id && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 56,
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: 8,
                        padding: '8px 12px',
                        color: '#f8fafc',
                        fontSize: 11,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        zIndex: 99,
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>{stage.name}</div>
                      <div>Scanner: {stage.scannerName || stage.name}</div>
                      <div>Version: {stage.scannerVersion || 'v1.0'}</div>
                      <div>Duration: {stage.duration}</div>
                      <div>Findings: {stage.findingCount || 0}</div>
                    </div>
                  )}

                  {/* Stage Circle Node */}
                  <div
                    style={{
                      width: isFailed ? 40 : 36,
                      height: isFailed ? 40 : 36,
                      borderRadius: '50%',
                      background: isPassed
                        ? '#ffffff'
                        : isFailed
                        ? '#fef2f2'
                        : isSkipped
                        ? 'var(--sf-bg-surface)'
                        : 'var(--sf-bg-card)',
                      border: isPassed
                        ? '2px solid #22c55e'
                        : isFailed
                        ? '2px solid #ef4444'
                        : isSkipped
                        ? '1.5px dashed #9ca3af'
                        : '2px solid #3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      animation: isFailed ? 'pulse 1.5s infinite ease-in-out' : isRunning ? 'spin 1.5s linear infinite' : 'none',
                      transition: 'all 200ms ease',
                    }}
                  >
                    {isPassed && <CheckCircle2 size={20} color="#22c55e" />}
                    {isFailed && <AlertTriangle size={22} color="#ef4444" />}
                    {isSkipped && <Slash size={18} color="#9ca3af" />}
                    {isRunning && <RefreshCw size={18} color="#3b82f6" />}
                  </div>

                  {/* Label Below Node */}
                  <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: isPassed ? '#16a34a' : isFailed ? '#dc2626' : '#9ca3af',
                        textTransform: 'uppercase',
                      }}
                    >
                      {isPassed ? 'PASSED' : isFailed ? 'FAILED' : isSkipped ? 'SKIPPED' : 'RUNNING'}
                    </span>

                    {/* Finding Count Badges */}
                    {stage.findingBadge && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: 8,
                          background: isFailed ? '#fee2e2' : '#fef9c3',
                          color: isFailed ? '#b91c1c' : '#854d0e',
                        }}
                      >
                        {stage.findingBadge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Connector Line to Next Stage */}
                {idx < pipelineStages.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      borderTop: nextStatus === 'skipped' ? '2px dashed #9ca3af' : 'none',
                      background:
                        nextStatus === 'passed'
                          ? '#22c55e'
                          : nextStatus === 'failed' || nextStatus === 'blocked'
                          ? '#ef4444'
                          : nextStatus === 'skipped'
                          ? 'transparent'
                          : '#3b82f6',
                      marginTop: -20,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* Main Content Layout: Stage Output & Console */}
      <div className="sf-v2-grid-2">
        {/* Stage List Details */}
        <Card>
          <div style={{ padding: 16, borderBottom: '1px solid var(--sf-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--sf-ink)', margin: 0 }}>Stage Details</h3>
            <span style={{ fontSize: 11, color: 'var(--sf-ink-low)' }}>Click to view logs</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
            {pipelineStages.map((stage) => {
              const isExpanded = expandedStageId === stage.id;
              const isFailed = stage.status === 'failed' || stage.status === 'blocked';

              return (
                <div key={stage.id} style={{ borderRadius: 8, border: '1px solid var(--sf-border)', background: 'var(--sf-bg-surface)', overflow: 'hidden' }}>
                  <div
                    onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                    style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>{stage.name}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isFailed && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBlockedPanelStage(stage);
                          }}
                        >
                          WHY BLOCKED
                        </Button>
                      )}
                      <Badge variant={stage.status === 'passed' ? 'passed' : stage.status === 'skipped' ? 'neutral' : 'blocked'}>
                        {stage.status}
                      </Badge>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: 12, borderTop: '1px solid var(--sf-border)', background: 'var(--sf-bg-card)' }}>
                      <div style={{ fontSize: 11, color: 'var(--sf-ink-mid)', marginBottom: 8 }}>
                        Scanner: {stage.scannerName} ({stage.scannerVersion}) | Duration: {stage.duration}
                      </div>
                      <div style={{ padding: 10, borderRadius: 6, background: '#080c14', fontFamily: 'var(--sf-font-mono)', fontSize: 11, color: '#38bdf8' }}>
                        {stage.logs.map((l, i) => <div key={i}>[{l.timestamp}] {l.message}</div>)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* SECTION 4: CONSOLE EXECUTION STREAM & LOG FILTER BAR */}
        <Card>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--sf-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Terminal size={16} color="var(--sf-accent)" />
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sf-ink)' }}>Console Execution Stream</span>
            </div>

            <Button variant="ghost" size="sm" onClick={handleCopyAllLogs}>
              <Copy size={12} /> {copiedLogs ? 'Copied' : 'Copy All Logs'}
            </Button>
          </div>

          {/* SECTION 4E: FILTER BAR ABOVE CONSOLE */}
          <div style={{ padding: '8px 12px', background: 'var(--sf-bg-surface)', borderBottom: '1px solid var(--sf-border)', display: 'flex', gap: 6 }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'errors', label: 'Errors only' },
              { id: 'policy', label: 'Policy events' },
              { id: 'scanners', label: 'Scanner output' },
              { id: 'starts', label: 'Stage starts' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setConsoleFilter(f.id as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 12,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: consoleFilter === f.id ? 'var(--sf-accent)' : 'transparent',
                  color: consoleFilter === f.id ? '#ffffff' : 'var(--sf-ink-low)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* SECTION 4A-D: STRUCTURED CONSOLE CONTAINER */}
          <div style={{ position: 'relative' }}>
            <div
              ref={consoleRef}
              onScroll={handleConsoleScroll}
              style={{
                padding: 14,
                background: '#080c14',
                fontFamily: 'var(--sf-font-mono)',
                fontSize: 12,
                lineHeight: 1.6,
                maxHeight: 480,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              {filteredConsoleLogs.map((log, idx) => {
                const isError = log.type === 'error';
                const isPolicy = log.type === 'policy';
                const isSuccess = log.type === 'success';

                return (
                  <React.Fragment key={idx}>
                    {/* SECTION 4D: DISTINCT POLICY DECISION BOX */}
                    {isPolicy && (
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          color: '#b91c1c',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          margin: '6px 0',
                        }}
                      >
                        <ShieldX size={20} color="#b91c1c" />
                        <div>
                          <div>{log.message}</div>
                          <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85 }}>
                            Subsequent stages skipped automatically by orchestrator
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SECTION 4A & 4C: STRUCTURED LOG LINE ANATOMY */}
                    {!isPolicy && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          padding: '4px 8px',
                          borderRadius: 4,
                          background: log.isCriticalCallout ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                          borderLeft: log.isCriticalCallout ? '3px solid #ef4444' : 'none',
                        }}
                      >
                        {/* Timestamp */}
                        <span style={{ color: '#64748b', fontSize: 11, width: 60, flexShrink: 0 }}>{log.timestamp}</span>

                        {/* Icon Gutter */}
                        <span style={{ width: 20, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                          {isSuccess && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }} />}
                          {isError && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />}
                          {!isSuccess && !isError && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#64748b' }} />}
                        </span>

                        {/* Stage Chip */}
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#1e293b', color: '#94a3b8', flexShrink: 0 }}>
                          {log.stageName}
                        </span>

                        {/* Log Message */}
                        <span style={{ color: log.isCriticalCallout ? '#ef4444' : '#f8fafc', flex: 1, wordBreak: 'break-all' }}>
                          {log.message}
                        </span>
                      </div>
                    )}

                    {/* SECTION 4C: INLINE CALLOUT CARD FOR CRITICAL ERRORS */}
                    {log.isCriticalCallout && (
                      <div
                        style={{
                          marginLeft: 88,
                          padding: 10,
                          borderRadius: 6,
                          background: '#1e1b2e',
                          border: '1px solid #ef4444',
                          color: '#f8fafc',
                          fontSize: 11,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ Critical Leak Detected</div>
                        <div>{log.calloutDetails}</div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            onClick={() => openVoidWithContext({ message: log.message })}
                            style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                          >
                            View file →
                          </button>
                        </div>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* SECTION 4F: JUMP TO LATEST FLOATING BUTTON */}
            {!autoScroll && (
              <button
                onClick={scrollToBottom}
                style={{
                  position: 'absolute',
                  bottom: 16,
                  right: 16,
                  padding: '6px 12px',
                  borderRadius: 16,
                  background: 'var(--sf-accent)',
                  color: '#ffffff',
                  fontSize: 11,
                  fontWeight: 700,
                  border: 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                ↓ Jump to latest
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* WHY BLOCKED Side Drawer */}
      {blockedPanelStage && (
        <div
          onClick={() => setBlockedPanelStage(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9990, display: 'flex', justifyContent: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 500, maxWidth: '90vw', height: '100vh', background: 'var(--sf-bg-card)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sf-border)', paddingBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>Why Blocked: {blockedPanelStage.name}</h2>
              <button onClick={() => setBlockedPanelStage(null)} style={{ background: 'none', border: 'none', color: 'var(--sf-ink-low)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 12, borderRadius: 8, background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', fontSize: 13, fontWeight: 700 }}>
              {blockedPanelStage.blockReason || 'Blocked by security policy rules.'}
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink)', marginBottom: 4 }}>Void AI Remediation</h4>
              <p style={{ fontSize: 12, color: 'var(--sf-ink-mid)', lineHeight: 1.5, background: 'var(--sf-bg-surface)', padding: 12, borderRadius: 8 }}>
                {blockedPanelStage.aiExplanation || 'Remove exposed API secrets and update security policy before pushing.'}
              </p>
            </div>

            <Button variant="primary" onClick={() => openVoidWithContext({ stage: blockedPanelStage.name })}>
              <Zap size={14} /> Discuss in Void AI
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
