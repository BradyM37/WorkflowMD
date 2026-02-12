import React from 'react';
import { Card, Row, Col, Skeleton, Space } from 'antd';
import { useTheme } from '../contexts/ThemeContext';

interface PageSkeletonProps {
  type?: 'settings' | 'help' | 'generic';
}

const PageSkeleton: React.FC<PageSkeletonProps> = ({ type = 'generic' }) => {
  const { isDarkMode } = useTheme();
  
  const cardStyle = {
    background: isDarkMode ? '#1f1f1f' : '#ffffff',
    borderRadius: 12,
  };

  if (type === 'settings') {
    return (
      <div className="page-skeleton" style={{ padding: 24 }}>
        {/* Header */}
        <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
          <Skeleton.Input active style={{ width: 200, height: 32 }} />
          <Skeleton.Input active style={{ width: 300, height: 16 }} />
        </Space>

        {/* Profile Card */}
        <Card style={{ ...cardStyle, marginBottom: 16 }}>
          <Space size="large">
            <Skeleton.Avatar active size={64} />
            <div>
              <Skeleton.Input active style={{ width: 150, height: 20, marginBottom: 8 }} />
              <Skeleton.Input active style={{ width: 200, height: 14 }} />
            </div>
          </Space>
        </Card>

        {/* Settings Tabs */}
        <Card style={cardStyle}>
          <div style={{ borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`, marginBottom: 24, paddingBottom: 12 }}>
            <Space size={24}>
              {[1, 2, 3, 4].map(i => (
                <Skeleton.Button key={i} active style={{ width: 80 }} />
              ))}
            </Space>
          </div>
          
          {/* Setting rows */}
          {[1, 2, 3, 4, 5].map(i => (
            <Row key={i} justify="space-between" align="middle" style={{ padding: '16px 0', borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}` }}>
              <Col>
                <Skeleton.Input active style={{ width: 120, height: 16, marginBottom: 4 }} />
                <Skeleton.Input active style={{ width: 200, height: 12 }} />
              </Col>
              <Col>
                <Skeleton.Button active style={{ width: 44, height: 22 }} />
              </Col>
            </Row>
          ))}
        </Card>

        <style>{`
          .page-skeleton .ant-skeleton-input,
          .page-skeleton .ant-skeleton-button,
          .page-skeleton .ant-skeleton-avatar {
            background: ${isDarkMode 
              ? 'linear-gradient(90deg, #27272a 25%, #3f3f46 37%, #27272a 63%)' 
              : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)'} !important;
            background-size: 400% 100% !important;
            animation: skeleton-loading 1.4s ease infinite !important;
          }
          
          @keyframes skeleton-loading {
            0% { background-position: 100% 50%; }
            100% { background-position: 0 50%; }
          }
        `}</style>
      </div>
    );
  }

  if (type === 'help') {
    return (
      <div className="page-skeleton" style={{ padding: 24 }}>
        {/* Header */}
        <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
          <Skeleton.Input active style={{ width: 180, height: 32 }} />
          <Skeleton.Input active style={{ width: 400, height: 16 }} />
        </Space>

        {/* FAQ Accordion */}
        <Card style={cardStyle}>
          {[1, 2, 3, 4, 5].map(i => (
            <div 
              key={i} 
              style={{ 
                padding: '16px 0', 
                borderBottom: i < 5 ? `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}` : 'none' 
              }}
            >
              <Space>
                <Skeleton.Avatar active size={20} shape="square" />
                <Skeleton.Input active style={{ width: 250 + Math.random() * 100, height: 18 }} />
              </Space>
            </div>
          ))}
        </Card>

        {/* Contact Card */}
        <Card style={{ ...cardStyle, marginTop: 16 }}>
          <Skeleton.Input active style={{ width: 150, height: 20, marginBottom: 16 }} />
          <Row gutter={[16, 16]}>
            {[1, 2, 3].map(i => (
              <Col key={i} xs={24} sm={8}>
                <div style={{ 
                  padding: 16, 
                  background: isDarkMode ? '#27272a' : '#f9fafb', 
                  borderRadius: 8,
                  textAlign: 'center'
                }}>
                  <Skeleton.Avatar active size={40} style={{ marginBottom: 12 }} />
                  <Skeleton.Input active style={{ width: 80, height: 14, marginBottom: 8 }} />
                  <Skeleton.Input active style={{ width: 120, height: 12 }} />
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        <style>{`
          .page-skeleton .ant-skeleton-input,
          .page-skeleton .ant-skeleton-button,
          .page-skeleton .ant-skeleton-avatar {
            background: ${isDarkMode 
              ? 'linear-gradient(90deg, #27272a 25%, #3f3f46 37%, #27272a 63%)' 
              : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)'} !important;
            background-size: 400% 100% !important;
            animation: skeleton-loading 1.4s ease infinite !important;
          }
          
          @keyframes skeleton-loading {
            0% { background-position: 100% 50%; }
            100% { background-position: 0 50%; }
          }
        `}</style>
      </div>
    );
  }

  // Generic page skeleton
  return (
    <div className="page-skeleton" style={{ padding: 24 }}>
      <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
        <Skeleton.Input active style={{ width: 200, height: 32 }} />
        <Skeleton.Input active style={{ width: 350, height: 16 }} />
      </Space>

      <Row gutter={[16, 16]}>
        {[1, 2, 3].map(i => (
          <Col key={i} xs={24} sm={8}>
            <Card style={cardStyle}>
              <Skeleton active paragraph={{ rows: 3 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ ...cardStyle, marginTop: 16 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>

      <style>{`
        .page-skeleton .ant-skeleton-input,
        .page-skeleton .ant-skeleton-button,
        .page-skeleton .ant-skeleton-avatar {
          background: ${isDarkMode 
            ? 'linear-gradient(90deg, #27272a 25%, #3f3f46 37%, #27272a 63%)' 
            : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)'} !important;
          background-size: 400% 100% !important;
          animation: skeleton-loading 1.4s ease infinite !important;
        }
        
        @keyframes skeleton-loading {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>
    </div>
  );
};

export default PageSkeleton;
