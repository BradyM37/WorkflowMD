/**
 * SharedReportView.tsx
 * Public view for client-shareable branded reports
 * NO AUTHENTICATION REQUIRED
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { 
  Card, 
  Typography, 
  Spin, 
  Result, 
  Row, 
  Col, 
  Statistic, 
  Table,
  Tag,
  Progress,
  Button,
  Space,
  Divider
} from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DownloadOutlined,
  TeamOutlined,
  MessageOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;

interface ReportData {
  locationName: string;
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
  metrics: {
    avgResponseTime: number;
    medianResponseTime: number;
    responseRate: number;
    totalConversations: number;
    respondedConversations: number;
    missedCount: number;
    under1Min: number;
    under5Min: number;
    under15Min: number;
    under1Hr: number;
    over1Hr: number;
    speedGrade: string;
  };
  comparison: {
    currentPeriod: { avgResponseTime: number; responseRate: number; missedCount: number };
    previousPeriod: { avgResponseTime: number; responseRate: number; missedCount: number };
    changes: { responseTime: number; responseRate: number; missedCount: number };
  };
  team: Array<{
    userName: string;
    avgResponseTime: number;
    totalResponses: number;
  }>;
  channels: Array<{
    channel: string;
    totalConversations: number;
    avgResponseTime: number;
  }>;
}

interface BrandingInfo {
  companyName: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  customFooterText: string | null;
  hidePoweredBy: boolean;
  reportTitle: string;
}

const formatTime = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const getGradeColor = (grade: string): string => {
  const colors: Record<string, string> = {
    'Excellent': '#52c41a',
    'Good': '#73d13d',
    'Average': '#faad14',
    'Poor': '#ff7a45',
    'Critical': '#ff4d4f'
  };
  return colors[grade] || '#8c8c8c';
};

const SharedReportView: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  
  const { data, isLoading, error } = useQuery(
    ['shared-report', token],
    async () => {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/reports/share/${token}`
      );
      return response.data.data;
    },
    {
      retry: false,
      refetchOnWindowFocus: false
    }
  );

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f5f5f5'
      }}>
        <Spin size="large" tip="Loading report..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: '#f5f5f5'
      }}>
        <Result
          status="error"
          title="Report Not Found"
          subTitle="This report link may have expired or been revoked."
        />
      </div>
    );
  }

  const reportData: ReportData = data.reportData;
  const branding: BrandingInfo = data.branding;

  const downloadPDF = () => {
    window.open(
      `${process.env.REACT_APP_API_URL || 'http://localhost:3000'}/api/reports/share/${token}/pdf`,
      '_blank'
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Branded Header */}
      <div 
        style={{ 
          background: `linear-gradient(135deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`,
          color: 'white',
          padding: '32px',
          textAlign: 'center'
        }}
      >
        {branding.logoUrl && (
          <img 
            src={branding.logoUrl} 
            alt={branding.companyName}
            style={{ maxHeight: 50, marginBottom: 16 }}
          />
        )}
        <Title level={2} style={{ color: 'white', margin: 0 }}>
          ⚡ {branding.reportTitle}
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
          {branding.companyName}
        </Text>
        {branding.tagline && (
          <div style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
            {branding.tagline}
          </div>
        )}
        <div style={{ marginTop: 8, color: 'rgba(255,255,255,0.9)' }}>
          {new Date(reportData.dateRange.start).toLocaleDateString()} - {new Date(reportData.dateRange.end).toLocaleDateString()} 
          ({reportData.dateRange.days} days)
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {/* Download Button */}
        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            size="large"
            onClick={downloadPDF}
            style={{ background: branding.primaryColor, borderColor: branding.primaryColor }}
          >
            Download PDF Report
          </Button>
        </div>

        {/* Key Metrics */}
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={8}>
            <Card 
              style={{ 
                background: getGradeColor(reportData.metrics.speedGrade),
                border: 'none'
              }}
            >
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Avg Response Time</span>}
                value={formatTime(reportData.metrics.avgResponseTime)}
                valueStyle={{ color: 'white', fontSize: 32 }}
                prefix={<ClockCircleOutlined />}
              />
              <Tag color="white" style={{ marginTop: 8, color: getGradeColor(reportData.metrics.speedGrade) }}>
                {reportData.metrics.speedGrade}
              </Tag>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card 
              style={{ 
                background: reportData.metrics.responseRate >= 90 ? '#52c41a' : 
                           reportData.metrics.responseRate >= 70 ? '#faad14' : '#ff4d4f',
                border: 'none'
              }}
            >
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Response Rate</span>}
                value={reportData.metrics.responseRate}
                valueStyle={{ color: 'white', fontSize: 32 }}
                suffix="%"
                prefix={<CheckCircleOutlined />}
              />
              <div style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>
                {reportData.metrics.respondedConversations} of {reportData.metrics.totalConversations} leads
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card 
              style={{ 
                background: reportData.metrics.missedCount === 0 ? '#52c41a' : '#ff4d4f',
                border: 'none'
              }}
            >
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>Missed Leads</span>}
                value={reportData.metrics.missedCount}
                valueStyle={{ color: 'white', fontSize: 32 }}
                prefix={<WarningOutlined />}
              />
              <div style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>
                {reportData.metrics.missedCount === 0 ? 'All contacted! 🎉' : 'Need follow-up'}
              </div>
            </Card>
          </Col>
        </Row>

        {/* Response Speed Distribution */}
        <Card title="⏱️ Response Speed Distribution" style={{ marginTop: 24 }}>
          <Row gutter={[16, 16]}>
            {[
              { label: '< 1 minute', count: reportData.metrics.under1Min, color: '#52c41a' },
              { label: '1-5 minutes', count: reportData.metrics.under5Min, color: '#73d13d' },
              { label: '5-15 minutes', count: reportData.metrics.under15Min, color: '#faad14' },
              { label: '15-60 minutes', count: reportData.metrics.under1Hr, color: '#ff7a45' },
              { label: '> 1 hour', count: reportData.metrics.over1Hr, color: '#ff4d4f' }
            ].map((item, idx) => {
              const pct = reportData.metrics.respondedConversations > 0
                ? Math.round((item.count / reportData.metrics.respondedConversations) * 100)
                : 0;
              return (
                <Col xs={24} sm={12} md={4.8} key={idx}>
                  <div style={{ textAlign: 'center' }}>
                    <Progress
                      type="circle"
                      percent={pct}
                      strokeColor={item.color}
                      format={() => item.count}
                      width={80}
                    />
                    <div style={{ marginTop: 8 }}>
                      <Text strong>{item.label}</Text>
                    </div>
                    <Text type="secondary">{pct}%</Text>
                  </div>
                </Col>
              );
            })}
          </Row>
        </Card>

        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          {/* Team Leaderboard */}
          <Col xs={24} lg={12}>
            <Card title={<><TrophyOutlined /> Team Leaderboard</>}>
              {reportData.team.length === 0 ? (
                <Text type="secondary">No team data available</Text>
              ) : (
                <Table
                  dataSource={reportData.team.slice(0, 5).map((member, idx) => ({
                    ...member,
                    key: idx,
                    rank: idx + 1
                  }))}
                  columns={[
                    {
                      title: 'Rank',
                      dataIndex: 'rank',
                      key: 'rank',
                      width: 60,
                      render: (rank: number) => {
                        const medals = ['🥇', '🥈', '🥉'];
                        return rank <= 3 ? medals[rank - 1] : rank;
                      }
                    },
                    {
                      title: 'Team Member',
                      dataIndex: 'userName',
                      key: 'userName'
                    },
                    {
                      title: 'Avg Response',
                      dataIndex: 'avgResponseTime',
                      key: 'avgResponseTime',
                      render: (time: number) => (
                        <Tag color={time < 300 ? 'green' : time < 900 ? 'gold' : 'red'}>
                          {formatTime(time)}
                        </Tag>
                      )
                    },
                    {
                      title: 'Responses',
                      dataIndex: 'totalResponses',
                      key: 'totalResponses'
                    }
                  ]}
                  pagination={false}
                  size="small"
                />
              )}
            </Card>
          </Col>

          {/* Channel Breakdown */}
          <Col xs={24} lg={12}>
            <Card title={<><MessageOutlined /> Channel Breakdown</>}>
              {reportData.channels.length === 0 ? (
                <Text type="secondary">No channel data available</Text>
              ) : (
                <Table
                  dataSource={reportData.channels.map((channel, idx) => ({
                    ...channel,
                    key: idx
                  }))}
                  columns={[
                    {
                      title: 'Channel',
                      dataIndex: 'channel',
                      key: 'channel',
                      render: (channel: string) => (
                        <Tag color="blue">{channel.toUpperCase()}</Tag>
                      )
                    },
                    {
                      title: 'Conversations',
                      dataIndex: 'totalConversations',
                      key: 'totalConversations'
                    },
                    {
                      title: 'Avg Response',
                      dataIndex: 'avgResponseTime',
                      key: 'avgResponseTime',
                      render: (time: number) => (
                        <Tag color={time < 300 ? 'green' : time < 900 ? 'gold' : 'red'}>
                          {formatTime(time)}
                        </Tag>
                      )
                    }
                  ]}
                  pagination={false}
                  size="small"
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* Period Comparison */}
        <Card title="📊 Period Comparison" style={{ marginTop: 24 }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} sm={8}>
              <Statistic
                title="Response Time Change"
                value={reportData.comparison.changes.responseTime.toFixed(1)}
                valueStyle={{ 
                  color: reportData.comparison.changes.responseTime < 0 ? '#52c41a' : '#ff4d4f' 
                }}
                prefix={reportData.comparison.changes.responseTime < 0 ? '↓' : '↑'}
                suffix="%"
              />
              <Text type="secondary">
                vs previous {reportData.dateRange.days} days
              </Text>
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Response Rate Change"
                value={reportData.comparison.changes.responseRate.toFixed(1)}
                valueStyle={{ 
                  color: reportData.comparison.changes.responseRate > 0 ? '#52c41a' : '#ff4d4f' 
                }}
                prefix={reportData.comparison.changes.responseRate > 0 ? '↑' : '↓'}
                suffix="%"
              />
              <Text type="secondary">
                vs previous {reportData.dateRange.days} days
              </Text>
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Missed Leads Change"
                value={Math.abs(reportData.comparison.changes.missedCount)}
                valueStyle={{ 
                  color: reportData.comparison.changes.missedCount < 0 ? '#52c41a' : '#ff4d4f' 
                }}
                prefix={reportData.comparison.changes.missedCount < 0 ? '↓' : '↑'}
              />
              <Text type="secondary">
                vs previous {reportData.dateRange.days} days
              </Text>
            </Col>
          </Row>
        </Card>

        {/* Footer */}
        <Divider />
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#8c8c8c' }}>
          {branding.customFooterText || (
            branding.hidePoweredBy 
              ? `© ${new Date().getFullYear()} ${branding.companyName}`
              : `Powered by WorkflowMD Response Tracker • ${new Date().getFullYear()}`
          )}
        </div>
      </div>
    </div>
  );
};

export default SharedReportView;
