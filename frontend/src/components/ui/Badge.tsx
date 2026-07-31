import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'failed' | 'running' | 'warning' | 'queued' | 'cancelled' | 'neutral' | 'critical' | 'high' | 'medium' | 'low' | 'passed' | 'blocked' | 'active' | 'inactive';
  children: React.ReactNode;
  dot?: boolean;
}

export function Badge({ variant = 'neutral', children, dot = false }: BadgeProps) {
  const variantLower = variant.toLowerCase();

  const getStyle = () => {
    const baseStyle: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '3px 8px',
      borderRadius: '9999px', // pill shape
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.2px',
      textTransform: 'uppercase',
      border: 'none',
      lineHeight: 1.2,
    };

    switch (variantLower) {
      case 'active':
      case 'success':
      case 'passed':
      case 'passing':
        return { ...baseStyle, backgroundColor: '#D1FAE5', color: '#065F46' };
      case 'running':
      case 'in-progress':
        return { ...baseStyle, backgroundColor: '#E0E7FF', color: '#3730A3' };
      case 'failed':
      case 'error':
      case 'blocked':
        return { ...baseStyle, backgroundColor: '#FEE2E2', color: '#991B1B' };
      case 'cancelled':
        return { ...baseStyle, backgroundColor: '#F1F5F9', color: '#475569' };
      case 'pending':
      case 'queued':
        return { ...baseStyle, backgroundColor: '#DBEAFE', color: '#1E40AF' };
      case 'critical':
        return { ...baseStyle, backgroundColor: '#FEE2E2', color: '#991B1B' };
      case 'high':
        return { ...baseStyle, backgroundColor: '#FFEDD5', color: '#9A3412' };
      case 'medium':
        return { ...baseStyle, backgroundColor: '#FEF9C3', color: '#854D0E' };
      case 'low':
        return { ...baseStyle, backgroundColor: '#DBEAFE', color: '#1E40AF' };
      case 'inactive':
      default:
        return { ...baseStyle, backgroundColor: '#F1F5F9', color: '#475569' };
    }
  };

  const isRunning = variantLower === 'running' || variantLower === 'in-progress';

  return (
    <span style={getStyle()}>
      {isRunning && (
        <svg
          style={{
            animation: 'badge-spin 1s linear infinite',
            width: '12px',
            height: '12px',
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" opacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeLinecap="round" />
        </svg>
      )}
      {dot && !isRunning && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            display: 'inline-block',
          }}
        />
      )}
      <span className="sr-only">status: </span>
      {children}
      <style>{`
        @keyframes badge-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </span>
  );
}

export default Badge;
