import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Space, List, Alert } from 'antd';
import { 
  ThunderboltOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text, Paragraph } = Typography;

const ConnectGHL: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleConnect = () => {
    // Set GHL as connected for demo mode
    localStorage.setItem('location_id', 'demo_location_123');
    localStorage.setItem('ghl_connected', 'true');
    
    // In production, redirect to GHL OAuth
    // window.location.href = process.env.REACT_APP_GHL_INSTALL_URL || '#';
    
    // For demo, go straight to dashboard
    navigate('/dashboard');
  };

  const handleSkipForDemo = () => {
    // Set demo flag and go to dashboard
    localStorage.setItem('location_id', 'demo_location_123');
    localStorage.setItem('ghl_connected', 'demo');
    navigate('/dashboard');
  };

  const permissions = [
    {
      icon: <ApiOutlined style={{ color: '#667eea' }} />,
      title: 'Read Workflows',
      description: 'Access your workflow data for analysis'
    },
    {
      icon: <ClockCircleOutlined style={{ color: '#667eea' }} />,
      title: 'Workflow History',
      description: 'View execution logs and performance metrics'
    },
    {
      icon: <TeamOutlined style={{ color: '#667eea' }} />,
      title: 'Location Access',
      description: 'Connect to your GHL location'
    }
  ];

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 200px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <Card 
          style={{ 
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            borderRadius: '12px',
            border: 'none',
            animation: 'fadeInUp 0.6s ease'
          }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Header */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '100px',
                height: '100px',
                margin: '0 auto 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'float 3s ease-in-out infinite',
                boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
              }}>
                <ThunderboltOutlined style={{ fontSize: '48px', color: 'white' }} />
              </div>
              
              <Title level={2} style={{ marginBottom: '8px' }}>
                Connect Your GHL Account
              </Title>
              <Paragraph style={{ color: '#595959', fontSize: '16px' }}>
                Welcome, {user?.name || 'there'}! Let's connect your GoHighLevel account 
                to start analyzing workflows.
              </Paragraph>
            </div>

            {/* What We Need Section */}
            <div>
              <Title level={4} style={{ marginBottom: '16px' }}>
                <SafetyOutlined style={{ marginRight: '8px', color: '#667eea' }} />
                What We Need Access To
              </Title>
              <List
                dataSource={permissions}
                renderItem={(item) => (
                  <List.Item style={{ border: 'none', padding: '12px 0' }}>
                    <List.Item.Meta
                      avatar={item.icon}
                      title={<Text strong>{item.title}</Text>}
                      description={<Text style={{ color: '#595959' }}>{item.description}</Text>}
                    />
                  </List.Item>
                )}
              />
            </div>

            {/* Security Notice */}
            <Alert
              message="Your Data is Safe"
              description="We only read workflow data for analysis. We never modify, delete, or share your data with third parties."
              type="info"
              showIcon
              icon={<SafetyOutlined />}
            />

            {/* Connect Button */}
            <Button 
              type="primary" 
              size="large" 
              block
              onClick={handleConnect}
              className="cta-pulse"
              icon={<ThunderboltOutlined />}
              style={{ 
                height: '56px',
                fontSize: '18px',
                fontWeight: '600',
                borderRadius: '8px'
              }}
            >
              Connect with GoHighLevel
            </Button>

            {/* Demo Mode Option */}
            <div style={{ textAlign: 'center' }}>
              <Button 
                type="link" 
                onClick={handleSkipForDemo}
                style={{ color: '#8c8c8c' }}
              >
                Skip for now (Demo Mode)
              </Button>
            </div>

            {/* What Happens Next */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                <Text strong style={{ fontSize: '15px' }}>
                  What Happens Next:
                </Text>
                <Space align="start">
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px', marginTop: '4px' }} />
                  <div>
                    <Text strong>You'll be redirected to GoHighLevel</Text>
                    <br />
                    <Text style={{ color: '#595959', fontSize: '13px' }}>
                      Securely authorize our app through GHL's OAuth
                    </Text>
                  </div>
                </Space>
                <Space align="start">
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px', marginTop: '4px' }} />
                  <div>
                    <Text strong>Select Your Location</Text>
                    <br />
                    <Text style={{ color: '#595959', fontSize: '13px' }}>
                      Choose which GHL location to analyze
                    </Text>
                  </div>
                </Space>
                <Space align="start">
                  <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '16px', marginTop: '4px' }} />
                  <div>
                    <Text strong>Start Analyzing</Text>
                    <br />
                    <Text style={{ color: '#595959', fontSize: '13px' }}>
                      Return here and scan your first workflow
                    </Text>
                  </div>
                </Space>
              </Space>
            </div>

            {/* Support Link */}
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                Need help connecting?{' '}
                <a href="mailto:support@ghlworkflowdebugger.com" style={{ color: '#667eea' }}>
                  Contact Support
                </a>
              </Text>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default ConnectGHL;
