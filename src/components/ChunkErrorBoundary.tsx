import React from 'react';

interface State {
  hasError: boolean;
}

export class ChunkErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Falha ao carregar a página:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="text-foreground">Não foi possível carregar esta página.</p>
        <button
          type="button"
          className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
          onClick={() => window.location.reload()}
        >
          Recarregar
        </button>
      </div>
    );
  }
}

export default ChunkErrorBoundary;
