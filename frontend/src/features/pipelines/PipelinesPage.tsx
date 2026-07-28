import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Play, Calendar, Clock, GitBranch } from 'lucide-react';
import DataTable, { Column } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import { client } from '../../api/client';

interface PipelineRun {
  id: string;
  run_number: number;
  repo_name: string;
  commit_sha: string;
  commit_message: string;
  branch: string;
  status: string;
  action_taken: string;
  started_at: string;
  created_at: string;
  duration: number;
}

export default function PipelinesPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery<PipelineRun[]>({
    queryKey: ['pipelines'],
    queryFn: async () => {
      const res = await client.get('/pipelines');
      console.log('Pipelines Raw API Response:', res.data);
      return res.data;
    },
  });

  const columns: Column<PipelineRun>[] = [
    {
      header: 'Run',
      accessor: (row) => (
        <span
          onClick={() => navigate(`/pipelines/${row.id}`)}
          style={{ fontWeight: 700, color: 'var(--sf-accent)', cursor: 'pointer' }}
        >
          #{row.run_number}
        </span>
      ),
      sortable: true,
      sortAccessor: 'run_number',
    },
    {
      header: 'Repository',
      accessor: 'repo_name',
      sortable: true,
    },
    {
      header: 'Commit Message',
      accessor: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '300px' }}>
          <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.commit_message || 'Deploy trigger'}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--sf-text-muted)', fontFamily: 'var(--sf-font-mono)' }}>
            SHA: {row.commit_sha?.substring(0, 8)}
          </span>
        </div>
      ),
    },
    {
      header: 'Branch',
      accessor: (row) => (
        <span style={{ fontSize: '12px' }}>
          <GitBranch size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          {row.branch}
        </span>
      ),
    },
    {
      header: 'Policy Gate',
      accessor: (row) => (
        <Badge variant={row.action_taken === 'BLOCK' ? 'failed' : 'success'}>
          {row.action_taken || 'ALLOW'}
        </Badge>
      ),
    },
    {
      header: 'CI Status',
      accessor: (row) => <Badge variant={row.status as any}>{row.status}</Badge>,
    },
    {
      header: 'Duration',
      accessor: (row) => (
        <span style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} /> {row.duration || 45}s
        </span>
      ),
    },
    {
      header: 'Started At',
      accessor: (row) => (
        <span style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={12} /> {new Date(row.created_at || row.started_at).toLocaleDateString()}
        </span>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>
          Pipeline Audits & Scans
        </h1>
        <p style={{ color: 'var(--sf-ink-low)', margin: 0, fontSize: '14px' }}>
          Chronological logs of all CI commits, scanning steps, and policy decisions.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={data || []}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyIcon={GitBranch}
        emptyHeading="No pipeline runs yet"
        emptyBody="Pipeline runs will appear here after your first GitHub Actions workflow."
      />
    </div>
  );
}
