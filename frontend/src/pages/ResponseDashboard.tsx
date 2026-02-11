import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Typography, 
  Table, 
  Tag, 
  Button, 
  Spin, 
  Alert,
  Progress,
  Tabs,
  Space,
  Tooltip,
  Badge
} from 'antd';
import {
  ClockCircleOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  TeamOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  MessageOutlined,
  FacebookOutlined,
  InstagramOutlined
} from '@ant-design/icons';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import './ResponseDashboard.css';

const { Title, Text } = Typography;

// Types
interface ResponseMetrics {
  avgResponseTime: number;
  medianResponseTime: number;
  fastestResponse: number;
  slowestResponse: number;
  totalConversations: number;
  respondedConversations: number;
  missedConversations: number;
  responseRate: number;
  speedGrade: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Critical';
  under1Min: number;
  under5Min: number;
  under15Min: number;
  under1Hr: number;
  over1Hr: number;
}

interface MissedConversation {
  id: string;
  ghlConversationId: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  channel: string;
  firstInboundAt: string;
  isMissed: boolean;
}

interface TeamMember {
  userId: string;
  userName: string;
  email?: string;
  totalResponses: number;
  avgResponseTime: number;
  fastestResponse: number;
  missedCount: number;
}

interface ChannelMetric {
  channel: string;
  totalConversations: number;
  avgResponseTime: number;
  missedCount: number;
  fastResponses: number;
}

interface TrendDataPoint {
  date: string;
  avgResponseTime: number;
  totalConversations: number;
  missedCount: number;
}

// Helper functions
const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
};

const formatTimeVerbose = (seconds: number): string => {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins} minutes`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`;
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

const getChannelIcon = (channel: string) => {
  const icons: Record<string, React.ReactNode> = {
    'sms': <MessageOutlined />,
    'email': <MailOutlined />,
    'phone': <PhoneOutlined />,
    'facebook': <FacebookOutlined />,
    'instagram': <InstagramOutlined />,
  };
  return icons[channel] || <MessageOutlined />;
};

const CHART_COLORS = ['#52c41a', '#73d13d', '#faad14', '#ff7a45', '#ff4d4f'];

const ResponseDashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const [selectedDays, setSelectedDays] = useState(7);

  // Fetch overview metrics
  const { data: overviewData, isLoading: loadingOverview, error: overviewError } = useQuery(
    ['metrics-overview', selectedDays],
    () => api.get(`/api/metrics/overview?days=${selectedDays}`).then(res => res.data.data),
    { refetchInterval: 60000 } // Refresh every minute
  );

  // Fetch trend data
  const { data: trendData, isLoading: loadingTrend } = useQuery(
    ['metrics-trend', selectedDays],
    () => api.get(`/api/metrics/trend?days=${selectedDays}`).then(res => res.data.data),
  );

  // Fetch missed conversations
  const { data: missedData, isLoading: loadingMissed } = useQuery(
    'metrics-missed',
    () => api.get('/api/metrics/missed?limit=10').then(res => res.data.data),
  );

  // Fetch team metrics
  const { data: teamData, isLoading: loadingTeam } = useQuery(
    ['metrics-team', selectedDays],
    () => api.get(`/api/metrics/team?days=${selectedDays}`).then(res => res.data.data),
  );

  // Fetch channel metrics
  const { data: channelData, isLoading: loadingChannels } = useQuery(
    ['metrics-channels', selectedDays],
    () => api.get(`/api/metrics/channels?days=${selectedDays}`).then(res => res.data.data),
  );

  // Sync mutation
  const syncMutation = useMutation(
    () => api.post('/api/metrics/sync'),
    {
      onSuccess: () => {
        toast.success('Sync started! Refreshing data...');
        setTimeout(() => {
          queryClient.invalidateQueries('metrics-overview');
          queryClient.invalidateQueries('metrics-trend');
          queryClient.invalidateQueries('metrics-missed');
          queryClient.invalidateQueries('metrics-team');
          queryClient.invalidateQueries('metrics-channels');
        }, 5000);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error?.message || 'Sync failed');
      }
    }
  );

  const metrics: ResponseMetrics = overviewData?.metrics || {
    avgResponseTime: 0,
    medianResponseTime: 0,
    fastestResponse: 0,
    slowestResponse: 0,
    totalConversations: 0,
    respondedConversations: 0,
    missedConversations: 0,
    responseRate: 0,
    speedGrade: 'Critical',
    under1Min: 0,
    under5Min: 0,
    under15Min: 0,
    under1Hr: 0,
    over1Hr: 0
  };

  const trend: TrendDataPoint[] = trendData?.trend || [];
  const missed: MissedConversation[] = missedData?.conversations || [];
  const team: TeamMember[] = teamData?.team || [];
  const channels: ChannelMetric[] = channelData?.channels || [];

  // Speed distribution data for pie chart
  const speedDistribution = [
    { name: '< 1 min', value: metrics.under1Min, color: '#52c41a' },
    { name: '1-5 min', value: metrics.under5Min, color: '#73d13d' },
    { name: '5-15 min', value: metrics.under15Min, color: '#faad14' },
    { name: '15-60 min', value: metrics.under1Hr, color: '#ff7a45' },
    { name: '> 1 hour', value: metrics.over1Hr, color: '#ff4d4f' },
  ].filter(d => d.value > 0);

  // Missed conversations table columns
  const missedColumns = [
    {
      title: 'Contact',
      dataIndex: 'contactName',
      key: 'contactName',
      render: (name: string, record: MissedConversation) => (
        <div>
          <Text strong>{name}</Text>
          {record.contactPhone && <div><Text type="secondary">{record.contactPhone}</Text></div>}
        </div>
      )
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      render: (channel: string) => (
        <Tag icon={getChannelIcon(channel)}>
          {channel.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Waiting Since',
      dataIndex: 'firstInboundAt',
      key: 'firstInboundAt',
      render: (date: string) => {
        const waitTime = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        return (
          <Tooltip title={new Date(date).toLocaleString()}>
            <Text type="danger">{formatTimeVerbose(waitTime)} ago</Text>
          </Tooltip>
        );
      }
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: MissedConversation) => (
        <Button 
          type="primary" 
          size="small"
          onClick={() => window.open(`https://app.gohighlevel.com/conversations/${record.ghlConversationId}`, '_blank')}
        >
          Respond Now
        </Button>
      )
    }
  ];

  // Team leaderboard columns
  const teamColumns = [
    {
      title: 'Rank',
      key: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => (
        <Badge 
          count={index + 1} 
          style={{ 
            backgroundColor: index === 0 ? '#52c41a' : index === 1 ? '#1890ff' : index === 2 ? '#faad14' : '#8c8c8c' 
          }} 
        />
      )
    },
    {
      title: 'Team Member',
      dataIndex: 'userName',
      key: 'userName',
      render: (name: string) => <Text strong>{name}</Text>
    },
    {
      title: 'Avg Response',
      dataIndex: 'avgResponseTime',
      key: 'avgResponseTime',
      render: (time: number) => (
        <Tag color={time < 300 ? 'green' : time < 900 ? 'orange' : 'red'}>
          {formatTime(time)}
        </Tag>
      ),
      sorter: (a: TeamMember, b: TeamMember) => a.avgResponseTime - b.avgResponseTime
    },
    {
      title: 'Responses',
      dataIndex: 'totalResponses',
      key: 'totalResponses'
    },
    {
      title: 'Missed',
      dataIndex: 'missedCount',
      key: 'missedCount',
      render: (count: number) => count > 0 ? <Text type="danger">{count}</Text> : <Text type="success">0</Text>
    }
  ];

  const colors = {
    cardBg: isDarkMode ? '#1f1f1f' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subtext: isDarkMode ? '#8c8c8c' : '#595959',
  };

  if (loadingOverview) {
    return (
      <div className="loading-container">
        <Spin size="large" />
        <Text style={{ marginTop: 16 }}>Loading response metrics...</Text>
      </div>
    );
  }

  if (overviewError) {
    return (
      <Alert
        message="Failed to load metrics"
        description="Please check your GHL connection and try again."
        type="error"
        showIcon
        action={
          <Button onClick={() => queryClient.invalidateQueries('metrics-overview')}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="response-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <Title level={2} style={{ margin: 0, color: colors.text }}>
            <ThunderboltOutlined /> Response Time Tracker
          </Title>
          <Text type="secondary">Monitor your team's speed-to-lead performance</Text>
        </div>
        <Space>
          <Button 
            onClick={() => setSelectedDays(7)}
            type={selectedDays === 7 ? 'primary' : 'default'}
          >
            7 Days
          </Button>
          <Button 
            onClick={() => setSelectedDays(30)}
            type={selectedDays === 30 ? 'primary' : 'default'}
          >
            30 Days
          </Button>
          <Button 
            icon={<SyncOutlined spin={syncMutation.isLoading} />}
            onClick={() => syncMutation.mutate()}
            loading={syncMutation.isLoading}
          >
            Sync Now
          </Button>
        </Space>
      </div>

      {/* Main Stats */}
      <Row gutter={[16, 16]} className="main-stats">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card primary">
            <Statistic
              title="Average Response Time"
              value={formatTimeVerbose(metrics.avgResponseTime)}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: getGradeColor(metrics.speedGrade) }}
            />
            <Tag color={getGradeColor(metrics.speedGrade)} style={{ marginTop: 8 }}>
              {metrics.speedGrade}
            </Tag>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Response Rate"
              value={metrics.responseRate}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: metrics.responseRate >= 90 ? '#52c41a' : metrics.responseRate >= 70 ? '#faad14' : '#ff4d4f' }}
            />
            <Text type="secondary">{metrics.respondedConversations} / {metrics.totalConversations} conversations</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card warning">
            <Statistic
              title="Missed Leads"
              value={metrics.missedConversations}
              prefix={<WarningOutlined />}
              valueStyle={{ color: metrics.missedConversations > 0 ? '#ff4d4f' : '#52c41a' }}
            />
            <Text type="secondary">No response after 1 hour</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Fastest Response"
              value={formatTimeVerbose(metrics.fastestResponse)}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Text type="secondary">Best time this period</Text>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card title="Response Time Trend" className="chart-card">
            {loadingTrend ? (
              <Spin />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#333' : '#eee'} />
                  <XAxis 
                    dataKey="date" 
                    stroke={colors.subtext}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis 
                    stroke={colors.subtext}
                    tickFormatter={(val) => formatTime(val)}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => [formatTimeVerbose(value), 'Avg Response']}
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgResponseTime" 
                    stroke="#1890ff" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Speed Distribution" className="chart-card">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={speedDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {speedDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* Tabs for Missed Leads / Team / Channels */}
      <Card style={{ marginTop: 16 }}>
        <Tabs
          items={[
            {
              key: 'missed',
              label: (
                <span>
                  <WarningOutlined />
                  Missed Leads ({missed.length})
                </span>
              ),
              children: (
                <Table
                  dataSource={missed}
                  columns={missedColumns}
                  rowKey="id"
                  loading={loadingMissed}
                  pagination={false}
                  locale={{ emptyText: '🎉 No missed leads! Great job!' }}
                />
              )
            },
            {
              key: 'team',
              label: (
                <span>
                  <TeamOutlined />
                  Team Leaderboard
                </span>
              ),
              children: (
                <Table
                  dataSource={team}
                  columns={teamColumns}
                  rowKey="userId"
                  loading={loadingTeam}
                  pagination={false}
                  locale={{ emptyText: 'No team data yet. Sync to load.' }}
                />
              )
            },
            {
              key: 'channels',
              label: (
                <span>
                  <MessageOutlined />
                  By Channel
                </span>
              ),
              children: loadingChannels ? (
                <Spin />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={channels}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#333' : '#eee'} />
                    <XAxis dataKey="channel" stroke={colors.subtext} />
                    <YAxis 
                      stroke={colors.subtext}
                      tickFormatter={(val) => formatTime(val)}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatTimeVerbose(value), 'Avg Response']}
                    />
                    <Bar dataKey="avgResponseTime" fill="#1890ff" />
                  </BarChart>
                </ResponsiveContainer>
              )
            }
          ]}
        />
      </Card>

      {/* Benchmark Info */}
      <Card style={{ marginTop: 16 }} size="small">
        <Row gutter={16} align="middle">
          <Col>
            <Text strong>Industry Benchmarks:</Text>
          </Col>
          <Col>
            <Tag color="green">Excellent: &lt;1 min</Tag>
          </Col>
          <Col>
            <Tag color="lime">Good: &lt;5 min</Tag>
          </Col>
          <Col>
            <Tag color="orange">Average: &lt;15 min</Tag>
          </Col>
          <Col>
            <Tag color="red">Poor: &gt;15 min</Tag>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Text type="secondary">
              78% of leads go to the first responder. Speed matters!
            </Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ResponseDashboard;
