'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Canvas-specific error boundary that provides recovery options
 * without crashing the entire application
 */
export class CanvasErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging (in production, send to error tracking service)
    console.error('[Canvas Error]', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-[#212121] p-8">
          <div className="max-w-md w-full bg-[#2a2a2a] rounded-2xl border border-[#4d4d4d] p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-[#ececec] mb-3">
              Something went wrong
            </h2>
            
            <p className="text-[#b4b4b4] text-sm mb-6">
              The canvas encountered an error. Your data is safe - try recovering or reload the page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="text-[#8e8e8e] text-xs cursor-pointer hover:text-[#b4b4b4] transition-colors">
                  Error details (dev only)
                </summary>
                <pre className="mt-2 p-3 bg-[#1a1a1a] rounded-lg text-xs text-red-400 overflow-auto max-h-32">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReset}
                className="bg-[#00D5FF] hover:bg-[#00B8E6] text-[#0d0d0d] rounded-lg font-medium"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try to Recover
              </Button>
              
              <Button
                onClick={this.handleReload}
                variant="outline"
                className="border-[#4d4d4d] text-[#ececec] hover:bg-[#3a3a3a] rounded-lg"
              >
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
