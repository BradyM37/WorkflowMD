import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button, Card, Form, Input, Typography, Space, message, Divider } from 'antd';
import { 
  UserOutlined, 
  MailOutlined, 
  LockOutlined, 
  EyeInvisibleOutlined, 
  EyeTwoTone,
  CheckCircleOutlined,
  BankOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const { Title, Text } = Typography;

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleRegister = async (values: any) => {
    setLoading(true);
    try {
      await register({
        email: values.email,
        password: values.password,
        name: values.name,
        companyName: values.companyName
      });
      
      message.success('Account created successfully! Check your email to verify.');
      
      // Redirect to email verification notice
      setTimeout(() => {
        navigate('/email-verification-sent');
      }, 1500);
    } catch (error: any) {
      message.error(error.message || 'Registration failed. Please try again.');
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
                margin: '0 auto 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img src="/logo-full.jpg" alt="FirstResponse" style={{ height: 80, width: 'auto', borderRadius: 8 }} />
              </div>
              
              <Title level={2} style={{ marginBottom: '8px' }}>Create Your Account</Title>
              <Text style={{ color: '#595959' }}>
                Be the First, Win the Lead
              </Text>
            </div>

            {/* Registration Form */}
            <Form
              form={form}
              name="register"
              onFinish={handleRegister}
              layout="vertical"
              requiredMark={false}
            >
              <Form.Item
                name="name"
                label="Full Name"
                rules={[
                  { required: true, message: 'Please enter your name' },
                  { min: 2, message: 'Name must be at least 2 characters' }
                ]}
              >
                <Input 
                  prefix={<UserOutlined />}
                  placeholder="John Doe"
                  size="large"
                />
              </Form.Item>

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
                name="companyName"
                label="Company Name (Optional)"
              >
                <Input 
                  prefix={<BankOutlined />}
                  placeholder="Your Company"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please enter your password' },
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
                label="Confirm Password"
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
                  className="cta-pulse"
                  style={{ 
                    height: '48px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '8px'
                  }}
                >
                  Create Account
                </Button>
              </Form.Item>

              <div style={{ textAlign: 'center' }}>
                <Text style={{ color: '#595959' }}>
                  Already have an account?{' '}
                  <Link to="/login" style={{ color: '#667eea', fontWeight: 600 }}>
                    Login here
                  </Link>
                </Text>
              </div>
            </Form>

            <Divider />

            {/* Features List */}
            <div style={{ 
              background: isDarkMode ? '#1f1f1f' : '#f8f9fa', 
              padding: '16px', 
              borderRadius: '8px' 
            }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong style={{ fontSize: '14px', color: isDarkMode ? '#ffffff' : '#1a1a2e' }}>
                  What you'll get:
                </Text>
                <div>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text style={{ color: isDarkMode ? '#d9d9d9' : '#595959' }}>Real-time speed-to-lead tracking</Text>
                </div>
                <div>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text style={{ color: isDarkMode ? '#d9d9d9' : '#595959' }}>Team response time analytics</Text>
                </div>
                <div>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                  <Text style={{ color: isDarkMode ? '#d9d9d9' : '#595959' }}>Alerts when leads go cold</Text>
                </div>
              </Space>
            </div>

            {/* Terms */}
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
                By creating an account, you agree to our{' '}
                <a href="/terms" style={{ color: '#667eea' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy" style={{ color: '#667eea' }}>Privacy Policy</a>
              </Text>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
};

export default Register;
