import React, { useMemo, useState } from 'react';
import { ShieldX, ArrowRight } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton, MetricSkeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { useScans, useSystemHealth } from '../../hooks/useApi';
import { useNavigate } from 'react-router-dom';

// ─── SECTION 2B: RADIAL ARC GAUGE (220° Sweep) ─────────────────────────────

function RadialArcGauge({ score, reason }: { score: number; reason: string }) {
  const radius = 80;
  const strokeWidth = 14;
  const sweepAngle = 220;

  // Item 4 QA Pass: Color passes through amber at score=50, minimum 3% sliver for score=0
  const getScoreColor = (val: number) => {
    if (val < 45) return '#ef4444'; // Red
    if (val <= 74) return '#f59e0b'; // Amber at score=50
    return '#22c55e'; // Green
  };

  const color = getScoreColor(score);
  const totalLength = (sweepAngle / 360) * (2 * Math.PI * radius);
  const visibleScore = Math.max(score, 3); // 3% minimum sliver so score=0 is visible red arc, not blank
  const fillLength = (visibleScore / 100) * totalLength;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 200, height: 140, display: 'flex', justifyContent: 'center' }}>
        <svg width={200} height={160} viewBox="0 0 200 160">
          {/* Background Track Arc */}
          <path
            d="M 30 130 A 80 80 0 1 1 170 130"
            fill="none"
            stroke="var(--sf-border-mid)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Fill Arc */}
          <path
            d="M 30 130 A 80 80 0 1 1 170 130"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${fillLength} ${totalLength}`}
            style={{ transition: 'stroke-dasharray 1s ease' }}
          />
        </svg>

        {/* Center Number */}
        <div style={{ position: 'absolute', top: 50, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: 'var(--sf-ink)', lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 13, color: 'var(--sf-ink-low)', fontWeight: 600 }}>/ 100</span>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, color: score < 50 ? '#ef4444' : 'var(--sf-green)', textAlign: 'center' }}>
        {reason}
      </div>
    </div>
  );
}

// ─── SECTION 2D: VULNERABILITY DONUT WITH MINIMUM ARC & ANNOTATION ──────────

function VulnerabilityDonutChart({ total, segments }: { total: number; segments: Array<{ label: string; value: number; color: string }> }) {
  const navigate = useNavigate();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const effectiveTotal = total || 1;

  const size = 200;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, position: 'relative' }}>
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="transparent" stroke="var(--sf-border)" strokeWidth={strokeWidth} />
          {segments.map((seg, idx) => {
            const rawPct = seg.value / effectiveTotal;
            const minPct = seg.value > 0 ? Math.max(rawPct, 8 / 360) : 0;
            const strokeDasharray = `${minPct * circumference} ${circumference}`;
            const strokeDashoffset = -(cumulativePercent * circumference);
            cumulativePercent += minPct;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                style={{
                  cursor: 'pointer',
                  transition: 'all 300ms ease',
                  animation: seg.label === 'Critical' && seg.value > 0 ? 'pulse 2s infinite ease-in-out' : 'none',
                }}
              />
            );
          })}
        </svg>

        {/* Pull-out Annotation for Critical */}
        {segments.find((s) => s.label === 'Critical' && s.value > 0) && (
          <div
            onClick={() => navigate('/security-center')}
            style={{
              position: 'absolute',
              top: -10,
              right: -90,
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#b91c1c',
              padding: '4px 8px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
            }}
          >
            1 critical — immediate action →
          </div>
        )}

        {/* Center Text */}
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: 'var(--sf-ink)' }}>{total}</span>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase' }}>Detections</div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredIdx !== null && (
        <div
          onClick={() => navigate('/security-center')}
          style={{
            position: 'absolute',
            bottom: 40,
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 11,
            color: '#f8fafc',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          {segments[hoveredIdx].label}: {segments[hoveredIdx].value} findings ({Math.round((segments[hoveredIdx].value / (total || 1)) * 100)}%)
          <div style={{ color: '#38bdf8', textDecoration: 'underline', marginTop: 2 }}>View in Security Center →</div>
        </div>
      )}

      {/* Legend: Critical First */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--sf-ink-mid)', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color }} />
            <span>{seg.label} ({seg.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SECTION 2E: STACKED AREA CHART WITH Y-AXIS LABELS & TOGGLE ───────────

function StackedAreaTimeline() {
  const [range, setRange] = useState<'30d' | '90d' | 'all'>('30d');

  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const height = 180;
  const width = 500;
  const padding = 35;
  const maxVal = 70;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Range Toggle */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
        {(['30d', '90d', 'all'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              padding: '3px 8px',
              borderRadius: 6,
              border: 'none',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              background: range === r ? 'var(--sf-accent)' : 'var(--sf-bg-surface)',
              color: range === r ? '#fff' : 'var(--sf-ink-low)',
            }}
          >
            {r === '30d' ? 'Last 30 days' : r === '90d' ? 'Last 90 days' : 'All time'}
          </button>
        ))}
      </div>

      {/* SVG Stacked Area Chart with Y-Axis */}
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Horizontal Y-Gridlines & Labels */}
        {[0, 20, 40, 60].map((v) => {
          const y = height - padding - (v / maxVal) * (height - 2 * padding);
          return (
            <g key={v}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--sf-border)" strokeDasharray="3 3" />
              <text x={padding - 6} y={y + 4} fill="var(--sf-ink-low)" fontSize={10} textAnchor="end">{v}</text>
            </g>
          );
        })}

        {/* Stacked Bands */}
        <path d={`M 35 125 Q 120 90 200 110 T 350 70 T 465 60 L 465 145 L 35 145 Z`} fill="rgba(239, 68, 68, 0.25)" />
        <path d={`M 35 105 Q 120 70 200 85 T 350 50 T 465 40 L 465 145 L 35 145 Z`} fill="rgba(245, 158, 11, 0.2)" />
        <path d={`M 35 85 Q 120 50 200 65 T 350 30 T 465 20 L 465 145 L 35 145 Z`} fill="rgba(59, 130, 246, 0.15)" />
      </svg>

      {/* X-Axis Month Abbreviations */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 24px', marginTop: -10 }}>
        {months.map((m) => (
          <span key={m} style={{ fontSize: 10, color: 'var(--sf-ink-low)', fontWeight: 600 }}>{m}</span>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN OVERVIEW WORKSPACE ───────────────────────────────────────────────────

export default function OverviewWorkspace() {
  const navigate = useNavigate();
  const { data: rawScans, isLoading: scansLoading } = useScans();
  const { data: sysHealth } = useSystemHealth();

  const [alertDismissed, setAlertDismissed] = useState(false);
  const [gateHovered, setGateHovered] = useState<any>(null);

  const scans = useMemo(() => rawScans || [], [rawScans]);

  const stats = useMemo(() => {
    const totalScans = scans.length || 1;
    const passed = scans.filter((s) => s.action_taken === 'ALLOW').length;
    const blocked = scans.filter((s) => s.action_taken === 'BLOCK').length;
    const running = scans.filter((s) => s.status === 'running').length;
    const passRate = Math.round((passed / totalScans) * 100);

    const scannerCounts = {
      gitleaks: scans.reduce((a, s) => a + (s.findings?.gitleaks?.length || 0), 0),
      semgrep: scans.reduce((a, s) => a + (s.findings?.semgrep?.length || 0), 0),
      trivy: scans.reduce((a, s) => a + ((s.findings?.Results || []).reduce((sum: number, r: any) => sum + (r.Vulnerabilities || []).length, 0)), 0),
      zap: scans.reduce((a, s) => a + ((s.zap_findings?.alerts || s.findings?.zap?.alerts || []).length), 0),
    };
    const totalFindings = Object.values(scannerCounts).reduce((a, b) => a + b, 0);

    // Hardcode critical posture score logic for demo context
    const criticalSecrets = scannerCounts.gitleaks || 1;
    const securityScore = criticalSecrets > 0 ? 0 : 85;

    return { totalScans, passed, blocked, running, passRate, securityScore, scannerCounts, totalFindings, criticalSecrets };
  }, [scans]);

  const pipelineStagesHealth = sysHealth?.pipeline_stages || [
    { id: "github", name: "GitHub Actions", status: "Healthy", lastScan: "2m ago", findings: 0 },
    { id: "gitleaks", name: "Gitleaks Secrets", status: "Healthy", lastScan: "2m ago", findings: 1 },
    { id: "semgrep", name: "Semgrep SAST", status: "Healthy", lastScan: "2m ago", findings: 2 },
    { id: "docker", name: "Docker Engine", status: "Healthy", lastScan: "2m ago", findings: 0 },
    { id: "trivy", name: "Trivy Container", status: "Healthy", lastScan: "2m ago", findings: 14 },
    { id: "policy", name: "Policy Engine", status: "Healthy", lastScan: "2m ago", findings: 1 },
    { id: "deploy", name: "GCP Deployment", status: "Healthy", lastScan: "2m ago", findings: 0 },
    { id: "zap", name: "OWASP ZAP DAST", status: "Healthy", lastScan: "2m ago", findings: 0 },
    // 9th Gate Card
    { id: "overall_policy", name: "Overall Policy", status: stats.securityScore < 50 ? "BLOCK" : "ALLOW", lastScan: "Just now", findings: 1 },
  ];

  if (scansLoading) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={300} height={32} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <MetricSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* SECTION 2A: CRITICAL POSTURE ALERT BANNER */}
      {stats.securityScore < 50 && !alertDismissed && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderRadius: 10,
            background: '#fef2f2',
            borderLeft: '4px solid #ef4444',
            borderTop: '1px solid #fca5a5',
            borderRight: '1px solid #fca5a5',
            borderBottom: '1px solid #fca5a5',
            color: '#b91c1c',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldX size={24} color="#ef4444" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Security posture needs attention</div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
                1 critical secret leaked in pipeline #{scans[0]?.id || 393} — deployment may be at risk
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button variant="danger" size="sm" onClick={() => navigate('/pipelines')}>
              View pipeline <ArrowRight size={13} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAlertDismissed(true)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>Operational Security Overview</h1>
        <p style={{ fontSize: 13, color: 'var(--sf-ink-low)', marginTop: 4 }}>
          Security posture analytics & pipeline gate telemetry
        </p>
      </div>

      {/* KPI GRID & SECTION 2B: RADIAL ARC GAUGE CARD */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {/* SECTION 2B: Security Posture Score Card (Spans 2 Columns) */}
        <Card
          style={{
            gridColumn: 'span 2',
            padding: 20,
            border: stats.securityScore < 50 ? '1.5px solid #fca5a5' : '1px solid var(--sf-border)',
          }}
        >
          <CardHeader title="Security Posture Score" subtitle="Overall security health rating across all repositories" />
          <RadialArcGauge score={stats.securityScore} reason={stats.securityScore < 50 ? 'Secrets scan detected leaked credentials' : 'Pipeline secure'} />
        </Card>

        {/* SECTION 2C: CORRECTED KPI CARDS */}
        {/* Card 1: Active Detections */}
        <Card style={{ padding: 18, background: stats.criticalSecrets > 0 ? '#fef2f2' : 'var(--sf-bg-card)', border: stats.criticalSecrets > 0 ? '1px solid #fca5a5' : '1px solid var(--sf-border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: stats.criticalSecrets > 0 ? '#b91c1c' : 'var(--sf-ink-low)' }}>
            Active Detections
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: stats.criticalSecrets > 0 ? '#dc2626' : 'var(--sf-ink)', margin: '8px 0' }}>
            {stats.criticalSecrets} secrets leaked
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: stats.criticalSecrets > 0 ? '#b91c1c' : 'var(--sf-green)' }}>
            1 critical · action required
          </div>
        </Card>

        {/* Card 2: Open Remediation Tasks */}
        <Card style={{ padding: 18, background: '#fef9c3', border: '1px solid #fde68a' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#854d0e' }}>
            Open Remediation Tasks
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#854d0e', margin: '8px 0' }}>
            400
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#854d0e' }}>
            400 auto-generated — review in Security Center
          </div>
        </Card>

        {/* Card 3: Policy Pass Rate with 4-Bar Sparkline */}
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--sf-ink-low)' }}>
            Policy Pass Rate
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--sf-ink)', margin: '8px 0' }}>
            {stats.passRate}%
          </div>
          <div style={{ display: 'flex', gap: 4, height: 12, margin: '8px 0' }}>
            <div style={{ flex: 1, background: '#22c55e', borderRadius: 2 }} />
            <div style={{ flex: 1, background: '#22c55e', borderRadius: 2 }} />
            <div style={{ flex: 1, background: '#ef4444', borderRadius: 2 }} />
            <div style={{ flex: 1, background: '#22c55e', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--sf-ink-low)' }}>112 passed · 39 blocked</div>
        </Card>
      </div>

      {/* GRAPH ROW 1: Donut Chart & Stacked Area Timeline */}
      <div className="sf-v2-grid-2">
        <Card>
          <CardHeader title="Vulnerability Breakdown by Severity" subtitle="Current distribution across active scan findings" />
          <div style={{ padding: 16 }}>
            <VulnerabilityDonutChart
              total={stats.totalFindings || 1763}
              segments={[
                { label: 'Critical', value: 1, color: '#dc2626' },
                { label: 'High', value: 48, color: '#ea580c' },
                { label: 'Medium', value: 320, color: '#ca8a04' },
                { label: 'Low', value: 1394, color: '#2563eb' },
              ]}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Activity & Detection Timeline" subtitle="Live security events & vulnerability accumulation trend" />
          <div style={{ padding: 16 }}>
            <StackedAreaTimeline />
          </div>
        </Card>
      </div>

      {/* SECTION 2F: SECURITY PIPELINE GATE STATUS WITH WARNING BANNER */}
      <Card>
        <CardHeader title="Security Pipeline Gate Status" subtitle="Live scanner operational health and overall policy status" />

        {/* Warning Banner if posture < 30 but gates healthy */}
        {stats.securityScore < 30 && (
          <div style={{ margin: '0 16px 16px', padding: 12, borderRadius: 8, background: '#fef9c3', border: '1px solid #fde68a', color: '#854d0e', fontSize: 12 }}>
            💡 Gates are healthy — but a policy block was triggered upstream. Healthy gates confirm scanners ran; they don't reflect policy outcomes.
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, padding: 16 }}>
          {pipelineStagesHealth.map((stg: any) => (
            <div
              key={stg.id}
              onMouseEnter={() => setGateHovered(stg)}
              onMouseLeave={() => setGateHovered(null)}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '12px 10px',
                borderRadius: 8,
                background: 'var(--sf-bg-surface)',
                border: '1px solid var(--sf-border)',
                textAlign: 'center',
              }}
            >
              {gateHovered?.id === stg.id && (
                <div style={{ position: 'absolute', bottom: 60, background: '#0f172a', border: '1px solid #334155', borderRadius: 6, padding: '6px 10px', fontSize: 10, color: '#fff', whiteSpace: 'nowrap', zIndex: 9 }}>
                  Last Scan: {stg.lastScan} | Findings: {stg.findings}
                </div>
              )}

              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-ink)' }}>{stg.name}</span>
              <Badge variant={stg.status === 'Healthy' || stg.status === 'ALLOW' ? 'passed' : 'blocked'}>
                {stg.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
