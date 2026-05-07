import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary]', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 p-8">
          <AlertTriangle className="w-10 h-10" style={{ color: 'var(--ink-3)' }} />
          <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
            Algo deu errado ao carregar esta página.
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border"
              style={{ borderColor: 'var(--border)', color: 'var(--ink-1)' }}
            >
              <RefreshCw className="w-4 h-4" />
              Tentar novamente
            </button>
            <button
              onClick={this.handleReload}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg text-white"
              style={{ background: 'var(--accent)' }}
            >
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
