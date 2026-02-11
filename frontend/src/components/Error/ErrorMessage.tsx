import React from 'react';
import { Alert, Button, Space } from 'antd';
import { ReloadOutlined, CloseCircleOutlined } from '@ant-design/icons';

interface ErrorMessageProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
  showRetry?: boolean;
  type?: 'error' | 'warning';
  closable?: boolean;
  onClose?: () => void;
}

/**
 * ErrorMessage - Inline error display with optional retry button
 * Use for form errors, API errors, or section-level errors
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message = 'Something went wrong',
  description,
  onRetry,
  showRetry = true,
  type = 'error',
  closable = true,
  onClose,
}) => {
  return (
    <Alert
      message={message}
      description={
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {description && <div>{description}</div>}
          
          {showRetry && onRetry && (
            <Button
              type="primary"
              danger={type === 'error'}
              icon={<ReloadOutlined />}
              onClick={onRetry}
              size="small"
            >
              Try Again
            </Button>
          )}
        </Space>
      }
      type={type}
      showIcon
      closable={closable}
      onClose={onClose}
      icon={<CloseCircleOutlined />}
      style={{
        borderRadius: '8px',
        marginBottom: '16px',
      }}
    />
  );
};

export default ErrorMessage;
