import React, { useState, useMemo } from 'react';
import { Key, Code2, Box, Globe, Search, ChevronDown, ChevronUp, AlertTriangle, Info, FileText, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

export default function FindingsPage({ findings = [], C }) {
  const [severityFilter, setSeverityFilter] = useState('All');
  const [scannerFilter, setScannerFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const filteredFindings = useMemo(() => {
    return findings.filter(f => {
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

  const totalPages = Math.ceil(filteredFindings.length / itemsPerPage) || 1;
  const currentFindings = filteredFindings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const severityCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    filteredFindings.forEach(f => {
      if (counts[f.severity] !== undefined) {
        counts[f.severity]++;
      }
    });
    return counts;
  }, [filteredFindings]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'CRITICAL': return { color: C.red, bg: C.redSoft, border: C.red };
      case 'HIGH': return { color: C.amber, bg: C.amberSoft, border: C.amber };
      case 'MEDIUM': return { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6' };
      case 'LOW': return { color: C.green, bg: C.greenSoft, border: C.green };
      default: return { color: C.inkMid, bg: C.bgSurface, border: C.border };
    }
  };

  const getScannerIcon = (scanner) => {
    switch (scanner) {
      case 'gitleaks': return <Key size={16} />;
      case 'semgrep': return <Code2 size={16} />;
      case 'trivy': return <Box size={16} />;
      case 'zap': return <Globe size={16} />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: '0 0 4px 0' }}>Unified Findings</h1>
        <div style={{ fontSize: 13, color: C.inkLow }}>Comprehensive view of all security vulnerabilities detected across your pipelines</div>
      </div>

      {/* Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          { label: 'Critical', count: severityCounts.CRITICAL, color: C.red },
          { label: 'High', count: severityCounts.HIGH, color: C.amber },
          { label: 'Medium', count: severityCounts.MEDIUM, color: '#3b82f6' },
          { label: 'Low', count: severityCounts.LOW, color: C.green }
        ].map(stat => (
          <div key={stat.label} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLow, textTransform: 'uppercase', marginBottom: 8 }}>{stat.label} Findings</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: stat.color }}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 14, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Search size={16} color={C.inkLow} />
          <input 
            type="text" 
            placeholder="Search by title, file, or CVE..." 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            style={{ background: 'transparent', border: 'none', color: C.ink, fontSize: 13, width: '100%', outline: 'none' }}
          />
        </div>
        <div style={{ width: 1, height: 24, background: C.border }}></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color={C.inkLow} />
          <select 
            value={severityFilter} 
            onChange={(e) => { setSeverityFilter(e.target.value); setCurrentPage(1); }}
            style={{ background: C.bgElevated, border: `1px solid ${C.border}`, color: C.ink, padding: '6px 12px', borderRadius: 6, fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select 
            value={scannerFilter} 
            onChange={(e) => { setScannerFilter(e.target.value); setCurrentPage(1); }}
            style={{ background: C.bgElevated, border: `1px solid ${C.border}`, color: C.ink, padding: '6px 12px', borderRadius: 6, fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            <option value="All">All Scanners</option>
            <option value="gitleaks">GitLeaks</option>
            <option value="semgrep">Semgrep</option>
            <option value="trivy">Trivy</option>
            <option value="zap">ZAP</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {filteredFindings.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <AlertTriangle size={32} color={C.inkLow} style={{ margin: '0 auto 16px', display: 'block' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>No findings match your criteria</div>
            <div style={{ fontSize: 13, color: C.inkLow, marginTop: 4 }}>Try adjusting your search or filters</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bgSurface }}>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: C.inkLow, textTransform: 'uppercase' }}>Scanner</th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: C.inkLow, textTransform: 'uppercase' }}>Severity</th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: C.inkLow, textTransform: 'uppercase' }}>Title</th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: C.inkLow, textTransform: 'uppercase' }}>File:Line</th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: C.inkLow, textTransform: 'uppercase' }}>CVE/CWE</th>
                <th style={{ padding: '12px 20px', fontSize: 11, fontWeight: 700, color: C.inkLow, textTransform: 'uppercase' }}>Status</th>
                <th style={{ padding: '12px 20px' }}></th>
              </tr>
            </thead>
            <tbody>
              {currentFindings.map(f => {
                const isExpanded = expandedId === f.id;
                const sevStyle = getSeverityStyle(f.severity);
                return (
                  <React.Fragment key={f.id}>
                    <tr 
                      onClick={() => toggleExpand(f.id)}
                      style={{ 
                        borderBottom: `1px solid ${C.border}`, 
                        cursor: 'pointer',
                        background: isExpanded ? C.bgSurface : 'transparent',
                      }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.inkMid }}>
                          {getScannerIcon(f.scanner)}
                          <span style={{ textTransform: 'capitalize' }}>{f.scanner}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ 
                          display: 'inline-flex', alignItems: 'center', padding: '2px 8px', 
                          borderRadius: 12, fontSize: 11, fontWeight: 700,
                          color: sevStyle.color, background: sevStyle.bg, border: `1px solid ${sevStyle.color}40`
                        }}>
                          {f.severity}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: C.ink, fontWeight: 500, maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.title}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: C.inkMid, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.file ? `${f.file.split('/').pop()}${f.line ? `:${f.line}` : ''}` : '-'}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: C.inkMid }}>
                        {f.cve_cwe || '-'}
                      </td>
                      <td style={{ padding: '14px 20px', fontSize: 13, color: C.inkMid }}>
                        {f.status || 'OPEN'}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {isExpanded ? <ChevronUp size={16} color={C.inkLow} /> : <ChevronDown size={16} color={C.inkLow} />}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.bgSurface }}>
                        <td colSpan={7} style={{ padding: 20 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div style={{ display: 'flex', gap: 40 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLow, textTransform: 'uppercase', marginBottom: 4 }}>Full Path</div>
                                <div style={{ fontSize: 13, color: C.ink, wordBreak: 'break-all', fontFamily: 'monospace' }}>{f.file || 'N/A'}</div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLow, textTransform: 'uppercase', marginBottom: 4 }}>OWASP Category</div>
                                <div style={{ fontSize: 13, color: C.ink }}>{f.owasp || 'N/A'}</div>
                              </div>
                            </div>
                            
                            {f.ai_explanation && (
                              <div style={{ background: C.bgElevated, padding: 16, borderRadius: 8, border: `1px solid ${C.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', marginBottom: 8 }}>
                                  <Info size={14} /> AI Explanation
                                </div>
                                <div style={{ fontSize: 13, color: C.ink, lineHeight: 1.5 }}>{f.ai_explanation}</div>
                              </div>
                            )}
                            
                            {f.ai_fix && (
                              <div style={{ background: C.bgElevated, padding: 16, borderRadius: 8, border: `1px solid ${C.border}` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: C.green, textTransform: 'uppercase', marginBottom: 8 }}>
                                  <Code2 size={14} /> Suggested Fix
                                </div>
                                <pre style={{ fontSize: 12, color: C.ink, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>
                                  {f.ai_fix}
                                </pre>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: `1px solid ${C.border}`, background: C.bgCard }}>
            <div style={{ fontSize: 13, color: C.inkLow }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredFindings.length)} of {filteredFindings.length}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', 
                  borderRadius: 6, fontSize: 13, fontWeight: 500,
                  background: C.bgElevated, border: `1px solid ${C.border}`, 
                  color: currentPage === 1 ? C.inkLow : C.ink,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', 
                  borderRadius: 6, fontSize: 13, fontWeight: 500,
                  background: C.bgElevated, border: `1px solid ${C.border}`, 
                  color: currentPage === totalPages ? C.inkLow : C.ink,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
