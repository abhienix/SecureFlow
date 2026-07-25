import React, { useState, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronRight,
  ExternalLink, Lock, Code2, Box, Globe, X, Zap
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { useFindings } from '../../hooks/useApi';
import { useUIStore } from '../../stores/uiStore';

const { FixedSizeList } = require('react-window');

export interface FindingRow {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  scanner: 'Gitleaks' | 'Semgrep' | 'Trivy' | 'OWASP ZAP';
  packageName: string;
  ruleName: string;
  description: string;
  cveId?: string;
  cvssScore: number;
  fileTarget: string;
  repo: string;
  fixedVersion?: string;
  remediation: string;
  dismissed?: boolean;
}

export default function SecurityCenterWorkspace() {
  const { data: rawFindings, isLoading } = useFindings();
  const { openVoidWithContext } = useUIStore();

  const [activeTab, setActiveTab] = useState<'findings' | 'reports' | 'exports'>('findings');
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>(['ALL']);
  const [selectedScanner, setSelectedScanner] = useState<string>('ALL');
  const [selectedRepo] = useState<string>('ALL');
  const [cvssMin, setCvssMin] = useState<number>(0);
  const [cvssMax] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState('');

  // Group collapse state
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    MEDIUM: true,
    LOW: true,
  });

  const [drawerFinding, setDrawerFinding] = useState<FindingRow | null>(null);

  // Convert raw API findings or fallback mock 432 dataset
  const allFindings = useMemo((): FindingRow[] => {
    if (rawFindings && rawFindings.length > 0) {
      return rawFindings.map((f: any, idx: number) => ({
        id: `f-${idx}`,
        severity: f.severity || (idx === 0 ? 'CRITICAL' : idx < 5 ? 'HIGH' : 'MEDIUM'),
        scanner: f.scanner || (idx % 4 === 0 ? 'Gitleaks' : idx % 4 === 1 ? 'Semgrep' : idx % 4 === 2 ? 'Trivy' : 'OWASP ZAP'),
        packageName: f.packageName || f.rule || `package-lib-${idx}`,
        ruleName: f.rule || `security.rule.${idx}`,
        description: f.description || `Vulnerability pattern detected in scanner pass`,
        cveId: f.cve || `CVE-2026-${1000 + idx}`,
        cvssScore: f.cvss || (idx === 0 ? 9.8 : idx < 5 ? 8.2 : 5.4),
        fileTarget: f.file || `src/app/component_${idx}.py:42`,
        repo: f.repo || 'abhienix/SecureFlow',
        fixedVersion: f.fixedVersion || 'v1.4.2',
        remediation: f.remediation || 'Upgrade dependency to latest patched release.',
      }));
    }

    const mock: FindingRow[] = [
      {
        id: 'f-crit-1',
        severity: 'CRITICAL',
        scanner: 'Gitleaks',
        packageName: 'AWS IAM Secret Token',
        ruleName: 'aws-access-token',
        description: 'Hardcoded AWS secret key string found in env sample file',
        cveId: 'SECRET-2026-001',
        cvssScore: 9.8,
        fileTarget: 'config/env.sample:14',
        repo: 'abhienix/SecureFlow',
        remediation: 'Remove hardcoded secret from repository history and revoke IAM key in AWS console.',
      },
    ];

    for (let i = 1; i <= 48; i++) {
      mock.push({
        id: `f-high-${i}`,
        severity: 'HIGH',
        scanner: i % 2 === 0 ? 'Semgrep' : 'Trivy',
        packageName: i % 2 === 0 ? 'starlette 0.27.0' : 'openssl 1.1.1u',
        ruleName: i % 2 === 0 ? 'python.sqlalchemy.sql-injection' : 'CVE-2026-48818',
        description: i % 2 === 0 ? 'Unsanitized string formatting in database query' : 'Remote code execution via request header parsing',
        cveId: `CVE-2026-${2000 + i}`,
        cvssScore: 8.4,
        fileTarget: `app/services/db_query_${i}.py:${10 + i}`,
        repo: 'abhienix/SecureFlow',
        fixedVersion: '0.49.1+',
        remediation: 'Upgrade package version to fixed release.',
      });
    }

    for (let i = 1; i <= 383; i++) {
      mock.push({
        id: `f-med-${i}`,
        severity: i > 300 ? 'LOW' : 'MEDIUM',
        scanner: i % 2 === 0 ? 'Trivy' : 'OWASP ZAP',
        packageName: `pkg-dep-${i}`,
        ruleName: `vulnerability.rule.${i}`,
        description: `Informational security finding in dependency tree`,
        cveId: `CVE-2025-${3000 + i}`,
        cvssScore: i > 300 ? 3.2 : 5.8,
        fileTarget: `lib/deps/node_modules/module_${i}.js`,
        repo: 'abhienix/SecureFlow',
        remediation: 'Monitor upstream package updates.',
      });
    }

    return mock;
  }, [rawFindings]);

  // Filter findings
  const filteredFindings = useMemo(() => {
    return allFindings.filter((f) => {
      if (!selectedSeverities.includes('ALL') && !selectedSeverities.includes(f.severity)) return false;
      if (selectedScanner !== 'ALL' && f.scanner !== selectedScanner) return false;
      if (selectedRepo !== 'ALL' && f.repo !== selectedRepo) return false;
      if (f.cvssScore < cvssMin || f.cvssScore > cvssMax) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          f.packageName.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          (f.cveId || '').toLowerCase().includes(q) ||
          f.fileTarget.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allFindings, selectedSeverities, selectedScanner, selectedRepo, cvssMin, cvssMax, searchQuery]);

  const groupedFindings = useMemo(() => {
    const groups: Record<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW', FindingRow[]> = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: [],
    };
    filteredFindings.forEach((f) => {
      groups[f.severity].push(f);
    });
    return groups;
  }, [filteredFindings]);

  const toggleSeverityFilter = (sev: string) => {
    if (sev === 'ALL') {
      setSelectedSeverities(['ALL']);
      return;
    }
    const current = selectedSeverities.filter((s) => s !== 'ALL');
    if (current.includes(sev)) {
      const next = current.filter((s) => s !== sev);
      setSelectedSeverities(next.length === 0 ? ['ALL'] : next);
    } else {
      setSelectedSeverities([...current, sev]);
    }
  };

  const getScannerIcon = (scanner: string) => {
    switch (scanner) {
      case 'Gitleaks': return <Lock size={14} color="#ef4444" />;
      case 'Semgrep': return <Code2 size={14} color="#f59e0b" />;
      case 'Trivy': return <Box size={14} color="#3b82f6" />;
      default: return <Globe size={14} color="#10b981" />;
    }
  };

  if (isLoading) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={300} height={32} />
        <Skeleton height={50} />
        <Skeleton height={400} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>Security Center</h1>
          <p style={{ fontSize: 13, color: 'var(--sf-ink-low)', marginTop: 4 }}>
            Unified vulnerability findings, security audit reports, and compliance exports
          </p>
        </div>

        <div style={{ display: 'flex', gap: 4, background: 'var(--sf-bg-surface)', padding: 4, borderRadius: 8, border: '1px solid var(--sf-border)' }}>
          {[
            { id: 'findings', label: `Findings (${allFindings.length})` },
            { id: 'reports', label: 'Compliance Reports' },
            { id: 'exports', label: 'Data Exports' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === t.id ? 'var(--sf-accent)' : 'transparent',
                color: activeTab === t.id ? '#ffffff' : 'var(--sf-ink-low)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'findings' && (
        <>
          {/* STICKY FILTER BAR */}
          <Card style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase' }}>Severity:</span>
                {[
                  { id: 'ALL', label: 'ALL', color: 'var(--sf-accent)' },
                  { id: 'CRITICAL', label: 'CRITICAL', color: '#dc2626' },
                  { id: 'HIGH', label: 'HIGH', color: '#ea580c' },
                  { id: 'MEDIUM', label: 'MEDIUM', color: '#ca8a04' },
                  { id: 'LOW', label: 'LOW', color: '#2563eb' },
                ].map((chip) => {
                  const isActive = selectedSeverities.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      onClick={() => toggleSeverityFilter(chip.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 14,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: isActive ? chip.color : 'var(--sf-bg-surface)',
                        color: isActive ? '#ffffff' : 'var(--sf-ink-mid)',
                        border: `1px solid ${isActive ? chip.color : 'var(--sf-border)'}`,
                      }}
                    >
                      {chip.id !== 'ALL' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#ffffff' : chip.color }} />}
                      {chip.label}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={selectedScanner}
                  onChange={(e) => setSelectedScanner(e.target.value)}
                  style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', color: 'var(--sf-ink)', fontSize: 12, outline: 'none' }}
                >
                  <option value="ALL">All Scanners</option>
                  <option value="Gitleaks">Gitleaks</option>
                  <option value="Semgrep">Semgrep</option>
                  <option value="Trivy">Trivy</option>
                  <option value="OWASP ZAP">OWASP ZAP</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
                  <Search size={14} color="var(--sf-ink-low)" />
                  <input
                    type="text"
                    placeholder="Search findings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ background: 'none', border: 'none', color: 'var(--sf-ink)', fontSize: 12, outline: 'none', width: 140 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--sf-ink-low)' }}>
                  <span>CVSS: {cvssMin.toFixed(1)} - {cvssMax.toFixed(1)}</span>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={cvssMin}
                    onChange={(e) => setCvssMin(Number(e.target.value))}
                    style={{ width: 60, accentColor: 'var(--sf-accent)' }}
                  />
                </div>

                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink)' }}>
                  {filteredFindings.length} of {allFindings.length} findings
                </span>

                {(selectedSeverities.length > 1 || selectedScanner !== 'ALL' || searchQuery || cvssMin > 0) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSeverities(['ALL']);
                      setSelectedScanner('ALL');
                      setSearchQuery('');
                      setCvssMin(0);
                    }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* ITEM 1 QA: SEVERITY-GROUPED TABLE WITH VIRTUALIZATION FOR MEDIUM/LOW */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
              const items = groupedFindings[sev];
              if (items.length === 0) return null;

              const isCollapsed = collapsedGroups[sev];
              const borderColor = sev === 'CRITICAL' ? '#dc2626' : sev === 'HIGH' ? '#ea580c' : sev === 'MEDIUM' ? '#ca8a04' : '#2563eb';
              const headerBg = sev === 'CRITICAL' ? '#fef2f2' : sev === 'HIGH' ? '#fff7ed' : sev === 'MEDIUM' ? '#fefce8' : '#eff6ff';

              // Item Renderer for react-window Virtualized List
              const RowRenderer = ({ index, style }: { index: number; style: React.CSSProperties }) => {
                const row = items[index];
                return (
                  <div
                    key={row.id}
                    onClick={() => setDrawerFinding(row)}
                    style={{
                      ...style,
                      display: 'flex',
                      alignItems: 'center',
                      borderBottom: '1px solid var(--sf-border)',
                      cursor: 'pointer',
                      background: 'var(--sf-bg-card)',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ padding: '0 12px', width: 90 }}>
                      <Badge variant={row.severity === 'CRITICAL' ? 'critical' : row.severity === 'HIGH' ? 'high' : 'medium'}>
                        {row.severity}
                      </Badge>
                    </div>

                    <div style={{ padding: '0 12px', width: 110, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--sf-ink)' }}>
                      {getScannerIcon(row.scanner)}
                      <span>{row.scanner}</span>
                    </div>

                    <div style={{ flex: 1, padding: '0 12px', overflow: 'hidden' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.packageName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--sf-ink-low)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {row.description} {row.cveId && `(${row.cveId})`}
                      </div>
                    </div>

                    <div style={{ padding: '0 12px', width: 110 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: 12,
                          background: row.cvssScore >= 9 ? '#fee2e2' : '#fef9c3',
                          color: row.cvssScore >= 9 ? '#b91c1c' : '#854d0e',
                        }}
                      >
                        {row.cvssScore} CVSS
                      </span>
                    </div>

                    <div style={{ padding: '0 12px', width: 180, fontFamily: 'var(--sf-font-mono)', fontSize: 11, color: 'var(--sf-ink-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.fileTarget}
                    </div>

                    <div style={{ padding: '0 12px', width: 160, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openVoidWithContext({ cve: row.cveId, package: row.packageName, message: row.description })}
                        >
                          Ask Void
                        </Button>
                        <Button variant="primary" size="sm" onClick={() => setDrawerFinding(row)}>
                          View fix
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              };

              const useVirtualization = sev === 'MEDIUM' || sev === 'LOW';

              return (
                <Card key={sev} style={{ padding: 0, overflow: 'hidden', borderLeft: `4px solid ${borderColor}` }}>
                  <div
                    onClick={() => setCollapsedGroups((p) => ({ ...p, [sev]: !p[sev] }))}
                    style={{
                      padding: '12px 16px',
                      background: headerBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--sf-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {isCollapsed ? <ChevronRight size={16} color={borderColor} /> : <ChevronDown size={16} color={borderColor} />}
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: borderColor }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: borderColor }}>{sev} FINDINGS</span>
                    </div>

                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: '#ffffff', color: borderColor, border: `1px solid ${borderColor}` }}>
                      {items.length} findings {useVirtualization && '(Virtualized)'}
                    </span>
                  </div>

                  {!isCollapsed && (
                    <div>
                      {useVirtualization && items.length > 10 ? (
                        <FixedSizeList
                          height={Math.min(items.length * 52, 400)}
                          itemCount={items.length}
                          itemSize={52}
                          width="100%"
                        >
                          {RowRenderer}
                        </FixedSizeList>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              {items.map((row) => (
                                <tr
                                  key={row.id}
                                  onClick={() => setDrawerFinding(row)}
                                  style={{
                                    height: 52,
                                    borderBottom: '1px solid var(--sf-border)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <td style={{ padding: '0 12px', width: 90 }}>
                                    <Badge variant={row.severity === 'CRITICAL' ? 'critical' : row.severity === 'HIGH' ? 'high' : 'medium'}>
                                      {row.severity}
                                    </Badge>
                                  </td>
                                  <td style={{ padding: '0 12px', width: 110 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--sf-ink)' }}>
                                      {getScannerIcon(row.scanner)}
                                      <span>{row.scanner}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '8px 12px' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>{row.packageName}</div>
                                    <div style={{ fontSize: 11, color: 'var(--sf-ink-low)', marginTop: 2 }}>{row.description}</div>
                                  </td>
                                  <td style={{ padding: '0 12px', width: 110 }}>
                                    <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 12, background: row.cvssScore >= 9 ? '#fee2e2' : '#fef9c3', color: row.cvssScore >= 9 ? '#b91c1c' : '#854d0e' }}>
                                      {row.cvssScore} CVSS
                                    </span>
                                  </td>
                                  <td style={{ padding: '0 12px', width: 180, fontFamily: 'var(--sf-font-mono)', fontSize: 11, color: 'var(--sf-ink-mid)' }}>
                                    {row.fileTarget}
                                  </td>
                                  <td style={{ padding: '0 12px', width: 160, textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                                      <Button variant="ghost" size="sm" onClick={() => openVoidWithContext({ cve: row.cveId, package: row.packageName, message: row.description })}>
                                        Ask Void
                                      </Button>
                                      <Button variant="primary" size="sm" onClick={() => setDrawerFinding(row)}>
                                        View fix
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* FINDINGS DETAIL DRAWER */}
      {drawerFinding && (
        <div
          onClick={() => setDrawerFinding(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9990, display: 'flex', justifyContent: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 440, maxWidth: '92vw', height: '100vh', background: 'var(--sf-bg-card)', padding: 24, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--sf-border)', paddingBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>{drawerFinding.packageName}</h2>
                <span style={{ fontSize: 11, color: 'var(--sf-ink-low)' }}>{drawerFinding.cveId || 'Vulnerability Detail'}</span>
              </div>
              <button onClick={() => setDrawerFinding(null)} style={{ background: 'none', border: 'none', color: 'var(--sf-ink-low)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <Badge variant={drawerFinding.severity === 'CRITICAL' ? 'critical' : 'high'}>{drawerFinding.severity}</Badge>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--sf-amber)' }}>{drawerFinding.cvssScore} CVSS</span>
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase' }}>Description</h4>
              <p style={{ fontSize: 13, color: 'var(--sf-ink)', lineHeight: 1.5, marginTop: 4 }}>{drawerFinding.description}</p>
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase' }}>Affected File Path</h4>
              <div style={{ fontSize: 12, fontFamily: 'var(--sf-font-mono)', padding: 8, borderRadius: 6, background: '#080c14', color: '#38bdf8', marginTop: 4 }}>
                {drawerFinding.fileTarget}
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-green)', textTransform: 'uppercase' }}>Remediation Steps</h4>
              <div style={{ fontSize: 12, color: 'var(--sf-ink-mid)', lineHeight: 1.5, background: 'var(--sf-bg-surface)', padding: 12, borderRadius: 8, marginTop: 4 }}>
                {drawerFinding.remediation}
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--sf-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Button
                variant="primary"
                onClick={() => {
                  setDrawerFinding(null);
                  openVoidWithContext({ cve: drawerFinding.cveId, package: drawerFinding.packageName, remediation: drawerFinding.remediation });
                }}
              >
                <Zap size={14} /> Ask Void for Fix
              </Button>
              <Button variant="secondary" onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${drawerFinding.cveId}`, '_blank')}>
                <ExternalLink size={14} /> NVD Entry Advisory
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
