import React from 'react';
import { Empty, Button, Space, Typography } from 'antd';
import { 
  InboxOutlined,
  FileSearchOutlined,
  RocketOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface EmptyStateProps {
  type?: 'workflows' | 'history' | 'search' | 'generic';
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'generic',
  title,
  description,
  actionText,
  onAction,
  icon
}) => {
  // Default configurations based on type
  const configs = {
    workflows: {
      icon: <RocketOutlined style={{ fontSize: '64px', color: '#667eea' }} />,
      title: 'No Workflows Found',
      description: 'Connect your GoHighLevel account to start analyzing workflows',
      actionText: 'Connect GHL Account'
    },
    history: {
      icon: <FileSearchOutlined style={{ fontSize: '64px', color: '#667eea' }} />,
      title: 'No Analysis History',
      description: 'Run your first workflow analysis to see results here',
      actionText: 'Analyze a Workflow'
    },
    search: {
      icon: <InboxOutlined style={{ fontSize: '64px', color: '#8c8c8c' }} />,
      title: 'No Results Found',
      description: 'Try adjusting your search or filter criteria',
      actionText: 'Clear Filters'
    },
    generic: {
      icon: <ThunderboltOutlined style={{ fontSize: '64px', color: '#667eea' }} />,
      title: 'Nothing Here Yet',
      description: 'Get started by taking your first action',
      actionText: 'Get Started'
    }
  };

  const config = configs[type];
  const finalIcon = icon || config.icon;
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalActionText = actionText || config.actionText;

  return (
    <div 
      style={{
        padding: '80px 20px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, rgba(102, 126, 234, 0.03) 0%, transparent 100%)',
        borderRadius: '16px',
        minHeight: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <Space direction="vertical" size="large" align="center" style={{ maxWidth: '500px' }}>
        <div 
          style={{
            animation: 'float 3s ease-in-out infinite'
          }}
        >
          {finalIcon}
        </div>
        
        <Space direction="vertical" size="small" align="center">
          <Title level={3} style={{ margin: 0 }}>
            {finalTitle}
          </Title>
          <Text type="secondary" style={{ fontSize: '16px', color: '#8c8c8c' }}>
            {finalDescription}
          </Text>
        </Space>

        {onAction && (
          <Button 
            type="primary" 
            size="large"
            onClick={onAction}
            style={{
              marginTop: '16px',
              height: '48px',
              padding: '0 32px',
              fontSize: '16px',
              fontWeight: 600
            }}
          >
            {finalActionText}
          </Button>
        )}

        {/* Decorative elements */}
        <div style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%)',
          zIndex: -1,
          animation: 'pulse 3s ease-in-out infinite'
        }} />
      </Space>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default EmptyState;
