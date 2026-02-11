import React from 'react';
import { useQuery } from 'react-query';
import {
  Modal,
  Spin,
  Typography,
  Row,
  Col,
  Statistic,
  Tag,
  Table,
  Space,
  Tooltip,
  Empty,
  Divider
} from 'antd';
import {
  ClockCircleOutlined,
  TrophyOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Text } = Typography;

interface UserStatsModalProps {
  userId: string | null;
  userName: string;
  onClose: () => void;
}

interface UserStats {
  userId: string;
  userName: string;
  stats: {
    totalResponses: number;
    avgResponseTime: number;
    fastestResponse: number;
    slowestResponse: number;
    missedCount: number;
    under1Min: number;
    under5Min: number;
  };
  dailyTrend: { date: string; avgResponseTime: number; totalConversations: number }[];
  recentConversations: {
    id: string;
    contactName: string;
    channel: string;
    firstInboundAt: string;
    responseTimeSeconds: number;
    isMissed: boolean;
  }[];
  badges: { type: string; earnedAt: string; icon: string; label: string }[];
}

const formatTime = (seconds: number): string => {
  if (!seconds) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
};

const getChannelIcon = (channel: string): string => {
  const icons: Record<string, string> = {
    sms: '💬', email: '📧', phone: '📞', facebook: '📘',
    instagram: '📸', whatsapp: '💚', google: '🔍', webchat: '🌐'
  };
  return icons[channel?.toLowerCase()] || '💬';
};

const UserStatsModal: React.FC<UserStatsModalProps> = ({ userId, userName, onClose }) => {
  const { isDarkMode } = useTheme();

  const { data, isLoading } = useQuery<{ data: UserStats }>(
    ['user-stats', userId],
    () => api.get(`/api/metrics/user/${userId}?days=30`).then(res => res.data),
    { enabled: !!userId }
  );

  const user = data?.data;
  const colors = {
    border: isDarkMode ? '#303030' : '#f0f0f0',
    subtext: isDarkMode ? '#8c8c8c' : '#595959'
  };

  const columns = [
    {
      title: 'Contact',
      dataIndex: 'contactName',
      key: 'contactName',
      render: (name: string, record: any) => (
        <Space>
          <span>{getChannelIcon(record.channel)}</span>
          <Text>{name || 'Unknown'}</Text>
        </Space>
      )
    },
    {
      title: 'Response Time',
      dataIndex: 'responseTimeSeconds',
      key: 'responseTime',
      render: (time: number, record: any) => (
        record.isMissed ? (
          <Tag color="red">Missed</Tag>
        ) : (
          <Tag color={time < 60 ? 'green' : time < 300 ? 'blue' : 'orange'}>
            {formatTime(time)}
          </Tag>
        )
      )
    },
    {
      title: 'When',
      dataIndex: 'firstInboundAt',
      key: 'when',
      render: (date: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      )
    }
  ];

  return (
    <Modal
      open={!!userId}
      onCancel={onClose}
      title={
        <Space>
          <TrophyOutlined style={{ color: '#faad14' }} />
          <span>{userName || 'Team Member'} Stats</span>
        </Space>
      }
      footer={null}
      width={700}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
      ) : !user ? (
        <Empty description="No data available" />
      ) : (
        <>
          {/* Badges */}
          {user.badges.length > 0 && (
            <>
              <div style={{ marginBottom: 16 }}>
                <Text strong>Badges Earned</Text>
                <div style={{ marginTop: 8 }}>
                  {user.badges.slice(0, 10).map((badge, i) => (
                    <Tooltip key={i} title={`${badge.label} - ${new Date(badge.earnedAt).toLocaleDateString()}`}>
                      <Tag style={{ fontSize: 16, padding: '4px 8px', marginBottom: 4 }}>
                        {badge.icon} {badge.label}
                      </Tag>
                    </Tooltip>
                  ))}
                </div>
              </div>
              <Divider style={{ margin: '12px 0' }} />
            </>
          )}

          {/* Stats */}
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic
                title="Avg Response"
                value={formatTime(user.stats.avgResponseTime)}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: user.stats.avgResponseTime < 300 ? '#52c41a' : '#faad14' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Fastest"
                value={formatTime(user.stats.fastestResponse)}
                prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Total Responses"
                value={user.stats.totalResponses}
                prefix={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Missed"
                value={user.stats.missedCount}
                prefix={<WarningOutlined />}
                valueStyle={{ color: user.stats.missedCount > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Col>
          </Row>

          {/* Mini Chart */}
          {user.dailyTrend.length > 0 && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <Text strong>Response Time Trend (30 days)</Text>
              <div style={{ height: 150, marginTop: 8 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={user.dailyTrend}>
                    <defs>
                      <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#667eea" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
                    <XAxis
                      dataKey="date"
                      stroke={colors.subtext}
                      tickFormatter={(d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      fontSize={10}
                    />
                    <YAxis stroke={colors.subtext} tickFormatter={(v) => formatTime(v)} fontSize={10} />
                    <RechartsTooltip formatter={(v: number) => [formatTime(v), 'Avg']} />
                    <Area type="monotone" dataKey="avgResponseTime" stroke="#667eea" fill="url(#userGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}

          {/* Recent Conversations */}
          <Divider style={{ margin: '16px 0' }} />
          <Text strong>Recent Conversations</Text>
          <Table
            dataSource={user.recentConversations}
            columns={columns}
            rowKey="id"
            size="small"
            pagination={false}
            style={{ marginTop: 8 }}
          />
        </>
      )}
    </Modal>
  );
};

export default UserStatsModal;
