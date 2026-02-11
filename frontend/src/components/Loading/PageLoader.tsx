import React from 'react';
import { Spin, Space, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface PageLoaderProps {
  message?: string;
  tip?: string;
}

/**
 * PageLoader - Full page loading state
 * Use for initial page loads or major transitions
 */
const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = 'Loading...', 
  tip 
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: 64, color: '#667eea' }} spin />;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
      backdropFilter: 'blur(10px)',
      zIndex: 9999,
    }}>
      <Space direction="vertical" size="large" align="center" style={{ padding: '40px' }}>
        {/* Logo or brand icon could go here */}
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
          animation: 'pulse 2s ease-in-out infinite',
        }}>
          <Spin indicator={antIcon} size="large" />
        </div>

        <Space direction="vertical" size="small" align="center">
          <Title level={3} style={{ margin: 0, color: '#262626' }}>
            {message}
          </Title>
          
          {tip && (
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {tip}
            </Text>
          )}
        </Space>

        {/* Animated progress bar */}
        <div style={{ 
          width: '200px', 
          height: '4px', 
          background: 'rgba(0,0,0,0.1)', 
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
            animation: 'loadingBar 2s ease-in-out infinite',
          }} />
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.05);
              opacity: 0.9;
            }
          }
          
          @keyframes loadingBar {
            0% {
              width: 0%;
              transform: translateX(0);
            }
            50% {
              width: 100%;
              transform: translateX(0);
            }
            100% {
              width: 100%;
              transform: translateX(100%);
            }
          }
        `}</style>
      </Space>
    </div>
  );
};

export default PageLoader;
