import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import type { NotificationItem } from '../stores/uiStore';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', icon: '#10b981' },
  error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', icon: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', icon: '#f59e0b' },
  info: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', icon: '#3b82f6' },
};

/**
 * Auto-dismissing toast notification system.
 * Reads from the Zustand uiStore's notification queue.
 * Each toast auto-dismisses after 5 seconds.
 */
function ToastItem({ notification }: { notification: NotificationItem }) {
  const { dismissNotification } = useUIStore();
  const { id, type, title, message } = notification;
  const Icon = ICONS[type];
  const colors = COLORS[type];

  useEffect(() => {
    const timer = setTimeout(() => dismissNotification(id), 5000);
    return () => clearTimeout(timer);
  }, [id, dismissNotification]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 10,
        background: 'var(--sf-bg-card, #0f172a)',
        border: `1px solid ${colors.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
        minWidth: 300,
        maxWidth: 380,
        animation: 'sf-slide-in 250ms ease',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          minWidth: 32,
          borderRadius: 8,
          background: colors.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} color={colors.icon} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink, #f8fafc)', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--sf-ink-mid, #94a3b8)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {message}
        </div>
      </div>
      <button
        onClick={() => dismissNotification(id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--sf-ink-low, #64748b)',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const { notifications } = useUIStore();

  if (notifications.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes sf-slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        {notifications.slice(0, 5).map((n) => (
          <div key={n.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem notification={n} />
          </div>
        ))}
      </div>
    </>
  );
}
