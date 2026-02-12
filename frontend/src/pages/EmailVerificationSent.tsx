import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Typography, Space, Alert, Button } from 'antd';
import { 
  MailOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

const EmailVerificationSent: React.FC = () => {
  const pendingUser = JSON.parse(localStorage.getItem('pending_user') || '{}');
  const email = pendingUser.email || 'your email';

  return (
    <div style={{ 
      minHeight: 'calc(100vh - 200px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
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
                <MailOutlined style={{ fontSize: '48px', color: 'white' }} />
              </div>
              
              <Title level={2} style={{ marginBottom: '8px' }}>
                Check Your Email
              </Title>
              <Text style={{ color: '#595959', fontSize: '16px' }}>
                We've sent a verification link to
              </Text>
              <br />
              <Text strong style={{ fontSize: '16px' }}>
                {email}
              </Text>
            </div>

            {/* Success Message */}
            <Alert
              message="Verification Email Sent"
              description={
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text>
                    Click the link in the email to verify your account and complete registration.
                  </Text>
                  <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                    The verification link will expire in 24 hours.
                  </Text>
                </Space>
              }
              type="success"
              showIcon
            />

            {/* Instructions */}
            <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '14px' }}>
                  What to do next:
                </Text>
                <Text style={{ color: '#595959', fontSize: '13px' }}>
                  1. Check your inbox for an email from FirstResponse<br />
                  2. Click the verification link in the email<br />
                  3. You'll be redirected to login<br />
                  4. Connect your GoHighLevel account and start analyzing
                </Text>
              </Space>
            </div>

            {/* Didn't receive email */}
            <Alert
              message="Didn't receive the email?"
              description={
                <Text style={{ fontSize: '13px' }}>
                  Check your spam folder. If you still can't find it,{' '}
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      // Resend logic here
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
                    resend verification email
                  </button>
                  {' '}or{' '}
                  <a href="mailto:support@ghlworkflowdebugger.com" style={{ color: '#667eea' }}>
                    contact support
                  </a>
                  .
                </Text>
              }
              type="warning"
              showIcon
            />

            {/* Actions */}
            <div style={{ textAlign: 'center' }}>
              <Link to="/login">
                <Button 
                  type="primary"
                  size="large"
                  style={{ 
                    height: '48px',
                    borderRadius: '8px',
                    fontWeight: 600
                  }}
                >
                  Back to Login
                </Button>
              </Link>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default EmailVerificationSent;
