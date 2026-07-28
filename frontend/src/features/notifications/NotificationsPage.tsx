import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, ShieldAlert, CheckCircle, Info, Calendar } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { client } from '../../api/client';

interface Notification {
  id: string;
  title: string;
  message: string;
  category: 'pipeline' | 'security' | 'deploy' | 'system';
  severity: 'info' | 'warning' | 'error';
  is_read: boolean;
  link?: string;
  created_at: string;
}

export default function NotificationsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pipeline' | 'security' | 'deploy'>('all');

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await client.get('/notifications');
      return res.data;
    },
  });

  const getSeverityIcon = (sev: string) => {
    switch (sev) {
      case 'error':
        return <ShieldAlert size={16} color="var(--sf-danger)" />;
      case 'warning':
        return <ShieldAlert size={16} color="var(--sf-warning)" />;
      default:
        return <Info size={16} color="var(--sf-info)" />;
    }
  };

  const filtered = (notifications || []).filter((n) => {
    if (filter === 'all') return true;
    return n.category === filter;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>
          Notifications Registry
        </h1>
        <p style={{ color: 'var(--sf-ink-low)', margin: 0, fontSize: '14px' }}>
          Real-time logs of system alerts, policy blocks, and pipeline status.
        </p>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          borderBottom: '1px solid var(--sf-border)',
          paddingBottom: '2px',
        }}
      >
        {[
          { id: 'all', label: 'All notifications' },
          { id: 'pipeline', label: 'Pipelines' },
          { id: 'security', label: 'Security' },
          { id: 'deploy', label: 'Deployments' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: filter === tab.id ? '2px solid var(--sf-accent)' : '2px solid transparent',
              color: filter === tab.id ? 'var(--sf-accent)' : 'var(--sf-text-secondary)',
              padding: '8px 4px 12px 4px',
              fontSize: '13px',
              fontWeight: filter === tab.id ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isLoading ? (
          <div className="skeleton" style={{ height: '200px', borderRadius: '12px' }} />
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              backgroundColor: 'var(--sf-bg-card)',
              border: '1px solid var(--sf-border)',
              borderRadius: '12px',
              color: 'var(--sf-text-secondary)',
            }}
          >
            No notifications found.
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: 'var(--sf-bg-card)',
                border: '1px solid var(--sf-border)',
                borderRadius: '8px',
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ marginTop: '2px' }}>{getSeverityIcon(item.severity)}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--sf-text-primary)' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--sf-text-secondary)' }}>
                    {item.message}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--sf-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <Calendar size={12} /> {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              <Badge variant={item.category === 'pipeline' ? 'running' : item.category === 'deploy' ? 'success' : 'neutral'}>
                {item.category}
              </Badge>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
