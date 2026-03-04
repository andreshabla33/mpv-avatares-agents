import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-[#050508] flex items-center justify-center font-mono">
          <div className="bg-[#0a0a14] border border-[#e74c3c44] rounded-xl p-8 max-w-md text-center space-y-4">
            <div className="text-4xl">⚠</div>
            <h1 className="text-[#e74c3c] text-lg font-bold tracking-wider">SYSTEM ERROR</h1>
            <p className="text-[#8a8aaa] text-xs leading-relaxed">
              El dashboard encontró un error inesperado. Esto no afecta a los agentes de IA — siguen operando normalmente.
            </p>
            <pre className="text-[9px] text-[#4a4a6a] bg-[#050508] p-3 rounded border border-[#1a1a2e] text-left overflow-auto max-h-32">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-[#4ecdc4]/10 text-[#4ecdc4] border border-[#4ecdc4]/30 rounded-md text-xs font-bold tracking-wider hover:bg-[#4ecdc4]/20 transition-all"
            >
              RECARGAR DASHBOARD
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
