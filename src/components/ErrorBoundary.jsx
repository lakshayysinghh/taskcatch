import React from 'react';

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
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center p-6 bg-[#0a0b08] text-[#e4e4de]"
      >
        <div className="w-full max-w-md rounded-2xl border border-[rgba(239,68,68,0.3)] bg-[rgba(19,20,16,0.95)] p-6 space-y-4">
          <h1 className="text-lg font-bold text-[#f2f2ec]">Something went wrong</h1>
          <p className="text-sm text-[#a5a99a]">
            TaskCatch hit an unexpected error. Your saved tasks are not affected.
          </p>
          <pre className="text-xs font-mono text-[#ff9b9b] bg-[rgba(0,0,0,0.35)] rounded-lg p-3 whitespace-pre-wrap break-words max-h-40 overflow-auto">
            {String(error?.message || error)}
          </pre>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => this.setState({ error: null })}
              className="px-4 py-2 text-xs font-medium rounded-lg border border-[rgba(168,173,122,0.3)] text-[#d5d6cd] hover:bg-[rgba(168,173,122,0.1)]"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-[#0b0c0a] bg-[#a8ad7a] hover:opacity-90"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
