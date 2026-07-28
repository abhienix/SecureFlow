import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: React.ReactNode;
  unit?: string;
  change?: number; // percentage change
  sparklineData?: number[]; // last 60 points
  icon?: React.ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  onClick?: () => void;
  color?: 'green' | 'indigo' | 'blue' | 'teal' | 'red' | 'amber' | string;
}

export function MetricCard({
  title,
  value,
  unit = '',
  change,
  sparklineData = [],
  icon,
  isLoading = false,
  isError = false,
  onClick,
  color,
}: MetricCardProps) {
  // Format mock data if empty
  const chartData = React.useMemo(() => {
    const data = sparklineData.length > 0 ? sparklineData : Array.from({ length: 60 }, () => 20 + Math.random() * 40);
    return data.map((v, i) => ({ index: i, value: v }));
  }, [sparklineData]);

  const resolvedColor = React.useMemo(() => {
    if (color) {
      switch (color) {
        case 'green': return '#10B981';
        case 'indigo': return '#6366F1';
        case 'blue': return '#3B82F6';
        case 'teal': return '#14B8A6';
        case 'red': return '#EF4444';
        case 'amber': return '#F59E0B';
        default: return color;
      }
    }
    return change !== undefined && change >= 0 ? '#10B981' : '#EF4444';
  }, [color, change]);

  if (isLoading) {
    return (
      <div
        className="skeleton"
        style={{
          height: '120px',
          borderRadius: '12px',
          backgroundColor: 'var(--sf-bg-elevated)',
          padding: '16px',
        }}
      />
    );
  }

  const isPositive = change !== undefined && change >= 0;
  const gradientId = `gradient-${title.replace(/\s+/g, '-')}`;

  return (
    <div
      onClick={onClick}
      style={{
        minHeight: '120px',
        backgroundColor: 'var(--sf-bg-card)',
        border: isError ? '1px solid var(--sf-danger)' : '1px solid var(--sf-border)',
        borderTop: isError ? '3px solid var(--sf-danger)' : '1px solid var(--sf-border)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 150ms ease, box-shadow 150ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--sf-shadow-lg)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
    >
      {/* Top Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--sf-text-muted)', display: 'flex', alignItems: 'center' }}>
            {icon}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              color: 'var(--sf-text-secondary)',
            }}
          >
            {title}
          </span>
        </div>

        {/* Change Badge */}
        {change !== undefined && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: isPositive ? 'var(--sf-success)' : 'var(--sf-danger)',
            }}
          >
            {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isPositive ? '+' : ''}
            {change}%
          </div>
        )}
      </div>

      {/* Center Value */}
      <div style={{ margin: '8px 0', display: 'flex', alignItems: 'baseline' }}>
        <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--sf-text-primary)' }}>
          {value}
        </span>
        {unit && (
          <span
            style={{
              fontSize: '14px',
              color: 'var(--sf-text-muted)',
              marginLeft: '4px',
              fontWeight: 500,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* Bottom Sparkline */}
      <div style={{ height: '24px', width: '100%', overflow: 'hidden', pointerEvents: 'none' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, bottom: 0, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={resolvedColor}
                  stopOpacity={0.1}
                />
                <stop
                  offset="100%"
                  stopColor={resolvedColor}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={resolvedColor}
              strokeWidth={1.5}
              fill={`url(#${gradientId})`}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
export default MetricCard;
