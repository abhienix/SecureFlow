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

  // Fetch Events for live feed
  const { data: events } = useQuery<any[]>({
    queryKey: ['events', 'feed'],
    queryFn: async () => {
      const res = await client.get('/events');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const repos = repoData?.repositories || [];
  const runningPipelines = (pipelineData || []).filter((p: any) => p.status === 'running');
  
  // Calculate security health score
  const criticalCount = secSummary?.critical || 0;
  const highCount = secSummary?.high || 0;
  const healthScore = Math.max(0, 100 - (criticalCount * 15 + highCount * 5));

  // Custom Active Pipelines rendering
  const renderActivePipelinesVal = () => {
    const count = runningPipelines.length;
    if (count === 0) {
      return <span style={{ color: 'var(--sf-text-secondary)' }}>0</span>;
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#6366F1' }}>
        {count}
        <span className="overview-pulse-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366F1' }} />
      </span>
    );
  };

  // Custom Infrastructure State rendering
  const renderInfraStateVal = () => {
    const status = sysHealth?.status?.toLowerCase() || 'healthy';
    if (status === 'healthy' || status === 'ok') {
      return <span style={{ color: '#10B981', fontWeight: 800 }}>OK</span>;
    } else if (status === 'degraded') {
      return <span style={{ color: '#F59E0B', fontWeight: 800 }}>DEGRADED</span>;
    } else {
      return (
        <span className="overview-pulse-text-red" style={{ color: '#EF4444', fontWeight: 800 }}>
          DOWN
        </span>
      );
    }
  };

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
          color="blue"
        />
        <MetricCard
          title="Security Health"
          value={`${healthScore}`}
          unit="%"
          change={healthScore >= 90 ? 1.5 : -2.3}
          icon={<Shield size={16} />}
          isLoading={secLoading}
          isError={healthScore < 80}
          color="green"
        />
        <MetricCard
          title="Active Pipelines"
          value={renderActivePipelinesVal()}
          unit="running"
          icon={<Zap size={16} />}
          isLoading={pipeLoading}
          color="indigo"
        />
        <MetricCard
          title="Infrastructure State"
          value={renderInfraStateVal()}
          icon={<Cloud size={16} />}
          isError={sysHealth?.status === 'degraded'}
          color="teal"
        />
      </div>

      {/* Compact Horizontal Events Strip */}
      {events && events.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            overflowX: 'auto',
            padding: '12px 16px',
            backgroundColor: 'var(--sf-bg-surface)',
            border: '1px solid var(--sf-border)',
            borderRadius: '8px',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--sf-text-secondary)', whiteSpace: 'nowrap', marginRight: '4px' }}>
            Live Feed:
          </div>
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', width: '100%' }}>
            {events.map((event) => {
              const isPipeline = event.type === 'pipeline';
              const isSecurity = event.type === 'security';
              const isDeploy = event.type === 'deploy' || event.type === 'deployment';

              let bg = 'var(--sf-bg-elevated)';
              let border = 'var(--sf-border)';
              let text = 'var(--sf-text-primary)';
              let Icon = Zap;

              if (isPipeline) {
                bg = '#E0E7FF';
                text = '#3730A3';
                border = 'rgba(79, 70, 229, 0.2)';
                Icon = Zap;
              } else if (isSecurity) {
                bg = '#FEE2E2';
                text = '#991B1B';
                border = 'rgba(239, 68, 68, 0.2)';
                Icon = Shield;
              } else if (isDeploy) {
                bg = '#D1FAE5';
                text = '#065F46';
                border = 'rgba(16, 185, 129, 0.2)';
                Icon = Cloud;
              }

              const timeStr = new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

              return (
                <div
                  key={event.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    backgroundColor: bg,
                    color: text,
                    border: `1px solid ${border}`,
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon size={12} />
                  <span>{event.message}</span>
                  <span style={{ opacity: 0.6, fontSize: '10px', fontWeight: 500 }}>({timeStr})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .overview-pulse-dot {
          animation: pulse-dot-anim 1.5s infinite ease-in-out;
        }
        .overview-pulse-text-red {
          animation: pulse-text-anim 1.5s infinite ease-in-out;
        }
        @keyframes pulse-dot-anim {
          0%, 100% { transform: scale(0.9); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes pulse-text-anim {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>

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
