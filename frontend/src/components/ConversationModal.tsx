import React from 'react';
import { useQuery } from 'react-query';
import { 
  Modal, 
  Timeline, 
  Typography, 
  Tag, 
  Space, 
  Spin, 
  Empty,
  Avatar,
  Divider,
  Button
} from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  MessageOutlined,
  LinkOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const { Text, Title } = Typography;

interface Message {
  id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  dateAdded: string;
  messageType?: string;
}

interface ConversationDetails {
  id: string;
  ghlConversationId: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  channel: string;
  firstInboundAt: string;
  firstResponseAt?: string;
  responseTimeSeconds?: number;
  messages: Message[];
}

interface ConversationModalProps {
  conversationId: string | null;
  ghlConversationId: string | null;
  onClose: () => void;
}

const formatTimestamp = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const formatResponseTime = (seconds: number): string => {
  if (!seconds) return 'No response yet';
  if (seconds < 60) return `${Math.round(seconds)} seconds`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
  return `${(seconds / 3600).toFixed(1)} hours`;
};

const ConversationModal: React.FC<ConversationModalProps> = ({ 
  conversationId, 
  ghlConversationId,
  onClose 
}) => {
  const { isDarkMode } = useTheme();
  
  const { data, isLoading, error } = useQuery<{ data: ConversationDetails }>(
    ['conversation-detail', conversationId],
    () => api.get(`/api/metrics/conversation/${conversationId}`).then(res => res.data),
    { 
      enabled: !!conversationId,
      staleTime: 30000 
    }
  );

  const conversation = data?.data;
  const messages = conversation?.messages || [];

  const colors = {
    inbound: isDarkMode ? '#1f3d1f' : '#f6ffed',
    outbound: isDarkMode ? '#1f1f3d' : '#e6f7ff',
    inboundBorder: '#52c41a',
    outboundBorder: '#1890ff',
  };

  return (
    <Modal
      open={!!conversationId}
      onCancel={onClose}
      title={
        <Space>
          <MessageOutlined />
          <span>Conversation Timeline</span>
        </Space>
      }
      width={600}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button 
          key="ghl" 
          type="primary" 
          icon={<LinkOutlined />}
          onClick={() => {
            const url = `https://app.gohighlevel.com/v2/location/conversations/${ghlConversationId}`;
            window.open(url, '_blank');
          }}
        >
          Open in GHL
        </Button>
      ]}
      styles={{
        body: { maxHeight: '60vh', overflowY: 'auto' }
      }}
    >
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
            Loading conversation...
          </Text>
        </div>
      ) : error ? (
        <Empty description="Failed to load conversation details" />
      ) : conversation ? (
        <>
          {/* Contact Header */}
          <div style={{ 
            padding: 16, 
            background: isDarkMode ? '#1f1f1f' : '#fafafa',
            borderRadius: 8,
            marginBottom: 16
          }}>
            <Space direction="vertical" size={4}>
              <Title level={5} style={{ margin: 0 }}>
                {conversation.contactName || 'Unknown Contact'}
              </Title>
              {conversation.contactPhone && (
                <Text type="secondary">
                  <PhoneOutlined /> {conversation.contactPhone}
                </Text>
              )}
              {conversation.contactEmail && (
                <Text type="secondary">
                  <MailOutlined /> {conversation.contactEmail}
                </Text>
              )}
              <Space style={{ marginTop: 8 }}>
                <Tag color="blue">{conversation.channel?.toUpperCase()}</Tag>
                {conversation.responseTimeSeconds ? (
                  <Tag color={conversation.responseTimeSeconds < 300 ? 'green' : 'orange'}>
                    <ClockCircleOutlined /> {formatResponseTime(conversation.responseTimeSeconds)}
                  </Tag>
                ) : (
                  <Tag color="red">No Response</Tag>
                )}
              </Space>
            </Space>
          </div>

          <Divider style={{ margin: '16px 0' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </Text>
          </Divider>

          {/* Message Timeline */}
          {messages.length === 0 ? (
            <Empty description="No messages found" />
          ) : (
            <Timeline
              items={messages.map((msg) => ({
                color: msg.direction === 'inbound' ? 'green' : 'blue',
                dot: msg.direction === 'inbound' ? (
                  <Avatar size="small" icon={<UserOutlined />} style={{ background: '#52c41a' }} />
                ) : (
                  <Avatar size="small" icon={<RobotOutlined />} style={{ background: '#1890ff' }} />
                ),
                children: (
                  <div style={{
                    background: msg.direction === 'inbound' ? colors.inbound : colors.outbound,
                    border: `1px solid ${msg.direction === 'inbound' ? colors.inboundBorder : colors.outboundBorder}`,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8
                  }}>
                    <div style={{ marginBottom: 4 }}>
                      <Text strong style={{ fontSize: 12 }}>
                        {msg.direction === 'inbound' ? 'Lead' : 'Team'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>
                        {formatTimestamp(msg.dateAdded)}
                      </Text>
                    </div>
                    <Text style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.body || <em style={{ color: '#999' }}>[No content]</em>}
                    </Text>
                  </div>
                )
              }))}
            />
          )}
        </>
      ) : (
        <Empty description="No conversation data" />
      )}
    </Modal>
  );
};

export default ConversationModal;
