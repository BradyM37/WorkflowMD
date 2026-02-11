import React from 'react';
import { useQuery } from 'react-query';
import { Card, Spin, Empty, Typography, Space, Row, Col, Statistic, Tag } from 'antd';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined, 
  SwapOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const { Text, Title } = Typography;

interface ComparisonData {
  current: {
    period: { start: string; end: string; days: number };
    totalConversations: number;
    avgResponseTime: number;
    responseRate: number;
    missedCount: number;
    fastResponses: number;
  };
  previous: {
    period: { start: string; end: string; days: number };
    totalConversations: number;
    avgResponseTime: number;
    responseRate: number;
    missedCount: number;
    fastResponses: number;
  };
  changes: {
    conversations: number | null;
    avgResponseTime: number | null;
    responseRate: number;
    missed: number | null;
    fastResponses: number | null;
  };
  improved: {
    responseTime: boolean;
    responseRate: boolean;
    missed: boolean;
  };
}

const formatTime = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
};

interface Props {
  days?: number;
}

const PeriodComparison: React.FC<Props> = ({ days = 7 }) => {
  const { isDarkMode } = useTheme();
  
  const { data, isLoading } = useQuery<{ data: ComparisonData }>(
    ['metrics-comparison', days],
    () => api.get(`/api/metrics/comparison?days=${days}`).then(res => res.data),
    { staleTime: 60000 }
  );

  if (isLoading) {
    return (
      <Card title="Period Comparison">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  const compData = data?.data;
  
  if (!compData) {
    return (
      <Card title="Period Comparison">
        <Empty description="No comparison data available" />
      </Card>
    );
  }

  const { current, previous, changes, improved } = compData;

  const ChangeIndicator: React.FC<{ 
    value: number | null; 
    inverted?: boolean;
    suffix?: string;
  }> = ({ value, inverted = false, suffix = '%' }) => {
    if (value === null) return <Text type="secondary">N/A</Text>;
    
    const isPositive = inverted ? value < 0 : value > 0;
    const isNegative = inverted ? value > 0 : value < 0;
    const absValue = Math.abs(value);
    
    return (
      <Space size={4}>
        {isPositive && <ArrowUpOutlined style={{ color: '#52c41a' }} />}
        {isNegative && <ArrowDownOutlined style={{ color: '#ff4d4f' }} />}
        {value === 0 && <SwapOutlined style={{ color: '#8c8c8c' }} />}
        <Text style={{ 
          color: isPositive ? '#52c41a' : isNegative ? '#ff4d4f' : '#8c8c8c',
          fontWeight: 600
        }}>
          {absValue}{suffix}
        </Text>
      </Space>
    );
  };

  const periodLabel = days === 7 ? 'week' : days === 14 ? '2 weeks' : `${days} days`;

  return (
    <Card 
      title={
        <Space>
          <SwapOutlined />
          <span>This {periodLabel} vs Last {periodLabel}</span>
        </Space>
      }
    >
      {/* Summary Tags */}
      <div style={{ marginBottom: 16 }}>
        {improved.responseTime && (
          <Tag color="green" icon={<ThunderboltOutlined />}>
            Response time improved!
          </Tag>
        )}
        {improved.responseRate && (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Response rate improved!
          </Tag>
        )}
        {improved.missed && (
          <Tag color="green" icon={<WarningOutlined />}>
            Fewer missed leads!
          </Tag>
        )}
        {!improved.responseTime && !improved.responseRate && !improved.missed && (
          <Tag color="orange">Room for improvement</Tag>
        )}
      </div>

      <Row gutter={[16, 16]}>
        {/* Response Time */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: isDarkMode ? '#262626' : '#fafafa' }}>
            <Statistic
              title={<Text type="secondary"><ClockCircleOutlined /> Avg Response</Text>}
              value={formatTime(current.avgResponseTime)}
              valueStyle={{ 
                color: improved.responseTime ? '#52c41a' : '#ff4d4f',
                fontSize: 24
              }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">vs {formatTime(previous.avgResponseTime)} </Text>
              <ChangeIndicator value={changes.avgResponseTime} inverted />
            </div>
          </Card>
        </Col>

        {/* Response Rate */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: isDarkMode ? '#262626' : '#fafafa' }}>
            <Statistic
              title={<Text type="secondary"><CheckCircleOutlined /> Response Rate</Text>}
              value={current.responseRate}
              suffix="%"
              valueStyle={{ 
                color: improved.responseRate ? '#52c41a' : current.responseRate >= 80 ? '#52c41a' : '#ff4d4f',
                fontSize: 24
              }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">vs {previous.responseRate}% </Text>
              <ChangeIndicator value={changes.responseRate} suffix=" pts" />
            </div>
          </Card>
        </Col>

        {/* Missed Leads */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: isDarkMode ? '#262626' : '#fafafa' }}>
            <Statistic
              title={<Text type="secondary"><WarningOutlined /> Missed Leads</Text>}
              value={current.missedCount}
              valueStyle={{ 
                color: current.missedCount === 0 ? '#52c41a' : '#ff4d4f',
                fontSize: 24
              }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">vs {previous.missedCount} </Text>
              <ChangeIndicator value={changes.missed} inverted />
            </div>
          </Card>
        </Col>

        {/* Conversations */}
        <Col xs={24} sm={12} md={6}>
          <Card size="small" style={{ background: isDarkMode ? '#262626' : '#fafafa' }}>
            <Statistic
              title={<Text type="secondary">Total Conversations</Text>}
              value={current.totalConversations}
              valueStyle={{ fontSize: 24 }}
            />
            <div style={{ marginTop: 8 }}>
              <Text type="secondary">vs {previous.totalConversations} </Text>
              <ChangeIndicator value={changes.conversations} />
            </div>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default PeriodComparison;
