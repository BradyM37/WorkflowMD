import React, { useEffect } from 'react';
import { Layout, Typography, Collapse, Card, Space, Button, Divider, Tag } from 'antd';
import {
  QuestionCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  BellOutlined,
  TrophyOutlined,
  DollarOutlined,
  RocketOutlined,
  MailOutlined,
  BookOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { Panel } = Collapse;

const Help: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [shortcutsModalVisible, setShortcutsModalVisible] = React.useState(false);

  // Listen for "?" key to open shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        setShortcutsModalVisible(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const faqItems = [
    {
      key: '1',
      icon: <ClockCircleOutlined style={{ color: '#667eea' }} />,
      question: 'How does response time tracking work?',
      answer: (
        <>
          <Paragraph>
            Response time tracking monitors the time between when a lead first contacts you and when your team responds.
            The system tracks multiple channels including:
          </Paragraph>
          <ul>
            <li><strong>Form submissions</strong> - When a lead fills out a contact form</li>
            <li><strong>Phone calls</strong> - Inbound call timestamps</li>
            <li><strong>SMS messages</strong> - Text message conversations</li>
            <li><strong>Email inquiries</strong> - Incoming email timestamps</li>
          </ul>
          <Paragraph>
            The clock starts when the lead reaches out and stops when your team sends a response 
            (call, text, or email). We calculate average response times, track trends, and compare 
            your performance against industry benchmarks.
          </Paragraph>
        </>
      ),
    },
    {
      key: '2',
      icon: <WarningOutlined style={{ color: '#ff4d4f' }} />,
      question: 'What counts as a missed lead?',
      answer: (
        <>
          <Paragraph>
            A lead is considered <Text strong>"missed"</Text> when:
          </Paragraph>
          <ul>
            <li>No response is recorded within 24 hours of initial contact</li>
            <li>The lead goes through your workflow but receives no human follow-up</li>
            <li>Automated messages were sent but no personal outreach occurred</li>
          </ul>
          <Paragraph>
            <Text type="warning">Important:</Text> Automated responses (like auto-reply emails) don't count 
            as a response. We track actual human engagement to give you accurate metrics.
          </Paragraph>
          <Paragraph>
            You can configure missed lead thresholds in <Text code>Settings → Response Tracker</Text>.
          </Paragraph>
        </>
      ),
    },
    {
      key: '3',
      icon: <BellOutlined style={{ color: '#52c41a' }} />,
      question: 'How do I set up Slack alerts?',
      answer: (
        <>
          <Paragraph>
            Slack integration keeps your team instantly notified about lead activity:
          </Paragraph>
          <ol>
            <li>Go to <Text code>Settings → Integrations</Text></li>
            <li>Click "Connect Slack" and authorize FirstResponse</li>
            <li>Select the channel for alerts (or create a dedicated #leads channel)</li>
            <li>Configure alert types:
              <ul>
                <li><Tag color="green">New Lead</Tag> - Instant notification when leads come in</li>
                <li><Tag color="orange">Slow Response</Tag> - Alert when response time exceeds threshold</li>
                <li><Tag color="red">Missed Lead</Tag> - Urgent alert for missed opportunities</li>
                <li><Tag color="blue">Daily Summary</Tag> - End-of-day performance recap</li>
              </ul>
            </li>
          </ol>
          <Paragraph>
            Pro tip: Set up separate channels for urgent alerts vs. daily summaries to avoid notification fatigue.
          </Paragraph>
        </>
      ),
    },
    {
      key: '4',
      icon: <TrophyOutlined style={{ color: '#faad14' }} />,
      question: 'What do the benchmark tiers mean?',
      answer: (
        <>
          <Paragraph>
            Benchmark tiers compare your response times against industry standards:
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
            <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
              <Text strong style={{ color: '#52c41a' }}>🏆 Elite (Under 5 min)</Text>
              <br />
              <Text type="secondary">Top 5% of businesses. Leads are 21x more likely to convert.</Text>
            </Card>
            <Card size="small" style={{ background: '#e6f7ff', border: '1px solid #91d5ff' }}>
              <Text strong style={{ color: '#1890ff' }}>⚡ Fast (5-15 min)</Text>
              <br />
              <Text type="secondary">Top 20%. Strong competitive advantage.</Text>
            </Card>
            <Card size="small" style={{ background: '#fff7e6', border: '1px solid #ffd591' }}>
              <Text strong style={{ color: '#faad14' }}>⏱️ Average (15-60 min)</Text>
              <br />
              <Text type="secondary">Industry standard. Room for improvement.</Text>
            </Card>
            <Card size="small" style={{ background: '#fff2f0', border: '1px solid #ffccc7' }}>
              <Text strong style={{ color: '#ff4d4f' }}>🐢 Slow (Over 60 min)</Text>
              <br />
              <Text type="secondary">Below average. Significant revenue at risk.</Text>
            </Card>
          </Space>
          <Paragraph>
            <Text type="secondary">
              Source: MIT/InsideSales.com research shows responding within 5 minutes is 
              100x more effective than waiting 30 minutes.
            </Text>
          </Paragraph>
        </>
      ),
    },
    {
      key: '5',
      icon: <DollarOutlined style={{ color: '#722ed1' }} />,
      question: 'How is ROI calculated?',
      answer: (
        <>
          <Paragraph>
            ROI (Return on Investment) is calculated based on recovered revenue from improved response times:
          </Paragraph>
          <Card size="small" style={{ background: isDarkMode ? '#1f1f1f' : '#fafafa', marginBottom: 16 }}>
            <Text code style={{ fontSize: 14 }}>
              ROI = (Recovered Leads × Average Deal Value) - Subscription Cost
            </Text>
          </Card>
          <Paragraph>
            <strong>How we calculate recovered leads:</strong>
          </Paragraph>
          <ul>
            <li>We track your response time improvement since using FirstResponse</li>
            <li>Industry data shows each 10-minute improvement recovers ~15% more leads</li>
            <li>Multiply recovered lead % by your total lead volume</li>
            <li>Apply your average deal value (set in Settings)</li>
          </ul>
          <Paragraph>
            <Text type="secondary">
              Example: If you improved from 45min to 10min average response, that's 35 minutes faster. 
              With 100 leads/month and $500 average deal, you'd recover ~20 leads = $10,000/month.
            </Text>
          </Paragraph>
        </>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: isDarkMode ? '#141414' : '#f0f2f5' }}>
      <Content style={{ padding: '24px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <QuestionCircleOutlined style={{ fontSize: 48, color: '#667eea', marginBottom: 16 }} />
          <Title level={2} style={{ marginBottom: 8 }}>Help & Documentation</Title>
          <Paragraph type="secondary" style={{ fontSize: 16 }}>
            Everything you need to get the most out of FirstResponse
          </Paragraph>
        </div>

        {/* Getting Started */}
        <Card 
          title={<><RocketOutlined /> Getting Started</>}
          style={{ marginBottom: 24 }}
          className={isDarkMode ? 'dark-card' : ''}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={5}>1. Connect Your GHL Account</Title>
              <Paragraph type="secondary">
                Link your GoHighLevel account to start analyzing workflows and tracking response times.
                We request read-only access to your contacts, conversations, and workflows.
              </Paragraph>
            </div>
            <div>
              <Title level={5}>2. Configure Response Tracking</Title>
              <Paragraph type="secondary">
                Set your target response time, business hours, and notification preferences 
                in Settings → Response Tracker.
              </Paragraph>
            </div>
            <div>
              <Title level={5}>3. Set Up Alerts</Title>
              <Paragraph type="secondary">
                Connect Slack or configure email alerts to get notified about slow responses 
                and missed leads in real-time.
              </Paragraph>
            </div>
            <div>
              <Title level={5}>4. Review Your Dashboard</Title>
              <Paragraph type="secondary">
                Check the Response Tracker dashboard daily to monitor team performance, 
                identify bottlenecks, and celebrate wins.
              </Paragraph>
            </div>
          </Space>
        </Card>

        {/* FAQ Section */}
        <Card 
          title={<><BookOutlined /> Frequently Asked Questions</>}
          style={{ marginBottom: 24 }}
          className={isDarkMode ? 'dark-card' : ''}
        >
          <Collapse 
            accordion 
            expandIconPosition="end"
            style={{ background: 'transparent', border: 'none' }}
          >
            {faqItems.map(item => (
              <Panel 
                key={item.key}
                header={
                  <Space>
                    {item.icon}
                    <Text strong>{item.question}</Text>
                  </Space>
                }
                style={{ 
                  marginBottom: 8, 
                  background: isDarkMode ? '#1f1f1f' : '#fff',
                  borderRadius: 8,
                  border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
                }}
              >
                {item.answer}
              </Panel>
            ))}
          </Collapse>
        </Card>

        {/* Keyboard Shortcuts */}
        <Card 
          title={<><KeyOutlined /> Keyboard Shortcuts</>}
          style={{ marginBottom: 24 }}
          className={isDarkMode ? 'dark-card' : ''}
        >
          <Paragraph type="secondary">
            FirstResponse supports keyboard shortcuts for power users. Press <Text keyboard>?</Text> 
            {' '}anywhere to see all available shortcuts.
          </Paragraph>
          <Button 
            type="primary"
            icon={<KeyOutlined />}
            onClick={() => setShortcutsModalVisible(true)}
            style={{ background: '#667eea', borderColor: '#667eea' }}
          >
            View All Shortcuts
          </Button>
        </Card>

        {/* Contact Support */}
        <Card 
          style={{ 
            background: isDarkMode 
              ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none'
          }}
        >
          <div style={{ textAlign: 'center', color: 'white' }}>
            <MailOutlined style={{ fontSize: 32, marginBottom: 16 }} />
            <Title level={4} style={{ color: 'white', marginBottom: 8 }}>
              Still need help?
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 20 }}>
              Our support team is here to help you succeed. Reach out anytime.
            </Paragraph>
            <Button 
              size="large"
              href="mailto:support@firstresponse.app"
              style={{ 
                background: 'white', 
                color: '#667eea', 
                border: 'none',
                fontWeight: 600
              }}
            >
              Contact Support
            </Button>
          </div>
        </Card>

        {/* Footer tip */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Text type="secondary">
            💡 Tip: Press <Text keyboard>?</Text> anywhere to see keyboard shortcuts
          </Text>
        </div>
      </Content>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal 
        visible={shortcutsModalVisible} 
        onClose={() => setShortcutsModalVisible(false)} 
      />
    </Layout>
  );
};

export default Help;
