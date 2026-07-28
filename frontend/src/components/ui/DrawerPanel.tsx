import React from 'react';
import { X } from 'lucide-react';

interface DrawerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function DrawerPanel({ isOpen, onClose, title, children, footer }: DrawerPanelProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer content */}
      <div
        className="slide-in"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '480px',
          height: '100%',
          backgroundColor: 'var(--sf-bg-card)',
          borderLeft: '1px solid var(--sf-border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--sf-shadow-lg)',
          zIndex: 1001,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--sf-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--sf-ink)', margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--sf-ink-low)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            color: 'var(--sf-ink-mid)',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--sf-border)',
              backgroundColor: 'var(--sf-bg-surface)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
export default DrawerPanel;
