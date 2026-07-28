import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitBranch, Shield, Zap, Cloud, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MetricCard from '../../components/charts/MetricCard';
import DataTable, { Column } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import { client } from '../../api/client';
import { useSSE } from '../../hooks/useSSE';
import { useWebSocket } from '../../hooks/useWebSocket';

interface RepositoryData {
  id: string;
  name: string;
  repo_name: string;
  owner: string;
  default_branch: string;
  status: string;
  url: string;
}

export default function OverviewWorkspace() {
  const navigate = useNavigate();
  
  // Activate real-time events
  useSSE();
  useWebSocket();

  // Fetch Repositories
  const { data: repoData, isLoading: reposLoading } = useQuery<{ repositories: RepositoryData[] }>({
    queryKey: ['repositories'],
    queryFn: async () => {
      const res = await client.get('/repositories');
      return res.data;
    },
  });

  // Fetch Security Summary
  const { data: secSummary, isLoading: secLoading } = useQuery({
    queryKey: ['security', 'summary'],
    queryFn: async () => {
      const res = await client.get('/security/summary');
      return res.data;
    },
  });

  // Fetch Pipelines
  const { data: pipelineData, isLoading: pipeLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const res = await client.get('/pipelines');
      return res.data;
    },
  });

  // Fetch System Health
  const { data: sysHealth } = useQuery({
    queryKey: ['system', 'health'],
    queryFn: async () => {
      // Legacy health endpoint
      const res = await client.get('/health/system');
      return res.data;
    },
  });

  const repos = repoData?.repositories || [];
  const runningPipelines = (pipelineData || []).filter((p: any) => p.status === 'running');
  
  // Calculate security health score: start at 100, subtract penalty for findings
  const criticalCount = secSummary?.critical || 0;
  const highCount = secSummary?.high || 0;
  const healthScore = Math.max(0, 100 - (criticalCount * 15 + highCount * 5));

  const columns: Column<RepositoryData>[] = [
    {
      header: 'Repository Name',
      accessor: (row) => (
        <span
          onClick={() => navigate(`/repositories/${row.id}`)}
          style={{ fontWeight: 600, color: 'var(--sf-accent)', cursor: 'pointer' }}
        >
          {row.name}
        </span>
      ),
      sortable: true,
      sortAccessor: 'name',
    },
    {
      header: 'Owner',
      accessor: 'owner',
    },
    {
      header: 'Default Branch',
      accessor: (row) => (
        <span style={{ fontFamily: 'var(--sf-font-mono)', fontSize: '12px' }}>
          <GitBranch size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          {row.default_branch}
        </span>
      ),
    },
    {
      header: 'Sync Status',
      accessor: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Action',
      accessor: (row) => (
        <button
          onClick={() => navigate(`/repositories/${row.id}`)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--sf-accent)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          View Workspace <ArrowRight size={14} />
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Enterprise Workspace Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>
          DevSecOps Operating System
        </h1>
        <p style={{ color: 'var(--sf-ink-low)', margin: 0, fontSize: '14px' }}>
          Real-time CI/CD scanning registry, Prometheus metrics, and automated policy enforcement.
        </p>
      </div>

      {/* Service Degraded Alert Banner */}
      {sysHealth?.status === 'degraded' && (
        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid var(--sf-warning)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--sf-warning)',
            fontSize: '13px',
          }}
        >
          <AlertTriangle size={18} />
          <div>
            <strong>Infrastructure Warning:</strong> Redis Cache or Celery queue is currently report degraded status. Click to open <span onClick={() => navigate('/observability')} style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 600 }}>Observability Workspace</span> for detail.
          </div>
        </div>
      )}

      {/* Row of 4 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <MetricCard
          title="Repositories Audited"
          value={repos.length}
          unit="repos"
          icon={<GitBranch size={16} />}
          isLoading={reposLoading}
        />
        <MetricCard
          title="Security Health"
          value={`${healthScore}`}
          unit="%"
          change={healthScore >= 90 ? 1.5 : -2.3}
          icon={<Shield size={16} />}
          isLoading={secLoading}
          isError={healthScore < 80}
        />
        <MetricCard
          title="Active Pipelines"
          value={runningPipelines.length}
          unit="running"
          icon={<Zap size={16} />}
          isLoading={pipeLoading}
        />
        <MetricCard
          title="Infrastructure State"
          value={sysHealth?.status === 'healthy' ? 'OK' : 'DEGRADED'}
          icon={<Cloud size={16} />}
          isError={sysHealth?.status === 'degraded'}
        />
      </div>

      {/* Repositories List Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--sf-ink)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Registered Repositories
        </h2>
        <DataTable
          columns={columns}
          data={repos}
          isLoading={reposLoading}
          emptyMessage="No repositories registered under SecureFlow control"
        />
      </div>
    </div>
  );
}
