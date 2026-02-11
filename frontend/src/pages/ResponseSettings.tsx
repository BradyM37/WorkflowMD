import React from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Card, 
  Form, 
  InputNumber, 
  Switch, 
  Input, 
  Button, 
  Space, 
  Typography, 
  Divider,
  Alert,
  Spin,
  Row,
  Col,
  Radio,
  Tag
} from 'antd';
import {
  BellOutlined,
  SlackOutlined,
  MailOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FireOutlined,
  SaveOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  TrophyOutlined,
  RocketOutlined,
  NotificationOutlined
} from '@ant-design/icons';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

// AlertSettings interface documented in API types

const GOAL_PRESETS = [
  { value: 60, label: '1 min', description: 'Elite' },
  { value: 120, label: '2 min', description: 'Recommended' },
  { value: 300, label: '5 min', description: 'Standard' },
];

const SLACK_ALERT_PRESETS = [
  { value: 180, label: '3 min', description: 'Fast' },
  { value: 300, label: '5 min', description: 'Recommended' },
  { value: 600, label: '10 min', description: 'Relaxed' },
];

const ResponseSettings: React.FC = () => {
  useTheme(); // Theme context for future use
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // Fetch current settings
  const { isLoading } = useQuery(
    'response-settings',
    () => api.get('/api/settings/response').then(res => res.data.data),
    {
      onSuccess: (data) => {
        form.setFieldsValue({
          warningThreshold: Math.round(data.settings.warningThreshold / 60),
          criticalThreshold: Math.round(data.settings.criticalThreshold / 60),
          missedThreshold: Math.round(data.settings.missedThreshold / 60),
          emailAlerts: data.settings.emailAlerts,
          slackWebhookUrl: data.settings.slackWebhookUrl,
          alertWaitThreshold: data.settings.alertWaitThreshold || 300,
          targetResponseTime: data.settings.targetResponseTime || 120
        });
      }
    }
  );

  // Save settings mutation
  const saveMutation = useMutation(
    (values: any) => api.put('/api/settings/response', {
      warningThreshold: values.warningThreshold * 60,
      criticalThreshold: values.criticalThreshold * 60,
      missedThreshold: values.missedThreshold * 60,
      emailAlerts: values.emailAlerts,
      slackWebhookUrl: values.slackWebhookUrl || null,
      alertWaitThreshold: values.alertWaitThreshold,
      targetResponseTime: values.targetResponseTime
    }),
    {
      onSuccess: () => {
        toast.success('Settings saved!');
        queryClient.invalidateQueries('response-settings');
        queryClient.invalidateQueries('metrics-goals');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error?.message || 'Failed to save settings');
      }
    }
  );

  // Test Slack webhook
  const testSlackMutation = useMutation(
    (webhookUrl: string) => api.post('/api/settings/response/test-slack', { webhookUrl }),
    {
      onSuccess: () => {
        toast.success('Test message sent to Slack!');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error?.message || 'Failed to send test message');
      }
    }
  );

  const handleSubmit = (values: any) => {
    saveMutation.mutate(values);
  };

  const handleTestSlack = () => {
    const webhookUrl = form.getFieldValue('slackWebhookUrl');
    if (!webhookUrl) {
      toast.error('Please enter a Slack webhook URL first');
      return;
    }
    testSlackMutation.mutate(webhookUrl);
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Button onClick={() => navigate('/response-tracker')} type="link" style={{ padding: 0 }}>
          ← Back to Response Tracker
        </Button>
        <Title level={2} style={{ marginTop: 8, marginBottom: 4 }}>
          <BellOutlined /> Alert & Goal Settings
        </Title>
        <Text type="secondary">
          Configure your response time goals and notification preferences
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          warningThreshold: 5,
          criticalThreshold: 15,
          missedThreshold: 60,
          emailAlerts: true,
          alertWaitThreshold: 300,
          targetResponseTime: 120
        }}
      >
        {/* Response Time Goal */}
        <Card 
          title={
            <Space>
              <TrophyOutlined style={{ color: '#faad14' }} />
              <span>Response Time Goal</span>
              <Tag color="blue">NEW</Tag>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Alert
            message="Set your target response time"
            description="This goal will be tracked on your dashboard. Aim for under 5 minutes to maximize lead conversion."
            type="info"
            showIcon
            icon={<RocketOutlined />}
            style={{ marginBottom: 24 }}
          />

          <Form.Item
            name="targetResponseTime"
            label={
              <Space>
                <ThunderboltOutlined style={{ color: '#667eea' }} />
                <span>Target Response Time</span>
              </Space>
            }
          >
            <Radio.Group buttonStyle="solid" size="large">
              {GOAL_PRESETS.map(preset => (
                <Radio.Button key={preset.value} value={preset.value}>
                  <Space direction="vertical" size={0} align="center" style={{ padding: '4px 8px' }}>
                    <Text strong>{preset.label}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {preset.description}
                      {preset.value === 120 && ' ⭐'}
                    </Text>
                  </Space>
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>

          <Text type="secondary">
            <InfoCircleOutlined /> Your dashboard will show what percentage of responses meet this goal.
            Celebrate when you hit 90%+ for the day!
          </Text>
        </Card>

        {/* Response Time Thresholds */}
        <Card title="Response Time Thresholds" style={{ marginBottom: 24 }}>
          <Alert
            message="These thresholds determine your response time grade"
            description="Set realistic goals based on your team's capacity. Industry best practice is to respond within 5 minutes."
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ marginBottom: 24 }}
          />

          <Row gutter={24}>
            <Col xs={24} md={8}>
              <Form.Item
                name="warningThreshold"
                label={
                  <Space>
                    <WarningOutlined style={{ color: '#faad14' }} />
                    <span>Warning Threshold</span>
                  </Space>
                }
                tooltip="Responses slower than this will be flagged as 'Average'"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber
                  min={1}
                  max={1440}
                  addonAfter="minutes"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="criticalThreshold"
                label={
                  <Space>
                    <FireOutlined style={{ color: '#ff7a45' }} />
                    <span>Critical Threshold</span>
                  </Space>
                }
                tooltip="Responses slower than this will be flagged as 'Poor'"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber
                  min={1}
                  max={1440}
                  addonAfter="minutes"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                name="missedThreshold"
                label={
                  <Space>
                    <ClockCircleOutlined style={{ color: '#ff4d4f' }} />
                    <span>Missed Lead Threshold</span>
                  </Space>
                }
                tooltip="Conversations with no response after this time are marked as missed"
                rules={[{ required: true, message: 'Required' }]}
              >
                <InputNumber
                  min={5}
                  max={1440}
                  addonAfter="minutes"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Paragraph type="secondary" style={{ marginTop: 8 }}>
            <ThunderboltOutlined /> <strong>Pro tip:</strong> Start with achievable goals and gradually improve. 
            The best performing teams respond within 5 minutes.
          </Paragraph>
        </Card>

        {/* Notifications */}
        <Card 
          title={
            <Space>
              <NotificationOutlined />
              <span>Notifications</span>
            </Space>
          }
          style={{ marginBottom: 24 }}
        >
          <Form.Item
            name="emailAlerts"
            valuePropName="checked"
            label={
              <Space>
                <MailOutlined style={{ color: '#1890ff' }} />
                <span>Email Alerts</span>
              </Space>
            }
          >
            <Switch checkedChildren="On" unCheckedChildren="Off" />
          </Form.Item>
          <Text type="secondary">
            Receive daily summary emails with your team's response time performance
          </Text>

          <Divider />

          <Form.Item
            name="slackWebhookUrl"
            label={
              <Space>
                <SlackOutlined style={{ color: '#4A154B' }} />
                <span>Slack Webhook URL</span>
              </Space>
            }
            tooltip="Get real-time alerts in your Slack channel"
          >
            <Input
              placeholder="https://hooks.slack.com/services/..."
              addonAfter={
                <Button 
                  type="link" 
                  size="small" 
                  onClick={handleTestSlack}
                  loading={testSlackMutation.isLoading}
                  style={{ margin: -7 }}
                >
                  Test
                </Button>
              }
            />
          </Form.Item>
          <Text type="secondary">
            Optional: Add a Slack webhook to receive real-time alerts for waiting leads.{' '}
            <a 
              href="https://api.slack.com/messaging/webhooks" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Learn how to create a webhook →
            </a>
          </Text>

          {/* Slack Alert Timing */}
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => 
              prevValues.slackWebhookUrl !== currentValues.slackWebhookUrl
            }
          >
            {({ getFieldValue }) => 
              getFieldValue('slackWebhookUrl') ? (
                <>
                  <Divider dashed />
                  <Form.Item
                    name="alertWaitThreshold"
                    label={
                      <Space>
                        <ClockCircleOutlined style={{ color: '#667eea' }} />
                        <span>Send Slack Alert After</span>
                        <Tag color="green">Real-time</Tag>
                      </Space>
                    }
                    tooltip="How long to wait before sending a Slack alert for a waiting lead"
                  >
                    <Radio.Group buttonStyle="solid">
                      {SLACK_ALERT_PRESETS.map(preset => (
                        <Radio.Button key={preset.value} value={preset.value}>
                          <Space direction="vertical" size={0} align="center" style={{ padding: '2px 4px' }}>
                            <Text strong style={{ fontSize: 13 }}>{preset.label}</Text>
                            <Text type="secondary" style={{ fontSize: 10 }}>
                              {preset.description}
                            </Text>
                          </Space>
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </Form.Item>
                  <Alert
                    message="Real-time Slack Alerts"
                    description={
                      <>
                        When a lead has been waiting longer than this threshold without a response, 
                        you'll get a Slack alert with their details and a direct link to respond in GHL.
                        <br /><br />
                        <strong>Alert includes:</strong> Contact name, phone, channel, wait time, and "Respond Now" button
                      </>
                    }
                    type="success"
                    showIcon
                    icon={<SlackOutlined />}
                    style={{ marginTop: 16 }}
                  />
                </>
              ) : null
            }
          </Form.Item>
        </Card>

        <Card>
          <Space>
            <Button 
              type="primary" 
              htmlType="submit" 
              icon={<SaveOutlined />}
              loading={saveMutation.isLoading}
              size="large"
            >
              Save Settings
            </Button>
            <Button onClick={() => navigate('/response-tracker')}>
              Cancel
            </Button>
          </Space>
        </Card>
      </Form>
    </div>
  );
};

export default ResponseSettings;
