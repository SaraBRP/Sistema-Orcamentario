import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearStorage = () => {
    if (window.confirm('Deseja limpar os dados temporários locais para restaurar a página?')) {
      try {
        localStorage.clear();
      } catch (e) {}
      window.location.href = '/';
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 font-sans">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-xl w-full p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-700 pb-4">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h1 className="text-lg font-bold text-white">Ocorreu um erro ao carregar a página</h1>
                <p className="text-xs text-slate-400">O sistema capturou a exceção e impediu a tela em branco.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl font-mono text-xs text-rose-300 overflow-x-auto border border-rose-950/60 max-h-48 overflow-y-auto">
              <p className="font-bold">{this.state.error?.toString()}</p>
              {this.state.errorInfo && (
                <pre className="text-[10px] text-slate-400 mt-2 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                onClick={this.handleClearStorage}
                className="px-4 py-2 text-xs font-semibold text-rose-300 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-xl transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Limpar Cache Local
              </button>

              <a
                href="/"
                className="px-4 py-2 text-xs font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-xl transition flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Voltar ao Início
              </a>

              <button
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Página
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
