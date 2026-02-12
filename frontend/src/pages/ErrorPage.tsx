import React from 'react';
import { Result, Button, Space } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeOutlined, ReloadOutlined, ArrowLeftOutlined } from '@ant-design/icons';

interface ErrorPageProps {
  status?: '404' | '500' | '403' | 'error';
  title?: string;
  subTitle?: string;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ 
  status = '404', 
  title,
  subTitle 
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const errorConfig = {
    '404': {
      title: title || 'Page Not Found',
      subTitle: subTitle || "Sorry, the page you're looking for doesn't exist or has been moved.",
    },
    '500': {
      title: title || 'Server Error',
      subTitle: subTitle || "Something went wrong on our end. Please try again later.",
    },
    '403': {
      title: title || 'Access Denied',
      subTitle: subTitle || "You don't have permission to access this page.",
    },
    'error': {
      title: title || 'Something Went Wrong',
      subTitle: subTitle || "An unexpected error occurred. Please try again.",
    },
  };

  const config = errorConfig[status] || errorConfig['error'];

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '60vh',
      padding: '24px'
    }}>
      <Result
        status={status === 'error' ? 'error' : status}
        title={config.title}
        subTitle={config.subTitle}
        extra={
          <Space wrap style={{ justifyContent: 'center' }}>
            <Button 
              type="primary" 
              icon={<HomeOutlined />}
              onClick={handleGoHome}
            >
              Go to Dashboard
            </Button>
            <Button 
              icon={<ArrowLeftOutlined />}
              onClick={handleGoBack}
            >
              Go Back
            </Button>
            {(status === '500' || status === 'error') && (
              <Button 
                icon={<ReloadOutlined />}
                onClick={handleRetry}
              >
                Try Again
              </Button>
            )}
          </Space>
        }
      />
    </div>
  );
};

export default ErrorPage;
