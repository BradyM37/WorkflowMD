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
  message,
  Tooltip,
  Row,
  Col
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
  InfoCircleOutlined
} from '@ant-design/icons';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

interface AlertSettings {
  warningThreshold: number;
  criticalThreshold: number;
  missedThreshold: number;
  emailAlerts: boolean;
  slackWebhookUrl?: string;
}

const ResponseSettings: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();

  // Fetch current settings
  const { data: settingsData, isLoading } = useQuery(
    'response-settings',
    () => api.get('/api/settings/response').then(res => res.data.data),
    {
      onSuccess: (data) => {
        form.setFieldsValue({
          warningThreshold: Math.round(data.settings.warningThreshold / 60),
          criticalThreshold: Math.round(data.settings.criticalThreshold / 60),
          missedThreshold: Math.round(data.settings.missedThreshold / 60),
          emailAlerts: data.settings.emailAlerts,
          slackWebhookUrl: data.settings.slackWebhookUrl
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
      slackWebhookUrl: values.slackWebhookUrl || null
    }),
    {
      onSuccess: () => {
        toast.success('Settings saved!');
        queryClient.invalidateQueries('response-settings');
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

  const colors = {
    cardBg: isDarkMode ? '#1f1f1f' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subtext: isDarkMode ? '#8c8c8c' : '#595959',
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Button onClick={() => navigate('/response-tracker')} type="link" style={{ padding: 0 }}>
          ← Back to Response Tracker
        </Button>
        <Title level={2} style={{ marginTop: 8, marginBottom: 4 }}>
          <BellOutlined /> Alert Settings
        </Title>
        <Text type="secondary">
          Configure when to receive alerts about slow response times
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
          emailAlerts: true
        }}
      >
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

        <Card title="Notifications" style={{ marginBottom: 24 }}>
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
            Optional: Add a Slack webhook to receive real-time alerts for missed leads.{' '}
            <a 
              href="https://api.slack.com/messaging/webhooks" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              Learn how to create a webhook →
            </a>
          </Text>
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
