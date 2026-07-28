import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, ShieldAlert, CheckCircle, Info, Calendar, AlertTriangle, ExternalLink } from 'lucide-react';
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

  const { data: notifications, isLoading, isError, refetch } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await client.get('/notifications');
      console.log('Notifications Raw API Response:', res.data);
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
          Array.from({ length: 5 }).map((_, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '16px',
                backgroundColor: 'var(--sf-bg-card)',
                border: '1px solid var(--sf-border)',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div className="skeleton" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton" style={{ width: '40%', height: '14px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ width: '80%', height: '12px', borderRadius: '4px' }} />
                <div className="skeleton" style={{ width: '20%', height: '10px', borderRadius: '4px' }} />
              </div>
            </div>
          ))
        ) : isError ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              backgroundColor: 'var(--sf-bg-card)',
              border: '1px solid var(--sf-border)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <AlertTriangle size={40} color="#EF4444" style={{ marginBottom: '8px' }} />
            <h3 style={{ color: 'var(--sf-ink)', fontSize: '16px', fontWeight: 600, margin: 0 }}>
              Failed to load data
            </h3>
            <Button variant="secondary" size="sm" onClick={() => refetch()} style={{ marginTop: '8px' }}>
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              backgroundColor: 'var(--sf-bg-card)',
              border: '1px solid var(--sf-border)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <Bell size={64} style={{ color: 'var(--sf-ink-low)', opacity: 0.5 }} />
            <h3 style={{ color: 'var(--sf-ink)', fontSize: '16px', fontWeight: 600, margin: 0 }}>
              All clear
            </h3>
            <p style={{ color: 'var(--sf-ink-low)', fontSize: '14px', margin: 0, maxWidth: '400px' }}>
              System alerts, policy blocks, and pipeline events will appear here.
            </p>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--sf-text-primary)' }}>
                      {item.title}
                    </span>
                    <Badge variant={item.category === 'pipeline' ? 'running' : item.category === 'deploy' ? 'success' : item.category === 'security' ? 'failed' : 'neutral'}>
                      {item.category}
                    </Badge>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--sf-text-secondary)', marginTop: '2px' }}>
                    {item.message}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '6px', fontSize: '11px', color: 'var(--sf-text-muted)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> {new Date(item.created_at).toLocaleString()}
                    </span>
                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                          color: 'var(--sf-accent)',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        View Source <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
