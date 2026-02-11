import React from 'react';
import { Spin, Space, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LoadingSpinnerProps {
  message?: string;
  tip?: string;
  size?: 'small' | 'default' | 'large';
  centered?: boolean;
}

/**
 * LoadingSpinner - Centered spinner with optional message
 * Use for inline loading states or small sections
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message,
  tip,
  size = 'large',
  centered = true,
}) => {
  const iconSize = size === 'large' ? 48 : size === 'default' ? 32 : 24;
  const antIcon = <LoadingOutlined style={{ fontSize: iconSize, color: '#667eea' }} spin />;

  const content = (
    <Space direction="vertical" size="large" align="center">
      <Spin indicator={antIcon} size={size} />
      
      {message && (
        <Space direction="vertical" size="small" align="center">
          <Text strong style={{ fontSize: '16px', color: '#262626' }}>
            {message}
          </Text>
          
          {tip && (
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {tip}
            </Text>
          )}
        </Space>
      )}

      {/* Animated dots for visual feedback */}
      <div style={{ 
        display: 'flex', 
        gap: '8px',
        marginTop: '8px'
      }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              animation: `dotPulse 1.4s infinite ease-in-out`,
              animationDelay: `${i * 0.16}s`
            }}
          />
        ))}
      </div>

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
    </Space>
  );

  if (centered) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        padding: '40px',
      }}>
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
