import React from 'react';
import { FolderOpen, ShieldCheck, Play, Plus, RefreshCw } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      margin: '24px 0',
      backgroundColor: 'rgba(30, 41, 59, 0.4)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      backdropFilter: 'blur(12px)',
      textAlign: 'center',
      animation: 'sfFadeIn 300ms ease-out',
    }}>
      {/* Icon Illustration Container */}
      <div style={{
        width: 64,
        height: 64,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(6, 182, 212, 0.15))',
        border: '1px solid rgba(99, 102, 241, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#818cf8',
        marginBottom: 16,
        boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)',
      }}>
        {icon || <FolderOpen size={30} />}
      </div>

      <h3 style={{
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--sf-ink, #f8fafc)',
        margin: '0 0 8px 0',
      }}>
        {title}
      </h3>

      <p style={{
        fontSize: '13px',
        color: 'var(--sf-text-muted, #94a3b8)',
        maxWidth: 420,
        margin: '0 0 24px 0',
        lineHeight: '1.5',
      }}>
        {description}
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '9px 18px',
              borderRadius: 8,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#ffffff',
              border: 'none',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              transition: 'transform 150ms ease, boxShadow 150ms ease',
            }}
          >
            <Plus size={15} />
            <span>{actionLabel}</span>
          </button>
        )}

        {secondaryLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 16px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--sf-ink, #f8fafc)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
          >
            <RefreshCw size={14} />
            <span>{secondaryLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
