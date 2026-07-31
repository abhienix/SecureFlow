import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { GitCommit, GitPullRequest, ShieldAlert, ArrowLeft, ExternalLink } from 'lucide-react';
import DataTable, { Column } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import { client } from '../../api/client';

export default function RepositoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'commits' | 'pulls' | 'security'>('commits');

  // Fetch Repo Details
  const { data: repo, isLoading: repoLoading } = useQuery({
    queryKey: ['repositories', 'detail', id],
    queryFn: async () => {
      const res = await client.get(`/repositories/${id}`);
      return res.data;
    },
  });

  // Fetch Commits (pipeline runs)
  const { data: commits, isLoading: commitsLoading } = useQuery<any[]>({
    queryKey: ['repositories', id, 'commits'],
    queryFn: async () => {
      const res = await client.get(`/repositories/${id}/commits`);
      return res.data;
    },
  });

  // Fetch PRs
  const { data: pulls } = useQuery<any[]>({
    queryKey: ['repositories', id, 'pulls'],
    queryFn: async () => {
      const res = await client.get(`/repositories/${id}/pulls`);
      return res.data;
    },
  });

  // Fetch Security Summary
  const { data: security } = useQuery({
    queryKey: ['repositories', id, 'security'],
    queryFn: async () => {
      const res = await client.get(`/repositories/${id}/security`);
      return res.data;
    },
  });

  if (repoLoading) {
    return <div className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />;
  }

  if (!repo) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <h2 style={{ color: 'var(--sf-danger)' }}>Repository not found</h2>
        <button onClick={() => navigate('/repositories')} style={{ marginTop: '16px' }}>
          Back to List
        </button>
      </div>
    );
  }

  const commitColumns: Column<any>[] = [
    {
      header: 'Commit SHA',
      accessor: (row) => (
        <span style={{ fontFamily: 'var(--sf-font-mono)', fontWeight: 600 }}>
          {row.sha?.substring(0, 8) || 'HEAD'}
        </span>
      ),
    },
    {
      header: 'Message',
      accessor: 'message',
    },
    {
      header: 'Branch',
      accessor: 'branch',
    },
    {
      header: 'CI Status',
      accessor: (row) => <Badge variant={row.status}>{row.status}</Badge>,
    },
  ];

  const pullColumns: Column<any>[] = [
    {
      header: 'Pull Request',
      accessor: (row) => (
        <span style={{ fontWeight: 600 }}>
          #{row.number} — {row.title}
        </span>
      ),
    },
    {
      header: 'Author',
      accessor: 'author',
    },
    {
      header: 'Target Branch',
      accessor: 'branch',
    },
    {
      header: 'Gate Status',
      accessor: (row) => <Badge variant={row.status === 'passed' ? 'success' : 'running'}>{row.status}</Badge>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back Button & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/repositories')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--sf-text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>
            {repo.name}
          </h1>
          <a
            href={repo.url}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: '13px', color: 'var(--sf-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}
          >
            GitHub Web Link <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          borderBottom: '1px solid var(--sf-border)',
          paddingBottom: '2px',
        }}
      >
        {[
          { id: 'commits', label: 'Commits History', icon: <GitCommit size={16} /> },
          { id: 'pulls', label: 'Pull Requests', icon: <GitPullRequest size={16} /> },
          { id: 'security', label: 'Security Gates', icon: <ShieldAlert size={16} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--sf-accent)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--sf-accent)' : 'var(--sf-text-secondary)',
              padding: '8px 4px 12px 4px',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'commits' && (
          <DataTable
            columns={commitColumns}
            data={commits || []}
            isLoading={commitsLoading}
            emptyMessage="No commit pipeline executions recorded."
          />
        )}

        {activeTab === 'pulls' && (
          <DataTable
            columns={pullColumns}
            data={pulls || []}
            emptyMessage="No open pull requests under analysis."
          />
        )}

        {activeTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Critical', val: security?.summary?.CRITICAL || 0, color: 'var(--sf-danger)' },
                { label: 'High', val: security?.summary?.HIGH || 0, color: 'var(--sf-warning)' },
                { label: 'Medium', val: security?.summary?.MEDIUM || 0, color: '#3B82F6' },
                { label: 'Low', val: security?.summary?.LOW || 0, color: '#10B981' },
              ].map((card, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: 'var(--sf-bg-surface)',
                    border: '1px solid var(--sf-border)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
                    {card.label}
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: card.color, marginTop: '4px' }}>
                    {card.val}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--sf-text-muted)' }}>
              Last scan completed at: {security?.last_scan_at ? new Date(security.last_scan_at).toLocaleString() : 'Never'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
