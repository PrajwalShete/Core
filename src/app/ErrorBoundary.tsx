import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. If anything below us throws on render, show a
 * cockpit-themed failure screen with a reload button instead of a blank
 * page. JARVIS-y "system fault — restart" feel.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // Logged so HMR / dev tools can pick it up.
    console.error('[Core] caught:', error);
  }

  reset = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-svh items-center justify-center bg-bg px-6">
          <div className="panel panel-ticks max-w-[min(440px,90vw)]">
            <div className="panel-head">
              <span className="panel-eyebrow text-accent">System Fault</span>
              <span className="panel-badge">Core / Recovery</span>
            </div>
            <div className="px-5 py-5">
              <div className="text-[1.2rem] font-bold tracking-[-0.02em] text-ink">
                Something went sideways.
              </div>
              <div className="mt-2 font-mono text-[0.72rem] tracking-[-0.005em] text-ink-soft">
                {this.state.error.message}
              </div>
              <button
                type="button"
                onClick={this.reset}
                className="mt-5 cursor-pointer border border-ink px-4 py-2 text-[0.7rem] font-semibold tracking-[0.22em] text-ink uppercase hover:bg-ink hover:text-bg"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
