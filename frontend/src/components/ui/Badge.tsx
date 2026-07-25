import React from 'react';
import { cn } from '../../lib/cn';

type BadgeVariant =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'
  | 'passed'
  | 'blocked'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClass: Record<BadgeVariant, string> = {
  critical: 'sf-v2-badge--critical',
  high: 'sf-v2-badge--high',
  medium: 'sf-v2-badge--medium',
  low: 'sf-v2-badge--low',
  passed: 'sf-v2-badge--passed',
  blocked: 'sf-v2-badge--blocked',
  neutral: 'sf-v2-badge--neutral',
};

/** Maps a severity string from the API to a badge variant */
export function severityToVariant(severity: string): BadgeVariant {
  const s = (severity || '').toUpperCase();
  if (s === 'CRITICAL') return 'critical';
  if (s === 'HIGH') return 'high';
  if (s === 'MEDIUM') return 'medium';
  if (s === 'LOW') return 'low';
  if (s === 'CLEAN' || s === 'ALLOW' || s === 'PASS' || s === 'PASSED') return 'passed';
  if (s === 'BLOCK' || s === 'BLOCKED' || s === 'FAIL') return 'blocked';
  return 'neutral';
}

export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span className={cn('sf-v2-badge', variantClass[variant], className)} {...props}>
      {children}
    </span>
  );
}

export default Badge;
