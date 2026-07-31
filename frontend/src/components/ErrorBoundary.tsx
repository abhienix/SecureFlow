import React, { Component } from 'react';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render errors in the subtree and shows a recovery UI
 * instead of a blank white screen. Each route should be wrapped.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="sf-v2-error-boundary">
          <div className="sf-v2-error-boundary__icon">⚠️</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--sf-ink)' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, maxWidth: 400, color: 'var(--sf-ink-mid)' }}>
            {this.state.error?.message || 'An unexpected error occurred in this view.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--sf-radius)',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--sf-accent)',
              color: '#fff',
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
