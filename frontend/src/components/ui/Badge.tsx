import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'failed' | 'running' | 'warning' | 'queued' | 'cancelled' | 'neutral' | 'critical' | 'high' | 'medium' | 'low' | 'passed' | 'blocked';
  children: React.ReactNode;
  dot?: boolean;
}

export function Badge({ variant = 'neutral', children, dot = false }: BadgeProps) {
  const getBadgeClass = () => {
    switch (variant) {
      case 'critical':
        return 'sf-v2-badge--critical';
      case 'high':
        return 'sf-v2-badge--high';
      case 'medium':
        return 'sf-v2-badge--medium';
      case 'low':
        return 'sf-v2-badge--low';
      case 'success':
      case 'passed':
        return 'sf-v2-badge--passed';
      case 'failed':
      case 'blocked':
        return 'sf-v2-badge--blocked';
      default:
        return 'sf-v2-badge--neutral';
    }
  };

  const getStyle = () => {
    // Basic overrides in case CSS custom vars are not loaded
    const style: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '3px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.2px',
      textTransform: 'uppercase',
    };
    return style;
  };

  return (
    <span className={`sf-v2-badge ${getBadgeClass()}`} style={getStyle()}>
      {dot && (
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
    </span>
  );
}
export default Badge;
