import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Steps, Button, Card, Typography, Space, Progress, Radio, Result } from 'antd';
import {
  RocketOutlined,
  ApiOutlined,
  SyncOutlined,
  TrophyOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Text, Paragraph } = Typography;

interface OnboardingWizardProps {
  onComplete: () => void;
}

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [syncProgress, setSyncProgress] = useState(0);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  const goals = [
    { value: 'speed', label: 'Improve Response Speed', icon: <ThunderboltOutlined />, desc: 'Get alerts when leads wait too long' },
    { value: 'tracking', label: 'Track Team Performance', icon: <ClockCircleOutlined />, desc: 'Monitor who responds fastest' },
    { value: 'optimize', label: 'Optimize Workflows', icon: <StarOutlined />, desc: 'Find bottlenecks and fix them' },
  ];

  const handleConnectGHL = () => {
    // In production, this would initiate OAuth
    // For now, simulate connection and move to sync
    setCurrentStep(2);
    startSync();
  };

  const startSync = () => {
    setIsSyncing(true);
    setSyncProgress(0);
    
    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSyncing(false);
          setTimeout(() => setCurrentStep(3), 500);
          return 100;
        }
        return prev + Math.random() * 15 + 5;
      });
    }, 400);
  };

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('user_goal', selectedGoal || 'speed');
    onComplete();
  };

  const steps = [
    { title: 'Welcome', icon: <RocketOutlined /> },
    { title: 'Connect', icon: <ApiOutlined /> },
    { title: 'Sync', icon: <SyncOutlined spin={isSyncing} /> },
    { title: 'Goal', icon: <TrophyOutlined /> },
    { title: 'Done!', icon: <CheckCircleOutlined /> },
  ];

  const cardStyle: React.CSSProperties = {
    background: isDarkMode ? '#1f1f1f' : 'white',
    borderRadius: '16px',
    boxShadow: isDarkMode 
      ? '0 4px 24px rgba(0,0,0,0.4)' 
      : '0 4px 24px rgba(0,0,0,0.08)',
    padding: '40px',
    maxWidth: '600px',
    margin: '0 auto',
    textAlign: 'center' as const,
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div style={cardStyle}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🚀</div>
            <Title level={2} style={{ marginBottom: '8px' }}>
              Welcome to FirstResponse
            </Title>
            <Paragraph style={{ fontSize: '18px', color: isDarkMode ? '#a0a0a0' : '#666', marginBottom: '32px' }}>
              The speed-to-lead analytics platform that helps you respond faster and win more leads.
            </Paragraph>
            
            <Space direction="vertical" size="middle" style={{ width: '100%', marginBottom: '32px' }}>
              <Card size="small" style={{ background: isDarkMode ? '#262626' : '#f6ffed', border: 'none' }}>
                <Space>
                  <ThunderboltOutlined style={{ color: '#52c41a', fontSize: '20px' }} />
                  <Text>Track response times across all your workflows</Text>
                </Space>
              </Card>
              <Card size="small" style={{ background: isDarkMode ? '#262626' : '#e6f7ff', border: 'none' }}>
                <Space>
                  <ClockCircleOutlined style={{ color: '#1890ff', fontSize: '20px' }} />
                  <Text>Get real-time alerts for slow responses</Text>
                </Space>
              </Card>
              <Card size="small" style={{ background: isDarkMode ? '#262626' : '#fff7e6', border: 'none' }}>
                <Space>
                  <TrophyOutlined style={{ color: '#fa8c16', fontSize: '20px' }} />
                  <Text>Beat your competition with faster follow-ups</Text>
                </Space>
              </Card>
            </Space>

            <Button 
              type="primary" 
              size="large" 
              onClick={() => setCurrentStep(1)}
              style={{ 
                height: '48px', 
                paddingInline: '40px', 
                fontSize: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none'
              }}
            >
              Let's Get Started →
            </Button>
          </div>
        );

      case 1:
        return (
          <div style={cardStyle}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔗</div>
            <Title level={2} style={{ marginBottom: '8px' }}>
              Connect Your GHL Account
            </Title>
            <Paragraph style={{ fontSize: '16px', color: isDarkMode ? '#a0a0a0' : '#666', marginBottom: '32px' }}>
              We'll securely connect to your GoHighLevel account to import your workflows and start tracking response times.
            </Paragraph>

            <Card 
              style={{ 
                background: isDarkMode ? '#262626' : '#fafafa', 
                border: `1px dashed ${isDarkMode ? '#434343' : '#d9d9d9'}`,
                marginBottom: '24px'
              }}
            >
              <Space direction="vertical" size="small">
                <Text type="secondary">✓ Read-only access to workflows</Text>
                <Text type="secondary">✓ Your data stays private</Text>
                <Text type="secondary">✓ Disconnect anytime</Text>
              </Space>
            </Card>

            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button 
                type="primary" 
                size="large" 
                icon={<ApiOutlined />}
                onClick={handleConnectGHL}
                style={{ 
                  height: '52px', 
                  paddingInline: '40px', 
                  fontSize: '16px',
                  background: '#ff6b35',
                  border: 'none',
                  width: '100%'
                }}
              >
                Connect GoHighLevel Account
              </Button>
              <Button 
                type="link" 
                onClick={() => setCurrentStep(0)}
              >
                ← Back
              </Button>
            </Space>
          </div>
        );

      case 2:
        return (
          <div style={cardStyle}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>
              <SyncOutlined spin style={{ color: '#667eea' }} />
            </div>
            <Title level={2} style={{ marginBottom: '8px' }}>
              Syncing Your Data
            </Title>
            <Paragraph style={{ fontSize: '16px', color: isDarkMode ? '#a0a0a0' : '#666', marginBottom: '32px' }}>
              We're importing your workflows and historical data. This only takes a moment...
            </Paragraph>

            <Progress 
              percent={Math.min(Math.round(syncProgress), 100)} 
              status={syncProgress >= 100 ? 'success' : 'active'}
              strokeColor={{
                '0%': '#667eea',
                '100%': '#52c41a',
              }}
              style={{ marginBottom: '24px' }}
            />

            <Space direction="vertical" size="small">
              {syncProgress > 10 && <Text type="secondary">✓ Connected to GHL API</Text>}
              {syncProgress > 35 && <Text type="secondary">✓ Found 12 workflows</Text>}
              {syncProgress > 60 && <Text type="secondary">✓ Importing response data...</Text>}
              {syncProgress > 85 && <Text type="secondary">✓ Calculating metrics...</Text>}
              {syncProgress >= 100 && <Text style={{ color: '#52c41a' }}>✓ Sync complete!</Text>}
            </Space>
          </div>
        );

      case 3:
        return (
          <div style={cardStyle}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>🎯</div>
            <Title level={2} style={{ marginBottom: '8px' }}>
              What's Your Main Goal?
            </Title>
            <Paragraph style={{ fontSize: '16px', color: isDarkMode ? '#a0a0a0' : '#666', marginBottom: '32px' }}>
              Help us personalize your dashboard experience.
            </Paragraph>

            <Radio.Group 
              value={selectedGoal} 
              onChange={(e) => setSelectedGoal(e.target.value)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {goals.map(goal => (
                  <Card 
                    key={goal.value}
                    hoverable
                    style={{ 
                      cursor: 'pointer',
                      border: selectedGoal === goal.value 
                        ? '2px solid #667eea' 
                        : `1px solid ${isDarkMode ? '#434343' : '#d9d9d9'}`,
                      background: selectedGoal === goal.value 
                        ? (isDarkMode ? '#262626' : '#f0f5ff')
                        : (isDarkMode ? '#1f1f1f' : 'white')
                    }}
                    onClick={() => setSelectedGoal(goal.value)}
                  >
                    <Space>
                      <Radio value={goal.value} />
                      <span style={{ fontSize: '24px' }}>{goal.icon}</span>
                      <div style={{ textAlign: 'left' }}>
                        <Text strong>{goal.label}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '13px' }}>{goal.desc}</Text>
                      </div>
                    </Space>
                  </Card>
                ))}
              </Space>
            </Radio.Group>

            <Space style={{ marginTop: '32px' }}>
              <Button onClick={() => setCurrentStep(2)}>← Back</Button>
              <Button 
                type="primary" 
                size="large"
                disabled={!selectedGoal}
                onClick={() => setCurrentStep(4)}
                style={{ 
                  height: '48px', 
                  paddingInline: '40px',
                  background: selectedGoal ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : undefined,
                  border: 'none'
                }}
              >
                Continue →
              </Button>
            </Space>
          </div>
        );

      case 4:
        return (
          <div style={cardStyle}>
            <Result
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              title="You're All Set! 🎉"
              subTitle="Your account is ready. Let's start tracking your response times."
              extra={[
                <Button 
                  type="primary" 
                  size="large"
                  key="dashboard"
                  onClick={handleComplete}
                  style={{ 
                    height: '52px', 
                    paddingInline: '48px', 
                    fontSize: '16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none'
                  }}
                >
                  View My Dashboard →
                </Button>
              ]}
            />
            
            <Card 
              style={{ 
                marginTop: '24px',
                background: isDarkMode ? '#262626' : '#f6ffed',
                border: 'none'
              }}
            >
              <Space>
                <ThunderboltOutlined style={{ color: '#52c41a', fontSize: '24px' }} />
                <div style={{ textAlign: 'left' }}>
                  <Text strong>Pro Tip</Text>
                  <br />
                  <Text type="secondary">Set up alerts in Settings to get notified when response times exceed your target.</Text>
                </div>
              </Space>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ padding: '40px 20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto 40px' }}>
        <Steps 
          current={currentStep} 
          items={steps}
          size="small"
          style={{ marginBottom: '40px' }}
        />
      </div>
      
      {renderStepContent()}
    </div>
  );
};

export default OnboardingWizard;
