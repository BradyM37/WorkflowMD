import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button, Card, Form, Input, Typography, Space, message, Result } from 'antd';
import { 
  LockOutlined, 
  EyeInvisibleOutlined, 
  EyeTwoTone,
  ThunderboltOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    if (!token) {
      message.error('Invalid reset token');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, values.password);
      setSuccess(true);
      message.success('Password reset successfully!');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      message.error(error.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validatePassword = (_: any, value: string) => {
    if (!value || value.length < 8) {
      return Promise.reject(new Error('Password must be at least 8 characters'));
    }
    return Promise.resolve();
  };

  const validateConfirmPassword = (_: any, value: string) => {
    const password = form.getFieldValue('password');
    if (value && value !== password) {
      return Promise.reject(new Error('Passwords do not match'));
    }
    return Promise.resolve();
  };

  if (success) {
    return (
      <div style={{ 
        minHeight: 'calc(100vh - 200px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px'
      }}>
        <Card 
          style={{ 
            maxWidth: '450px',
            width: '100%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
            borderRadius: '12px',
            border: 'none',
            animation: 'fadeInUp 0.6s ease'
          }}
        >
          <Result
            status="success"
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="Password Reset Successful!"
            subTitle="Your password has been updated. Redirecting to login..."
            extra={[
              <Button 
                type="primary" 
                key="login"
                onClick={() => navigate('/login')}
                style={{ 
                  height: '40px',
                  borderRadius: '8px'
                }}
              >
                Go to Login
              </Button>
            ]}
          />
        </Card>
      </div>
    );
  }

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
              
              <Title level={2} style={{ marginBottom: '8px' }}>Reset Password</Title>
              <Text style={{ color: '#595959' }}>
                Enter your new password below
              </Text>
            </div>

            {/* Reset Password Form */}
            <Form
              form={form}
              name="reset-password"
              onFinish={handleSubmit}
              layout="vertical"
              requiredMark={false}
            >
              <Form.Item
                name="password"
                label="New Password"
                rules={[
                  { required: true, message: 'Please enter your new password' },
                  { validator: validatePassword }
                ]}
                hasFeedback
              >
                <Input.Password 
                  prefix={<LockOutlined />}
                  placeholder="At least 8 characters"
                  size="large"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm New Password"
                dependencies={['password']}
                rules={[
                  { required: true, message: 'Please confirm your password' },
                  { validator: validateConfirmPassword }
                ]}
                hasFeedback
              >
                <Input.Password 
                  prefix={<LockOutlined />}
                  placeholder="Confirm your password"
                  size="large"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
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
                  Reset Password
                </Button>
              </Form.Item>
            </Form>

            {/* Back to Login Link */}
            <div style={{ textAlign: 'center' }}>
              <Link 
                to="/login" 
                style={{ 
                  color: '#667eea', 
                  fontWeight: 600
                }}
              >
                Back to Login
              </Link>
            </div>

            {/* Security Notice */}
            <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px' }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '14px' }}>
                  🔒 Password Requirements:
                </Text>
                <Text style={{ color: '#595959', fontSize: '13px' }}>
                  • At least 8 characters long<br />
                  • Use a strong, unique password<br />
                  • Don't reuse passwords from other sites
                </Text>
              </Space>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
