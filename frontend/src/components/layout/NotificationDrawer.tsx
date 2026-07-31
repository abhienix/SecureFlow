import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Bell, ShieldAlert, GitPullRequest, Rocket, MessageSquare, Server, CheckCircle2, ArrowRight } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useTheme } from '../../contexts/ThemeContext';

type Category = 'all' | 'pipelines' | 'security' | 'deployments' | 'slack' | 'system';

export default function NotificationDrawer() {
  const { C } = useTheme();
  const navigate = useNavigate();
  const { isNotificationOpen, setNotificationOpen, notifications, dismissNotification } = useUIStore();
  const [activeCategory, setActiveCategory] = useState<Category>('all');

  if (!isNotificationOpen) return null;

  const categories: { key: Category; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pipelines', label: 'Pipelines' },
    { key: 'security', label: 'Security' },
    { key: 'deployments', label: 'Deployments' },
    { key: 'slack', label: 'Slack' },
    { key: 'system', label: 'System' },
  ];

  const filtered = notifications.filter((n) => {
    if (activeCategory === 'all') return true;
    return n.category === activeCategory;
  });

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'pipelines': return <GitPullRequest size={16} color="var(--sf-accent)" />;
      case 'security': return <ShieldAlert size={16} color="var(--sf-red)" />;
      case 'deployments': return <Rocket size={16} color="var(--sf-green)" />;
      case 'slack': return <MessageSquare size={16} color="var(--sf-amber)" />;
      case 'system': return <Server size={16} color="var(--sf-violet)" />;
      default: return <Bell size={16} color="var(--sf-ink-mid)" />;
    }
  };

  return (
    <div
      onClick={() => setNotificationOpen(false)}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9990,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="fade-in"
        style={{
          width: 440,
          maxWidth: '90vw',
          height: '100vh',
          background: C.bgCard || '#0f172a',
          borderLeft: `1px solid ${C.border || '#1e293b'}`,
          boxShadow: C.shadowLg || '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9995,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${C.border || '#1e293b'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--sf-accent-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} color="var(--sf-accent)" />
            </div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: C.ink, margin: 0 }}>
                Notification Center
              </h2>
              <span style={{ fontSize: 11, color: C.inkMid }}>
                {notifications.length} total events
              </span>
            </div>
          </div>
          <button
            onClick={() => setNotificationOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: C.inkMid,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Categories Tab Bar */}
        <div
          style={{
            display: 'flex',
            gap: 4,
            padding: '8px 16px',
            borderBottom: `1px solid ${C.border || '#1e293b'}`,
            overflowX: 'auto',
            background: C.bgSurface || '#111827',
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                background: activeCategory === cat.key ? C.accentSoft || 'rgba(99,102,241,0.15)' : 'transparent',
                color: activeCategory === cat.key ? C.accent || '#6366F1' : C.inkMid || '#94a3b8',
                fontSize: 12,
                fontWeight: activeCategory === cat.key ? 700 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Notifications Stream */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  background: C.bgSurface || '#111827',
                  border: `1px solid ${item.type === 'error' ? 'var(--sf-red-border)' : C.border || '#1e293b'}`,
                  display: 'flex',
                  gap: 12,
                  position: 'relative',
                }}
              >
                <div style={{ marginTop: 2 }}>{getCategoryIcon(item.category)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{item.title}</span>
                    <span style={{ fontSize: 10, color: C.inkMuted }}>
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: C.inkMid, margin: 0, lineHeight: 1.4 }}>
                    {item.message}
                  </p>

                  {item.link && (
                    <button
                      onClick={() => {
                        setNotificationOpen(false);
                        navigate(item.link!);
                      }}
                      style={{
                        marginTop: 8,
                        background: 'transparent',
                        border: 'none',
                        color: C.accent || '#6366F1',
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: 0,
                      }}
                    >
                      View Resource <ArrowRight size={12} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => dismissNotification(item.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: C.inkMuted,
                    cursor: 'pointer',
                    fontSize: 12,
                    padding: 2,
                  }}
                  title="Dismiss notification"
                >
                  <X size={14} />
                </button>
              </div>
            ))
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: C.inkMid, fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={36} color="var(--sf-green)" />
              <span>No notifications in this category.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
