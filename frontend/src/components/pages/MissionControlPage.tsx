import React, { useMemo } from 'react';
import {
  ShieldCheck, ShieldAlert, Activity, GitPullRequest,
  TrendingUp, Key, Code2, Box, Globe,
  AlertTriangle, Zap, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Badge, severityToVariant } from '../ui/Badge';
import { MetricCard } from '../ui/MetricCard';
import { RiskGauge } from '../ui/RiskGauge';
import { Skeleton, MetricSkeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { useScans, useFindings, useMetrics } from '../../hooks/useApi';
import { useUIStore } from '../../stores/uiStore';
import type { Persona } from '../../types';

// ─── Stats Computation ──────────────────────────────────────────────

interface MissionStats {
  totalScans: number;
  passed: number;
  blocked: number;
  running: number;
  passRate: number;
  securityScore: number;
  scannerCounts: { gitleaks: number; semgrep: number; trivy: number; zap: number };
  totalFindings: number;
  activeThreats: ThreatItem[];
  topActions: ActionItem[];
}

interface ThreatItem {
  id: number;
  repo: string;
  commit: string;
  severity: string;
  scanner: string;
  message: string;
  age: string;
}

interface ActionItem {
  priority: number;
  title: string;
  detail: string;
  action: string;
}

function computeStats(scans: any[], findings: any[]): MissionStats {
  const totalScans = scans.length || 1;
  const passed = scans.filter((s) => s.action_taken === 'ALLOW').length;
  const blocked = scans.filter((s) => s.action_taken === 'BLOCK').length;
  const running = scans.filter((s) => s.status === 'running').length;
  const passRate = Math.round((passed / totalScans) * 100);

  const scannerCounts = {
    gitleaks: scans.reduce((a, s) => a + (s.findings?.gitleaks?.length || 0), 0),
    semgrep: scans.reduce((a, s) => a + (s.findings?.semgrep?.length || 0), 0),
    trivy: scans.reduce(
      (a, s) => a + ((s.findings?.Results || []).reduce((sum: number, r: any) => sum + (r.Vulnerabilities || []).length, 0)),
      0
    ),
    zap: scans.reduce(
      (a, s) => a + ((s.zap_findings?.alerts || s.findings?.zap?.alerts || []).length),
      0
    ),
  };
  const totalFindings = Object.values(scannerCounts).reduce((a, b) => a + b, 0);

  // Weighted security score
  const deductions = (blocked * 2) + (scannerCounts.gitleaks * 3) + (scannerCounts.semgrep * 1) + (scannerCounts.trivy * 0.05);
  const securityScore = Math.max(0, Math.min(100, Math.round(100 - deductions)));

  // Active threats: recent blocked scans
  const activeThreats: ThreatItem[] = scans
    .filter((s) => s.action_taken === 'BLOCK')
    .slice(0, 5)
    .map((s) => {
      let scanner = 'Policy Engine';
      if (s.findings?.gitleaks?.length) scanner = 'Gitleaks';
      else if (s.findings?.semgrep?.length) scanner = 'Semgrep';
      else if (s.findings?.Results?.length) scanner = 'Trivy';
      else if (s.zap_findings?.alerts?.length) scanner = 'OWASP ZAP';

      const ageMs = Date.now() - new Date(s.created_at).getTime();
      const ageH = Math.floor(ageMs / 3600000);
      const age = ageH < 1 ? 'just now' : ageH < 24 ? `${ageH}h ago` : `${Math.floor(ageH / 24)}d ago`;

      return {
        id: s.id,
        repo: s.repo_name || 'unknown',
        commit: (s.commit_sha || '').substring(0, 8),
        severity: s.severity || 'HIGH',
        scanner,
        message: s.ai_explanation || `Blocked by ${scanner}`,
        age,
      };
    });

  // Top 3 AI-prioritized actions
  const topActions: ActionItem[] = [];
  if (scannerCounts.gitleaks > 0) {
    const s = scans.find((sc) => sc.findings?.gitleaks?.length > 0);
    const gl = s?.findings?.gitleaks?.[0];
    topActions.push({
      priority: 1,
      title: 'Rotate Exposed Secret',
      detail: `${gl?.RuleID || gl?.Description || 'Secret'} in ${gl?.File || 'source file'}`,
      action: 'Rotate & Clean Git History',
    });
  }
  if (scannerCounts.trivy > 0) {
    const s = scans.find((sc) => sc.findings?.Results?.some((r: any) => r.Vulnerabilities?.length > 0));
    const vuln = s?.findings?.Results?.[0]?.Vulnerabilities?.[0];
    if (vuln) {
      topActions.push({
        priority: topActions.length + 1,
        title: `Fix ${vuln.VulnerabilityID}`,
        detail: `Upgrade ${vuln.PkgName} to ${vuln.FixedVersion || 'latest'}`,
        action: 'View Remediation',
      });
    }
  }
  if (blocked > 0) {
    topActions.push({
      priority: topActions.length + 1,
      title: 'Review Blocked Pipeline',
      detail: `${blocked} pipeline(s) blocked by security policy`,
      action: 'Investigate',
    });
  }
  while (topActions.length < 3) {
    topActions.push({
      priority: topActions.length + 1,
      title: 'No Critical Actions',
      detail: 'All security gates are passing.',
      action: 'View Dashboard',
    });
  }

  return { totalScans, passed, blocked, running, passRate, securityScore, scannerCounts, totalFindings, activeThreats, topActions };
}

// ─── Pipeline Heatmap ───────────────────────────────────────────────

function PipelineHeatmap({ scans }: { scans: any[] }) {
  const heatmap = useMemo(() => {
    const repos = [...new Set(scans.map((s) => s.repo_name || 'unknown'))].slice(0, 8);
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    return repos.map((repo) => ({
      repo,
      cells: days.map((day) => {
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        const dayScans = scans.filter((s) => {
          const sd = new Date(s.created_at);
          return s.repo_name === repo && sd >= day && sd < next;
        });
        if (dayScans.length === 0) return { status: 'empty', count: 0 };
        const hasBlock = dayScans.some((s) => s.action_taken === 'BLOCK');
        const hasRunning = dayScans.some((s) => s.status === 'running');
        if (hasRunning) return { status: 'running', count: dayScans.length };
        if (hasBlock) return { status: 'blocked', count: dayScans.length };
        return { status: 'passed', count: dayScans.length };
      }),
    }));
  }, [scans]);

  return (
    <Card>
      <CardHeader title="Pipeline Heatmap" subtitle="Last 14 days × repositories" />
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 420 }}>
          {/* Day labels */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 6, paddingLeft: 120 }}>
            {heatmap[0]?.cells.map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              return (
                <div key={i} style={{ width: 28, textAlign: 'center', fontSize: 9, color: 'var(--sf-ink-low)', fontWeight: 600 }}>
                  {d.getDate()}
                </div>
              );
            })}
          </div>
          {/* Repo rows */}
          {heatmap.map((row) => (
            <div key={row.repo} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
              <div style={{ width: 120, fontSize: 11, fontWeight: 600, color: 'var(--sf-ink-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {row.repo.split('/').pop()}
              </div>
              {row.cells.map((cell, i) => (
                <div
                  key={i}
                  className={`sf-v2-heatmap-cell sf-v2-heatmap-cell--${cell.status}`}
                  style={{ width: 28, height: 28 }}
                  title={`${row.repo} — ${cell.count} scan(s)`}
                />
              ))}
            </div>
          ))}
          {heatmap.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--sf-ink-low)', fontSize: 13 }}>
              No pipeline data yet.
            </div>
          )}
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--sf-ink-low)' }}>
        {[
          { label: 'Passed', cls: 'sf-v2-heatmap-cell--passed' },
          { label: 'Blocked', cls: 'sf-v2-heatmap-cell--blocked' },
          { label: 'Running', cls: 'sf-v2-heatmap-cell--running' },
          { label: 'No scans', cls: 'sf-v2-heatmap-cell--empty' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div className={`sf-v2-heatmap-cell ${l.cls}`} style={{ width: 12, height: 12 }} />
            {l.label}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Compliance Bars ────────────────────────────────────────────────

function ComplianceBars({ score }: { score: number }) {
  const frameworks = [
    { name: 'SOC 2 Readiness', pct: Math.min(98, score + 4) },
    { name: 'ISO 27001', pct: Math.min(96, score + 2) },
    { name: 'NIST 800-53', pct: Math.min(99, score + 6) },
    { name: 'PCI-DSS', pct: Math.min(92, score - 2) },
  ];
  return (
    <Card>
      <CardHeader title="Compliance Readiness" subtitle="Framework posture overview" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {frameworks.map((f) => (
          <div key={f.name}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sf-ink-mid)' }}>{f.name}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: f.pct >= 90 ? 'var(--sf-green)' : f.pct >= 75 ? 'var(--sf-amber)' : 'var(--sf-red)' }}>
                {f.pct}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--sf-bg-elevated)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${f.pct}%`,
                  borderRadius: 3,
                  background: f.pct >= 90 ? 'var(--sf-green)' : f.pct >= 75 ? 'var(--sf-amber)' : 'var(--sf-red)',
                  transition: 'width 800ms ease',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Persona Config ─────────────────────────────────────────────────

const PERSONAS: { key: Persona; label: string }[] = [
  { key: 'executive', label: 'Executive' },
  { key: 'secops', label: 'SecOps' },
  { key: 'developer', label: 'Developer' },
];

// ─── Main Page ──────────────────────────────────────────────────────

export default function MissionControlPage() {
  const { data: rawScans, isLoading: scansLoading } = useScans();
  const { data: findings } = useFindings();
  const { data: metrics } = useMetrics();
  const { persona, setPersona } = useUIStore();

  const scans = useMemo(() => rawScans || [], [rawScans]);
  const stats = useMemo(() => computeStats(scans, findings || []), [scans, findings]);

  if (scansLoading) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={300} height={32} />
        <div className="sf-v2-grid-kpi">
          {Array.from({ length: 6 }).map((_, i) => <MetricSkeleton key={i} />)}
        </div>
        <div className="sf-v2-grid-2">
          <Skeleton height={200} />
          <Skeleton height={200} />
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ─── Header ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>
            Mission Control
          </h1>
          <p style={{ fontSize: 13, color: 'var(--sf-ink-low)', marginTop: 4 }}>
            Real-time security posture & decision intelligence
          </p>
        </div>
        <div className="sf-v2-persona-tabs">
          {PERSONAS.map((p) => (
            <button
              key={p.key}
              className={`sf-v2-persona-tab ${persona === p.key ? 'sf-v2-persona-tab--active' : ''}`}
              onClick={() => setPersona(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── KPI Row (always visible) ─── */}
      <div className="sf-v2-grid-kpi">
        <MetricCard title="Security Score" value={`${stats.securityScore}%`} change={stats.securityScore >= 80 ? 'Healthy' : 'Needs Attention'} isPositive={stats.securityScore >= 80} Icon={ShieldCheck} iconColor="var(--sf-green)" />
        <MetricCard title="Pipeline Runs" value={stats.totalScans} change={`${stats.running} running`} isPositive={true} Icon={Activity} iconColor="var(--sf-accent)" />
        <MetricCard title="Pass Rate" value={`${stats.passRate}%`} change={`${stats.passed} passed`} isPositive={stats.passRate >= 75} Icon={TrendingUp} iconColor="var(--sf-green)" />
        <MetricCard title="Blocked" value={stats.blocked} change={stats.blocked > 0 ? 'Action Required' : 'All Clear'} isPositive={stats.blocked === 0} Icon={ShieldAlert} iconColor="var(--sf-red)" />
        <MetricCard title="Findings" value={stats.totalFindings} change={`${stats.scannerCounts.gitleaks} secrets`} isPositive={stats.totalFindings === 0} Icon={AlertTriangle} iconColor="var(--sf-amber)" />
        <MetricCard title="DAST Scans" value={metrics?.dast_pipeline?.completed_jobs ?? 0} change={`${metrics?.dast_pipeline?.queued_jobs ?? 0} queued`} isPositive={true} Icon={Globe} iconColor="var(--sf-violet)" />
      </div>

      {/* ─── Persona-Specific Layout ─── */}
      {persona === 'executive' && (
        <>
          <div className="sf-v2-grid-2">
            <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <CardHeader title="Risk Posture" subtitle="Weighted security score" />
              <RiskGauge score={stats.securityScore} size={200} />
            </Card>
            <ComplianceBars score={stats.securityScore} />
          </div>

          {/* Top 3 Actions */}
          <Card>
            <CardHeader title="Top Priority Actions" subtitle="AI-prioritized next steps" action={<Zap size={16} color="var(--sf-accent)" />} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.topActions.map((action) => (
                <div key={action.priority} className="sf-v2-threat-item">
                  <div style={{ width: 28, height: 28, borderRadius: 'var(--sf-radius-sm)', background: action.priority === 1 ? 'var(--sf-red-soft)' : 'var(--sf-amber-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: action.priority === 1 ? 'var(--sf-red)' : 'var(--sf-amber)' }}>{action.priority}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>{action.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--sf-ink-low)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{action.detail}</div>
                  </div>
                  <Button variant="ghost" size="sm">{action.action} <ArrowRight size={14} /></Button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {persona === 'secops' && (
        <>
          <div className="sf-v2-grid-2">
            {/* Active Threats */}
            <Card>
              <CardHeader title="Active Threats" subtitle="Recent blocked pipelines" action={<Badge variant="blocked">{stats.activeThreats.length}</Badge>} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.activeThreats.length > 0 ? stats.activeThreats.map((t) => (
                  <div key={t.id} className="sf-v2-threat-item">
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sf-red)', flexShrink: 0, boxShadow: '0 0 8px var(--sf-red)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>{t.repo.split('/').pop()}</span>
                        <Badge variant={severityToVariant(t.severity)}>{t.severity}</Badge>
                        <span style={{ fontSize: 11, color: 'var(--sf-ink-low)' }}>{t.scanner}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--sf-ink-low)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.message.substring(0, 80)}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--sf-ink-muted)', flexShrink: 0 }}>{t.age}</span>
                  </div>
                )) : (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--sf-green)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={32} color="var(--sf-green)" />
                    No active threats. All pipelines passing.
                  </div>
                )}
              </div>
            </Card>

            {/* Scanner Breakdown */}
            <Card>
              <CardHeader title="Scanner Breakdown" subtitle="Findings by scanner type" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { key: 'gitleaks', label: 'Secrets', Icon: Key, color: 'var(--sf-red)', count: stats.scannerCounts.gitleaks },
                  { key: 'semgrep', label: 'SAST', Icon: Code2, color: 'var(--sf-amber)', count: stats.scannerCounts.semgrep },
                  { key: 'trivy', label: 'Container', Icon: Box, color: 'var(--sf-blue)', count: stats.scannerCounts.trivy },
                  { key: 'zap', label: 'DAST', Icon: Globe, color: 'var(--sf-violet)', count: stats.scannerCounts.zap },
                ].map((s) => (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 'var(--sf-radius)', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 'var(--sf-radius-sm)', background: `${s.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <s.Icon size={18} color={s.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sf-ink)' }}>{s.count}</div>
                      <div style={{ fontSize: 11, color: 'var(--sf-ink-low)' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Risk gauge mini */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <RiskGauge score={stats.securityScore} size={140} label="Posture" />
              </div>
            </Card>
          </div>
        </>
      )}

      {persona === 'developer' && (
        <>
          <div className="sf-v2-grid-2">
            {/* Recent Pipeline Runs */}
            <Card>
              <CardHeader title="Recent Pipeline Runs" subtitle="Latest CI/CD activity" action={<GitPullRequest size={16} color="var(--sf-accent)" />} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {scans.slice(0, 8).map((s) => (
                  <div key={s.id} className="sf-v2-threat-item" style={{ padding: '10px 12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sf-ink)' }}>{(s.repo_name || '').split('/').pop()}</span>
                        <span style={{ fontSize: 11, fontFamily: 'var(--sf-font-mono)', color: 'var(--sf-ink-low)' }}>{(s.commit_sha || '').substring(0, 8)}</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--sf-ink-low)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.commit_message || 'No commit message'}
                      </div>
                    </div>
                    <Badge variant={s.action_taken === 'BLOCK' ? 'blocked' : 'passed'}>{s.action_taken || 'ALLOW'}</Badge>
                  </div>
                ))}
                {scans.length === 0 && (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--sf-ink-low)', fontSize: 13 }}>
                    No pipeline runs yet. Push a commit to trigger the security pipeline.
                  </div>
                )}
              </div>
            </Card>

            {/* Blocked Commits */}
            <Card>
              <CardHeader title="Blocked Commits" subtitle="Requires your attention" action={stats.blocked > 0 ? <Badge variant="blocked">{stats.blocked}</Badge> : undefined} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {stats.activeThreats.length > 0 ? stats.activeThreats.map((t) => (
                  <div key={t.id} style={{ padding: 12, borderRadius: 'var(--sf-radius)', border: '1px solid var(--sf-red-border)', background: 'var(--sf-red-soft)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <AlertTriangle size={14} color="var(--sf-red)" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>{t.scanner} block</span>
                      <Badge variant={severityToVariant(t.severity)}>{t.severity}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--sf-ink-mid)' }}>{t.message.substring(0, 100)}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <Button variant="danger" size="sm">Fix Now</Button>
                      <Button variant="ghost" size="sm">Ask Void</Button>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: 24, textAlign: 'center', color: 'var(--sf-green)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={32} color="var(--sf-green)" />
                    No blocked commits. You're clear to deploy.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </>
      )}

      {/* ─── Pipeline Heatmap (always visible) ─── */}
      <PipelineHeatmap scans={scans} />
    </div>
  );
}
