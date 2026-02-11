import React from 'react';
import { Modal, Card, Typography, Space, Button, Tag, Row, Col, Divider, Tooltip } from 'antd';
import {
  CloseOutlined,
  CheckOutlined,
  ThunderboltOutlined,
  CrownOutlined,
  BankOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: 'free' | 'pro' | 'agency';
  requiredPlan?: 'pro' | 'agency';
  feature?: string;
}

const FEATURES = {
  free: {
    name: 'Free',
    price: '$0',
    icon: <ThunderboltOutlined />,
    features: [
      { name: 'Basic dashboard', included: true },
      { name: '7-day history', included: true },
      { name: 'Limited insights (3)', included: true },
      { name: 'Export reports', included: false },
      { name: 'Slack/email alerts', included: false },
      { name: 'Team analytics', included: false },
      { name: 'AI insights', included: false },
      { name: 'White-label branding', included: false },
      { name: 'Shareable reports', included: false },
      { name: 'API access', included: false },
    ],
  },
  pro: {
    name: 'Pro',
    price: '$100/mo',
    icon: <CrownOutlined />,
    popular: true,
    features: [
      { name: 'Basic dashboard', included: true },
      { name: 'Full history (365 days)', included: true },
      { name: 'Unlimited insights', included: true },
      { name: 'Export reports (CSV, PDF)', included: true },
      { name: 'Slack/email alerts', included: true },
      { name: 'Team analytics', included: true },
      { name: 'AI-powered insights', included: true },
      { name: 'White-label branding', included: false },
      { name: 'Shareable reports', included: false },
      { name: 'API access', included: false },
    ],
  },
  agency: {
    name: 'Agency',
    price: '$200/mo',
    icon: <BankOutlined />,
    features: [
      { name: 'Basic dashboard', included: true },
      { name: 'Unlimited history', included: true },
      { name: 'Unlimited insights', included: true },
      { name: 'Export reports (CSV, PDF)', included: true },
      { name: 'Slack/email alerts', included: true },
      { name: 'Team analytics', included: true },
      { name: 'AI-powered insights', included: true },
      { name: 'White-label branding', included: true },
      { name: 'Shareable client reports', included: true },
      { name: 'Full API access', included: true },
    ],
  },
};

// GHL Marketplace app URL - update with your actual app ID
const MARKETPLACE_URL = 'https://marketplace.gohighlevel.com/app/YOUR_APP_ID';

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  isOpen,
  onClose,
  currentPlan,
  requiredPlan = 'pro',
  feature,
}) => {
  const handleUpgrade = (plan: 'pro' | 'agency') => {
    window.open(`${MARKETPLACE_URL}?plan=${plan}`, '_blank');
  };

  const getPlanColor = (plan: string) => {
    if (plan === 'free') return '#8c8c8c';
    if (plan === 'pro') return '#1890ff';
    return '#722ed1';
  };

  const getPlanBgColor = (plan: string) => {
    if (plan === 'free') return '#fafafa';
    if (plan === 'pro') return '#e6f7ff';
    return '#f9f0ff';
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={900}
      centered
      closeIcon={<CloseOutlined />}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #1890ff 0%, #722ed1 100%)',
          marginBottom: 16
        }}>
          <CrownOutlined style={{ fontSize: 32, color: 'white' }} />
        </div>
        <Title level={3} style={{ margin: 0, marginBottom: 8 }}>
          Unlock Premium Features
        </Title>
        {feature && (
          <Text type="secondary">
            <Text strong style={{ color: '#1890ff' }}>{feature}</Text> requires a {requiredPlan === 'agency' ? 'Agency' : 'Pro'} subscription
          </Text>
        )}
      </div>

      {/* Pricing Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {(['free', 'pro', 'agency'] as const).map((plan) => {
          const planData = FEATURES[plan];
          const isCurrentPlan = currentPlan === plan;
          const isPopular = 'popular' in planData && planData.popular;
          const canUpgrade = plan !== 'free' && (
            currentPlan === 'free' || 
            (currentPlan === 'pro' && plan === 'agency')
          );

          return (
            <Col key={plan} xs={24} md={8}>
              <Card
                hoverable={canUpgrade}
                style={{
                  height: '100%',
                  borderColor: isPopular ? '#1890ff' : isCurrentPlan ? '#52c41a' : '#d9d9d9',
                  borderWidth: isPopular || isCurrentPlan ? 2 : 1,
                  background: getPlanBgColor(plan),
                  position: 'relative'
                }}
                bodyStyle={{ padding: 24 }}
              >
                {isPopular && (
                  <Tag 
                    color="#1890ff" 
                    style={{ 
                      position: 'absolute', 
                      top: -12, 
                      left: '50%', 
                      transform: 'translateX(-50%)',
                      fontWeight: 600
                    }}
                  >
                    MOST POPULAR
                  </Tag>
                )}
                
                {isCurrentPlan && (
                  <Tag 
                    color="#52c41a" 
                    style={{ 
                      position: 'absolute', 
                      top: -12, 
                      left: '50%', 
                      transform: 'translateX(-50%)',
                      fontWeight: 600
                    }}
                  >
                    CURRENT PLAN
                  </Tag>
                )}

                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: getPlanBgColor(plan),
                    border: `2px solid ${getPlanColor(plan)}`,
                    marginBottom: 12
                  }}>
                    <span style={{ fontSize: 24, color: getPlanColor(plan) }}>
                      {planData.icon}
                    </span>
                  </div>
                  <Title level={4} style={{ margin: 0 }}>
                    {planData.name}
                  </Title>
                  <Title level={2} style={{ margin: '8px 0 0 0', color: getPlanColor(plan) }}>
                    {planData.price}
                  </Title>
                </div>

                <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 24 }}>
                  {planData.features.map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <CheckOutlined style={{ 
                        color: feat.included ? '#52c41a' : '#d9d9d9',
                        marginTop: 4
                      }} />
                      <Text 
                        style={{ 
                          color: feat.included ? 'inherit' : '#bfbfbf',
                          textDecoration: feat.included ? 'none' : 'line-through'
                        }}
                      >
                        {feat.name}
                      </Text>
                    </div>
                  ))}
                </Space>

                {canUpgrade ? (
                  <Button
                    type={isPopular ? 'primary' : 'default'}
                    size="large"
                    block
                    onClick={() => handleUpgrade(plan as 'pro' | 'agency')}
                  >
                    Upgrade to {planData.name}
                  </Button>
                ) : (
                  <Button size="large" block disabled>
                    {isCurrentPlan ? 'Current Plan' : 'N/A'}
                  </Button>
                )}
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Footer */}
      <Divider style={{ margin: '16px 0' }} />
      <Text type="secondary" style={{ display: 'block', textAlign: 'center' }}>
        Subscriptions are managed through the{' '}
        <a href={MARKETPLACE_URL} target="_blank" rel="noopener noreferrer">
          GoHighLevel Marketplace
        </a>
        . Cancel anytime.
      </Text>
    </Modal>
  );
};

export default UpgradePrompt;
