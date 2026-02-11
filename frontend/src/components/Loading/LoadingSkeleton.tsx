import React from 'react';
import { Skeleton, Card, Space } from 'antd';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'table' | 'profile' | 'workflow';
  count?: number;
  active?: boolean;
}

/**
 * LoadingSkeleton - Professional skeleton loaders for various content types
 * Used while data is being fetched to show content structure
 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  variant = 'card', 
  count = 1,
  active = true 
}) => {
  const renderSkeleton = () => {
    switch (variant) {
      case 'card':
        return (
          <Card
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <Skeleton active={active} avatar paragraph={{ rows: 3 }} />
          </Card>
        );

      case 'list':
        return (
          <div style={{ padding: '16px' }}>
            <Skeleton active={active} avatar paragraph={{ rows: 2 }} />
          </div>
        );

      case 'table':
        return (
          <div style={{ padding: '16px' }}>
            <Skeleton active={active} title paragraph={{ rows: 4 }} />
          </div>
        );

      case 'profile':
        return (
          <Card
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Skeleton.Avatar active={active} size={64} />
                <div style={{ flex: 1 }}>
                  <Skeleton active={active} paragraph={{ rows: 2 }} />
                </div>
              </div>
              <Skeleton active={active} paragraph={{ rows: 4 }} />
            </Space>
          </Card>
        );

      case 'workflow':
        return (
          <Card
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Workflow header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Skeleton.Input active={active} style={{ width: 200 }} />
                <Skeleton.Button active={active} />
              </div>
              
              {/* Workflow graph area */}
              <div style={{ 
                background: '#f5f5f5', 
                borderRadius: '8px', 
                padding: '24px',
                minHeight: '200px',
              }}>
                <Skeleton active={active} paragraph={{ rows: 3 }} />
              </div>
              
              {/* Workflow stats */}
              <div style={{ display: 'flex', gap: '16px' }}>
                <Skeleton.Input active={active} style={{ width: 100 }} />
                <Skeleton.Input active={active} style={{ width: 100 }} />
                <Skeleton.Input active={active} style={{ width: 100 }} />
              </div>
            </Space>
          </Card>
        );

      default:
        return <Skeleton active={active} />;
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </Space>
  );
};

export default LoadingSkeleton;
