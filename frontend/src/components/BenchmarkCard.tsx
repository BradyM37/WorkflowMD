import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  Card,
  Progress,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Statistic,
  Divider,
  Button,
  Select,
  Tooltip,
  Skeleton,
  Alert
} from 'antd';
import {
  TrophyOutlined,
  RiseOutlined,
  FallOutlined,
  MinusOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  CrownOutlined,
  StarOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

interface TierInfo {
  tier: string;
  emoji: string;
  name: string;
  color: string;
  minPercentile: number;
  description: string;
}

interface BenchmarkData {
  percentile: number;
  tierInfo: TierInfo;
  responseTimePercentile: number;
  healthScorePercentile: number;
  workflowEfficiencyPercentile: number;
  vsIndustryAverage: {
    responseTime: { value: number; diff: number; better: boolean };
    healthScore: { value: number; diff: number; better: boolean };
  };
  nextTier: TierInfo | null;
  toNextTier: {
    metric: string;
    currentValue: number;
    targetValue: number;
    improvement: string;
  } | null;
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    previousPercentile: number | null;
    change: number;
    periodDays: number;
  };
  industry: {
    id: string;
    name: string;
    avgResponseTime: number;
    avgHealthScore: number;
  };
  stats: {
    aheadOfPercent: number;
    leadsLikelyWon: string;
    potentialRevenueLift: string;
  };
}

interface Industry {
  id: string;
  name: string;
  description: string;
}

// Tier badge component with visual styling
const TierBadge: React.FC<{ tier: TierInfo; size?: 'small' | 'large' }> = ({ tier, size = 'large' }) => {
  const bgColors: Record<string, string> = {
    bronze: 'linear-gradient(135deg, #CD7F32 0%, #8B5A2B 100%)',
    silver: 'linear-gradient(135deg, #C0C0C0 0%, #808080 100%)',
    gold: 'linear-gradient(135deg, #FFD700 0%, #DAA520 100%)',
    platinum: 'linear-gradient(135deg, #E5E4E2 0%, #B0C4DE 50%, #87CEEB 100%)'
  };

  return (
    <div style={{
      background: bgColors[tier.tier] || bgColors.bronze,
      padding: size === 'large' ? '16px 24px' : '8px 16px',
      borderRadius: '12px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: size === 'large' ? '12px' : '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      <span style={{ fontSize: size === 'large' ? '36px' : '20px' }}>{tier.emoji}</span>
      <div>
        <Text strong style={{ 
          color: tier.tier === 'gold' ? '#1a1a2e' : 'white', 
          fontSize: size === 'large' ? '20px' : '14px',
          display: 'block'
        }}>
          {tier.name} Tier
        </Text>
        {size === 'large' && (
          <Text style={{ 
            color: tier.tier === 'gold' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)', 
            fontSize: '12px' 
          }}>
            {tier.description}
          </Text>
        )}
      </div>
    </div>
  );
};

// Percentile gauge component
const PercentileGauge: React.FC<{ 
  percentile: number; 
  label: string; 
  color: string;
  icon: React.ReactNode;
}> = ({ percentile, label, color, icon }) => {
  return (
    <div style={{ textAlign: 'center' }}>
      <Progress
        type="dashboard"
        percent={percentile}
        strokeColor={color}
        format={() => (
          <div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color }}>{percentile}</div>
            <div style={{ fontSize: '11px', color: '#8c8c8c' }}>percentile</div>
          </div>
        )}
        size={120}
      />
      <Space style={{ marginTop: '8px' }}>
        {icon}
        <Text strong>{label}</Text>
      </Space>
    </div>
  );
};

// Trend indicator
const TrendIndicator: React.FC<{ trend: BenchmarkData['trend'] }> = ({ trend }) => {
  const iconMap = {
    improving: <RiseOutlined style={{ color: '#52c41a' }} />,
    declining: <FallOutlined style={{ color: '#ff4d4f' }} />,
    stable: <MinusOutlined style={{ color: '#faad14' }} />
  };

  const colorMap = {
    improving: '#52c41a',
    declining: '#ff4d4f',
    stable: '#faad14'
  };

  const textMap = {
    improving: 'Improving',
    declining: 'Declining',
    stable: 'Stable'
  };

  return (
    <Space>
      {iconMap[trend.direction]}
      <Text style={{ color: colorMap[trend.direction] }}>
        {textMap[trend.direction]}
        {trend.change !== 0 && ` (${trend.change > 0 ? '+' : ''}${trend.change}%)`}
      </Text>
      <Text type="secondary" style={{ fontSize: '12px' }}>
        vs {trend.periodDays} days ago
      </Text>
    </Space>
  );
};

// Format time helper
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds / 3600)}h`;
};

interface BenchmarkCardProps {
  expanded?: boolean;
  onClose?: () => void;
}

const BenchmarkCard: React.FC<BenchmarkCardProps> = ({ expanded = true, onClose }) => {
  const { isDarkMode } = useTheme();
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

  // Fetch benchmark data
  const { data: benchmarks, isLoading, error, refetch } = useQuery<BenchmarkData>(
    'benchmarks',
    () => api.get('/api/benchmarks').then(res => res.data.data || res.data),
    {
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false
    }
  );

  // Fetch available industries
  const { data: industriesData } = useQuery<{ industries: Industry[] }>(
    'benchmark-industries',
    () => api.get('/api/benchmarks/industries').then(res => res.data.data || res.data),
    {
      staleTime: 300000 // 5 minutes
    }
  );

  // Handle industry change
  const handleIndustryChange = async (industryId: string) => {
    try {
      await api.put('/api/benchmarks/industry', { industryId });
      setSelectedIndustry(industryId);
      refetch();
    } catch (err) {
      console.error('Failed to update industry:', err);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (error || !benchmarks) {
    return (
      <Card>
        <Alert
          type="warning"
          message="Unable to load benchmarks"
          description="We need more workflow data to calculate your industry ranking. Analyze a few workflows to get started!"
          showIcon
        />
      </Card>
    );
  }

  const colors = {
    cardBg: isDarkMode ? '#262626' : 'white',
    text: isDarkMode ? '#d9d9d9' : '#1a1a2e',
    muted: isDarkMode ? '#8c8c8c' : '#8c8c8c'
  };

  return (
    <Card
      title={
        <Space>
          <TrophyOutlined style={{ color: '#faad14' }} />
          <span>Industry Benchmark</span>
          <Tag color="blue">{benchmarks.industry.name}</Tag>
        </Space>
      }
      extra={
        <Space>
          {industriesData && (
            <Select
              style={{ width: 180 }}
              placeholder="Change industry"
              value={selectedIndustry || benchmarks.industry.id}
              onChange={handleIndustryChange}
              size="small"
            >
              {industriesData.industries.map(ind => (
                <Option key={ind.id} value={ind.id}>
                  {ind.name}
                </Option>
              ))}
            </Select>
          )}
          {onClose && (
            <Button type="text" onClick={onClose}>Close</Button>
          )}
        </Space>
      }
      style={{ background: colors.cardBg }}
    >
      {/* Hero Section - Tier & Percentile */}
      <Row gutter={[24, 24]} align="middle" style={{ marginBottom: '24px' }}>
        <Col xs={24} md={12}>
          <div style={{ textAlign: 'center' }}>
            <TierBadge tier={benchmarks.tierInfo} />
            <div style={{ marginTop: '16px' }}>
              <Progress
                type="circle"
                percent={benchmarks.percentile}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': benchmarks.tierInfo.color
                }}
                format={() => (
                  <div>
                    <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                      Top {100 - benchmarks.percentile}%
                    </div>
                    <div style={{ fontSize: '12px', color: colors.muted }}>
                      of {benchmarks.industry.name}
                    </div>
                  </div>
                )}
                size={160}
                strokeWidth={8}
              />
            </div>
            <div style={{ marginTop: '12px' }}>
              <TrendIndicator trend={benchmarks.trend} />
            </div>
          </div>
        </Col>

        <Col xs={24} md={12}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* Next Tier Progress */}
            {benchmarks.nextTier && benchmarks.toNextTier && (
              <Card size="small" style={{ background: isDarkMode ? '#1f1f1f' : '#fafafa' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    <ArrowUpOutlined style={{ color: '#52c41a' }} />
                    <Text strong>Next: {benchmarks.nextTier.emoji} {benchmarks.nextTier.name}</Text>
                  </Space>
                  <Progress
                    percent={Math.round((benchmarks.percentile / benchmarks.nextTier.minPercentile) * 100)}
                    strokeColor="#52c41a"
                    size="small"
                  />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {benchmarks.toNextTier.improvement}
                  </Text>
                </Space>
              </Card>
            )}

            {/* Lead Impact Stats */}
            <Card size="small" style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none'
            }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong style={{ color: 'white', fontSize: '14px' }}>
                  📊 Lead Impact
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px' }}>
                  {benchmarks.stats.leadsLikelyWon}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
                  {benchmarks.stats.potentialRevenueLift}
                </Text>
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>

      <Divider />

      {/* Metric Breakdown */}
      <Title level={5}>Performance Breakdown</Title>
      <Row gutter={[16, 16]} justify="center" style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={8}>
          <PercentileGauge
            percentile={benchmarks.responseTimePercentile}
            label="Speed"
            color="#52c41a"
            icon={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <PercentileGauge
            percentile={benchmarks.healthScorePercentile}
            label="Workflow Health"
            color="#1890ff"
            icon={<SafetyOutlined style={{ color: '#1890ff' }} />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <PercentileGauge
            percentile={benchmarks.workflowEfficiencyPercentile}
            label="Efficiency"
            color="#722ed1"
            icon={<TeamOutlined style={{ color: '#722ed1' }} />}
          />
        </Col>
      </Row>

      <Divider />

      {/* You vs Industry Average */}
      <Title level={5}>
        You vs Industry Average
        <Tooltip title="Based on aggregated data from similar businesses in your vertical">
          <InfoCircleOutlined style={{ marginLeft: '8px', color: colors.muted, fontSize: '14px' }} />
        </Tooltip>
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Statistic
              title="Response Time"
              value={formatTime(benchmarks.vsIndustryAverage.responseTime.value)}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ 
                color: benchmarks.vsIndustryAverage.responseTime.better ? '#52c41a' : '#ff4d4f' 
              }}
              suffix={
                <Tag color={benchmarks.vsIndustryAverage.responseTime.better ? 'success' : 'error'}>
                  {benchmarks.vsIndustryAverage.responseTime.better ? 'Faster' : 'Slower'}
                </Tag>
              }
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Industry avg: {formatTime(benchmarks.industry.avgResponseTime)}
              {benchmarks.vsIndustryAverage.responseTime.better && (
                <Text style={{ color: '#52c41a', marginLeft: '8px' }}>
                  ({formatTime(Math.abs(benchmarks.vsIndustryAverage.responseTime.diff))} faster!)
                </Text>
              )}
            </Text>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small">
            <Statistic
              title="Workflow Health"
              value={benchmarks.vsIndustryAverage.healthScore.value}
              prefix={<SafetyOutlined />}
              suffix="/100"
              valueStyle={{ 
                color: benchmarks.vsIndustryAverage.healthScore.better ? '#52c41a' : '#ff4d4f' 
              }}
            />
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Industry avg: {benchmarks.industry.avgHealthScore}
              {benchmarks.vsIndustryAverage.healthScore.better && (
                <Text style={{ color: '#52c41a', marginLeft: '8px' }}>
                  (+{benchmarks.vsIndustryAverage.healthScore.diff} points!)
                </Text>
              )}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Harvard Stat Footer */}
      <div style={{ 
        marginTop: '24px', 
        padding: '16px', 
        background: isDarkMode ? '#1f1f1f' : '#f6f8fa',
        borderRadius: '8px',
        borderLeft: '4px solid #667eea'
      }}>
        <Text style={{ fontSize: '13px' }}>
          <StarOutlined style={{ color: '#faad14', marginRight: '8px' }} />
          <strong>Did you know?</strong> According to Harvard Business Review, 
          <Text strong style={{ color: '#667eea' }}> 78% of customers buy from the company that responds first</Text>. 
          Speed is your competitive advantage.
        </Text>
      </div>
    </Card>
  );
};

export default BenchmarkCard;
