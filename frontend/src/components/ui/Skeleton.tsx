import React from 'react';
import { cn } from '../../lib/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: number | string;
  height?: number | string;
  rounded?: string;
}

export function Skeleton({ width, height, rounded, className, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('sf-v2-skeleton', className)}
      style={{ width, height, borderRadius: rounded, ...style }}
      {...props}
    />
  );
}

/** A skeleton placeholder for a metric card */
export function MetricSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Skeleton width={80} height={12} />
      <Skeleton width={60} height={28} />
      <Skeleton width={50} height={12} />
    </div>
  );
}

/** A skeleton placeholder for a row in a table */
export function RowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '10px 14px' }}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} width={`${100 / columns}%`} height={14} />
      ))}
    </div>
  );
}

export default Skeleton;
