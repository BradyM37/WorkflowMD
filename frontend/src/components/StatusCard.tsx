import React from 'react';
import { Card, Space, Typography, Button } from 'antd';
import { 
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface StatusCardProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
  closeable?: boolean;
  onClose?: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({
  type,
  title,
  message,
  actionText,
  onAction,
  closeable = false,
  onClose
}) => {
  const configs = {
    success: {
      icon: <CheckCircleOutlined style={{ fontSize: '48px', color: '#52c41a' }} />,
      gradient: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)',
      bgColor: '#f6ffed',
      borderColor: '#b7eb8f'
    },
    error: {
      icon: <CloseCircleOutlined style={{ fontSize: '48px', color: '#ff4d4f' }} />,
      gradient: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
      bgColor: '#fff2f0',
      borderColor: '#ffccc7'
    },
    warning: {
      icon: <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#faad14' }} />,
      gradient: 'linear-gradient(135deg, #faad14 0%, #ffc53d 100%)',
      bgColor: '#fffbe6',
      borderColor: '#ffe58f'
    },
    info: {
      icon: <InfoCircleOutlined style={{ fontSize: '48px', color: '#1890ff' }} />,
      gradient: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
      bgColor: '#e6f7ff',
      borderColor: '#91d5ff'
    }
  };

  const config = configs[type];

  return (
    <Card
      style={{
        background: config.bgColor,
        border: `2px solid ${config.borderColor}`,
        borderRadius: '16px',
        overflow: 'hidden',
        animation: 'slideIn 0.5s ease, celebrate 0.6s ease',
        position: 'relative'
      }}
    >
      {/* Gradient bar on top */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: config.gradient
      }} />

      <Space direction="vertical" size="large" style={{ width: '100%', marginTop: '8px' }}>
        <Space align="start" size="large" style={{ width: '100%' }}>
          <div style={{
            animation: 'float 3s ease-in-out infinite'
          }}>
            {config.icon}
          </div>
          
          <div style={{ flex: 1 }}>
            <Title level={3} style={{ margin: 0, marginBottom: '8px' }}>
              {title}
            </Title>
            <Text style={{ fontSize: '16px', lineHeight: '1.6', color: '#595959' }}>
              {message}
            </Text>
          </div>

          {closeable && onClose && (
            <Button 
              type="text" 
              icon={<CloseCircleOutlined />} 
              onClick={onClose}
              style={{ alignSelf: 'flex-start' }}
            />
          )}
        </Space>

        {actionText && onAction && (
          <div>
            <Button 
              type="primary"
              size="large"
              onClick={onAction}
              icon={<ArrowRightOutlined />}
              style={{
                background: config.gradient,
                border: 'none',
                boxShadow: `0 4px 12px ${config.borderColor}`
              }}
            >
              {actionText}
            </Button>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default StatusCard;
