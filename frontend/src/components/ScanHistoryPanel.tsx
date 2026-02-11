import React from 'react';
import {
  Card,
  Typography,
  Timeline,
  Space,
  Tag,
  Empty,
  Button,
  Row,
  Col,
  Statistic,
  Avatar,
  Badge,
  Tooltip
} from 'antd';
import {
  HistoryOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  LineOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Text } = Typography;

interface ScanRecord {
  id: string;
  workflow_name: string;
  workflow_id: string;
  health_score: number;
  grade: string;
  issues_found: number;
  created_at: string;
}

interface ScanHistoryPanelProps {
  history: ScanRecord[];
  onClearHistory?: () => void;
}

const ScanHistoryPanel: React.FC<ScanHistoryPanelProps> = ({ history, onClearHistory }) => {
  // Helper function for health score colors
  const getHealthColor = (score: number): string => {
    if (score >= 90) return '#52c41a';  // Excellent - green
    if (score >= 70) return '#1890ff';  // Good - blue
    if (score >= 50) return '#faad14';  // Needs Attention - yellow
    if (score >= 30) return '#fa8c16';  // High Risk - orange
    return '#ff4d4f';                   // Critical - red
  };

  // Helper function for health score labels
  const getHealthLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Attention';
    if (score >= 30) return 'High Risk';
    return 'Critical';
  };

  // Calculate trends
  const calculateTrend = () => {
    if (history.length < 2) return { direction: 'stable', value: 0 };
    
    const recent = history.slice(0, 5);
    const avgRecent = recent.reduce((acc, h) => acc + h.health_score, 0) / recent.length;
    
    const older = history.slice(5, 10);
    if (older.length === 0) return { direction: 'stable', value: 0 };
    
    const avgOlder = older.reduce((acc, h) => acc + h.health_score, 0) / older.length;
    const diff = Math.round(avgRecent - avgOlder);
    
    if (diff > 5) return { direction: 'up', value: diff };
    if (diff < -5) return { direction: 'down', value: Math.abs(diff) };
    return { direction: 'stable', value: 0 };
  };

  const trend = calculateTrend();

  const todayScans = history.filter(h => 
    dayjs(h.created_at).isSame(dayjs(), 'day')
  ).length;

  const weekScans = history.filter(h => 
    dayjs(h.created_at).isAfter(dayjs().subtract(7, 'day'))
  ).length;

  const avgHealthScore = history.length > 0
    ? Math.round(history.reduce((acc, h) => acc + h.health_score, 0) / history.length)
    : 0;

  if (history.length === 0) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No scan history yet"
          style={{ padding: '48px 0' }}
        >
          <Text type="secondary" style={{ color: '#8c8c8c' }}>
            Run your first workflow analysis to see results here
          </Text>
        </Empty>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Stats Overview */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Total Scans"
              value={history.length}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#667eea', fontSize: '24px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Today"
              value={todayScans}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a', fontSize: '24px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="This Week"
              value={weekScans}
              prefix={<HistoryOutlined />}
              valueStyle={{ color: '#1890ff', fontSize: '24px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card>
            <Statistic
              title="Avg Health"
              value={avgHealthScore}
              suffix="/100"
              prefix={
                trend.direction === 'up' ? <RiseOutlined /> :
                trend.direction === 'down' ? <FallOutlined /> :
                <LineOutlined />
              }
              valueStyle={{ 
                color: getHealthColor(avgHealthScore),
                fontSize: '24px'
              }}
            />
            {trend.value > 0 && (
              <Text 
                type="secondary" 
                style={{ 
                  fontSize: '12px',
                  color: trend.direction === 'up' ? '#52c41a' : '#ff4d4f'
                }}
              >
                {trend.direction === 'up' ? '↑' : '↓'} {trend.value} pts
              </Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* Timeline */}
      <Card
        title={
          <Space>
            <HistoryOutlined />
            <span>Scan Timeline</span>
            <Badge count={history.length} />
          </Space>
        }
        extra={
          onClearHistory && (
            <Tooltip title="Remove all scan history">
              <Button danger onClick={onClearHistory} size="small">
                Clear History
              </Button>
            </Tooltip>
          )
        }
      >
        <Timeline mode="left" style={{ marginTop: '24px' }}>
          {history.slice(0, 20).map((scan) => {
            const color = getHealthColor(scan.health_score);
            const label = getHealthLabel(scan.health_score);
            
            return (
              <Timeline.Item
                key={scan.id}
                color={color}
                label={
                  <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    {dayjs(scan.created_at).format('MMM D, h:mm A')}
                    <br />
                    <Text type="secondary" style={{ fontSize: '11px', color: '#bfbfbf' }}>
                      {dayjs(scan.created_at).fromNow()}
                    </Text>
                  </Text>
                }
                dot={
                  scan.health_score >= 70 ? <CheckCircleOutlined /> :
                  scan.health_score >= 50 ? <ClockCircleOutlined /> :
                  <WarningOutlined />
                }
              >
                <Card 
                  size="small" 
                  hoverable
                  style={{ 
                    cursor: 'pointer',
                    borderLeft: `4px solid ${color}`
                  }}
                >
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space>
                        <Avatar 
                          size="small" 
                          style={{ backgroundColor: color }}
                        >
                          {scan.workflow_name.charAt(0)}
                        </Avatar>
                        <Text strong>
                          {scan.workflow_name}
                        </Text>
                      </Space>
                      <Tag color={color}>{label}</Tag>
                    </div>
                    
                    <Space wrap>
                      <Text type="secondary" style={{ fontSize: '12px', color: '#595959' }}>
                        <TrophyOutlined /> Health: {scan.health_score}/100
                      </Text>
                      <Text type="secondary" style={{ fontSize: '12px', color: '#595959' }}>
                        <WarningOutlined /> {scan.issues_found} issues
                      </Text>
                    </Space>
                  </Space>
                </Card>
              </Timeline.Item>
            );
          })}
        </Timeline>

        {history.length > 20 && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
              Showing 20 most recent scans of {history.length} total
            </Text>
          </div>
        )}
      </Card>
    </Space>
  );
};

export default ScanHistoryPanel;
export type { ScanRecord };
