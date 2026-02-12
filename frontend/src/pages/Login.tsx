import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Card, Typography, Space, Row, Col, Divider, Form, Input, Checkbox, message } from 'antd';
import { 
  LoginOutlined, 
  ThunderboltOutlined,
  CheckCircleOutlined,
  SafetyOutlined,
  DashboardOutlined,
  MailOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Text, Paragraph } = Typography;

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, locationId } = useAuth();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);

  // Theme-aware colors
  const colors = {
    cardBg: isDarkMode ? '#262626' : '#ffffff',
    featureCardBg: isDarkMode ? '#1f1f1f' : '#ffffff',
    pricingBg: isDarkMode ? '#1a1a1a' : '#f0f2f5',
    titleText: isDarkMode ? '#ffffff' : '#1a1a2e',
    bodyText: isDarkMode ? '#d9d9d9' : '#4a4a5a',
    mutedText: isDarkMode ? '#8c8c8c' : '#595959',
    border: isDarkMode ? '#303030' : '#e8e8e8',
  };

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      await login(values.email, values.password, values.remember);
      message.success('Login successful!');
      
      // Check if GHL is connected
      const ghlConnected = localStorage.getItem('ghl_connected');
      if (!ghlConnected && !locationId) {
        // Redirect to GHL connection page
        navigate('/connect-ghl');
      } else {
        // Redirect to dashboard
        navigate('/dashboard');
      }
    } catch (error: any) {
      message.error(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <ThunderboltOutlined style={{ fontSize: '24px', color: '#667eea' }} />,
      title: 'Speed-to-Lead Tracking',
      description: 'Know exactly how fast you respond to every lead'
    },
    {
      icon: <DashboardOutlined style={{ fontSize: '24px', color: '#667eea' }} />,
      title: 'Response Time Analytics',
      description: 'Track team performance with real-time dashboards'
    },
    {
      icon: <SafetyOutlined style={{ fontSize: '24px', color: '#667eea' }} />,
      title: 'Win More Deals',
      description: 'Faster response times = higher close rates'
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
      <div style={{ maxWidth: '1200px', width: '100%' }}>
        <Row gutter={[48, 48]} align="middle">
          {/* Left side - Hero content */}
          <Col xs={24} lg={12}>
            <div style={{ animation: 'fadeInUp 0.6s ease' }}>
              <Title level={1} style={{ 
                fontSize: '48px',
                fontWeight: '700',
                marginBottom: '16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                WorkflowMD
              </Title>
              
              <Paragraph style={{ fontSize: '20px', color: colors.mutedText, marginBottom: '32px' }}>
                Track your speed-to-lead and win more deals. 
                See exactly how fast your team responds to every lead.
              </Paragraph>

              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {features.map((feature, index) => (
                  <Card 
                    key={index}
                    bordered={false}
                    hoverable
                    style={{ 
                      background: colors.featureCardBg,
                      borderLeft: '4px solid #667eea',
                      animation: `fadeInUp 0.6s ease ${0.2 + index * 0.1}s backwards`,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <Space align="start">
                      {feature.icon}
                      <div>
                        <Text strong style={{ fontSize: '16px', color: colors.titleText }}>
                          {feature.title}
                        </Text>
                        <br />
                        <Text style={{ color: colors.bodyText }}>
                          {feature.description}
                        </Text>
                      </div>
                    </Space>
                  </Card>
                ))}
              </Space>
            </div>
          </Col>

          {/* Right side - Login card */}
          <Col xs={24} lg={12}>
            <Card 
              style={{ 
                maxWidth: '450px',
                margin: '0 auto',
                boxShadow: isDarkMode ? '0 10px 40px rgba(0,0,0,0.3)' : '0 10px 40px rgba(0,0,0,0.08)',
                borderRadius: '12px',
                border: isDarkMode ? '1px solid #303030' : 'none',
                background: colors.cardBg,
                animation: 'fadeInUp 0.8s ease 0.2s backwards'
              }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    margin: '0 auto 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'float 3s ease-in-out infinite',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                  }}>
                    <ThunderboltOutlined style={{ fontSize: '36px', color: 'white' }} />
                  </div>
                  
                  <Title level={3} style={{ marginBottom: '8px', color: colors.titleText }}>
                    Welcome Back
                  </Title>
                  <Text style={{ color: colors.mutedText }}>
                    Login to your account to continue
                  </Text>
                </div>

                {/* Login Form */}
                <Form
                  name="login"
                  onFinish={handleLogin}
                  layout="vertical"
                  requiredMark={false}
                  initialValues={{ remember: true }}
                >
                  <Form.Item
                    name="email"
                    label="Email Address"
                    rules={[
                      { required: true, message: 'Please enter your email' },
                      { type: 'email', message: 'Please enter a valid email' }
                    ]}
                  >
                    <Input 
                      prefix={<MailOutlined />}
                      placeholder="you@company.com"
                      size="large"
                    />
                  </Form.Item>

                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[
                      { required: true, message: 'Please enter your password' }
                    ]}
                  >
                    <Input.Password 
                      prefix={<LockOutlined />}
                      placeholder="Enter your password"
                      size="large"
                      iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                    />
                  </Form.Item>

                  <Form.Item style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Form.Item name="remember" valuePropName="checked" noStyle>
                        <Checkbox>Remember me</Checkbox>
                      </Form.Item>
                      <Link to="/forgot-password" style={{ color: '#667eea' }}>
                        Forgot password?
                      </Link>
                    </div>
                  </Form.Item>

                  <Form.Item style={{ marginBottom: '12px' }}>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      size="large" 
                      block
                      loading={loading}
                      icon={<LoginOutlined />}
                      className="cta-pulse"
                      style={{ 
                        height: '48px',
                        fontSize: '16px',
                        fontWeight: '600',
                        borderRadius: '8px'
                      }}
                    >
                      Login
                    </Button>
                  </Form.Item>

                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: colors.mutedText }}>
                      Don't have an account?{' '}
                      <Link to="/register" style={{ color: '#667eea', fontWeight: 600 }}>
                        Register here
                      </Link>
                    </Text>
                  </div>
                </Form>

                <Divider />

                {/* Pricing Info */}
                <div style={{ background: colors.pricingBg, padding: '16px', borderRadius: '8px', border: `1px solid ${colors.border}` }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: '16px', color: colors.titleText }}>
                      Pricing
                    </Text>
                    <div>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                      <Text style={{ color: colors.bodyText }}>Starter ($47/mo): Track up to 100 leads/month</Text>
                    </div>
                    <div>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                      <Text style={{ color: colors.bodyText }}>Growth ($97/mo): 500 leads + team analytics</Text>
                    </div>
                    <div>
                      <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                      <Text style={{ color: colors.bodyText }}>Scale ($197/mo): Unlimited leads + API access</Text>
                    </div>
                  </Space>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '12px', color: colors.mutedText }}>
                    By logging in, you agree to our{' '}
                    <a href="/terms" style={{ color: '#667eea' }}>Terms of Service</a>
                    {' '}and{' '}
                    <a href="/privacy" style={{ color: '#667eea' }}>Privacy Policy</a>
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Login;
