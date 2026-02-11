import React, { useState } from 'react';
import { Result, Button, Card, Typography, Collapse, Space } from 'antd';
import { 
  CloseCircleOutlined, 
  HomeOutlined, 
  ReloadOutlined,
  DownOutlined,
  UpOutlined 
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface ErrorPageProps {
  error?: Error;
  errorInfo?: React.ErrorInfo;
  message?: string;
  onRetry?: () => void;
  showHomeButton?: boolean;
  showRetryButton?: boolean;
}

/**
 * ErrorPage - Full page error display
 * Use for critical errors, 404s, or when entire page fails to load
 */
const ErrorPage: React.FC<ErrorPageProps> = ({
  error,
  errorInfo,
  message = 'Something went wrong',
  onRetry,
  showHomeButton = true,
  showRetryButton = true,
}) => {
  const navigate = useNavigate();
  const [detailsVisible, setDetailsVisible] = useState(false);

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleReload = () => {
    window.location.reload();
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      handleReload();
    }
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
      padding: '24px',
    }}>
      <Card
        style={{
          maxWidth: '700px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          borderRadius: '16px',
          border: 'none',
        }}
      >
        <Result
          icon={
            <CloseCircleOutlined 
              style={{ 
                fontSize: '72px', 
                color: '#ff4d4f',
                filter: 'drop-shadow(0 4px 8px rgba(255, 77, 79, 0.2))'
              }} 
            />
          }
          title={
            <Text strong style={{ fontSize: '24px', color: '#262626' }}>
              Oops! Something went wrong
            </Text>
          }
          subTitle={
            <Space direction="vertical" size="small" style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}>
                {message}
              </Text>
              <Text type="secondary" style={{ fontSize: '14px' }}>
                We're sorry for the inconvenience. The error has been logged and we'll look into it.
              </Text>
            </Space>
          }
          extra={
            <Space direction="vertical" size="large" style={{ width: '100%', marginTop: '24px' }}>
              {/* Action buttons */}
              <Space style={{ width: '100%', justifyContent: 'center' }} wrap>
                {showHomeButton && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<HomeOutlined />}
                    onClick={handleGoHome}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      border: 'none',
                      borderRadius: '8px',
                    }}
                  >
                    Go Home
                  </Button>
                )}
                
                {showRetryButton && (
                  <Button
                    size="large"
                    icon={<ReloadOutlined />}
                    onClick={handleRetry}
                    style={{
                      borderRadius: '8px',
                    }}
                  >
                    Try Again
                  </Button>
                )}
              </Space>

              {/* Error details (collapsible) - always show in development */}
              {(error || errorInfo) && (
                <div style={{ textAlign: 'left', width: '100%' }}>
                  <Button
                    type="link"
                    onClick={() => setDetailsVisible(!detailsVisible)}
                    icon={detailsVisible ? <UpOutlined /> : <DownOutlined />}
                    style={{ padding: 0, height: 'auto' }}
                  >
                    {detailsVisible ? 'Hide' : 'Show'} Error Details
                    {isDevelopment && ' (Debug Info)'}
                  </Button>

                  {detailsVisible && (
                    <Card
                      size="small"
                      style={{ 
                        marginTop: '16px',
                        background: '#fafafa',
                        border: '1px solid #d9d9d9',
                        borderRadius: '8px',
                      }}
                    >
                      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                        {error && (
                          <div>
                            <Text strong style={{ fontSize: '13px' }}>
                              Error Message:
                            </Text>
                            <Paragraph
                              copyable
                              style={{
                                marginTop: '8px',
                                marginBottom: 0,
                                padding: '12px',
                                background: '#fff',
                                border: '1px solid #d9d9d9',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                                wordBreak: 'break-word',
                              }}
                            >
                              {error.message}
                            </Paragraph>
                          </div>
                        )}

                        {error?.stack && isDevelopment && (
                          <div>
                            <Text strong style={{ fontSize: '13px' }}>
                              Stack Trace:
                            </Text>
                            <pre style={{
                              marginTop: '8px',
                              padding: '12px',
                              background: '#fff',
                              border: '1px solid #d9d9d9',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              overflow: 'auto',
                              maxHeight: '200px',
                              wordBreak: 'break-all',
                              whiteSpace: 'pre-wrap',
                            }}>
                              {error.stack}
                            </pre>
                          </div>
                        )}

                        {errorInfo?.componentStack && isDevelopment && (
                          <div>
                            <Text strong style={{ fontSize: '13px' }}>
                              Component Stack:
                            </Text>
                            <pre style={{
                              marginTop: '8px',
                              padding: '12px',
                              background: '#fff',
                              border: '1px solid #d9d9d9',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              overflow: 'auto',
                              maxHeight: '150px',
                              wordBreak: 'break-all',
                              whiteSpace: 'pre-wrap',
                            }}>
                              {errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </Space>
                    </Card>
                  )}
                </div>
              )}
            </Space>
          }
        />
      </Card>
    </div>
  );
};

export default ErrorPage;
