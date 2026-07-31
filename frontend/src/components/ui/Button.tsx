import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children, className = '', ...props }: ButtonProps) {
  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'sf-v2-btn--primary';
      case 'secondary':
        return 'sf-v2-btn--secondary';
      case 'ghost':
        return 'sf-v2-btn--ghost';
      case 'danger':
        return 'sf-v2-btn--danger';
      default:
        return '';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'sf-v2-btn--sm';
      case 'md':
        return 'sf-v2-btn--md';
      case 'lg':
        return 'sf-v2-btn--lg';
      default:
        return '';
    }
  };

  return (
    <button
      className={`sf-v2-btn ${getVariantClass()} ${getSizeClass()} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export default Button;
