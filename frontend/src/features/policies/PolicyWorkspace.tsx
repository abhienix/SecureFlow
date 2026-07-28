import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Plus, Edit2, Trash2, Check, X, FileCheck } from 'lucide-react';
import DataTable, { Column } from '../../components/ui/DataTable';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { client } from '../../api/client';

interface PolicyRule {
  id: string;
  name: string;
  type: string;
  rule_summary: string;
  status: string;
  enforcement_mode: string;
}

export default function PolicyWorkspace() {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Severity Gate');
  const [summary, setSummary] = useState('');
  const [enforcement, setEnforcement] = useState('block');

  // Fetch Policies
  const { data: policies, isLoading, isError, refetch } = useQuery<PolicyRule[]>({
    queryKey: ['policies'],
    queryFn: async () => {
      const res = await client.get('/policies');
      console.log('Policies Raw API Response:', res.data);
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<PolicyRule>) => {
      const res = await client.post('/policies', payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] });
      setIsEditing(false);
      setName('');
      setSummary('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await client.delete(`/policies/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name: name.trim(),
      type,
      rule_summary: summary.trim(),
      enforcement_mode: enforcement,
    });
  };

  const columns: Column<PolicyRule>[] = [
    {
      header: 'Policy Gate Name',
      accessor: (row) => <span style={{ fontWeight: 600, color: 'var(--sf-text-primary)' }}>{row.name}</span>,
      sortable: true,
      sortAccessor: 'name',
    },
    {
      header: 'Type',
      accessor: 'type',
    },
    {
      header: 'Rule Criteria',
      accessor: (row) => <span style={{ color: 'var(--sf-text-secondary)' }}>{row.rule_summary}</span>,
    },
    {
      header: 'Enforcement Mode',
      accessor: (row) => (
        <Badge variant={row.enforcement_mode === 'block' ? 'failed' : 'warning'}>
          {row.enforcement_mode?.toUpperCase()}
        </Badge>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <Badge variant="success">{row.status}</Badge>,
    },
    {
      header: 'Action',
      accessor: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => deleteMutation.mutate(row.id)}
          style={{ color: 'var(--sf-danger)' }}
        >
          <Trash2 size={14} />
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>
            Pipeline Gating Policies
          </h1>
          <p style={{ color: 'var(--sf-ink-low)', margin: 0, fontSize: '14px' }}>
            Configure CVSS vulnerability thresholds, scanner blockers, and custom compliance rule gates.
          </p>
        </div>

        <Button onClick={() => setIsEditing(!isEditing)}>
          <Plus size={16} style={{ marginRight: '6px' }} /> Create Policy Rule
        </Button>
      </div>

      {isEditing && (
        <form
          onSubmit={handleCreate}
          style={{
            backgroundColor: 'var(--sf-bg-card)',
            border: '1px solid var(--sf-border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            maxWidth: '700px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Rule Name</label>
            <input
              type="text"
              placeholder="e.g. Block critical package findings"
              value={name}
              onChange={(e) => setName(e.target.value)}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Scanner Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{
                background: 'var(--sf-bg-surface)',
                border: '1px solid var(--sf-border)',
                borderRadius: '6px',
                color: 'var(--sf-text-primary)',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value="Severity Gate">Severity Gate</option>
              <option value="Secret Detection">Secret Detection</option>
              <option value="Coverage Gate">Coverage Gate</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', gridColumn: 'span 2' }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Rule Summary</label>
            <input
              type="text"
              placeholder="e.g. Blocks commits containing vulns above CVSS 9.0"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600 }}>Enforcement Mode</label>
            <select
              value={enforcement}
              onChange={(e) => setEnforcement(e.target.value)}
              style={{
                background: 'var(--sf-bg-surface)',
                border: '1px solid var(--sf-border)',
                borderRadius: '6px',
                color: 'var(--sf-text-primary)',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
              }}
            >
              <option value="block">BLOCK</option>
              <option value="warn">WARN</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '12px' }}>
            <Button variant="secondary" type="button" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit">Create</Button>
          </div>
        </form>
      )}

      <DataTable
        columns={columns}
        data={policies || []}
        isLoading={isLoading}
        isError={isError}
        onRetry={refetch}
        emptyIcon={FileCheck}
        emptyHeading="No policy rules configured"
        emptyBody="Create your first policy gate to enforce security and quality standards."
        emptyCTA={
          <Button onClick={() => setIsEditing(true)}>
            <Plus size={16} style={{ marginRight: '6px' }} /> Create Policy Rule
          </Button>
        }
      />
    </div>
  );
}
