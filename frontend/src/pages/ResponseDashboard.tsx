import React, { useState, useEffect } from 'react';
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
  Badge,
  Empty,
  Segmented,
  Skeleton,
  message,
  Modal,
  Result
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
  InstagramOutlined,
  WhatsAppOutlined,
  GoogleOutlined,
  GlobalOutlined,
  RocketOutlined,
  TrophyOutlined,
  FireOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  LinkOutlined
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
  Cell,
  Area,
  AreaChart,
  Legend
} from 'recharts';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import './ResponseDashboard.css';

const { Title, Text, Paragraph } = Typography;

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

interface SyncStatus {
  status: 'pending' | 'syncing' | 'completed' | 'error';
  lastSyncAt: string | null;
  error?: string;
}

// Helper functions
const formatTime = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${Math.round(seconds / 86400)}d`;
};

const formatTimeVerbose = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0 seconds';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
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

const getGradeEmoji = (grade: string): string => {
  const emojis: Record<string, string> = {
    'Excellent': '🚀',
    'Good': '✅',
    'Average': '⚡',
    'Poor': '⚠️',
    'Critical': '🔥'
  };
  return emojis[grade] || '📊';
};

const getChannelIcon = (channel: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    'sms': <MessageOutlined style={{ color: '#52c41a' }} />,
    'email': <MailOutlined style={{ color: '#1890ff' }} />,
    'phone': <PhoneOutlined style={{ color: '#722ed1' }} />,
    'facebook': <FacebookOutlined style={{ color: '#1877f2' }} />,
    'instagram': <InstagramOutlined style={{ color: '#e4405f' }} />,
    'whatsapp': <WhatsAppOutlined style={{ color: '#25d366' }} />,
    'google': <GoogleOutlined style={{ color: '#4285f4' }} />,
    'webchat': <GlobalOutlined style={{ color: '#13c2c2' }} />,
  };
  return icons[channel?.toLowerCase()] || <MessageOutlined style={{ color: '#8c8c8c' }} />;
};

const getChannelColor = (channel: string): string => {
  const colors: Record<string, string> = {
    'sms': '#52c41a',
    'email': '#1890ff',
    'phone': '#722ed1',
    'facebook': '#1877f2',
    'instagram': '#e4405f',
    'whatsapp': '#25d366',
    'google': '#4285f4',
    'webchat': '#13c2c2',
  };
  return colors[channel?.toLowerCase()] || '#8c8c8c';
};

const CHART_COLORS = ['#52c41a', '#73d13d', '#faad14', '#ff7a45', '#ff4d4f'];

// Industry benchmark - 78% of customers buy from the first responder
const SPEED_TO_LEAD_STAT = "78% of customers buy from whoever responds first";

const ResponseDashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { ghlConnected } = useAuth();
  const queryClient = useQueryClient();
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Fetch sync status
  const { data: syncStatusData } = useQuery<{ data: SyncStatus }>(
    'sync-status',
    () => api.get('/api/metrics/sync/status').then(res => res.data),
    { refetchInterval: 5000 } // Check every 5 seconds while syncing
  );

  const syncStatus = syncStatusData?.data;
  const isSyncing = syncStatus?.status === 'syncing';

  // Fetch overview metrics
  const { data: overviewData, isLoading: loadingOverview, error: overviewError, refetch: refetchOverview } = useQuery(
    ['metrics-overview', selectedDays],
    () => api.get(`/api/metrics/overview?days=${selectedDays}`).then(res => res.data.data),
    { 
      refetchInterval: isSyncing ? 5000 : 60000,
      enabled: ghlConnected
    }
  );

  // Fetch trend data
  const { data: trendData, isLoading: loadingTrend } = useQuery(
    ['metrics-trend', selectedDays],
    () => api.get(`/api/metrics/trend?days=${selectedDays}`).then(res => res.data.data),
    { enabled: ghlConnected }
  );

  // Fetch missed conversations
  const { data: missedData, isLoading: loadingMissed, refetch: refetchMissed } = useQuery(
    'metrics-missed',
    () => api.get('/api/metrics/missed?limit=20').then(res => res.data.data),
    { enabled: ghlConnected }
  );

  // Fetch team metrics
  const { data: teamData, isLoading: loadingTeam } = useQuery(
    ['metrics-team', selectedDays],
    () => api.get(`/api/metrics/team?days=${selectedDays}`).then(res => res.data.data),
    { enabled: ghlConnected }
  );

  // Fetch channel metrics
  const { data: channelData, isLoading: loadingChannels } = useQuery(
    ['metrics-channels', selectedDays],
    () => api.get(`/api/metrics/channels?days=${selectedDays}`).then(res => res.data.data),
    { enabled: ghlConnected }
  );

  // Sync mutation
  const syncMutation = useMutation(
    () => api.post('/api/metrics/sync'),
    {
      onSuccess: () => {
        toast.success('Syncing conversations from GHL...');
        queryClient.invalidateQueries('sync-status');
      },
      onError: (error: any) => {
        if (error.response?.status === 409) {
          toast('Sync already in progress', { icon: '⏳' });
        } else {
          toast.error(error.response?.data?.error?.message || 'Sync failed');
        }
      }
    }
  );

  // Refetch all data when sync completes
  useEffect(() => {
    if (syncStatus?.status === 'completed') {
      queryClient.invalidateQueries('metrics-overview');
      queryClient.invalidateQueries('metrics-trend');
      queryClient.invalidateQueries('metrics-missed');
      queryClient.invalidateQueries('metrics-team');
      queryClient.invalidateQueries('metrics-channels');
    }
  }, [syncStatus?.status, queryClient]);

  // Show onboarding if no data
  useEffect(() => {
    if (!loadingOverview && overviewData?.metrics?.totalConversations === 0 && !syncStatus?.lastSyncAt) {
      setShowOnboarding(true);
    }
  }, [loadingOverview, overviewData, syncStatus]);

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

  // Calculate time since last sync
  const getTimeSinceSync = (): string => {
    if (!syncStatus?.lastSyncAt) return 'Never synced';
    const diff = Date.now() - new Date(syncStatus.lastSyncAt).getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  // Missed conversations table columns
  const missedColumns = [
    {
      title: 'Contact',
      dataIndex: 'contactName',
      key: 'contactName',
      render: (name: string, record: MissedConversation) => (
        <div>
          <Text strong>{name || 'Unknown'}</Text>
          {record.contactPhone && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.contactPhone}</Text>
            </div>
          )}
          {record.contactEmail && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>{record.contactEmail}</Text>
            </div>
          )}
        </div>
      )
    },
    {
      title: 'Channel',
      dataIndex: 'channel',
      key: 'channel',
      width: 120,
      render: (channel: string) => (
        <Tag icon={getChannelIcon(channel)} color={getChannelColor(channel)}>
          {channel?.toUpperCase() || 'UNKNOWN'}
        </Tag>
      )
    },
    {
      title: 'Waiting',
      dataIndex: 'firstInboundAt',
      key: 'firstInboundAt',
      width: 150,
      render: (date: string) => {
        const waitTime = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        const isUrgent = waitTime > 3600; // More than 1 hour
        return (
          <Tooltip title={new Date(date).toLocaleString()}>
            <Text type={isUrgent ? 'danger' : 'warning'} strong>
              <ClockCircleOutlined /> {formatTimeVerbose(waitTime)}
            </Text>
          </Tooltip>
        );
      },
      sorter: (a: MissedConversation, b: MissedConversation) => 
        new Date(a.firstInboundAt).getTime() - new Date(b.firstInboundAt).getTime()
    },
    {
      title: 'Action',
      key: 'action',
      width: 140,
      render: (_: any, record: MissedConversation) => (
        <Button 
          type="primary" 
          size="small"
          icon={<LinkOutlined />}
          onClick={() => {
            // Open GHL conversation
            const ghlUrl = `https://app.gohighlevel.com/v2/location/conversations/${record.ghlConversationId}`;
            window.open(ghlUrl, '_blank');
          }}
        >
          Respond
        </Button>
      )
    }
  ];

  // Team leaderboard columns
  const teamColumns = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      render: (_: any, __: any, index: number) => {
        const badges = ['🥇', '🥈', '🥉'];
        return index < 3 ? (
          <span style={{ fontSize: 20 }}>{badges[index]}</span>
        ) : (
          <Text type="secondary">{index + 1}</Text>
        );
      }
    },
    {
      title: 'Team Member',
      dataIndex: 'userName',
      key: 'userName',
      render: (name: string, record: TeamMember, index: number) => (
        <Space>
          <Text strong style={{ color: index === 0 ? '#52c41a' : undefined }}>
            {name || 'Unknown User'}
          </Text>
          {index === 0 && <Tag color="green">Fastest</Tag>}
        </Space>
      )
    },
    {
      title: 'Avg Response',
      dataIndex: 'avgResponseTime',
      key: 'avgResponseTime',
      render: (time: number) => {
        let color = 'green';
        if (time >= 900) color = 'red';
        else if (time >= 300) color = 'orange';
        
        return (
          <Tag color={color} style={{ fontWeight: 600 }}>
            {formatTime(time)}
          </Tag>
        );
      },
      sorter: (a: TeamMember, b: TeamMember) => a.avgResponseTime - b.avgResponseTime,
      defaultSortOrder: 'ascend' as const
    },
    {
      title: 'Fastest',
      dataIndex: 'fastestResponse',
      key: 'fastestResponse',
      render: (time: number) => (
        <Text type="secondary">{formatTime(time)}</Text>
      )
    },
    {
      title: 'Responses',
      dataIndex: 'totalResponses',
      key: 'totalResponses',
      sorter: (a: TeamMember, b: TeamMember) => b.totalResponses - a.totalResponses
    },
    {
      title: 'Missed',
      dataIndex: 'missedCount',
      key: 'missedCount',
      render: (count: number) => (
        count > 0 ? (
          <Text type="danger" strong>{count}</Text>
        ) : (
          <Text type="success">0 ✓</Text>
        )
      )
    }
  ];

  const colors = {
    cardBg: isDarkMode ? '#1f1f1f' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subtext: isDarkMode ? '#8c8c8c' : '#595959',
    border: isDarkMode ? '#303030' : '#f0f0f0',
  };

  // Not connected state
  if (!ghlConnected) {
    return (
      <div className="response-dashboard">
        <Result
          icon={<RocketOutlined style={{ color: '#667eea' }} />}
          title="Connect Your GHL Account"
          subTitle="Link your GoHighLevel account to start tracking response times and improving your speed-to-lead."
          extra={
            <Button type="primary" size="large" href="/connect-ghl">
              Connect GHL Account
            </Button>
          }
        />
      </div>
    );
  }

  // Onboarding modal
  const OnboardingModal = () => (
    <Modal
      open={showOnboarding}
      title={<><RocketOutlined /> Welcome to Response Tracker</>}
      onCancel={() => setShowOnboarding(false)}
      footer={[
        <Button key="later" onClick={() => setShowOnboarding(false)}>
          I'll do this later
        </Button>,
        <Button 
          key="sync" 
          type="primary" 
          icon={<SyncOutlined />}
          loading={syncMutation.isLoading}
          onClick={() => {
            syncMutation.mutate();
            setShowOnboarding(false);
          }}
        >
          Sync Now
        </Button>
      ]}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="First Time Setup"
          description="We need to sync your conversations from GoHighLevel to calculate response times."
          type="info"
          showIcon
        />
        <div>
          <Text strong>What happens when you sync:</Text>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>We fetch your recent conversations</li>
            <li>Calculate response times for each</li>
            <li>Identify missed leads needing follow-up</li>
            <li>Build your team's performance metrics</li>
          </ul>
        </div>
        <Alert
          message={<><FireOutlined /> Pro Tip</>}
          description="Enable webhooks in your GHL app settings for real-time tracking!"
          type="warning"
          showIcon
        />
      </Space>
    </Modal>
  );

  // Loading state
  if (loadingOverview && !overviewData) {
    return (
      <div className="response-dashboard">
        <div className="dashboard-header">
          <Skeleton.Input active style={{ width: 300, height: 40 }} />
          <Skeleton.Button active style={{ width: 200 }} />
        </div>
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          {[1, 2, 3, 4].map(i => (
            <Col key={i} xs={24} sm={12} lg={6}>
              <Card><Skeleton active paragraph={{ rows: 2 }} /></Card>
            </Col>
          ))}
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={16}>
            <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
          </Col>
        </Row>
      </div>
    );
  }

  // Error state
  if (overviewError) {
    return (
      <div className="response-dashboard">
        <Alert
          message="Failed to Load Response Metrics"
          description={
            <Space direction="vertical">
              <Text>There was an error loading your data. This could mean:</Text>
              <ul>
                <li>Your GHL scopes need updating (add conversations.readonly)</li>
                <li>You need to sync your data first</li>
                <li>There's a temporary connection issue</li>
              </ul>
              <Space>
                <Button onClick={() => refetchOverview()}>Try Again</Button>
                <Button type="primary" onClick={() => syncMutation.mutate()}>
                  Sync Data
                </Button>
              </Space>
            </Space>
          }
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div className="response-dashboard">
      <OnboardingModal />
      
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <Title level={2} style={{ margin: 0, color: colors.text }}>
            <ThunderboltOutlined style={{ color: '#faad14' }} /> Response Tracker
          </Title>
          <Text type="secondary" className="header-subtitle">
            {SPEED_TO_LEAD_STAT}
          </Text>
        </div>
        <Space wrap className="header-controls">
          <Segmented
            options={[
              { label: '7 Days', value: 7 },
              { label: '14 Days', value: 14 },
              { label: '30 Days', value: 30 },
            ]}
            value={selectedDays}
            onChange={(value) => setSelectedDays(value as number)}
          />
          <Tooltip title={`Last synced: ${getTimeSinceSync()}`}>
            <Button 
              icon={<SyncOutlined spin={isSyncing} />}
              onClick={() => syncMutation.mutate()}
              loading={syncMutation.isLoading || isSyncing}
            >
              {isSyncing ? 'Syncing...' : 'Sync'}
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Sync Status Banner */}
      {isSyncing && (
        <Alert
          message="Syncing conversations from GHL..."
          description="This may take a minute. Data will refresh automatically."
          type="info"
          showIcon
          icon={<SyncOutlined spin />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Main Stats */}
      <Row gutter={[16, 16]} className="main-stats">
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card hero-stat" hoverable>
            <div className="stat-content">
              <div className="stat-icon">
                <ClockCircleOutlined />
              </div>
              <div className="stat-details">
                <Text className="stat-label">Avg Response Time</Text>
                <div className="stat-value" style={{ color: getGradeColor(metrics.speedGrade) }}>
                  {formatTime(metrics.avgResponseTime)}
                </div>
                <Tag 
                  color={getGradeColor(metrics.speedGrade)} 
                  style={{ marginTop: 4, fontWeight: 600 }}
                >
                  {getGradeEmoji(metrics.speedGrade)} {metrics.speedGrade}
                </Tag>
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title={<Text style={{ color: colors.subtext }}>Response Rate</Text>}
              value={metrics.responseRate}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: metrics.responseRate >= 90 ? '#52c41a' : '#faad14' }} />}
              valueStyle={{ 
                color: metrics.responseRate >= 90 ? '#52c41a' : metrics.responseRate >= 70 ? '#faad14' : '#ff4d4f',
                fontWeight: 700
              }}
            />
            <Progress 
              percent={metrics.responseRate} 
              showInfo={false} 
              strokeColor={metrics.responseRate >= 90 ? '#52c41a' : metrics.responseRate >= 70 ? '#faad14' : '#ff4d4f'}
              size="small"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {metrics.respondedConversations} of {metrics.totalConversations} conversations
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card 
            className={`stat-card ${metrics.missedConversations > 0 ? 'warning-card' : 'success-card'}`} 
            hoverable
          >
            <Statistic
              title={<Text style={{ color: colors.subtext }}>Missed Leads</Text>}
              value={metrics.missedConversations}
              prefix={metrics.missedConversations > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
              valueStyle={{ 
                color: metrics.missedConversations > 0 ? '#ff4d4f' : '#52c41a',
                fontWeight: 700
              }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {metrics.missedConversations > 0 
                ? '⚠️ No response after 1 hour' 
                : '✅ All leads contacted!'}
            </Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card" hoverable>
            <Statistic
              title={<Text style={{ color: colors.subtext }}>Fastest Response</Text>}
              value={formatTime(metrics.fastestResponse)}
              prefix={<TrophyOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#52c41a', fontWeight: 700 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              Your best time this period 🏆
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <LineChartOutlined />
                <span>Response Time Trend</span>
              </Space>
            }
            className="chart-card"
            extra={
              <Text type="secondary" style={{ fontSize: 12 }}>
                Lower is better
              </Text>
            }
          >
            {loadingTrend ? (
              <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin />
              </div>
            ) : trend.length === 0 ? (
              <Empty 
                description="No data yet. Sync to see your trend."
                style={{ padding: 60 }}
              />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#667eea" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                  <XAxis 
                    dataKey="date" 
                    stroke={colors.subtext}
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke={colors.subtext}
                    tickFormatter={(val) => formatTime(val)}
                    fontSize={12}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => [formatTimeVerbose(value), 'Avg Response']}
                    labelFormatter={(date) => new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgResponseTime" 
                    stroke="#667eea" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorResponse)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <PieChartOutlined />
                <span>Speed Distribution</span>
              </Space>
            }
            className="chart-card"
          >
            {speedDistribution.length === 0 ? (
              <Empty 
                description="No response data yet"
                style={{ padding: 60 }}
              />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={speedDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {speedDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    formatter={(value: number, name: string) => [`${value} conversations`, name]}
                    contentStyle={{ 
                      backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 8
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <Text style={{ fontSize: 12 }}>{value}</Text>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      {/* Tabs Section */}
      <Card style={{ marginTop: 16 }} className="tabs-card">
        <Tabs
          defaultActiveKey="missed"
          items={[
            {
              key: 'missed',
              label: (
                <Badge count={missed.length} offset={[10, 0]} size="small">
                  <Space>
                    <WarningOutlined style={{ color: missed.length > 0 ? '#ff4d4f' : '#52c41a' }} />
                    <span>Missed Leads</span>
                  </Space>
                </Badge>
              ),
              children: missed.length === 0 ? (
                <Result
                  status="success"
                  icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                  title="No Missed Leads!"
                  subTitle="Great job! All your leads have been contacted."
                />
              ) : (
                <Table
                  dataSource={missed}
                  columns={missedColumns}
                  rowKey="id"
                  loading={loadingMissed}
                  pagination={{ pageSize: 10 }}
                  rowClassName={(record) => {
                    const waitTime = Date.now() - new Date(record.firstInboundAt).getTime();
                    return waitTime > 3600000 ? 'urgent-row' : '';
                  }}
                />
              )
            },
            {
              key: 'team',
              label: (
                <Space>
                  <TrophyOutlined style={{ color: '#faad14' }} />
                  <span>Team Leaderboard</span>
                </Space>
              ),
              children: team.length === 0 ? (
                <Empty 
                  description="No team data yet. Team members will appear after they respond to conversations."
                />
              ) : (
                <Table
                  dataSource={team}
                  columns={teamColumns}
                  rowKey="userId"
                  loading={loadingTeam}
                  pagination={false}
                />
              )
            },
            {
              key: 'channels',
              label: (
                <Space>
                  <MessageOutlined />
                  <span>By Channel</span>
                </Space>
              ),
              children: channels.length === 0 ? (
                <Empty description="No channel data yet" />
              ) : (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={channels} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                        <XAxis 
                          type="number" 
                          stroke={colors.subtext}
                          tickFormatter={(val) => formatTime(val)}
                        />
                        <YAxis 
                          type="category" 
                          dataKey="channel" 
                          stroke={colors.subtext}
                          width={80}
                          tickFormatter={(val) => val?.toUpperCase()}
                        />
                        <RechartsTooltip 
                          formatter={(value: number) => [formatTimeVerbose(value), 'Avg Response']}
                        />
                        <Bar 
                          dataKey="avgResponseTime" 
                          fill="#667eea"
                          radius={[0, 4, 4, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Table
                      dataSource={channels}
                      rowKey="channel"
                      pagination={false}
                      size="small"
                      columns={[
                        {
                          title: 'Channel',
                          dataIndex: 'channel',
                          render: (ch: string) => (
                            <Space>
                              {getChannelIcon(ch)}
                              <Text>{ch?.toUpperCase()}</Text>
                            </Space>
                          )
                        },
                        {
                          title: 'Conversations',
                          dataIndex: 'totalConversations',
                          align: 'right' as const
                        },
                        {
                          title: 'Avg Response',
                          dataIndex: 'avgResponseTime',
                          align: 'right' as const,
                          render: (t: number) => formatTime(t)
                        },
                        {
                          title: 'Fast (<5m)',
                          dataIndex: 'fastResponses',
                          align: 'right' as const,
                          render: (v: number) => <Text type="success">{v}</Text>
                        }
                      ]}
                    />
                  </Col>
                </Row>
              )
            }
          ]}
        />
      </Card>

      {/* Benchmarks Footer */}
      <Card size="small" style={{ marginTop: 16 }} className="benchmarks-card">
        <Row align="middle" gutter={[16, 8]}>
          <Col>
            <Text strong><InfoCircleOutlined /> Industry Benchmarks:</Text>
          </Col>
          <Col>
            <Tag color="#52c41a">🚀 Excellent: &lt;1 min</Tag>
          </Col>
          <Col>
            <Tag color="#73d13d">✅ Good: &lt;5 min</Tag>
          </Col>
          <Col>
            <Tag color="#faad14">⚡ Average: &lt;15 min</Tag>
          </Col>
          <Col>
            <Tag color="#ff4d4f">🔥 Poor: &gt;15 min</Tag>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Tooltip title="Harvard Business Review, Lead Response Management Study">
              <Text type="secondary" style={{ fontSize: 12, cursor: 'help' }}>
                <FireOutlined /> Responding in &lt;5 min = 100x more likely to connect
              </Text>
            </Tooltip>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

// Add missing icon
const { PieChartOutlined, LineChartOutlined } = require('@ant-design/icons');

export default ResponseDashboard;
