/**
 * InsightsPanel Component
 * AI-powered insights and recommendations display
 * Shows actionable patterns detected in response data
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  Card,
  Collapse,
  Space,
  Typography,
  Tag,
  Button,
  Empty,
  Spin,
  Badge,
  Tooltip,
  message,
  Skeleton
} from 'antd';
import {
  BulbOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  ExclamationCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  MessageOutlined,
  RiseOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface Insight {
  id: string;
  category: 'timing' | 'channel' | 'team' | 'trend' | 'volume' | 'behavior';
  severity: 'info' | 'warning' | 'opportunity' | 'critical';
  title: string;
  description: string;
  metric: string;
  impact: string;
  recommendation: string;
  data?: Record<string, any>;
  priority: number;
  createdAt: string;
}

interface InsightsResponse {
  data: {
    insights: Insight[];
    grouped: {
      critical: Insight[];
      warning: Insight[];
      opportunity: Insight[];
      info: Insight[];
    };
    total: number;
    period: { days: number };
  };
}

interface InsightsPanelProps {
  days?: number;
  maxInsights?: number;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({
  days = 30,
  maxInsights = 5,
  collapsible = true,
  defaultExpanded = true
}) => {
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const [dismissing, setDismissing] = useState<string | null>(null);
  const [addressing, setAddressing] = useState<string | null>(null);

  // Fetch insights
  const { data, isLoading, error, refetch } = useQuery<InsightsResponse>(
    ['insights', days],
    () => api.get(`/api/metrics/insights?days=${days}`).then(res => res.data),
    {
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      staleTime: 2 * 60 * 1000 // Consider stale after 2 minutes
    }
  );

  // Dismiss mutation
  const dismissMutation = useMutation(
    (insightId: string) => api.post(`/api/metrics/insights/${insightId}/dismiss`),
    {
      onSuccess: () => {
        message.success('Insight dismissed');
        queryClient.invalidateQueries(['insights', days]);
      },
      onError: () => {
        message.error('Failed to dismiss insight');
      },
      onSettled: () => {
        setDismissing(null);
      }
    }
  );

  // Mark as addressed mutation
  const addressMutation = useMutation(
    (insightId: string) => api.post(`/api/metrics/insights/${insightId}/addressed`),
    {
      onSuccess: () => {
        message.success('Marked as addressed! 🎉');
        queryClient.invalidateQueries(['insights', days]);
      },
      onError: () => {
        message.error('Failed to update insight');
      },
      onSettled: () => {
        setAddressing(null);
      }
    }
  );

  const handleDismiss = (insightId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissing(insightId);
    dismissMutation.mutate(insightId);
  };

  const handleAddress = (insightId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAddressing(insightId);
    addressMutation.mutate(insightId);
  };

  const insights = data?.data?.insights?.slice(0, maxInsights) || [];
  const total = data?.data?.total || 0;

  // Get icon based on category
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      timing: <ClockCircleOutlined />,
      channel: <MessageOutlined />,
      team: <TeamOutlined />,
      trend: <RiseOutlined />,
      volume: <BarChartOutlined />,
      behavior: <ThunderboltOutlined />
    };
    return icons[category] || <BulbOutlined />;
  };

  // Get severity styles
  const getSeverityStyles = (severity: string) => {
    const styles: Record<string, { color: string; bgColor: string; borderColor: string; icon: React.ReactNode }> = {
      critical: {
        color: '#cf1322',
        bgColor: isDarkMode ? 'rgba(255, 77, 79, 0.15)' : '#fff1f0',
        borderColor: '#ffa39e',
        icon: <ExclamationCircleOutlined />
      },
      warning: {
        color: '#d48806',
        bgColor: isDarkMode ? 'rgba(250, 173, 20, 0.15)' : '#fffbe6',
        borderColor: '#ffe58f',
        icon: <WarningOutlined />
      },
      opportunity: {
        color: '#389e0d',
        bgColor: isDarkMode ? 'rgba(82, 196, 26, 0.15)' : '#f6ffed',
        borderColor: '#b7eb8f',
        icon: <RocketOutlined />
      },
      info: {
        color: '#096dd9',
        bgColor: isDarkMode ? 'rgba(24, 144, 255, 0.15)' : '#e6f7ff',
        borderColor: '#91d5ff',
        icon: <InfoCircleOutlined />
      }
    };
    return styles[severity] || styles.info;
  };

  // Get severity tag
  const getSeverityTag = (severity: string) => {
    const config: Record<string, { color: string; label: string }> = {
      critical: { color: 'red', label: 'Critical' },
      warning: { color: 'orange', label: 'Warning' },
      opportunity: { color: 'green', label: 'Opportunity' },
      info: { color: 'blue', label: 'Info' }
    };
    const { color, label } = config[severity] || config.info;
    return <Tag color={color}>{label}</Tag>;
  };

  // Render single insight card
  const renderInsightCard = (insight: Insight) => {
    const styles = getSeverityStyles(insight.severity);
    const isProcessing = dismissing === insight.id || addressing === insight.id;

    return (
      <Card
        key={insight.id}
        size="small"
        style={{
          marginBottom: 12,
          background: styles.bgColor,
          borderColor: styles.borderColor,
          borderLeft: `4px solid ${styles.color}`
        }}
        bodyStyle={{ padding: '12px 16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ color: styles.color, fontSize: 18 }}>
                {styles.icon}
              </span>
              <Text strong style={{ fontSize: 14, color: styles.color }}>
                {insight.title}
              </Text>
            </div>

            {/* Description */}
            <Paragraph 
              style={{ 
                margin: '0 0 8px 0', 
                fontSize: 13,
                color: isDarkMode ? '#d9d9d9' : '#595959'
              }}
            >
              {insight.description}
            </Paragraph>

            {/* Metric & Impact */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>Metric:</Text>
                <Tag color={styles.color} style={{ marginLeft: 4, fontWeight: 600 }}>
                  {insight.metric}
                </Tag>
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11 }}>Impact:</Text>
                <Text style={{ marginLeft: 4, fontSize: 12 }}>{insight.impact}</Text>
              </div>
            </div>

            {/* Recommendation */}
            <div style={{
              background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
              padding: '8px 10px',
              borderRadius: 6,
              marginBottom: 8
            }}>
              <Text type="secondary" style={{ fontSize: 11 }}>
                💡 Recommendation:
              </Text>
              <Text style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                {insight.recommendation}
              </Text>
            </div>

            {/* Tags */}
            <Space size={4} wrap>
              {getSeverityTag(insight.severity)}
              <Tag icon={getCategoryIcon(insight.category)}>
                {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
              </Tag>
            </Space>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 12 }}>
            <Tooltip title="Mark as addressed">
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                style={{ color: '#52c41a' }}
                loading={addressing === insight.id}
                disabled={isProcessing}
                onClick={(e) => handleAddress(insight.id, e)}
              />
            </Tooltip>
            <Tooltip title="Dismiss for 7 days">
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                style={{ color: '#8c8c8c' }}
                loading={dismissing === insight.id}
                disabled={isProcessing}
                onClick={(e) => handleDismiss(insight.id, e)}
              />
            </Tooltip>
          </div>
        </div>
      </Card>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <Card
        title={
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            <span>AI Insights</span>
          </Space>
        }
      >
        <Skeleton active paragraph={{ rows: 3 }} />
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card
        title={
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            <span>AI Insights</span>
          </Space>
        }
      >
        <Empty
          description="Failed to load insights"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button onClick={() => refetch()}>Retry</Button>
        </Empty>
      </Card>
    );
  }

  // Empty state
  if (insights.length === 0) {
    return (
      <Card
        title={
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            <span>AI Insights</span>
          </Space>
        }
      >
        <Empty
          description={
            <span>
              <Text>No insights yet.</Text>
              <br />
              <Text type="secondary">
                We need more data to generate meaningful insights. Keep using the platform!
              </Text>
            </span>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  // Count by severity for header badge
  const criticalCount = data?.data?.grouped?.critical?.length || 0;
  const warningCount = data?.data?.grouped?.warning?.length || 0;
  const opportunityCount = data?.data?.grouped?.opportunity?.length || 0;

  const headerTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Space>
        <BulbOutlined style={{ color: '#faad14', fontSize: 18 }} />
        <span style={{ fontWeight: 600 }}>AI Insights</span>
      </Space>
      <Space size={4}>
        {criticalCount > 0 && (
          <Badge count={criticalCount} style={{ backgroundColor: '#ff4d4f' }} />
        )}
        {warningCount > 0 && (
          <Badge count={warningCount} style={{ backgroundColor: '#faad14' }} />
        )}
        {opportunityCount > 0 && (
          <Badge count={opportunityCount} style={{ backgroundColor: '#52c41a' }} />
        )}
      </Space>
    </div>
  );

  const headerExtra = (
    <Space>
      <Tooltip title="Refresh insights">
        <Button
          type="text"
          size="small"
          icon={<ReloadOutlined />}
          onClick={(e) => {
            e.stopPropagation();
            refetch();
          }}
        />
      </Tooltip>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Last {days} days
      </Text>
    </Space>
  );

  // Collapsible version
  if (collapsible) {
    return (
      <Collapse
        defaultActiveKey={defaultExpanded ? ['insights'] : []}
        expandIconPosition="start"
        style={{ marginBottom: 24 }}
        className="insights-collapse"
      >
        <Panel
          key="insights"
          header={headerTitle}
          extra={headerExtra}
        >
          {insights.map(renderInsightCard)}
          
          {total > maxInsights && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text type="secondary">
                Showing {maxInsights} of {total} insights
              </Text>
            </div>
          )}
        </Panel>
      </Collapse>
    );
  }

  // Non-collapsible card version
  return (
    <Card
      title={headerTitle}
      extra={headerExtra}
      bodyStyle={{ padding: 16 }}
    >
      {insights.map(renderInsightCard)}
      
      {total > maxInsights && (
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <Text type="secondary">
            Showing {maxInsights} of {total} insights
          </Text>
        </div>
      )}
    </Card>
  );
};

export default InsightsPanel;
