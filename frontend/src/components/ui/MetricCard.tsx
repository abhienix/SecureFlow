import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  Icon?: LucideIcon;
  iconColor?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  isPositive,
  Icon,
  iconColor = 'var(--sf-accent)',
  className,
}: MetricCardProps) {
  return (
    <div className={cn('sf-v2-card', className)} style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
      {Icon && (
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 'var(--sf-radius-md)',
            background: `${iconColor}1a`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} color={iconColor} />
        </div>
      )}
      <div className="sf-v2-metric">
        <div className="sf-v2-metric__label">{title}</div>
        <div className="sf-v2-metric__value">{value}</div>
        {change && (
          <div
            className={cn(
              'sf-v2-metric__change',
              isPositive ? 'sf-v2-metric__change--positive' : 'sf-v2-metric__change--negative'
            )}
          >
            {change}
          </div>
        )}
      </div>
    </div>
  );
}

export default MetricCard;
