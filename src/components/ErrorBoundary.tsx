import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    // If the error is a Vite dynamic import failure (stale cache), hard reload the page
    if (
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Importing a module script failed') ||
      error.name === 'ChunkLoadError'
    ) {
      const hasReloaded = sessionStorage.getItem('chunk_load_error_reloaded');
      
      if (!hasReloaded) {
        sessionStorage.setItem('chunk_load_error_reloaded', 'true');
        window.location.reload();
      } else {
        console.error('Already attempted to reload for chunk load error to prevent infinite loop.');
      }
    } else {
      // Clear the reload flag if a different error occurs
      sessionStorage.removeItem('chunk_load_error_reloaded');
    }
  }

  handleReset = () => {
    // If it's a chunk load error, the only way to recover is to reload the browser
    if (
      this.state.error?.message.includes('Failed to fetch dynamically imported module') ||
      this.state.error?.message.includes('Importing a module script failed') ||
      this.state.error?.name === 'ChunkLoadError'
    ) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2 text-foreground">
            Something went wrong
          </h2>
          <p className="text-muted-foreground max-w-md mb-6">
            {this.state.error?.message}
          </p>
          <pre className="text-left text-xs text-red-500 overflow-auto max-w-2xl bg-black/10 p-4 rounded mb-6">
            {this.state.error?.stack}
          </pre>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
