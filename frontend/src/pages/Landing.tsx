import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layout, 
  Button, 
  Typography, 
  Row, 
  Col, 
  Card, 
  Space, 
  Statistic,
  Avatar,
  Rate,
  Divider
} from 'antd';
import {
  ThunderboltOutlined,
  DashboardOutlined,
  BellOutlined,
  LineChartOutlined,
  TeamOutlined,
  SafetyOutlined,
  CheckCircleOutlined,
  RocketOutlined,
  CrownOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

const Landing: React.FC = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#667eea' }} />,
      title: 'Speed-to-Lead Tracking',
      description: 'Monitor response times in real-time. Know exactly how fast your team responds to every lead.'
    },
    {
      icon: <DashboardOutlined style={{ fontSize: 32, color: '#764ba2' }} />,
      title: 'Visual Analytics Dashboard',
      description: 'Beautiful charts and insights that show your team performance at a glance.'
    },
    {
      icon: <BellOutlined style={{ fontSize: 32, color: '#f5576c' }} />,
      title: 'Smart Alerts',
      description: 'Get notified when leads go unanswered. Never miss a hot prospect again.'
    },
    {
      icon: <LineChartOutlined style={{ fontSize: 32, color: '#00c9ff' }} />,
      title: 'Performance Reports',
      description: 'Weekly and monthly reports showing trends, improvements, and areas to focus.'
    },
    {
      icon: <TeamOutlined style={{ fontSize: 32, color: '#92fe9d' }} />,
      title: 'Team Leaderboards',
      description: 'Gamify response times with leaderboards. Motivate your team to respond faster.'
    },
    {
      icon: <SafetyOutlined style={{ fontSize: 32, color: '#ffd89b' }} />,
      title: 'GHL Native Integration',
      description: 'Seamless integration with GoHighLevel. Connect in seconds, start tracking instantly.'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Agency Owner',
      avatar: 'S',
      content: 'Our close rate increased 34% after we started tracking speed-to-lead. Game changer!',
      rating: 5
    },
    {
      name: 'Mike Chen',
      role: 'Sales Manager',
      avatar: 'M',
      content: 'Finally I can see who\'s responding fast and who needs coaching. Love the leaderboards.',
      rating: 5
    },
    {
      name: 'Emily Roberts',
      role: 'Marketing Director',
      avatar: 'E',
      content: 'The alerts alone have saved us dozens of leads that would have gone cold. Worth every penny.',
      rating: 5
    }
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      description: 'Perfect for getting started',
      features: [
        '7 days history',
        '1 location',
        '3 team members',
        '5 missed alerts/week',
        'Basic dashboard'
      ],
      cta: 'Start Free',
      highlighted: false
    },
    {
      name: 'Starter',
      price: '$47',
      period: '/month',
      description: 'For small teams',
      features: [
        '30 days history',
        '3 locations',
        '10 team members',
        'Unlimited alerts',
        'CSV export'
      ],
      cta: 'Start Starter Trial',
      highlighted: false
    },
    {
      name: 'Pro',
      price: '$97',
      period: '/month',
      description: 'For growing teams',
      features: [
        '90 days history',
        '10 locations',
        '25 team members',
        'AI insights',
        'Slack integration',
        'Revenue attribution'
      ],
      cta: 'Start Pro Trial',
      highlighted: true
    },
    {
      name: 'Agency',
      price: '$197',
      period: '/month',
      description: 'For agencies & enterprises',
      features: [
        '1 year history',
        '50 locations',
        'Unlimited team members',
        'White-label branding',
        'Full API access'
      ],
      cta: 'Contact Sales',
      highlighted: false
    }
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Landing Header */}
      <Header style={{
        background: 'transparent',
        position: 'fixed',
        width: '100%',
        zIndex: 1000,
        padding: '0 50px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderBottom: '1px solid rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 28 }}>🔍</span>
          <Title level={4} style={{ margin: 0, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            WorkflowMD
          </Title>
        </div>
        <Space size="large" className="desktop-nav">
          <Button type="text" onClick={() => scrollToSection('features')}>Features</Button>
          <Button type="text" onClick={() => scrollToSection('pricing')}>Pricing</Button>
          <Button onClick={() => navigate('/login')}>Login</Button>
          <Button 
            type="primary" 
            onClick={() => navigate('/register')}
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: 'none' }}
          >
            Get Started Free
          </Button>
        </Space>
      </Header>

      <Content>
        {/* Hero Section */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '160px 50px 100px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.5
          }} />
          <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto' }}>
            <Title style={{ color: 'white', fontSize: 'clamp(36px, 6vw, 56px)', marginBottom: 16, fontWeight: 700 }}>
              Win More Leads by Responding First
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 'clamp(18px, 3vw, 22px)', marginBottom: 40, maxWidth: 700, margin: '0 auto 40px' }}>
              Speed-to-lead analytics for GoHighLevel. Track response times, motivate your team, and close more deals.
            </Paragraph>
            <Space size="large" wrap style={{ justifyContent: 'center' }}>
              <Button 
                type="primary" 
                size="large" 
                icon={<RocketOutlined />}
                onClick={() => navigate('/register')}
                style={{ 
                  height: 56, 
                  padding: '0 40px', 
                  fontSize: 18,
                  background: 'white',
                  color: '#667eea',
                  border: 'none',
                  fontWeight: 600
                }}
              >
                Start Free Trial
              </Button>
              <Button 
                size="large" 
                ghost
                onClick={() => scrollToSection('features')}
                style={{ height: 56, padding: '0 40px', fontSize: 18, borderColor: 'white', color: 'white' }}
              >
                See How It Works
              </Button>
            </Space>
          </div>
        </div>

        {/* Key Stat Section */}
        <div style={{ 
          background: '#1a1a2e', 
          padding: '60px 50px',
          textAlign: 'center'
        }}>
          <Row gutter={[48, 32]} justify="center" align="middle" style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Col xs={24} md={12}>
              <Statistic
                value={78}
                suffix="%"
                valueStyle={{ color: '#f5576c', fontSize: 72, fontWeight: 700 }}
              />
              <Title level={3} style={{ color: 'white', margin: '16px 0 8px' }}>
                of leads buy from the first responder
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }}>
                — InsideSales.com Research
              </Text>
            </Col>
            <Col xs={24} md={12}>
              <Card style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16
              }}>
                <Space direction="vertical" size="small">
                  <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Average response time matters:</Text>
                  <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Statistic title={<span style={{color: 'rgba(255,255,255,0.5)'}}>5 min</span>} value="9x" valueStyle={{ color: '#92fe9d' }} suffix="more likely" />
                    <Statistic title={<span style={{color: 'rgba(255,255,255,0.5)'}}>30 min</span>} value="21x" valueStyle={{ color: '#ffd89b' }} suffix="drop off" />
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Features Section */}
        <div id="features" style={{ padding: '100px 50px', background: '#f8f9ff' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <Title level={2} style={{ marginBottom: 16 }}>
                Everything You Need to Respond Faster
              </Title>
              <Paragraph style={{ fontSize: 18, color: '#666', maxWidth: 600, margin: '0 auto' }}>
                Powerful tools designed specifically for GHL users who want to win more leads.
              </Paragraph>
            </div>
            <Row gutter={[32, 32]}>
              {features.map((feature, index) => (
                <Col xs={24} sm={12} lg={8} key={index}>
                  <Card 
                    hoverable
                    style={{ 
                      height: '100%', 
                      borderRadius: 16,
                      border: 'none',
                      boxShadow: '0 4px 24px rgba(0,0,0,0.06)'
                    }}
                  >
                    <Space direction="vertical" size="middle">
                      <div style={{ 
                        width: 64, 
                        height: 64, 
                        borderRadius: 16, 
                        background: 'linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {feature.icon}
                      </div>
                      <Title level={4} style={{ margin: 0 }}>{feature.title}</Title>
                      <Text style={{ color: '#666' }}>{feature.description}</Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* Social Proof / Testimonials */}
        <div style={{ padding: '100px 50px', background: 'white' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <Title level={2} style={{ marginBottom: 16 }}>
                Loved by GHL Users Everywhere
              </Title>
              <Paragraph style={{ fontSize: 18, color: '#666' }}>
                See what our customers are saying
              </Paragraph>
            </div>
            <Row gutter={[32, 32]}>
              {testimonials.map((testimonial, index) => (
                <Col xs={24} md={8} key={index}>
                  <Card style={{ 
                    height: '100%', 
                    borderRadius: 16,
                    border: '1px solid #f0f0f0'
                  }}>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <Rate disabled defaultValue={testimonial.rating} style={{ fontSize: 16 }} />
                      <Paragraph style={{ fontSize: 16, margin: 0, fontStyle: 'italic' }}>
                        "{testimonial.content}"
                      </Paragraph>
                      <Divider style={{ margin: '12px 0' }} />
                      <Space>
                        <Avatar style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                          {testimonial.avatar}
                        </Avatar>
                        <div>
                          <Text strong>{testimonial.name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 13 }}>{testimonial.role}</Text>
                        </div>
                      </Space>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* Pricing Section */}
        <div id="pricing" style={{ padding: '100px 50px', background: '#f8f9ff' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 60 }}>
              <Title level={2} style={{ marginBottom: 16 }}>
                Simple, Transparent Pricing
              </Title>
              <Paragraph style={{ fontSize: 18, color: '#666' }}>
                Start free, upgrade when you're ready
              </Paragraph>
            </div>
            <Row gutter={[32, 32]} justify="center">
              {pricingPlans.map((plan, index) => (
                <Col xs={24} sm={12} lg={8} key={index}>
                  <Card 
                    style={{ 
                      height: '100%', 
                      borderRadius: 16,
                      border: plan.highlighted ? '2px solid #667eea' : '1px solid #f0f0f0',
                      position: 'relative',
                      overflow: 'visible'
                    }}
                  >
                    {plan.highlighted && (
                      <div style={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        padding: '4px 16px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600
                      }}>
                        MOST POPULAR
                      </div>
                    )}
                    <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                      <div>
                        <Title level={3} style={{ margin: 0 }}>{plan.name}</Title>
                        <Text type="secondary">{plan.description}</Text>
                      </div>
                      <div>
                        <Text style={{ fontSize: 48, fontWeight: 700, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                          {plan.price}
                        </Text>
                        <Text type="secondary">{plan.period}</Text>
                      </div>
                      <Divider style={{ margin: '8px 0' }} />
                      <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'left' }}>
                        {plan.features.map((feature, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircleOutlined style={{ color: '#52c41a' }} />
                            <Text>{feature}</Text>
                          </div>
                        ))}
                      </Space>
                      <Button 
                        type={plan.highlighted ? 'primary' : 'default'}
                        size="large"
                        block
                        icon={plan.highlighted ? <CrownOutlined /> : undefined}
                        onClick={() => navigate('/register')}
                        style={plan.highlighted ? { 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                          border: 'none',
                          height: 48
                        } : { height: 48 }}
                      >
                        {plan.cta}
                      </Button>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* Final CTA Section */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '100px 50px',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <Title style={{ color: 'white', fontSize: 'clamp(28px, 5vw, 42px)', marginBottom: 16 }}>
              Ready to Win More Leads?
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 18, marginBottom: 32 }}>
              Join hundreds of GHL users who are closing more deals by responding faster. Start your free trial today.
            </Paragraph>
            <Button 
              type="primary" 
              size="large" 
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/register')}
              style={{ 
                height: 56, 
                padding: '0 48px', 
                fontSize: 18,
                background: 'white',
                color: '#667eea',
                border: 'none',
                fontWeight: 600
              }}
            >
              Start Free — No Credit Card Required
            </Button>
          </div>
        </div>
      </Content>

      {/* Footer */}
      <Footer style={{ 
        textAlign: 'center', 
        background: '#1a1a2e',
        padding: '40px 50px',
        color: 'rgba(255,255,255,0.7)'
      }}>
        <Space direction="vertical" size="small">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>🔍</span>
            <Text strong style={{ color: 'white', fontSize: 18 }}>WorkflowMD</Text>
          </div>
          <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
            Speed-to-Lead Analytics for GoHighLevel
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            © 2026 WorkflowMD. All rights reserved.
          </Text>
        </Space>
      </Footer>
    </Layout>
  );
};

export default Landing;
