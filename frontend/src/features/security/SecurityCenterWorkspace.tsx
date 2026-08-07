import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, ShieldAlert, ShieldCheck, CheckCircle, ExternalLink, Filter, HelpCircle, FileJson, FileText } from 'lucide-react';
import DataTable, { Column } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import DrawerPanel from '../../components/ui/DrawerPanel';
import ScannerBar from '../../components/security/ScannerBar';
import { client } from '../../api/client';
import { useSecurityStore } from '../../stores/securityStore';
import { downloadReport } from '../../utils/reportExporter';

export default function SecurityCenterWorkspace() {
  const qc = useQueryClient();
  const { filters, setFilters, resetFilters } = useSecurityStore();
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);

  const { data: findingsData, isLoading: findingsLoading, isError: findingsError, refetch } = useQuery({
    queryKey: ['security', 'findings', filters],
    queryFn: async () => {
      const res = await client.get('/security/findings', { params: filters });
      return res.data;
    },
  });

  const { data: secSummary } = useQuery({
    queryKey: ['security', 'summary'],
    queryFn: async () => {
      const res = await client.get('/security/summary');
      return res.data;
    },
  });

  const { data: scannerComparison } = useQuery({
    queryKey: ['security', 'scanner-comparison'],
    queryFn: async () => {
      const res = await client.get('/security/scanners/comparison');
      return res.data;
    },
  });

  const { data: latestPipeline } = useQuery({
    queryKey: ['pipelines', 'latest'],
    queryFn: async () => {
      const res = await client.get('/pipelines/latest');
      return res.data;
    },
  });

  const handleExportJson = (scanId: string) => {
    downloadReport(scanId, 'json');
  };

  const handleExportPdf = (scanId: string) => {
    downloadReport(scanId, 'pdf');
  };

  // Update Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await client.patch(`/security/findings/${id}`, { status });
      return res.data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['security', 'findings'] });
      setSelectedFinding(data);
    },
  });

  const findings = findingsData?.findings || [];
  // Target scan ID for exports: current finding's scan, or latest pipeline run, or fallback
  const targetScanId = findings[0]?.scan_id || latestPipeline?.scan_id || latestPipeline?.id || '665';

  // Grouped Scanner chart data formatting
  const comparisonData = React.useMemo(() => {
    if (!scannerComparison) return [];
    return Object.entries(scannerComparison).map(([scanner, levels]: [string, any]) => ({
      scanner: scanner.toUpperCase(),
      critical: levels.critical || 0,
      high: levels.high || 0,
      medium: levels.medium || 0,
      low: levels.low || 0,
    }));
  }, [scannerComparison]);

  const columns: Column<any>[] = [
    {
      header: 'Vulnerability / Issue',
      accessor: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            onClick={() => setSelectedFinding(row)}
            style={{ fontWeight: 600, color: 'var(--sf-accent)', cursor: 'pointer' }}
          >
            {row.title}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--sf-text-muted)', fontFamily: 'var(--sf-font-mono)' }}>
            {row.cve_cwe}
          </span>
        </div>
      ),
      sortable: true,
      sortAccessor: 'title',
    },
    {
      header: 'Severity',
      accessor: (row) => <Badge variant={row.severity?.toLowerCase()}>{row.severity}</Badge>,
      sortable: true,
      sortAccessor: 'severity',
    },
    {
      header: 'Scanner',
      accessor: (row) => (
        <span style={{ textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>
          {row.scanner}
        </span>
      ),
    },
    {
      header: 'Location',
      accessor: (row) => (
        <span style={{ fontFamily: 'var(--sf-font-mono)', fontSize: '11px', color: 'var(--sf-text-secondary)' }}>
          {row.file}:{row.line}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <Badge variant={row.status === 'open' ? 'neutral' : row.status === 'resolved' ? 'success' : 'cancelled'}>
          {row.status}
        </Badge>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>
          Security Control Center
        </h1>
        <p style={{ color: 'var(--sf-ink-low)', margin: 0, fontSize: '14px' }}>
          Unified dashboard aggregating Gitleaks, Semgrep, Trivy, and OWASP ZAP alerts.
        </p>
      </div>

      {/* Grouped Bar Chart */}
      {comparisonData.length > 0 && <ScannerBar data={comparisonData} />}

      {/* Filters Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--sf-bg-surface)',
          border: '1px solid var(--sf-border)',
          borderRadius: '8px',
          padding: '12px 16px',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--sf-text-secondary)', fontSize: '13px' }}>
            <Filter size={14} /> Filter:
          </div>

          {/* Severity Select */}
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ severity: e.target.value })}
            style={{
              background: 'var(--sf-bg-card)',
              border: '1px solid var(--sf-border)',
              borderRadius: '6px',
              color: 'var(--sf-text-primary)',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Scanner Select */}
          <select
            value={filters.scanner}
            onChange={(e) => setFilters({ scanner: e.target.value })}
            style={{
              background: 'var(--sf-bg-card)',
              border: '1px solid var(--sf-border)',
              borderRadius: '6px',
              color: 'var(--sf-text-primary)',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="">All Scanners</option>
            <option value="gitleaks">Gitleaks</option>
            <option value="semgrep">Semgrep</option>
            <option value="trivy">Trivy</option>
            <option value="zap">OWASP ZAP</option>
          </select>

          {/* Status Select */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ status: e.target.value })}
            style={{
              background: 'var(--sf-bg-card)',
              border: '1px solid var(--sf-border)',
              borderRadius: '6px',
              color: 'var(--sf-text-primary)',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={resetFilters}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--sf-text-muted)',
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline',
            }}
          >
            Reset Filters
          </button>

          <button
            id="btn-export-json"
            onClick={() => handleExportJson(targetScanId)}
            title="Export report as JSON"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '6px',
              color: '#818cf8',
              padding: '5px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'background 0.15s',
            }}
          >
            <FileJson size={13} />
            Export JSON
          </button>

          <button
            id="btn-export-pdf"
            onClick={() => handleExportPdf(targetScanId)}
            title="Export report as PDF"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '6px',
              color: '#f87171',
              padding: '5px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'background 0.15s',
            }}
          >
            <FileText size={13} />
            Export PDF
          </button>
        </div>
      </div>

      {/* Findings Data Table */}
      <DataTable
        columns={columns}
        data={findings}
        isLoading={findingsLoading}
        isError={findingsError}
        onRetry={refetch}
        emptyIcon={ShieldCheck}
        emptyHeading="No findings detected"
        emptyBody="Security scan results will appear here after a pipeline scan completes."
      />

      {/* Details Side Drawer */}
      <DrawerPanel
        isOpen={!!selectedFinding}
        onClose={() => setSelectedFinding(null)}
        title={selectedFinding?.title || 'Finding details'}
      >
        {selectedFinding && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Severity and Status badges */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Badge variant={selectedFinding.severity?.toLowerCase()}>{selectedFinding.severity}</Badge>
              <Badge variant={selectedFinding.status === 'open' ? 'neutral' : selectedFinding.status === 'resolved' ? 'success' : 'cancelled'}>
                {selectedFinding.status}
              </Badge>
            </div>

            {/* Location file path */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
                Location
              </div>
              <div
                style={{
                  fontFamily: 'var(--sf-font-mono)',
                  fontSize: '12px',
                  backgroundColor: 'var(--sf-bg-surface)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--sf-border)',
                  marginTop: '4px',
                  wordBreak: 'break-all',
                }}
              >
                {selectedFinding.file}:{selectedFinding.line}
              </div>
            </div>

            {/* Class mappings */}
            <div style={{ display: 'flex', gap: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
                  CVE / CWE Class
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  {selectedFinding.cve_cwe}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
                  OWASP Category
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, marginTop: '2px' }}>
                  {selectedFinding.owasp || 'A06:2021-Vulnerable Components'}
                </div>
              </div>
            </div>

            {/* AI Explanation */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
                AI Analysis & Explanation
              </div>
              <p style={{ fontSize: '13px', lineHeight: '1.5', margin: '4px 0 0 0' }}>
                {selectedFinding.ai_explanation || 'Vulnerability threat vector detected inside deployment artifacts. Vulnerable libraries pose dependency chain remote exploit risk.'}
              </p>
            </div>

            {/* AI Fix Recommendations */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--sf-success)' }}>
                Remediation & Fix
              </div>
              <div
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '13px',
                  fontFamily: 'var(--sf-font-mono)',
                  lineHeight: '1.5',
                  marginTop: '4px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {selectedFinding.ai_fix || 'Update references in project lockfile to stable minor release and rebuild docker images.'}
              </div>
            </div>

            {/* Resolution dropdown selection */}
            <div style={{ borderTop: '1px solid var(--sf-border)', paddingTop: '16px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sf-text-secondary)', display: 'block', marginBottom: '6px' }}>
                Change Finding Status
              </label>
              <select
                value={selectedFinding.status}
                onChange={(e) => updateStatusMutation.mutate({ id: selectedFinding.id, status: e.target.value })}
                style={{
                  background: 'var(--sf-bg-surface)',
                  border: '1px solid var(--sf-border)',
                  borderRadius: '6px',
                  color: 'var(--sf-text-primary)',
                  padding: '8px 12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  width: '100%',
                  outline: 'none',
                }}
              >
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>
        )}
      </DrawerPanel>
    </div>
  );
}
