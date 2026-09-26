import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** The route, where the boundary can read it: a new one clears the error screen, so leaving the page leaves it. */
  resetKey?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Render error boundary, at the top of the app and again around the routes,
 * where it can see the route and let go on navigation. Without one, any
 * uncaught error during render or in an effect unmounts the whole React tree
 * and the user sees a blank page with nothing to act on.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught render error:", error, info.componentStack);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
    // Only an error already on screen is cleared: one thrown by the render that
    // moved the key is the new page's own, and clearing it would only throw again.
    if (prevState.error && prevProps.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        className="min-h-screen bg-background flex items-center justify-center px-6"
        role="alert"
      >
        <div className="max-w-md text-center">
          <p className="font-label text-xs tracking-[0.2em] uppercase text-primary/80 mb-3">
            Something went wrong
          </p>
          <h1 className="font-display text-3xl leading-tight mb-3">
            This page hit an unexpected error
          </h1>
          <p className="text-muted-foreground text-sm mb-6 break-words">{error.message}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-sm text-primary hover:underline font-label"
            >
              Reload
            </button>
            <span className="text-muted-foreground/40">·</span>
            <a href="/" className="text-sm text-primary hover:underline font-label">
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
