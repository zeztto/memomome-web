import { Component, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { AppError, classifyError, logError } from '../utils/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: (error: AppError, resetError: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    const appError = classifyError(error);
    logError(appError, { source: 'ErrorBoundary' });
    return { hasError: true, error: appError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <CardTitle>오류가 발생했습니다</CardTitle>
                  <CardDescription>
                    애플리케이션에서 예상치 못한 오류가 발생했습니다
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">오류 내용:</p>
                <p className="text-sm text-muted-foreground">{this.state.error.message}</p>
              </div>

              {this.state.error.recoverable && (
                <div className="flex gap-2">
                  <Button onClick={this.resetError} className="flex-1">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    다시 시도
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="flex-1"
                  >
                    페이지 새로고침
                  </Button>
                </div>
              )}

              {!this.state.error.recoverable && (
                <Button onClick={() => window.location.reload()} className="w-full">
                  페이지 새로고침
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
