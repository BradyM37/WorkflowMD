import React from 'react';
import { Card, Button, Typography, Space, Row, Col, List, Badge, Divider } from 'antd';
import { 
  CheckOutlined, 
  CrownOutlined, 
  ThunderboltOutlined,
  SafetyOutlined,
  FilePdfOutlined,
  LineChartOutlined,
  CustomerServiceOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  StarOutlined
} from '@ant-design/icons';
import api from '../services/api';

const { Title, Text, Paragraph } = Typography;

const Pricing: React.FC = () => {
  
  const handleUpgrade = async () => {
    try {
      const response = await api.post('/api/subscription/checkout');
      window.location.href = response.data.url;
    } catch (error) {
      console.error('Checkout error:', error);
      // In demo mode, just show alert
      if (localStorage.getItem('demo_mode') === 'true') {
        alert('Stripe checkout would open here in production');
      }
    }
  };

  const freeFeatures = [
    { icon: <SafetyOutlined />, text: '1 sub-account analysis' },
    { icon: <ThunderboltOutlined />, text: '3 issues shown per scan' },
    { icon: <LineChartOutlined />, text: 'Basic risk score (A-F grade)' },
    { icon: <ClockCircleOutlined />, text: '7-day scan history' },
    { icon: <CheckOutlined />, text: 'Basic error detection' }
  ];

  const proFeatures = [
    { icon: <GlobalOutlined />, text: 'Unlimited sub-accounts' },
    { icon: <ThunderboltOutlined />, text: 'All issues revealed with fixes' },
    { icon: <LineChartOutlined />, text: 'Detailed risk breakdown' },
    { icon: <FilePdfOutlined />, text: 'White-label PDF reports' },
    { icon: <ClockCircleOutlined />, text: '90-day history & trends' },
    { icon: <StarOutlined />, text: 'Revenue impact estimation' },
    { icon: <CustomerServiceOutlined />, text: 'Priority email support' },
    { icon: <CheckOutlined />, text: 'Bulk workflow analysis' },
    { icon: <CheckOutlined />, text: 'Weekly automated reports' },
    { icon: <CheckOutlined />, text: 'CSV data export' }
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Agency Owner",
      text: "Found 12 critical payment issues we didn't know about. Saved us thousands in lost revenue."
    },
    {
      name: "Mike Chen",
      role: "GHL Expert",
      text: "The white-label reports alone justify the cost. My clients love them."
    },
    {
      name: "Lisa Martinez",
      role: "Operations Manager",
      text: "Cut our debugging time by 80%. Worth every penny."
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <div style={{ 
        textAlign: 'center', 
        marginBottom: '48px',
        padding: '40px 20px',
        background: 'linear-gradient(180deg, rgba(102, 126, 234, 0.05) 0%, transparent 100%)',
        borderRadius: '20px',
        animation: 'fadeInUp 0.6s ease'
      }}>
        <Title level={1} style={{ 
          fontSize: '56px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          fontWeight: 700,
          animation: 'slideIn 0.8s ease'
        }}>
          Choose Your Plan
        </Title>
        <Paragraph style={{ 
          fontSize: '22px', 
          color: '#595959',
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.6'
        }}>
          Start free and upgrade when you need more power
        </Paragraph>
        <div style={{ marginTop: '20px' }}>
          <Space size="large">
            <div style={{ textAlign: 'center' }}>
              <Text strong style={{ fontSize: '24px', color: '#667eea', display: 'block' }}>100+</Text>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>Happy Agencies</Text>
            </div>
            <Divider type="vertical" style={{ height: '40px' }} />
            <div style={{ textAlign: 'center' }}>
              <Text strong style={{ fontSize: '24px', color: '#667eea', display: 'block' }}>10,000+</Text>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>Workflows Analyzed</Text>
            </div>
            <Divider type="vertical" style={{ height: '40px' }} />
            <div style={{ textAlign: 'center' }}>
              <Text strong style={{ fontSize: '24px', color: '#667eea', display: 'block' }}>$500K+</Text>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>Revenue Saved</Text>
            </div>
          </Space>
        </div>
      </div>

      {/* Pricing Cards */}
      <Row gutter={[32, 32]} justify="center" style={{ marginBottom: '48px' }}>
        <Col xs={24} md={11} lg={10}>
          <Card
            hoverable
            style={{ 
              height: '100%',
              borderRadius: '16px',
              overflow: 'hidden'
            }}
            bodyStyle={{ padding: '32px' }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <Title level={3} style={{ marginBottom: '8px' }}>Free</Title>
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ fontSize: '48px', fontWeight: 'bold' }}>$0</Text>
                <Text style={{ fontSize: '18px', color: '#8c8c8c' }}>/month</Text>
              </div>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>Perfect for trying out the tool</Text>
            </div>

            <List
              dataSource={freeFeatures}
              renderItem={item => (
                <List.Item style={{ border: 'none', padding: '8px 0' }}>
                  <Space>
                    <span style={{ color: '#52c41a' }}>{item.icon}</span>
                    <Text>{item.text}</Text>
                  </Space>
                </List.Item>
              )}
            />

            <Button 
              block 
              size="large" 
              style={{ marginTop: '24px' }}
              disabled
            >
              Current Plan
            </Button>
          </Card>
        </Col>

        <Col xs={24} md={11} lg={10}>
          <Badge.Ribbon text="MOST POPULAR" color="purple">
            <Card
              hoverable
              style={{ 
                height: '100%',
                borderRadius: '16px',
                border: '2px solid #667eea',
                overflow: 'hidden',
                position: 'relative'
              }}
              bodyStyle={{ padding: '32px' }}
            >
              <div style={{ 
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }} />
              
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <Title level={3} style={{ marginBottom: '8px' }}>
                  <CrownOutlined style={{ color: '#667eea', marginRight: '8px' }} />
                  Pro
                </Title>
                <div style={{ marginBottom: '16px' }}>
                  <Text style={{ fontSize: '48px', fontWeight: 'bold' }}>$297</Text>
                  <Text style={{ fontSize: '18px', color: '#8c8c8c' }}>/month</Text>
                </div>
                <Text type="secondary" style={{ color: '#8c8c8c' }}>Everything you need to scale</Text>
              </div>

              <List
                dataSource={proFeatures}
                renderItem={item => (
                  <List.Item style={{ border: 'none', padding: '8px 0' }}>
                    <Space>
                      <span style={{ color: '#667eea' }}>{item.icon}</span>
                      <Text>{item.text}</Text>
                    </Space>
                  </List.Item>
                )}
              />

              <Button 
                type="primary" 
                block 
                size="large" 
                style={{ 
                  marginTop: '24px',
                  height: '48px',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}
                onClick={handleUpgrade}
                icon={<CrownOutlined />}
              >
                Upgrade to Pro
              </Button>

              <Text 
                type="secondary" 
                style={{ 
                  display: 'block', 
                  textAlign: 'center', 
                  marginTop: '12px',
                  fontSize: '12px'
                }}
              >
                Cancel anytime • Instant access
              </Text>
            </Card>
          </Badge.Ribbon>
        </Col>
      </Row>

      {/* Value Props */}
      <Card style={{ marginBottom: '32px', borderRadius: '16px' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
          Why Agencies Choose Pro
        </Title>
        <Row gutter={[32, 32]}>
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ClockCircleOutlined style={{ fontSize: '36px', color: 'white' }} />
              </div>
              <Title level={4}>Save 10+ Hours Monthly</Title>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>
                Stop manually debugging workflows. Find issues in seconds, not hours.
              </Text>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <SafetyOutlined style={{ fontSize: '36px', color: 'white' }} />
              </div>
              <Title level={4}>Prevent Revenue Loss</Title>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>
                One broken payment workflow costs more than a year of Pro subscription.
              </Text>
            </div>
          </Col>
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FilePdfOutlined style={{ fontSize: '36px', color: 'white' }} />
              </div>
              <Title level={4}>Impress Clients</Title>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>
                White-label reports show your professionalism and justify your fees.
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Testimonials */}
      <Card style={{ marginBottom: '32px', borderRadius: '16px' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
          What Agencies Say
        </Title>
        <Row gutter={[32, 32]}>
          {testimonials.map((testimonial, index) => (
            <Col xs={24} md={8} key={index}>
              <Card 
                style={{ 
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  height: '100%'
                }}
                bordered={false}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    {[...Array(5)].map((_, i) => (
                      <StarOutlined key={i} style={{ color: '#faad14', marginRight: '4px' }} />
                    ))}
                  </div>
                  <Paragraph style={{ fontSize: '16px', fontStyle: 'italic' }}>
                    "{testimonial.text}"
                  </Paragraph>
                  <div>
                    <Text strong>{testimonial.name}</Text>
                    <br />
                    <Text type="secondary" style={{ color: '#8c8c8c' }}>{testimonial.role}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* FAQ */}
      <Card style={{ borderRadius: '16px' }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: '32px' }}>
          Frequently Asked Questions
        </Title>
        <Row gutter={[32, 32]}>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={5}>Can I cancel anytime?</Title>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>
                Yes! Cancel your Pro subscription anytime. You'll keep access until the end of your billing period.
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={5}>Do I need technical knowledge?</Title>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>
                No! The tool is designed for agency owners. Just click analyze and get clear, actionable results.
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={5}>How fast is the analysis?</Title>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>
                Most workflows are analyzed in 3-5 seconds. Even complex workflows rarely take more than 10 seconds.
              </Text>
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Title level={5}>What's included in white-label reports?</Title>
              <Text type="secondary" style={{ color: '#8c8c8c' }}>
                PDF reports with your branding, showing all issues, fixes, and risk scores. Perfect for client presentations.
              </Text>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* CTA */}
      <div style={{ 
        textAlign: 'center', 
        marginTop: '48px',
        padding: '48px 24px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px'
      }}>
        <Title level={2} style={{ color: 'white', marginBottom: '16px' }}>
          Ready to Fix Your Workflows?
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: '18px', marginBottom: '32px' }}>
          Join hundreds of agencies saving time and preventing revenue loss
        </Paragraph>
        <Button 
          size="large"
          onClick={handleUpgrade}
          style={{ 
            height: '56px',
            fontSize: '18px',
            padding: '0 48px',
            fontWeight: 'bold'
          }}
        >
          Start Pro Trial - $297/month
        </Button>
      </div>
    </div>
  );
};

export default Pricing;