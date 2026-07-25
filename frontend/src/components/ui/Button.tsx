import React from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClass: Record<Variant, string> = {
  primary: 'sf-v2-btn--primary',
  secondary: 'sf-v2-btn--secondary',
  ghost: 'sf-v2-btn--ghost',
  danger: 'sf-v2-btn--danger',
};

const sizeClass: Record<Size, string> = {
  sm: 'sf-v2-btn--sm',
  md: 'sf-v2-btn--md',
  lg: 'sf-v2-btn--lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn('sf-v2-btn', variantClass[variant], sizeClass[size], className)}
      {...props}
    >
      {children}
    </button>
  )
);

Button.displayName = 'Button';
export default Button;
