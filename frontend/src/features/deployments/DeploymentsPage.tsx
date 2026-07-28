import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Cloud, Link, ArrowLeft, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable, { Column } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { client } from '../../api/client';

interface Deployment {
  id: string;
  revision_name: string;
  service: string;
  environment: string;
  url: string;
  status: string;
  commit_sha: string;
  created_at: string;
  duration: number;
}

export default function DeploymentsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<{ deployments: Deployment[] }>({
    queryKey: ['deployments'],
    queryFn: async () => {
      const res = await client.get('/deployments');
      return res.data;
    },
  });

  const { data: currentDep } = useQuery<Deployment>({
    queryKey: ['deployments', 'current'],
    queryFn: async () => {
      const res = await client.get('/deployments/current');
      return res.data;
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.post(`/deployments/${id}/rollback`);
      return res.data;
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['deployments'] });
      window.dispatchEvent(
        new CustomEvent('sf_toast', {
          detail: {
            type: 'success',
            title: 'Rollback Completed',
            message: res.message || 'Service rolled back successfully.',
          },
        })
      );
    },
  });

  const handleRollback = (id: string, revName: string) => {
    if (window.confirm(`Are you sure you want to rollback production service to revision ${revName}?`)) {
      rollbackMutation.mutate(id);
    }
  };

  const columns: Column<Deployment>[] = [
    {
      header: 'Revision Name',
      accessor: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontWeight: 600, color: 'var(--sf-text-primary)' }}>{row.revision_name}</span>
          <span style={{ fontSize: '11px', color: 'var(--sf-text-muted)', fontFamily: 'var(--sf-font-mono)' }}>
            SHA: {row.commit_sha?.substring(0, 8)}
          </span>
        </div>
      ),
      sortable: true,
      sortAccessor: 'revision_name',
    },
    {
      header: 'Environment',
      accessor: (row) => <span style={{ textTransform: 'capitalize' }}>{row.environment}</span>,
    },
    {
      header: 'URL',
      accessor: (row) => (
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--sf-accent)', fontSize: '13px' }}
        >
          Endpoint <Link size={12} />
        </a>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : row.status === 'blocked' ? 'failed' : 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Created At',
      accessor: (row) => <span>{new Date(row.created_at).toLocaleString()}</span>,
    },
    {
      header: 'Action',
      accessor: (row) => {
        const isActive = row.status === 'active';
        return (
          <Button
            variant="secondary"
            size="sm"
            disabled={isActive || rollbackMutation.isPending}
            onClick={() => handleRollback(row.id, row.revision_name)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          >
            <RotateCcw size={12} /> Rollback
          </Button>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>
          Cloud Run Deployments
        </h1>
        <p style={{ color: 'var(--sf-ink-low)', margin: 0, fontSize: '14px' }}>
          Production deployment revisions history, active traffic targets, and rollback triggers.
        </p>
      </div>

      {/* Active Revision Banner */}
      {currentDep && (
        <div
          style={{
            backgroundColor: 'var(--sf-bg-surface)',
            border: '1px solid var(--sf-border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: 'var(--sf-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cloud size={24} />
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
                Active Production Revision
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--sf-text-primary)', marginTop: '2px' }}>
                {currentDep.revision_name}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--sf-text-muted)', marginTop: '2px' }}>
                Commit: {currentDep.commit_sha} | Created: {new Date(currentDep.created_at).toLocaleString()}
              </div>
            </div>
          </div>

          <a
            href={currentDep.url}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--sf-accent)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Live Endpoint <Link size={14} />
          </a>
        </div>
      )}

      {/* Revisions Table */}
      <DataTable
        columns={columns}
        data={data?.deployments || []}
        isLoading={isLoading}
        emptyMessage="No historical deployments recorded."
      />
    </div>
  );
}
