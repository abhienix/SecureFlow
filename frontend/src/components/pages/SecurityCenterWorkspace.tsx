import React, { useState, useMemo } from 'react';
import {
  ShieldAlert, Download, FileText, Search, Key, Code2, Box, Globe,
  CheckCircle2, Zap, X
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Badge, severityToVariant } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useFindings } from '../../hooks/useApi';
import { useUIStore } from '../../stores/uiStore';

type Tab = 'findings' | 'reports' | 'exports';

export default function SecurityCenterWorkspace() {
  const { data: rawFindings, isLoading } = useFindings();
  const { openVoidWithContext } = useUIStore();
  const [activeTab, setActiveTab] = useState<Tab>('findings');

  // Filters
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [scannerFilter, setScannerFilter] = useState('ALL');

  // Selected Finding for Side Drawer
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);

  const findings = useMemo(() => rawFindings || [], [rawFindings]);

  const filteredFindings = useMemo(() => {
    return findings.filter((f) => {
      const matchSearch =
        search === '' ||
        (f.rule_id || f.title || f.scanner || f.repo || '').toLowerCase().includes(search.toLowerCase());
      const matchSev = severityFilter === 'ALL' || f.severity === severityFilter;
      const matchScanner = scannerFilter === 'ALL' || f.scanner === scannerFilter;
      return matchSearch && matchSev && matchScanner;
    });
  }, [findings, search, severityFilter, scannerFilter]);

  const getScannerIcon = (scanner?: string) => {
    switch ((scanner || '').toLowerCase()) {
      case 'gitleaks': return <Key size={14} color="var(--sf-red)" />;
      case 'semgrep': return <Code2 size={14} color="var(--sf-amber)" />;
      case 'trivy': return <Box size={14} color="var(--sf-blue)" />;
      case 'zap': return <Globe size={14} color="var(--sf-violet)" />;
      default: return <ShieldAlert size={14} color="var(--sf-accent)" />;
    }
  };

  if (isLoading) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={300} height={32} />
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
            Security Center
          </h1>
          <p style={{ fontSize: 13, color: 'var(--sf-ink-low)', marginTop: 4 }}>
            Centralized vulnerability findings, compliance reports, and data exports
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--sf-bg-surface)', padding: 4, borderRadius: 10, border: '1px solid var(--sf-border)' }}>
          <button
            onClick={() => setActiveTab('findings')}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'findings' ? 'var(--sf-accent-soft)' : 'transparent',
              color: activeTab === 'findings' ? 'var(--sf-accent)' : 'var(--sf-ink-mid)',
              fontSize: 13,
              fontWeight: activeTab === 'findings' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <ShieldAlert size={14} /> Findings ({findings.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'reports' ? 'var(--sf-accent-soft)' : 'transparent',
              color: activeTab === 'reports' ? 'var(--sf-accent)' : 'var(--sf-ink-mid)',
              fontSize: 13,
              fontWeight: activeTab === 'reports' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <FileText size={14} /> Reports
          </button>
          <button
            onClick={() => setActiveTab('exports')}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              background: activeTab === 'exports' ? 'var(--sf-accent-soft)' : 'transparent',
              color: activeTab === 'exports' ? 'var(--sf-accent)' : 'var(--sf-ink-mid)',
              fontSize: 13,
              fontWeight: activeTab === 'exports' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Download size={14} /> Exports
          </button>
        </div>
      </div>

      {/* TAB 1: FINDINGS */}
      {activeTab === 'findings' && (
        <Card>
          {/* Filters Bar */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--sf-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 8, background: 'var(--sf-bg)', border: '1px solid var(--sf-border)', flex: 1 }}>
                <Search size={14} color="var(--sf-ink-mid)" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search findings, CVEs, rules, files..."
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--sf-ink)', fontSize: 13, width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', color: 'var(--sf-ink)', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={scannerFilter}
                onChange={(e) => setScannerFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', color: 'var(--sf-ink)', fontSize: 12, fontWeight: 600, outline: 'none', cursor: 'pointer' }}
              >
                <option value="ALL">All Scanners</option>
                <option value="Gitleaks">Gitleaks</option>
                <option value="Semgrep">Semgrep</option>
                <option value="Trivy">Trivy</option>
                <option value="OWASP ZAP">OWASP ZAP</option>
              </select>
            </div>
          </div>

          {/* Findings Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--sf-bg-surface)', borderBottom: '1px solid var(--sf-border)', color: 'var(--sf-ink-low)', fontSize: 11, textTransform: 'uppercase', fontWeight: 700 }}>
                  <th style={{ padding: '12px 20px' }}>Severity</th>
                  <th style={{ padding: '12px 16px' }}>Scanner</th>
                  <th style={{ padding: '12px 16px' }}>Finding / Rule ID</th>
                  <th style={{ padding: '12px 16px' }}>Repository</th>
                  <th style={{ padding: '12px 16px' }}>File / Target</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFindings.map((f, i) => (
                  <tr
                    key={i}
                    onClick={() => setSelectedFinding(f)}
                    style={{ borderBottom: '1px solid var(--sf-border)', cursor: 'pointer', transition: 'background 100ms' }}
                  >
                    <td style={{ padding: '12px 20px' }}>
                      <Badge variant={severityToVariant(f.severity)}>{f.severity}</Badge>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {getScannerIcon(f.scanner)}
                        <span style={{ fontWeight: 600, color: 'var(--sf-ink)' }}>{f.scanner}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--sf-ink)' }}>
                      {f.rule_id || f.title || 'Security Finding'}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--sf-ink-mid)' }}>
                      {(f.repo || 'abhienix/SecureFlow').split('/').pop()}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--sf-font-mono)', fontSize: 11, color: 'var(--sf-ink-low)' }}>
                      {f.file || f.location || 'src/main.ts'}
                    </td>
                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openVoidWithContext({ scanner: f.scanner, rule: f.rule_id, file: f.file, severity: f.severity });
                        }}
                      >
                        <Zap size={13} color="var(--sf-accent)" /> Ask Void
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredFindings.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--sf-green)' }}>
                      <CheckCircle2 size={32} color="var(--sf-green)" style={{ margin: '0 auto 8px' }} />
                      <div>No security findings matching current filters.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 2: REPORTS */}
      {activeTab === 'reports' && (
        <div className="sf-v2-grid-2">
          <Card>
            <CardHeader title="Executive Security Summary" subtitle="CISO-level pipeline posture report" action={<Button variant="primary" size="sm"><Download size={14} /> Download PDF</Button>} />
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 8, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sf-ink)' }}>Overall Risk Rating: LOW</div>
                <p style={{ fontSize: 12, color: 'var(--sf-ink-mid)', marginTop: 4 }}>
                  94.2% of active deployment pipelines successfully pass Gitleaks, Semgrep, Trivy, and OWASP ZAP security gates.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--sf-ink-low)' }}>Scans Executed</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sf-ink)' }}>1,420</div>
                </div>
                <div style={{ padding: 12, borderRadius: 8, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--sf-ink-low)' }}>Block Signals Emitted</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sf-red)' }}>12</div>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="SOC 2 & ISO 27001 Compliance Audit" subtitle="Compliance readiness verification" action={<Button variant="secondary" size="sm"><FileText size={14} /> View Audit Log</Button>} />
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { name: 'CC6.8 — Unauthorized Software Prevention', status: 'COMPLIANT', pct: 98 },
                { name: 'CC7.1 — Vulnerability Detection & Management', status: 'COMPLIANT', pct: 96 },
                { name: 'CC8.1 — Change Management & Gate Checks', status: 'COMPLIANT', pct: 100 },
              ].map((c) => (
                <div key={c.name} style={{ padding: 12, borderRadius: 8, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink)' }}>{c.name}</span>
                    <Badge variant="passed">{c.status}</Badge>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'var(--sf-bg-elevated)', overflow: 'hidden', marginTop: 8 }}>
                    <div style={{ height: '100%', width: `${c.pct}%`, background: 'var(--sf-green)' }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: EXPORTS */}
      {activeTab === 'exports' && (
        <Card>
          <CardHeader title="Data Export Center" subtitle="Export security findings and scan telemetry in enterprise formats" />
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <div style={{ padding: 16, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sf-ink)' }}>CSV Findings Export</div>
              <p style={{ fontSize: 12, color: 'var(--sf-ink-low)' }}>Export raw finding records, CVE identifiers, file locations, and severity ratings.</p>
              <Button variant="secondary" size="sm"><Download size={14} /> Download CSV</Button>
            </div>

            <div style={{ padding: 16, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sf-ink)' }}>JSON Telemetry Dump</div>
              <p style={{ fontSize: 12, color: 'var(--sf-ink-low)' }}>Full pipeline trace with raw Gitleaks, Semgrep, Trivy, and ZAP JSON logs.</p>
              <Button variant="secondary" size="sm"><Download size={14} /> Download JSON</Button>
            </div>

            <div style={{ padding: 16, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sf-ink)' }}>PDF Executive Summary</div>
              <p style={{ fontSize: 12, color: 'var(--sf-ink-low)' }}>Formatted executive PDF report for security posture review meetings.</p>
              <Button variant="primary" size="sm"><Download size={14} /> Export PDF Report</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Selected Finding Detail Side Drawer */}
      {selectedFinding && (
        <div
          onClick={() => setSelectedFinding(null)}
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
              width: 500,
              maxWidth: '90vw',
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--sf-border)', paddingBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>
                  {selectedFinding.rule_id || 'Security Finding Details'}
                </h2>
                <span style={{ fontSize: 11, color: 'var(--sf-ink-low)' }}>
                  Detected by {selectedFinding.scanner}
                </span>
              </div>
              <button onClick={() => setSelectedFinding(null)} style={{ background: 'none', border: 'none', color: 'var(--sf-ink-low)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge variant={severityToVariant(selectedFinding.severity)}>{selectedFinding.severity}</Badge>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sf-ink-mid)' }}>Repo: {selectedFinding.repo || 'abhienix/SecureFlow'}</span>
            </div>

            <div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase', marginBottom: 4 }}>Vulnerable Location</h3>
              <div style={{ padding: 10, borderRadius: 8, background: '#080c14', border: '1px solid #1e293b', fontFamily: 'var(--sf-font-mono)', fontSize: 12, color: '#38bdf8' }}>
                {selectedFinding.file || 'config/environment.js'}:{selectedFinding.line || 14}
              </div>
            </div>

            <div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase', marginBottom: 4 }}>Description</h3>
              <p style={{ fontSize: 13, color: 'var(--sf-ink-mid)', lineHeight: 1.5, margin: 0 }}>
                {selectedFinding.description || selectedFinding.message || 'Security violation detected by scanner engine.'}
              </p>
            </div>

            <div>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase', marginBottom: 4 }}>Void AI Remediation Fix</h3>
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--sf-accent-soft)', border: '1px solid var(--sf-accent-border)', fontSize: 12, color: 'var(--sf-ink)', lineHeight: 1.5 }}>
                💡 {selectedFinding.remediation || 'Remove exposed hardcoded credentials and store securely in environment environment variables.'}
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--sf-border)', display: 'flex', gap: 10 }}>
              <Button
                variant="primary"
                style={{ flex: 1 }}
                onClick={() => {
                  setSelectedFinding(null);
                  openVoidWithContext({
                    scanner: selectedFinding.scanner,
                    rule: selectedFinding.rule_id,
                    file: selectedFinding.file,
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
