import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography, Card, Space } from 'antd';
import { BugOutlined, ReloadOutlined, HomeOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component - Graceful error handling
 * Catches JavaScript errors anywhere in child component tree
 * Displays fallback UI and logs error details
 * 
 * Usage:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you'd send this to an error reporting service
    // like Sentry, LogRocket, etc.
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error, { extra: errorInfo });
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Placeholder for error logging service integration
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.log('Error logged:', errorData);
    
    // TODO: Send to error tracking service
    // fetch('/api/log-error', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(errorData),
    // });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    this.handleReset();
    window.location.href = '/dashboard';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI - Styled like Linear/Notion
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '24px',
        }}>
          <Card
            style={{
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              borderRadius: '12px',
            }}
          >
            <Result
              status="error"
              icon={<BugOutlined style={{ fontSize: '64px', color: '#ff4d4f' }} />}
              title="Oops! Something went wrong"
              subTitle="We're sorry for the inconvenience. The error has been logged and we'll look into it."
              extra={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space style={{ width: '100%', justifyContent: 'center' }}>
                    <Button
                      type="primary"
                      size="large"
                      icon={<HomeOutlined />}
                      onClick={this.handleGoHome}
                    >
                      Go to Dashboard
                    </Button>
                    <Button
                      size="large"
                      icon={<ReloadOutlined />}
                      onClick={this.handleReload}
                    >
                      Reload Page
                    </Button>
                  </Space>
                  
                  {process.env.NODE_ENV === 'development' && this.state.error && (
                    <Card
                      size="small"
                      style={{ marginTop: '24px', textAlign: 'left' }}
                      title={
                        <Text strong style={{ fontSize: '14px' }}>
                          🔧 Debug Info (Development Only)
                        </Text>
                      }
                    >
                      <Paragraph>
                        <Text strong>Error:</Text>
                        <br />
                        <Text code copyable style={{ fontSize: '12px' }}>
                          {this.state.error.message}
                        </Text>
                      </Paragraph>
                      
                      {this.state.error.stack && (
                        <Paragraph>
                          <Text strong>Stack Trace:</Text>
                          <br />
                          <pre style={{
                            fontSize: '11px',
                            background: '#f5f5f5',
                            padding: '12px',
                            borderRadius: '4px',
                            overflow: 'auto',
                            maxHeight: '200px',
                          }}>
                            {this.state.error.stack}
                          </pre>
                        </Paragraph>
                      )}

                      {this.state.errorInfo && (
                        <Paragraph>
                          <Text strong>Component Stack:</Text>
                          <br />
                          <pre style={{
                            fontSize: '11px',
                            background: '#f5f5f5',
                            padding: '12px',
                            borderRadius: '4px',
                            overflow: 'auto',
                            maxHeight: '150px',
                          }}>
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </Paragraph>
                      )}
                    </Card>
                  )}
                </Space>
              }
            />
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
