import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, Form, Input, Typography, Space, message, Alert } from 'antd';
import { 
  MailOutlined, 
  ArrowLeftOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const ForgotPassword: React.FC = () => {
  const { forgotPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await forgotPassword(values.email);
      setEmail(values.email);
      setEmailSent(true);
      message.success('Password reset link sent to your email');
    } catch (error: any) {
      message.error(error.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 200px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '450px', width: '100%' }}>
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
              
              <Title level={2} style={{ marginBottom: '8px' }}>
                {emailSent ? 'Check Your Email' : 'Forgot Password?'}
              </Title>
              <Text style={{ color: '#595959' }}>
                {emailSent 
                  ? `We've sent a password reset link to ${email}`
                  : 'No worries, we\'ll send you reset instructions'
                }
              </Text>
            </div>

            {!emailSent ? (
              <>
                {/* Forgot Password Form */}
                <Form
                  name="forgot-password"
                  onFinish={handleSubmit}
                  layout="vertical"
                  requiredMark={false}
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

                  <Form.Item style={{ marginBottom: '12px' }}>
                    <Button 
                      type="primary" 
                      htmlType="submit" 
                      size="large" 
                      block
                      loading={loading}
                      style={{ 
                        height: '48px',
                        fontSize: '16px',
                        fontWeight: '600',
                        borderRadius: '8px'
                      }}
                    >
                      Send Reset Link
                    </Button>
                  </Form.Item>
                </Form>
              </>
            ) : (
              <Alert
                message="Email Sent Successfully"
                description={
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text>
                      Check your inbox and click the link to reset your password. 
                      The link will expire in 1 hour.
                    </Text>
                    <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      Didn't receive the email? Check your spam folder or{' '}
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          setEmailSent(false);
                        }}
                        style={{ 
                          color: '#667eea',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                          font: 'inherit'
                        }}
                      >
                        try again
                      </button>
                    </Text>
                  </Space>
                }
                type="success"
                showIcon
                style={{ marginBottom: '16px' }}
              />
            )}

            {/* Back to Login Link */}
            <div style={{ textAlign: 'center' }}>
              <Link 
                to="/login" 
                style={{ 
                  color: '#667eea', 
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ArrowLeftOutlined />
                Back to Login
              </Link>
            </div>

            {/* Help Section */}
            <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '14px' }}>
                  Need help?
                </Text>
                <Text style={{ color: '#595959', fontSize: '13px' }}>
                  Contact support at{' '}
                  <a href="mailto:support@ghlworkflowdebugger.com" style={{ color: '#667eea' }}>
                    support@ghlworkflowdebugger.com
                  </a>
                </Text>
              </Space>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
