import React from 'react';
import { Button } from './ui/Button';

/**
 * Catches render errors anywhere below it so one broken component shows a
 * recoverable message instead of unmounting the whole app to a blank window.
 * Task data lives in the backend store, so reloading does not lose anything.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[TaskCatch] UI error:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-canvas p-6 text-ink">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-danger/25 bg-surface p-6 shadow-pop">
          <h1 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">Something went wrong</h1>
          <p className="text-[13.5px] leading-relaxed text-ink-2">
            TaskCatch hit an unexpected error. Your saved tasks are not affected.
          </p>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-line bg-black/30 p-3 font-mono text-[12px] text-danger">
            {String(error?.message || error)}
          </pre>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => this.setState({ error: null })}>
              Try again
            </Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
