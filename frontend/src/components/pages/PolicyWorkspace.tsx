import React, { useState, useMemo } from 'react';
import { ShieldAlert, FileText, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { MetricCard } from '../ui/MetricCard';
import { Skeleton } from '../ui/Skeleton';
import { usePolicies, useScans } from '../../hooks/useApi';

export default function PolicyWorkspace() {
  const { data: policyData, isLoading } = usePolicies();
  const { data: rawScans } = useScans();
  const scans = useMemo(() => rawScans || [], [rawScans]);
  const [showRawYaml, setShowRawYaml] = useState(false);

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
  const rawPolicyYaml = policyData?.policy ? JSON.stringify(policyData.policy, null, 2) : '{\n  "default": {\n    "block_on": ["CRITICAL", "HIGH"],\n    "cvss_threshold": 7.0\n  }\n}';
  const blockedCount = scans.filter((s: any) => s.action_taken === 'BLOCK').length;
  const passedCount = scans.filter((s: any) => s.action_taken === 'ALLOW').length;

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>Security Policy Management Center</h1>
          <p style={{ fontSize: 13, color: 'var(--sf-ink-low)' }}>Define deployment blocking rules, CVSS score thresholds, allowed CVE exceptions, and DAST header gates</p>
        </div>
        <button onClick={() => setShowRawYaml((p) => !p)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid var(--sf-border)', background: 'var(--sf-bg-surface)', color: 'var(--sf-ink-mid)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          <FileText size={14} color="var(--sf-accent)" /> {showRawYaml ? 'Hide policy.yaml Source' : 'View policy.yaml Source'} {showRawYaml ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {showRawYaml && (
        <Card style={{ padding: 16, border: '1px solid var(--sf-accent-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-accent)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileText size={14} /> Raw Declarative Policy Source (`policy.yaml`)
          </div>
          <pre style={{ margin: 0, padding: 12, background: '#090d16', color: 'var(--sf-blue)', borderRadius: 8, fontSize: 12, overflowX: 'auto', fontFamily: 'var(--sf-font-mono)' }}>
            <code>{rawPolicyYaml}</code>
          </pre>
        </Card>
      )}

      <div className="sf-v2-grid-kpi" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <MetricCard title="Policy Mode" value="Strict" change="Enforcement Active" isPositive Icon={Lock} iconColor="var(--sf-green)" />
        <MetricCard title="Max CVSS Limit" value="≥ 7.0" change="Block threshold" isPositive Icon={ShieldAlert} iconColor="var(--sf-amber)" />
        <MetricCard title="Blocked Builds" value={blockedCount} change="pipelines" isPositive={blockedCount === 0} Icon={ShieldAlert} iconColor="var(--sf-red)" />
        <MetricCard title="Passed Builds" value={passedCount} change="pipelines" isPositive Icon={ShieldAlert} iconColor="var(--sf-green)" />
      </div>

      {/* Active Gate Rules */}
      <Card>
        <CardHeader title="Active Security Gate Rules" subtitle="Declarative policy enforcement configuration" action={<ShieldAlert size={18} color="var(--sf-accent)" />} />
        {rules.length === 0 ? (
          <div style={{ color: 'var(--sf-ink-mid)', fontSize: 13, padding: 20, textAlign: 'center', background: 'var(--sf-bg-surface)', borderRadius: 8 }}>No rules configured in current policy.</div>
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
    </div>
  );
}
