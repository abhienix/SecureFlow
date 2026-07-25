import React, { useState, useMemo } from 'react';
import { ShieldAlert, Lock, Copy, Check } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { MetricCard } from '../ui/MetricCard';
import { Skeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { usePolicies, useScans } from '../../hooks/useApi';

const DEFAULT_POLICY_YAML = `# SecureFlow Enterprise Policy Configuration (policy.yaml)
# -------------------------------------------------------------
default:
  block_on: [CRITICAL, HIGH]
  warn_on: [MEDIUM]
  cvss_threshold: 7.0

repos:
  abhienix/SecureFlow:
    block_on: [CRITICAL]
    warn_on: [HIGH, MEDIUM]
    cvss_threshold: 9.8
    allowlist:
      - cve: CVE-2024-1234
        expires: 2026-09-01
        reason: "OS-level package, no upstream patch available"

notifications:
  slack: true
  on_block: true
  on_allow: false`;

export default function PolicyWorkspace() {
  const { data: policyData, isLoading } = usePolicies();
  const { data: rawScans } = useScans();
  const scans = useMemo(() => rawScans || [], [rawScans]);
  const [copied, setCopied] = useState(false);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={400} height={32} />
        <div className="sf-v2-grid-kpi" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={70} />)}
        </div>
        <Skeleton height={200} />
      </div>
    );
  }

  const rules = policyData?.rules || [];
  const rawPolicyYaml = policyData?.policy ? JSON.stringify(policyData.policy, null, 2) : DEFAULT_POLICY_YAML;
  const blockedCount = scans.filter((s: any) => s.action_taken === 'BLOCK').length;
  const passedCount = scans.filter((s: any) => s.action_taken === 'ALLOW').length;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawPolicyYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>
            Security Policy Engine (`policy.yaml`)
          </h1>
          <p style={{ fontSize: 13, color: 'var(--sf-ink-low)' }}>
            Declarative deployment blocking rules, CVSS score thresholds, CVE allowlists, and notification triggers
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleCopy}>
          {copied ? <Check size={14} color="var(--sf-green)" /> : <Copy size={14} />}
          {copied ? 'Copied to Clipboard' : 'Copy policy.yaml'}
        </Button>
      </div>

      {/* 4 Policy KPI Cards */}
      <div className="sf-v2-grid-kpi" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MetricCard title="Policy Enforcement" value="Strict" change="policy.yaml active" isPositive Icon={Lock} iconColor="var(--sf-green)" />
        <MetricCard title="Max CVSS Limit" value="≥ 7.0" change="Block threshold" isPositive Icon={ShieldAlert} iconColor="var(--sf-amber)" />
        <MetricCard title="Blocked Builds" value={blockedCount} change="pipelines" isPositive={blockedCount === 0} Icon={ShieldAlert} iconColor="var(--sf-red)" />
        <MetricCard title="Passed Builds" value={passedCount} change="pipelines" isPositive Icon={ShieldAlert} iconColor="var(--sf-green)" />
      </div>

      {/* Declarative policy.yaml Source Viewer (ALWAYS VISIBLE BY DEFAULT) */}
      <Card>
        <CardHeader
          title="Declarative Policy Source Code (policy.yaml)"
          subtitle="Version controlled rules configuration active across all CI/CD pipelines"
          action={<Badge variant="passed">● Active Enforcement</Badge>}
        />
        <div style={{ padding: 16 }}>
          <pre
            style={{
              margin: 0,
              padding: 16,
              background: '#080c14',
              border: '1px solid #1e293b',
              color: '#38bdf8',
              borderRadius: 8,
              fontSize: 12,
              overflowX: 'auto',
              fontFamily: 'var(--sf-font-mono)',
              lineHeight: 1.6,
            }}
          >
            <code>{rawPolicyYaml}</code>
          </pre>
        </div>
      </Card>

      {/* Active Gate Rules Table */}
      <Card>
        <CardHeader title="Evaluated Security Gate Rules" subtitle="Declarative policy enforcement breakdown by scanner scope" action={<ShieldAlert size={18} color="var(--sf-accent)" />} />
        {rules.length === 0 ? (
          <div style={{ color: 'var(--sf-ink-mid)', fontSize: 13, padding: 20, textAlign: 'center', background: 'var(--sf-bg-surface)', borderRadius: 8 }}>
            No custom repo overrides configured. Default strict policy rules active.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--sf-border)', color: 'var(--sf-ink-low)' }}>
                  {['Rule Name', 'Severity Gate', 'Action', 'Scanner Scope'].map((h) => (
                    <th key={h} style={{ padding: '12px 10px', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rules.map((r: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--sf-border)' }}>
                    <td style={{ padding: '12px 10px', color: 'var(--sf-ink)', fontWeight: 600 }}>{r.name || 'Unnamed Rule'}</td>
                    <td style={{ padding: '12px 10px' }}><Badge variant={r.severity === 'CRITICAL' ? 'critical' : 'high'}>{r.severity}</Badge></td>
                    <td style={{ padding: '12px 10px' }}><Badge variant={r.action === 'BLOCK' ? 'blocked' : 'neutral'}>{r.action}</Badge></td>
                    <td style={{ padding: '12px 10px', color: 'var(--sf-ink-mid)' }}>{r.scanner || 'All Scanners'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Policy Enforcement Toggles */}
      <Card>
        <CardHeader title="Enterprise Policy Enforcement Toggles" subtitle="Toggle pipeline blocking criteria and automated security gates" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {[
            { title: 'Block Critical Vulnerabilities', desc: 'Immediately emit BLOCK signal on CRITICAL findings', defaultOn: true },
            { title: 'Block Hardcoded Secrets', desc: 'Enforce zero-tolerance rule on Gitleaks secret leaks', defaultOn: true },
            { title: 'Require Successful DAST Pass', desc: 'Validate live endpoint health before finalizing pipeline', defaultOn: true },
            { title: 'Require Container Trivy Scan', desc: 'Scan Docker container layers for OS vulnerability CVEs', defaultOn: true },
            { title: 'Slack Notification Alerts', desc: 'Send webhook alert to Slack channel on pipeline BLOCK', defaultOn: true },
            { title: 'Auto-Close Remediated Findings', desc: 'Automatically resolve findings once code fix is verified', defaultOn: false },
          ].map((toggle, i) => (
            <div key={i} style={{ padding: 14, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>{toggle.title}</div>
                <div style={{ fontSize: 11, color: 'var(--sf-ink-low)', marginTop: 2 }}>{toggle.desc}</div>
              </div>
              <input type="checkbox" defaultChecked={toggle.defaultOn} style={{ width: 18, height: 18, accentColor: 'var(--sf-accent)', cursor: 'pointer' }} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
