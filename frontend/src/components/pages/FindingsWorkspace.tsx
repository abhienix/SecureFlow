import React, { useState, useMemo } from 'react';
import {
  Key, Code2, Box, Globe, Search, ChevronDown, ChevronUp,
  AlertTriangle, Info, FileText, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge, severityToVariant } from '../ui/Badge';
import { Skeleton, RowSkeleton } from '../ui/Skeleton';
import { useFindings } from '../../hooks/useApi';
import type { UnifiedFinding } from '../../types';

const SCANNER_ICONS: Record<string, React.ReactNode> = {
  gitleaks: <Key size={16} />,
  semgrep: <Code2 size={16} />,
  trivy: <Box size={16} />,
  zap: <Globe size={16} />,
};

const ITEMS_PER_PAGE = 25;

export default function FindingsWorkspace() {
  const { data: rawFindings, isLoading } = useFindings();
  const [severityFilter, setSeverityFilter] = useState('All');
  const [scannerFilter, setScannerFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const findings = useMemo(() => rawFindings || [], [rawFindings]);

  const filteredFindings = useMemo(() => {
    return findings.filter((f: UnifiedFinding) => {
      const matchSeverity = severityFilter === 'All' || f.severity === severityFilter;
      const matchScanner = scannerFilter === 'All' || f.scanner === scannerFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch = q === '' ||
        (f.title && f.title.toLowerCase().includes(q)) ||
        (f.file && f.file.toLowerCase().includes(q)) ||
        (f.cve_cwe && f.cve_cwe.toLowerCase().includes(q));
      return matchSeverity && matchScanner && matchSearch;
    });
  }, [findings, severityFilter, scannerFilter, searchQuery]);

  const totalPages = Math.ceil(filteredFindings.length / ITEMS_PER_PAGE) || 1;
  const currentFindings = filteredFindings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const severityCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filteredFindings.forEach((f: UnifiedFinding) => {
      if (counts[f.severity as keyof typeof counts] !== undefined) {
        counts[f.severity as keyof typeof counts]++;
      }
    });
    return counts;
  }, [filteredFindings]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={300} height={32} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={80} />)}
        </div>
        <Card><RowSkeleton columns={6} /><RowSkeleton columns={6} /><RowSkeleton columns={6} /></Card>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>Unified Findings</h1>
        <p style={{ fontSize: 13, color: 'var(--sf-ink-low)' }}>Comprehensive view of all security vulnerabilities detected across your pipelines</p>
      </div>

      {/* Summary Strip */}
      <div className="sf-v2-grid-kpi" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {[
          { label: 'Critical', count: severityCounts.CRITICAL, color: 'var(--sf-red)' },
          { label: 'High', count: severityCounts.HIGH, color: 'var(--sf-amber)' },
          { label: 'Medium', count: severityCounts.MEDIUM, color: 'var(--sf-blue)' },
          { label: 'Low', count: severityCounts.LOW, color: 'var(--sf-green)' },
        ].map((stat) => (
          <Card key={stat.label} style={{ padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase', marginBottom: 8 }}>{stat.label} Findings</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.count}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Search size={16} color="var(--sf-ink-low)" />
          <input
            type="text"
            placeholder="Search by title, file, or CVE..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            style={{ background: 'transparent', border: 'none', color: 'var(--sf-ink)', fontSize: 13, width: '100%', outline: 'none' }}
          />
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--sf-border)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="var(--sf-ink-low)" />
          <select value={severityFilter} onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
            style={{ background: 'var(--sf-bg-elevated)', border: '1px solid var(--sf-border)', color: 'var(--sf-ink)', padding: '6px 12px', borderRadius: 6, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            <option value="All">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select value={scannerFilter} onChange={(e) => { setScannerFilter(e.target.value); setCurrentPage(1); }}
            style={{ background: 'var(--sf-bg-elevated)', border: '1px solid var(--sf-border)', color: 'var(--sf-ink)', padding: '6px 12px', borderRadius: 6, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            <option value="All">All Scanners</option>
            <option value="gitleaks">GitLeaks</option>
            <option value="semgrep">Semgrep</option>
            <option value="trivy">Trivy</option>
            <option value="zap">ZAP</option>
          </select>
        </div>
      </Card>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {filteredFindings.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <AlertTriangle size={32} color="var(--sf-ink-low)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sf-ink)' }}>No findings match your criteria</div>
            <div style={{ fontSize: 13, color: 'var(--sf-ink-low)', marginTop: 4 }}>Try adjusting your search or filters</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--sf-border)', background: 'var(--sf-bg-surface)' }}>
                {['Scanner', 'Severity', 'Title', 'File:Line', 'CVE/CWE', 'Status'].map((h) => (
                  <th key={h} style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase' }}>{h}</th>
                ))}
                <th style={{ padding: '12px 20px' }} />
              </tr>
            </thead>
            <tbody>
              {currentFindings.map((f: UnifiedFinding) => {
                const isExpanded = expandedId === f.id;
                return (
                  <React.Fragment key={f.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : f.id)}
                      style={{ borderBottom: '1px solid var(--sf-border)', cursor: 'pointer', background: isExpanded ? 'var(--sf-bg-surface)' : 'transparent' }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--sf-ink-mid)' }}>
                          {SCANNER_ICONS[f.scanner] || <FileText size={16} />}
                          <span style={{ textTransform: 'capitalize' }}>{f.scanner}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <Badge variant={severityToVariant(f.severity)}>{f.severity}</Badge>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--sf-ink)', fontWeight: 500, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.title}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--sf-ink-mid)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.file ? `${f.file.split('/').pop()}${f.line ? `:${f.line}` : ''}` : '-'}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--sf-ink-mid)' }}>{f.cve_cwe || '-'}</td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--sf-ink-mid)' }}>{f.status || 'OPEN'}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {isExpanded ? <ChevronUp size={16} color="var(--sf-ink-low)" /> : <ChevronDown size={16} color="var(--sf-ink-low)" />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ borderBottom: '1px solid var(--sf-border)', background: 'var(--sf-bg-surface)' }}>
                        <td colSpan={7} style={{ padding: 20 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', gap: 40 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase', marginBottom: 4 }}>Full Path</div>
                                <div style={{ fontSize: 13, color: 'var(--sf-ink)', wordBreak: 'break-all', fontFamily: 'var(--sf-font-mono)' }}>{f.file || 'N/A'}</div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase', marginBottom: 4 }}>OWASP Category</div>
                                <div style={{ fontSize: 13, color: 'var(--sf-ink)' }}>{f.owasp || 'N/A'}</div>
                              </div>
                            </div>
                            {f.ai_explanation && (
                              <div style={{ background: 'var(--sf-bg-elevated)', padding: 16, borderRadius: 8, border: '1px solid var(--sf-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--sf-accent)', textTransform: 'uppercase', marginBottom: 8 }}>
                                  <Info size={14} /> AI Explanation
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--sf-ink)', lineHeight: 1.5 }}>{f.ai_explanation}</div>
                              </div>
                            )}
                            {f.ai_fix && (
                              <div style={{ background: 'var(--sf-bg-elevated)', padding: 16, borderRadius: 8, border: '1px solid var(--sf-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--sf-green)', textTransform: 'uppercase', marginBottom: 8 }}>
                                  <Code2 size={14} /> Suggested Fix
                                </div>
                                <pre style={{ fontSize: 12, color: 'var(--sf-ink)', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--sf-font-mono)' }}>{f.ai_fix}</pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {filteredFindings.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid var(--sf-border)' }}>
            <div style={{ fontSize: 13, color: 'var(--sf-ink-low)' }}>
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredFindings.length)} of {filteredFindings.length}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500, background: 'var(--sf-bg-elevated)', border: '1px solid var(--sf-border)', color: currentPage === 1 ? 'var(--sf-ink-low)' : 'var(--sf-ink)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}
                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500, background: 'var(--sf-bg-elevated)', border: '1px solid var(--sf-border)', color: currentPage === totalPages ? 'var(--sf-ink-low)' : 'var(--sf-ink)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
