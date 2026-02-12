import React from 'react';
import { Card, Row, Col, Skeleton, Space } from 'antd';
import { useTheme } from '../contexts/ThemeContext';

const DashboardSkeleton: React.FC = () => {
  const { isDarkMode } = useTheme();
  
  const cardStyle = {
    background: isDarkMode ? '#1f1f1f' : '#ffffff',
    borderRadius: 12,
  };

  return (
    <div className="dashboard-skeleton">
      {/* Header Skeleton */}
      <div className="dashboard-header" style={{ marginBottom: 24 }}>
        <div className="header-left">
          <Skeleton.Input active style={{ width: 280, height: 36 }} />
          <Skeleton.Input active style={{ width: 320, height: 16, marginTop: 8 }} />
        </div>
        <Space>
          <Skeleton.Button active style={{ width: 150 }} />
          <Skeleton.Button active style={{ width: 40 }} />
          <Skeleton.Button active style={{ width: 40 }} />
          <Skeleton.Button active style={{ width: 40 }} />
        </Space>
      </div>

      {/* Main Stats Cards */}
      <Row gutter={[16, 16]}>
        {[1, 2, 3, 4].map(i => (
          <Col key={i} xs={24} sm={12} lg={6}>
            <Card style={cardStyle} bodyStyle={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Skeleton.Input active style={{ width: 100, height: 14, marginBottom: 12 }} />
                  <Skeleton.Input active style={{ width: 80, height: 36, marginBottom: 8 }} />
                  <Skeleton.Input active style={{ width: 140, height: 12 }} />
                </div>
                <Skeleton.Avatar active size={48} shape="square" style={{ borderRadius: 8 }} />
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* SLA Compliance Card Skeleton */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card 
            style={{ 
              ...cardStyle, 
              background: isDarkMode ? '#1f1f1f' : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' 
            }}
          >
            <Row align="middle" gutter={[24, 16]}>
              <Col xs={24} sm={8}>
                <Space size="large">
                  <Skeleton.Avatar active size={64} />
                  <div>
                    <Skeleton.Input active style={{ width: 120, height: 20, marginBottom: 8 }} />
                    <Skeleton.Input active style={{ width: 180, height: 14 }} />
                  </div>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <Skeleton.Input active style={{ width: '100%', height: 12, marginBottom: 12 }} />
                <Skeleton.Input active style={{ width: 200, height: 14 }} />
              </Col>
              <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                <Skeleton.Button active style={{ width: 180 }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Goal Progress Card Skeleton */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card style={cardStyle}>
            <Row gutter={[24, 16]} align="middle">
              <Col xs={24} md={8}>
                <Skeleton.Input active style={{ width: 150, height: 20, marginBottom: 8 }} />
                <Skeleton.Input active style={{ width: '100%', height: 8 }} />
              </Col>
              <Col xs={24} md={16}>
                <Row gutter={16}>
                  {[1, 2, 3].map(i => (
                    <Col key={i} xs={8}>
                      <Skeleton.Input active style={{ width: '100%', height: 60 }} />
                    </Col>
                  ))}
                </Row>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Charts Row Skeleton */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card 
            style={cardStyle}
            title={<Skeleton.Input active style={{ width: 180 }} />}
          >
            <div style={{ height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              {/* Fake chart bars */}
              <div style={{ display: 'flex', alignItems: 'flex-end', height: '100%', gap: 8, padding: '0 20px' }}>
                {[65, 45, 80, 55, 70, 40, 90, 60, 75, 50, 85, 45].map((h, i) => (
                  <div 
                    key={i} 
                    style={{ 
                      flex: 1, 
                      height: `${h}%`, 
                      background: isDarkMode 
                        ? 'linear-gradient(180deg, #3f3f46 0%, #27272a 100%)' 
                        : 'linear-gradient(180deg, #e5e7eb 0%, #d1d5db 100%)',
                      borderRadius: '4px 4px 0 0',
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }} 
                  />
                ))}
              </div>
              {/* X-axis labels */}
              <div style={{ display: 'flex', marginTop: 12, padding: '0 20px' }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <Skeleton.Input active style={{ width: 40, height: 12 }} />
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            style={cardStyle}
            title={<Skeleton.Input active style={{ width: 150 }} />}
          >
            <div style={{ 
              height: 300, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column'
            }}>
              {/* Fake pie chart */}
              <div style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: isDarkMode
                  ? 'conic-gradient(#3f3f46 0deg 90deg, #52525b 90deg 180deg, #71717a 180deg 270deg, #27272a 270deg 360deg)'
                  : 'conic-gradient(#e5e7eb 0deg 90deg, #d1d5db 90deg 180deg, #c0c4cc 180deg 270deg, #f3f4f6 270deg 360deg)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[1, 2, 3, 4].map(i => (
                  <Space key={i} size={4}>
                    <div style={{ 
                      width: 12, 
                      height: 12, 
                      borderRadius: 2, 
                      background: isDarkMode ? '#52525b' : '#d1d5db' 
                    }} />
                    <Skeleton.Input active style={{ width: 50, height: 12 }} />
                  </Space>
                ))}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Comparison & Heatmap Row Skeleton */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card style={cardStyle} title={<Skeleton.Input active style={{ width: 150 }} />}>
            <Row gutter={16}>
              {[1, 2].map(i => (
                <Col key={i} xs={12}>
                  <div style={{ 
                    padding: 16, 
                    background: isDarkMode ? '#27272a' : '#f9fafb', 
                    borderRadius: 8 
                  }}>
                    <Skeleton.Input active style={{ width: 100, height: 14, marginBottom: 8 }} />
                    <Skeleton.Input active style={{ width: 60, height: 28 }} />
                  </div>
                </Col>
              ))}
            </Row>
            <div style={{ marginTop: 16 }}>
              <Skeleton.Input active style={{ width: '100%', height: 80 }} />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card style={cardStyle} title={<Skeleton.Input active style={{ width: 140 }} />}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, 1fr)', 
              gap: 4,
              padding: 8
            }}>
              {Array(35).fill(0).map((_, i) => (
                <div 
                  key={i} 
                  style={{ 
                    aspectRatio: '1', 
                    background: isDarkMode ? '#27272a' : '#f3f4f6',
                    borderRadius: 2,
                    animation: 'pulse 1.5s ease-in-out infinite',
                    animationDelay: `${i * 0.02}s`
                  }} 
                />
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tabs Section Skeleton */}
      <Card style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`, marginBottom: 16 }}>
          <Space size={24}>
            {['Missed Leads', 'Team Leaderboard', 'By Channel', 'Revenue & ROI'].map((tab, i) => (
              <div 
                key={tab}
                style={{ 
                  padding: '12px 0',
                  borderBottom: i === 0 ? '2px solid #667eea' : 'none',
                  opacity: i === 0 ? 1 : 0.5
                }}
              >
                <Skeleton.Input active style={{ width: 100, height: 16 }} />
              </div>
            ))}
          </Space>
        </div>
        
        {/* Table skeleton inside tabs */}
        <div style={{ padding: '8px 0' }}>
          {/* Table header */}
          <div style={{ 
            display: 'flex', 
            gap: 16, 
            padding: '12px 16px',
            background: isDarkMode ? '#27272a' : '#fafafa',
            borderRadius: '8px 8px 0 0'
          }}>
            <Skeleton.Input active style={{ width: 150, height: 14 }} />
            <Skeleton.Input active style={{ width: 80, height: 14 }} />
            <Skeleton.Input active style={{ width: 100, height: 14 }} />
            <Skeleton.Input active style={{ width: 80, height: 14, marginLeft: 'auto' }} />
          </div>
          
          {/* Table rows */}
          {[1, 2, 3, 4, 5].map(i => (
            <div 
              key={i}
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 16, 
                padding: '16px',
                borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
              }}
            >
              <div style={{ width: 150 }}>
                <Skeleton.Input active style={{ width: 120, height: 16, marginBottom: 4 }} />
                <Skeleton.Input active style={{ width: 80, height: 12 }} />
              </div>
              <Skeleton.Button active size="small" style={{ width: 70 }} />
              <Skeleton.Input active style={{ width: 90, height: 16 }} />
              <Skeleton.Button active size="small" style={{ width: 80, marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </Card>

      {/* Benchmarks Footer Skeleton */}
      <Card size="small" style={{ ...cardStyle, marginTop: 16 }}>
        <Row align="middle" gutter={[16, 8]}>
          <Col>
            <Skeleton.Input active style={{ width: 140, height: 14 }} />
          </Col>
          {[1, 2, 3, 4].map(i => (
            <Col key={i}>
              <Skeleton.Button active size="small" style={{ width: 90 }} />
            </Col>
          ))}
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Skeleton.Input active style={{ width: 280, height: 12 }} />
          </Col>
        </Row>
      </Card>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .dashboard-skeleton .ant-skeleton-input,
        .dashboard-skeleton .ant-skeleton-button,
        .dashboard-skeleton .ant-skeleton-avatar {
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

export default DashboardSkeleton;
