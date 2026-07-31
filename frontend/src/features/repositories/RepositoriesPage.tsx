import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, GitBranch, ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable, { Column } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { client } from '../../api/client';

interface Repository {
  id: string;
  name: string;
  repo_name: string;
  owner: string;
  default_branch: string;
  status: string;
  url: string;
}

export default function RepositoriesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [repoName, setRepoName] = useState('');
  const [branch, setBranch] = useState('main');

  const { data, isLoading } = useQuery<{ repositories: Repository[] }>({
    queryKey: ['repositories'],
    queryFn: async () => {
      const res = await client.get('/repositories');
      return res.data;
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: { repo_name: string; default_branch: string }) => {
      const res = await client.post('/repositories', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repositories'] });
      setIsAdding(false);
      setRepoName('');
      setBranch('main');
    },
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoName.trim()) return;
    registerMutation.mutate({
      repo_name: repoName.trim(),
      default_branch: branch,
    });
  };

  const columns: Column<Repository>[] = [
    {
      header: 'Repository',
      accessor: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            onClick={() => navigate(`/repositories/${row.id}`)}
            style={{ fontWeight: 600, color: 'var(--sf-accent)', cursor: 'pointer' }}
          >
            {row.name}
          </span>
          <span style={{ fontSize: '11px', color: 'var(--sf-text-muted)' }}>
            ID: {row.id}
          </span>
        </div>
      ),
      sortable: true,
      sortAccessor: 'name',
    },
    {
      header: 'GitHub URL',
      accessor: (row) => (
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--sf-text-secondary)', fontSize: '13px' }}
        >
          {row.url} <ExternalLink size={12} />
        </a>
      ),
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
      header: 'Status',
      accessor: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/repositories/${row.id}`)}
        >
          Manage <ArrowRight size={12} style={{ marginLeft: '4px' }} />
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>
            Repositories Registry
          </h1>
          <p style={{ color: 'var(--sf-ink-low)', margin: 0, fontSize: '14px' }}>
            Registered repository workspaces under security enforcement.
          </p>
        </div>

        <Button onClick={() => setIsAdding(!isAdding)}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Add Repository
        </Button>
      </div>

      {isAdding && (
        <form
          onSubmit={handleRegister}
          style={{
            backgroundColor: 'var(--sf-bg-card)',
            border: '1px solid var(--sf-border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-end',
            maxWidth: '600px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sf-text-secondary)' }}>
              Repository Slug (owner/name)
            </label>
            <input
              type="text"
              placeholder="e.g. abhienix/SecureFlow"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
              style={{
                background: 'var(--sf-bg-surface)',
                border: '1px solid var(--sf-border)',
                borderRadius: '6px',
                color: 'var(--sf-text-primary)',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
              }}
              required
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '120px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sf-text-secondary)' }}>
              Branch
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              style={{
                background: 'var(--sf-bg-surface)',
                border: '1px solid var(--sf-border)',
                borderRadius: '6px',
                color: 'var(--sf-text-primary)',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
              }}
              required
            />
          </div>
          <Button type="submit" disabled={registerMutation.isPending}>
            Register
          </Button>
        </form>
      )}

      <DataTable
        columns={columns}
        data={data?.repositories || []}
        isLoading={isLoading}
        emptyMessage="No repositories registered."
      />
    </div>
  );
}
