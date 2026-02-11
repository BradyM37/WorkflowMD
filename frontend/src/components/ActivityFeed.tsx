import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  List, 
  Typography, 
  Space, 
  Tag, 
  Badge, 
  Button,
  Empty,
  Tooltip,
  Avatar,
  Skeleton,
  theme
} from 'antd';
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  UserOutlined,
  MessageOutlined,
  MailOutlined,
  PhoneOutlined,
  FacebookOutlined,
  InstagramOutlined,
  WhatsAppOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ExpandOutlined,
  CompressOutlined,
  BellOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from 'react-query';
import api from '../services/api';

const { Text, Title } = Typography;

interface Activity {
  id: string;
  type: 'response' | 'missed' | 'new_lead';
  responderName: string;
  contactName: string;
  channel: string;
  responseTimeSeconds: number | null;
  timestamp: string;
  isMissed: boolean;
}

interface ActivityFeedProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

const getChannelIcon = (channel: string): React.ReactNode => {
  const icons: Record<string, React.ReactNode> = {
    'sms': <MessageOutlined style={{ color: '#52c41a' }} />,
    'email': <MailOutlined style={{ color: '#1890ff' }} />,
    'phone': <PhoneOutlined style={{ color: '#722ed1' }} />,
    'facebook': <FacebookOutlined style={{ color: '#1877f2' }} />,
    'instagram': <InstagramOutlined style={{ color: '#e4405f' }} />,
    'whatsapp': <WhatsAppOutlined style={{ color: '#25d366' }} />,
  };
  return icons[channel?.toLowerCase()] || <MessageOutlined style={{ color: '#8c8c8c' }} />;
};

const formatResponseTime = (seconds: number): string => {
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

const formatTimeAgo = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
};

const getResponseQualityColor = (seconds: number | null): string => {
  if (seconds === null) return '#ff4d4f';  // Error red
  if (seconds < 60) return '#52c41a';      // Success green
  if (seconds < 300) return '#73d13d';     // Light green
  if (seconds < 900) return '#faad14';     // Warning yellow
  return '#fa8c16';                        // Orange
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  collapsed = false, 
  onToggle 
}) => {
  const { token } = theme.useToken();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  
  // Fetch recent activities
  const { data, isLoading, refetch, isFetching } = useQuery(
    'activity-feed',
    async () => {
      const response = await api.get('/api/metrics/activity?limit=20');
      return response.data.data;
    },
    {
      refetchInterval: 30000, // Auto-refresh every 30 seconds
      onSuccess: () => setLastUpdate(new Date()),
      staleTime: 25000
    }
  );

  const activities: Activity[] = data?.activities || [];

  // Manual refresh handler
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Activity item component with animation
  const ActivityItem: React.FC<{ activity: Activity; index: number }> = ({ activity, index }) => {
    const isGoodResponse = activity.responseTimeSeconds !== null && activity.responseTimeSeconds < 300;
    const qualityColor = getResponseQualityColor(activity.responseTimeSeconds);
    
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ delay: index * 0.05, duration: 0.3 }}
      >
        <List.Item
          style={{
            padding: '12px 16px',
            borderRadius: token.borderRadius,
            marginBottom: 8,
            background: activity.isMissed 
              ? 'rgba(255, 77, 79, 0.06)' 
              : isGoodResponse 
              ? 'rgba(82, 196, 26, 0.06)' 
              : token.colorBgTextHover,
            border: `1px solid ${activity.isMissed ? 'rgba(255, 77, 79, 0.2)' : 'transparent'}`,
            transition: 'all 0.2s ease'
          }}
        >
          <List.Item.Meta
            avatar={
              <Avatar 
                size={40} 
                style={{ 
                  backgroundColor: qualityColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {activity.isMissed ? (
                  <WarningOutlined />
                ) : (
                  <CheckCircleOutlined />
                )}
              </Avatar>
            }
            title={
              <Space size={4} wrap>
                <Text strong style={{ fontSize: 13 }}>
                  {activity.responderName || 'Unknown'}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  responded to
                </Text>
                <Text strong style={{ fontSize: 13 }}>
                  {activity.contactName || 'Unknown Contact'}
                </Text>
              </Space>
            }
            description={
              <Space size={12} style={{ marginTop: 4 }}>
                <Tag 
                  icon={getChannelIcon(activity.channel)} 
                  style={{ 
                    margin: 0, 
                    fontSize: 11,
                    background: 'transparent',
                    border: `1px solid ${token.colorBorder}`
                  }}
                >
                  {activity.channel?.toUpperCase()}
                </Tag>
                
                {activity.responseTimeSeconds !== null ? (
                  <Tooltip title="Response time">
                    <Tag 
                      color={qualityColor}
                      style={{ margin: 0, fontWeight: 600 }}
                    >
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {formatResponseTime(activity.responseTimeSeconds)}
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tag color="error" style={{ margin: 0 }}>
                    No response
                  </Tag>
                )}
                
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {formatTimeAgo(activity.timestamp)}
                </Text>
              </Space>
            }
          />
        </List.Item>
      </motion.div>
    );
  };

  // Collapsed view - just shows count
  if (collapsed) {
    return (
      <motion.div
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: 60, opacity: 1 }}
        exit={{ width: 0, opacity: 0 }}
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 1000
        }}
      >
        <Tooltip title="Open Activity Feed" placement="left">
          <Button
            type="primary"
            icon={<BellOutlined />}
            onClick={onToggle}
            style={{
              height: 60,
              width: 60,
              borderRadius: '12px 0 0 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Badge 
              count={activities.filter(a => a.isMissed).length} 
              size="small"
              offset={[0, -8]}
            />
          </Button>
        </Tooltip>
      </motion.div>
    );
  }

  return (
    <Card
      title={
        <Space>
          <ThunderboltOutlined style={{ color: '#faad14' }} />
          <span>Live Activity</span>
          <Badge 
            status="processing" 
            text={<Text type="secondary" style={{ fontSize: 11 }}>Auto-refresh</Text>}
          />
        </Space>
      }
      extra={
        <Space>
          <Tooltip title={`Last updated: ${lastUpdate.toLocaleTimeString()}`}>
            <Button 
              icon={<SyncOutlined spin={isFetching} />} 
              size="small"
              onClick={handleRefresh}
              type="text"
            />
          </Tooltip>
          {onToggle && (
            <Tooltip title="Collapse">
              <Button 
                icon={<CompressOutlined />} 
                size="small"
                onClick={onToggle}
                type="text"
              />
            </Tooltip>
          )}
        </Space>
      }
      bodyStyle={{ 
        padding: '8px 12px',
        maxHeight: 500,
        overflowY: 'auto'
      }}
      style={{
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)'
      }}
    >
      {isLoading ? (
        <Space direction="vertical" style={{ width: '100%' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton 
              key={i} 
              avatar 
              active 
              paragraph={{ rows: 1 }} 
              style={{ marginBottom: 8 }}
            />
          ))}
        </Space>
      ) : activities.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text type="secondary">
              No recent activity. Responses will appear here in real-time.
            </Text>
          }
          style={{ padding: '40px 0' }}
        />
      ) : (
        <AnimatePresence mode="popLayout">
          <List
            dataSource={activities}
            renderItem={(activity, index) => (
              <ActivityItem key={activity.id} activity={activity} index={index} />
            )}
          />
        </AnimatePresence>
      )}
      
      {/* Footer stats */}
      {activities.length > 0 && (
        <div 
          style={{ 
            borderTop: `1px solid ${token.colorBorder}`,
            marginTop: 8,
            paddingTop: 12,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Space split={<span style={{ color: token.colorBorder }}>•</span>}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 4 }} />
              {activities.filter(a => !a.isMissed && a.responseTimeSeconds && a.responseTimeSeconds < 300).length} fast
            </Text>
            <Text type="secondary" style={{ fontSize: 11 }}>
              <WarningOutlined style={{ color: '#ff4d4f', marginRight: 4 }} />
              {activities.filter(a => a.isMissed).length} missed
            </Text>
          </Space>
          <Text type="secondary" style={{ fontSize: 10 }}>
            Last 24h
          </Text>
        </div>
      )}
    </Card>
  );
};

export default ActivityFeed;
