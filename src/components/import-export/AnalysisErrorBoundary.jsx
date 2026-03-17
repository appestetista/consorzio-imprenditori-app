import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default class AnalysisErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[AnalysisErrorBoundary] Caught:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 my-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400 font-bold text-sm">Errore nel rendering dei risultati</p>
          </div>
          <p className="text-slate-400 text-xs">{this.state.error?.message || 'Si è verificato un errore imprevisto.'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-3 text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Riprova
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}