import { Component } from 'react';

// Catches render errors below it. `resetKey` clears the error when it changes (e.g. on navigation).
// variant: "page" (whole app), "panel" (main area) or "compose" (compose windows).
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const { variant = 'panel' } = this.props;

    if (variant === 'compose') {
      return (
        <div role="alert" className="fixed right-6 bottom-6 z-40 flex items-center gap-4 rounded bg-[#202124] px-4 py-3 text-sm text-white shadow-lg">
          Compose hit a problem. Your drafts are saved.
          <button type="button" onClick={this.reset} className="cursor-pointer border-0 bg-transparent p-0 text-sm font-medium text-[#8ab4f8]">
            Reload
          </button>
        </div>
      );
    }

    return (
      <div role="alert" className={`grid place-items-center p-8 text-center text-ink ${variant === 'page' ? 'min-h-screen bg-surface' : 'h-full'}`}>
        <div className="max-w-md">
          <h1 className="m-0 mb-2 text-[22px] font-normal">Something went wrong</h1>
          <p className="m-0 mb-6 text-sm text-muted">
            {variant === 'page' ? 'The app hit an unexpected error.' : 'This part of the page hit an unexpected error.'}
            {error.message ? ` (${error.message})` : ''}
          </p>
          <div className="flex justify-center gap-2">
            {variant === 'panel' && (
              <button type="button" onClick={this.reset} className="h-9 cursor-pointer rounded-full border border-outline bg-transparent px-6 text-sm font-medium text-link hover:bg-link-tint">
                Try again
              </button>
            )}
            <button type="button" onClick={() => window.location.assign('/mail/inbox')} className="h-9 cursor-pointer rounded-full border-0 bg-primary px-6 text-sm font-medium text-on-primary hover:bg-primary-hover">
              Back to inbox
            </button>
          </div>
        </div>
      </div>
    );
  }
}
