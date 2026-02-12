import React, { useState } from 'react';
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
  Divider,
  Drawer
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
  ArrowRightOutlined,
  MenuOutlined,
  CloseOutlined,
  TwitterOutlined,
  LinkedinOutlined,
  GithubOutlined
} from '@ant-design/icons';
import Logo from '../components/Logo';

const { Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: <ThunderboltOutlined style={{ fontSize: 32, color: '#00CED1' }} />,
      title: 'Speed-to-Lead Tracking',
      description: 'Monitor response times in real-time. Know exactly how fast your team responds to every lead.'
    },
    {
      icon: <DashboardOutlined style={{ fontSize: 32, color: '#4169E1' }} />,
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
      icon: <TeamOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
      title: 'Team Leaderboards',
      description: 'Gamify response times with leaderboards. Motivate your team to respond faster.'
    },
    {
      icon: <SafetyOutlined style={{ fontSize: 32, color: '#faad14' }} />,
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
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const navLinks = [
    { label: 'Features', action: () => scrollToSection('features') },
    { label: 'Pricing', action: () => scrollToSection('pricing') },
    { label: 'Login', action: () => navigate('/login') },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      {/* ========== HEADER ========== */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        height: 72
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Logo - LEFT */}
          <Logo size="medium" variant="dark" />

          {/* Desktop Nav - CENTER/RIGHT */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="desktop-nav">
            {navLinks.map((link, idx) => (
              <Button
                key={idx}
                type="text"
                onClick={link.action}
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: '#374151',
                  padding: '8px 16px',
                  height: 'auto'
                }}
              >
                {link.label}
              </Button>
            ))}
            <Button 
              type="primary" 
              onClick={() => navigate('/register')}
              style={{ 
                marginLeft: 8,
                height: 42,
                padding: '0 24px',
                fontSize: 15,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #00CED1 0%, #4169E1 100%)',
                border: 'none',
                borderRadius: 8
              }}
            >
              Get Started
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <Button
            type="text"
            icon={<MenuOutlined style={{ fontSize: 24 }} />}
            onClick={() => setMobileMenuOpen(true)}
            className="mobile-menu-btn"
            style={{ display: 'none' }}
          />
        </div>
      </header>

      {/* Mobile Drawer */}
      <Drawer
        title={null}
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
        closeIcon={<CloseOutlined style={{ fontSize: 20 }} />}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: 24 }}>
          <Logo size="medium" variant="dark" style={{ marginBottom: 32 }} />
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {navLinks.map((link, idx) => (
              <Button
                key={idx}
                type="text"
                block
                onClick={link.action}
                style={{
                  textAlign: 'left',
                  height: 48,
                  fontSize: 16,
                  fontWeight: 500
                }}
              >
                {link.label}
              </Button>
            ))}
            <Button 
              type="primary" 
              block
              onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}
              style={{ 
                marginTop: 16,
                height: 48,
                fontSize: 16,
                fontWeight: 600,
                background: 'linear-gradient(135deg, #00CED1 0%, #4169E1 100%)',
                border: 'none',
                borderRadius: 8
              }}
            >
              Get Started
            </Button>
          </Space>
        </div>
      </Drawer>

      <Content style={{ marginTop: 72 }}>
        {/* ========== HERO SECTION ========== */}
        <div style={{
          background: 'linear-gradient(135deg, #00CED1 0%, #20B2AA 40%, #4169E1 100%)',
          padding: '80px 24px 100px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.08\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: 0.5
          }} />
          
          <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
            <Title style={{ 
              color: 'white', 
              fontSize: 'clamp(32px, 6vw, 56px)', 
              marginBottom: 20, 
              fontWeight: 800,
              lineHeight: 1.2
            }}>
              Be the First, Win the Lead
            </Title>
            <Paragraph style={{ 
              color: 'rgba(255,255,255,0.95)', 
              fontSize: 'clamp(16px, 2.5vw, 20px)', 
              marginBottom: 40, 
              maxWidth: 600, 
              margin: '0 auto 40px',
              lineHeight: 1.6
            }}>
              Speed-to-lead analytics for GoHighLevel. Track response times, motivate your team, and close more deals.
            </Paragraph>
            <Space size="middle" wrap style={{ justifyContent: 'center' }}>
              <Button 
                type="primary" 
                size="large" 
                icon={<RocketOutlined />}
                onClick={() => navigate('/register')}
                style={{ 
                  height: 52, 
                  padding: '0 32px', 
                  fontSize: 17,
                  background: 'white',
                  color: '#00CED1',
                  border: 'none',
                  fontWeight: 600,
                  borderRadius: 8,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
                }}
              >
                Start Free Trial
              </Button>
              <Button 
                size="large" 
                ghost
                onClick={() => scrollToSection('features')}
                style={{ 
                  height: 52, 
                  padding: '0 32px', 
                  fontSize: 17, 
                  borderColor: 'rgba(255,255,255,0.8)', 
                  color: 'white',
                  borderRadius: 8,
                  fontWeight: 500
                }}
              >
                See How It Works
              </Button>
            </Space>
          </div>
        </div>

        {/* ========== STATS SECTION ========== */}
        <div style={{ 
          background: '#0f172a', 
          padding: '60px 24px',
          textAlign: 'center'
        }}>
          <Row gutter={[48, 32]} justify="center" align="middle" style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Col xs={24} md={12}>
              <Statistic
                value={78}
                suffix="%"
                valueStyle={{ color: '#f5576c', fontSize: 64, fontWeight: 800 }}
              />
              <Title level={3} style={{ color: 'white', margin: '12px 0 8px', fontWeight: 600 }}>
                of leads buy from the first responder
              </Title>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>
                — InsideSales.com Research
              </Text>
            </Col>
            <Col xs={24} md={12}>
              <Card style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 16 }}>
                  Response time impact:
                </Text>
                <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Statistic 
                    title={<span style={{color: 'rgba(255,255,255,0.5)'}}>5 min</span>} 
                    value="9x" 
                    valueStyle={{ color: '#52c41a', fontSize: 32, fontWeight: 700 }} 
                    suffix="more likely" 
                  />
                  <Statistic 
                    title={<span style={{color: 'rgba(255,255,255,0.5)'}}>30+ min</span>} 
                    value="21x" 
                    valueStyle={{ color: '#faad14', fontSize: 32, fontWeight: 700 }} 
                    suffix="drop off" 
                  />
                </div>
              </Card>
            </Col>
          </Row>
        </div>

        {/* ========== FEATURES SECTION ========== */}
        <div id="features" style={{ padding: '100px 24px', background: '#f8fafc' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <Title level={2} style={{ marginBottom: 16, fontWeight: 700 }}>
                Everything You Need to Respond Faster
              </Title>
              <Paragraph style={{ fontSize: 18, color: '#64748b', maxWidth: 550, margin: '0 auto' }}>
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
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)'
                    }}
                  >
                    <Space direction="vertical" size="middle">
                      <div style={{ 
                        width: 56, 
                        height: 56, 
                        borderRadius: 12, 
                        background: 'linear-gradient(135deg, rgba(0,206,209,0.1) 0%, rgba(65,105,225,0.1) 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {feature.icon}
                      </div>
                      <Title level={4} style={{ margin: 0, fontWeight: 600 }}>{feature.title}</Title>
                      <Text style={{ color: '#64748b', lineHeight: 1.6 }}>{feature.description}</Text>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>

        {/* ========== TESTIMONIALS SECTION ========== */}
        <div style={{ padding: '100px 24px', background: 'white' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <Title level={2} style={{ marginBottom: 16, fontWeight: 700 }}>
                Loved by GHL Users Everywhere
              </Title>
              <Paragraph style={{ fontSize: 18, color: '#64748b' }}>
                See what our customers are saying
              </Paragraph>
            </div>
            <Row gutter={[32, 32]}>
              {testimonials.map((testimonial, index) => (
                <Col xs={24} md={8} key={index}>
                  <Card style={{ 
                    height: '100%', 
                    borderRadius: 16,
                    border: '1px solid #e2e8f0'
                  }}>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <Rate disabled defaultValue={testimonial.rating} style={{ fontSize: 16 }} />
                      <Paragraph style={{ fontSize: 16, margin: 0, fontStyle: 'italic', color: '#334155' }}>
                        "{testimonial.content}"
                      </Paragraph>
                      <Divider style={{ margin: '12px 0' }} />
                      <Space>
                        <Avatar style={{ background: 'linear-gradient(135deg, #00CED1 0%, #4169E1 100%)' }}>
                          {testimonial.avatar}
                        </Avatar>
                        <div>
                          <Text strong style={{ display: 'block' }}>{testimonial.name}</Text>
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

        {/* ========== PRICING SECTION ========== */}
        <div id="pricing" style={{ padding: '100px 24px', background: '#f8fafc' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <Title level={2} style={{ marginBottom: 16, fontWeight: 700 }}>
                Simple, Transparent Pricing
              </Title>
              <Paragraph style={{ fontSize: 18, color: '#64748b' }}>
                Start free, upgrade when you're ready
              </Paragraph>
            </div>
            <Row gutter={[24, 24]} justify="center">
              {pricingPlans.map((plan, index) => (
                <Col xs={24} sm={12} lg={6} key={index}>
                  <Card 
                    style={{ 
                      height: '100%', 
                      borderRadius: 16,
                      border: plan.highlighted ? '2px solid #00CED1' : '1px solid #e2e8f0',
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
                        background: 'linear-gradient(135deg, #00CED1 0%, #4169E1 100%)',
                        color: 'white',
                        padding: '4px 16px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: '0.5px'
                      }}>
                        MOST POPULAR
                      </div>
                    )}
                    <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                      <div>
                        <Title level={4} style={{ margin: 0, fontWeight: 600 }}>{plan.name}</Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>{plan.description}</Text>
                      </div>
                      <div>
                        <Text style={{ 
                          fontSize: 40, 
                          fontWeight: 800, 
                          background: 'linear-gradient(135deg, #00CED1 0%, #4169E1 100%)', 
                          WebkitBackgroundClip: 'text', 
                          WebkitTextFillColor: 'transparent' 
                        }}>
                          {plan.price}
                        </Text>
                        <Text type="secondary">{plan.period}</Text>
                      </div>
                      <Divider style={{ margin: '4px 0' }} />
                      <Space direction="vertical" size="small" style={{ width: '100%', textAlign: 'left' }}>
                        {plan.features.map((feature, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 14 }} />
                            <Text style={{ fontSize: 14 }}>{feature}</Text>
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
                          background: 'linear-gradient(135deg, #00CED1 0%, #4169E1 100%)', 
                          border: 'none',
                          height: 44,
                          fontWeight: 600,
                          borderRadius: 8
                        } : { height: 44, borderRadius: 8 }}
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

        {/* ========== FINAL CTA ========== */}
        <div style={{
          background: 'linear-gradient(135deg, #00CED1 0%, #20B2AA 40%, #4169E1 100%)',
          padding: '80px 24px',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: 650, margin: '0 auto' }}>
            <Title style={{ color: 'white', fontSize: 'clamp(24px, 5vw, 38px)', marginBottom: 16, fontWeight: 700 }}>
              Ready to Win More Leads?
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: 17, marginBottom: 32, lineHeight: 1.7 }}>
              Join hundreds of GHL users who are closing more deals by responding faster. Start your free trial today.
            </Paragraph>
            <Button 
              type="primary" 
              size="large" 
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/register')}
              style={{ 
                height: 52, 
                padding: '0 40px', 
                fontSize: 17,
                background: 'white',
                color: '#00CED1',
                border: 'none',
                fontWeight: 600,
                borderRadius: 8,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
              }}
            >
              Start Free — No Credit Card Required
            </Button>
          </div>
        </div>
      </Content>

      {/* ========== FOOTER ========== */}
      <Footer style={{ 
        background: '#0f172a',
        padding: '60px 24px 40px'
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[48, 40]}>
            {/* Brand Column */}
            <Col xs={24} md={8}>
              <Logo size="medium" variant="light" />
              <Paragraph style={{ color: 'rgba(255,255,255,0.6)', marginTop: 16, maxWidth: 280 }}>
                Speed-to-lead analytics built for GoHighLevel. Track, analyze, and improve your team's response times.
              </Paragraph>
              <Space size="middle" style={{ marginTop: 16 }}>
                <Button 
                  type="text" 
                  icon={<TwitterOutlined style={{ fontSize: 18 }} />} 
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Button 
                  type="text" 
                  icon={<LinkedinOutlined style={{ fontSize: 18 }} />} 
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                />
                <Button 
                  type="text" 
                  icon={<GithubOutlined style={{ fontSize: 18 }} />} 
                  style={{ color: 'rgba(255,255,255,0.6)' }}
                />
              </Space>
            </Col>
            
            {/* Links Columns */}
            <Col xs={12} sm={8} md={5}>
              <Title level={5} style={{ color: 'white', marginBottom: 16 }}>Product</Title>
              <Space direction="vertical" size="small">
                <Button type="link" style={{ color: 'rgba(255,255,255,0.6)', padding: 0, height: 'auto' }}>
                  Features
                </Button>
                <Button type="link" style={{ color: 'rgba(255,255,255,0.6)', padding: 0, height: 'auto' }}>
                  Pricing
                </Button>
                <Button type="link" style={{ color: 'rgba(255,255,255,0.6)', padding: 0, height: 'auto' }}>
                  Integrations
                </Button>
              </Space>
            </Col>
            
            <Col xs={12} sm={8} md={5}>
              <Title level={5} style={{ color: 'white', marginBottom: 16 }}>Company</Title>
              <Space direction="vertical" size="small">
                <Button type="link" style={{ color: 'rgba(255,255,255,0.6)', padding: 0, height: 'auto' }}>
                  About
                </Button>
                <Button type="link" style={{ color: 'rgba(255,255,255,0.6)', padding: 0, height: 'auto' }}>
                  Blog
                </Button>
                <Button type="link" style={{ color: 'rgba(255,255,255,0.6)', padding: 0, height: 'auto' }}>
                  Careers
                </Button>
              </Space>
            </Col>
            
            <Col xs={12} sm={8} md={6}>
              <Title level={5} style={{ color: 'white', marginBottom: 16 }}>Legal</Title>
              <Space direction="vertical" size="small">
                <Button type="link" style={{ color: 'rgba(255,255,255,0.6)', padding: 0, height: 'auto' }}>
                  Privacy Policy
                </Button>
                <Button type="link" style={{ color: 'rgba(255,255,255,0.6)', padding: 0, height: 'auto' }}>
                  Terms of Service
                </Button>
              </Space>
            </Col>
          </Row>
          
          <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '40px 0 24px' }} />
          
          <div style={{ textAlign: 'center' }}>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
              © {new Date().getFullYear()} First Response. All rights reserved.
            </Text>
          </div>
        </div>
      </Footer>

      {/* ========== RESPONSIVE STYLES ========== */}
      <style>{`
        .desktop-nav {
          display: flex !important;
        }
        .mobile-menu-btn {
          display: none !important;
        }
        
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
        }
      `}</style>
    </Layout>
  );
};

export default Landing;
