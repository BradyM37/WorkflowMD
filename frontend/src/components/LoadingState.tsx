import React from 'react';
import { Spin, Space, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LoadingStateProps {
  message?: string;
  tip?: string;
  fullscreen?: boolean;
  size?: 'small' | 'default' | 'large';
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = 'Loading...', 
  tip,
  fullscreen = false,
  size = 'large'
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 48 : size === 'default' ? 32 : 24 }} spin />;

  const content = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: fullscreen ? '100vh' : '400px',
      padding: '40px'
    }}>
      <Space direction="vertical" size="large" align="center">
        <Spin indicator={antIcon} size={size} />
        
        <Space direction="vertical" size="small" align="center">
          <Text strong style={{ fontSize: '18px', color: '#667eea' }}>
            {message}
          </Text>
          
          {tip && (
            <Text type="secondary" style={{ fontSize: '14px', color: '#8c8c8c' }}>
              {tip}
            </Text>
          )}
        </Space>

        {/* Animated dots */}
        <div style={{ 
          display: 'flex', 
          gap: '8px',
          marginTop: '16px'
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                animation: `dotPulse 1.4s infinite ease-in-out`,
                animationDelay: `${i * 0.16}s`
              }}
            />
          ))}
        </div>
      </Space>

      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.5;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );

  if (fullscreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingState;
