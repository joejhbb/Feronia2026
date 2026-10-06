import React, { type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidMount() {
    sessionStorage.removeItem('feronia_chunk_reloaded');
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
    if (
      error.message?.includes('dynamically imported module') ||
      error.message?.includes('Failed to fetch')
    ) {
      const reloaded = sessionStorage.getItem('feronia_chunk_reloaded');
      if (!reloaded) {
        sessionStorage.setItem('feronia_chunk_reloaded', 'true');
        window.location.reload();
        return;
      }
    }
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    localStorage.removeItem('feronia_current_role');
    window.location.reload();
  };

  private handleClearAllAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#04110A] text-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-[#071F11] border border-emerald-800/80 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">Temporary Interface Pause</h2>
              <p className="text-xs text-slate-300 mt-1">
                A rendering issue was detected. Click reload below to resume normal operation.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-black/50 p-3 rounded-xl border border-emerald-900/50 text-left overflow-x-auto max-h-40">
                <p className="text-xs font-mono text-red-400 break-all">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>
              <button
                type="button"
                onClick={this.handleClearAllAndReload}
                className="px-4 py-2.5 bg-black/40 hover:bg-black/60 text-slate-300 text-xs font-bold rounded-xl border border-emerald-900/50 transition-all cursor-pointer"
              >
                Reset Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
