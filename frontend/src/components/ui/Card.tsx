import React from 'react';
import { cn } from '../../lib/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover = false, className, children, ...props }: CardProps) {
  return (
    <div className={cn('sf-v2-card', hover && 'sf-v2-card--hover', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="sf-v2-card__header">
      <div>
        <div className="sf-v2-card__title">{title}</div>
        {subtitle && <div className="sf-v2-card__subtitle">{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

export default Card;
