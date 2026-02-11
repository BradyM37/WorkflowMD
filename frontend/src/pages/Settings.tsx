import React, { useState } from 'react';
import { 
  Card, 
  Typography, 
  Space, 
  Row, 
  Col, 
  Switch, 
  Button, 
  Input, 
  Select, 
  Divider,
  Avatar,
  Badge,
  Alert,
  Tabs,
  Form,
  Tooltip
} from 'antd';
import { 
  UserOutlined,
  BellOutlined,
  SafetyOutlined,
  CreditCardOutlined,
  MailOutlined,
  LockOutlined,
  CrownOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  BulbOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  BgColorsOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { StartTourButton } from '../components/OnboardingTour';
import { toast } from '../utils/toast';
import { useNavigate } from 'react-router-dom';
import ScheduleModal from '../components/ScheduleModal';
import { MOCK_WORKFLOWS } from '../mocks/mockData';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Settings: React.FC = () => {
  const { subscription, locationId, user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [slackConnecting, setSlackConnecting] = useState(false);
  const [zapierConnecting, setZapierConnecting] = useState(false);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    weeklyReports: true,
    criticalAlerts: true,
    autoAnalysis: false,
    language: 'en',
    timezone: 'America/New_York',
  });

  // Use email as username (fallback to locationId for backwards compatibility)
  const displayName = user?.email || user?.name || locationId || 'Demo User';

  // Get current schedule from localStorage
  const currentSchedule = JSON.parse(localStorage.getItem('scan_schedule') || 'null');

  const toggleSchedule = () => {
    if (currentSchedule) {
      const updated = { ...currentSchedule, enabled: !currentSchedule.enabled };
      localStorage.setItem('scan_schedule', JSON.stringify(updated));
      if (updated.enabled) {
        toast.success('Schedule enabled - Automatic scans will run as configured');
      } else {
        toast.info('Schedule disabled - Automatic scans have been paused');
      }
      // Force re-render
      window.location.reload();
    } else {
      setScheduleModalVisible(true);
    }
  };

  const handleSave = () => {
    setLoading(true);
    toast.loading('Saving changes...');
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      toast.destroy(); // Remove loading toast
      toast.success('Settings saved successfully!');
    }, 1000);
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings({ ...settings, [key]: value });
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <UserOutlined /> Account Settings
        </Title>
        <Text type="secondary">
          Manage your account, notifications, and preferences
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Sidebar Profile Card */}
        <Col xs={24} lg={8}>
          <Card style={{ textAlign: 'center' }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Badge 
                count={subscription === 'pro' ? <CrownOutlined style={{ color: '#faad14' }} /> : 0}
                offset={[-8, 8]}
              >
                <Avatar 
                  size={100} 
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    fontSize: '48px'
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </Avatar>
              </Badge>
              
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {displayName}
                </Title>
                <Text type="secondary">
                  {subscription === 'pro' ? '⭐ Pro Member' : '🆓 Free Plan'}
                </Text>
              </div>

              {subscription === 'free' && (
                <Button 
                  type="primary" 
                  size="large" 
                  block
                  icon={<CrownOutlined />}
                  onClick={() => navigate('/pricing')}
                >
                  Upgrade to Pro
                </Button>
              )}

              <Divider />

              <Space direction="vertical" style={{ width: '100%', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ color: '#8c8c8c' }}>Plan</Text>
                  <Text strong>{subscription === 'pro' ? 'Pro' : 'Free'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ color: '#8c8c8c' }}>Member since</Text>
                  <Text strong>Jan 2026</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ color: '#8c8c8c' }}>Scans this month</Text>
                  <Text strong>12</Text>
                </div>
              </Space>
            </Space>
          </Card>

          {/* Quick Actions */}
          <Card title="Quick Actions" style={{ marginTop: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block icon={<MailOutlined />}>
                Change Email
              </Button>
              <Button block icon={<LockOutlined />}>
                Change Password
              </Button>
              <Button block icon={<CreditCardOutlined />} disabled={subscription === 'free'}>
                Billing Portal {subscription === 'free' && '(Pro)'}
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Main Settings Content */}
        <Col xs={24} lg={16}>
          <Tabs defaultActiveKey="notifications">
            {/* Scheduled Scans Tab */}
            <Tabs.TabPane 
              tab={
                <span>
                  <CalendarOutlined /> Scheduled Scans
                </span>
              } 
              key="scheduled-scans"
            >
              <Card>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Alert
                    message="Automate Workflow Analysis"
                    description="Schedule regular scans to proactively identify issues before they impact your business."
                    type="info"
                    showIcon
                    icon={<CalendarOutlined />}
                  />

                  {currentSchedule ? (
                    <>
                      {/* Current Schedule Status */}
                      <div style={{
                        padding: '24px',
                        background: currentSchedule.enabled 
                          ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                          : '#fafafa',
                        borderRadius: '12px',
                        border: currentSchedule.enabled ? '2px solid #667eea' : '1px solid #d9d9d9'
                      }}>
                        <Row gutter={[24, 24]}>
                          <Col span={24}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Space size="large">
                                <div style={{
                                  width: '60px',
                                  height: '60px',
                                  borderRadius: '50%',
                                  background: currentSchedule.enabled 
                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    : '#8c8c8c',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '28px',
                                  color: 'white'
                                }}>
                                  <CalendarOutlined />
                                </div>
                                <div>
                                  <Badge 
                                    status={currentSchedule.enabled ? 'success' : 'default'}
                                    text={
                                      <Text strong style={{ fontSize: '18px' }}>
                                        {currentSchedule.enabled ? 'Schedule Active' : 'Schedule Paused'}
                                      </Text>
                                    }
                                  />
                                  <div style={{ marginTop: '4px' }}>
                                    <Text type="secondary" style={{ fontSize: '14px', color: '#595959' }}>
                                      {currentSchedule.enabled ? (
                                        <>
                                          Next scan: {(() => {
                                            const time = dayjs(currentSchedule.time, 'HH:mm');
                                            const freq = currentSchedule.frequency;
                                            if (freq === 'daily') return `Tomorrow at ${time.format('h:mm A')}`;
                                            if (freq === 'every12h') return `Every 12 hours at ${time.format('h:mm A')}`;
                                            if (freq === 'every6h') return `Every 6 hours at ${time.format('h:mm A')}`;
                                            if (freq === 'weekly') return `Next week at ${time.format('h:mm A')}`;
                                            return 'Scheduled';
                                          })()}
                                        </>
                                      ) : (
                                        'Enable to resume automatic scans'
                                      )}
                                    </Text>
                                  </div>
                                </div>
                              </Space>
                              <Switch
                                checked={currentSchedule.enabled}
                                onChange={toggleSchedule}
                                checkedChildren="ON"
                                unCheckedChildren="OFF"
                                size="default"
                              />
                            </div>
                          </Col>
                        </Row>
                      </div>

                      <Divider />

                      {/* Schedule Details */}
                      <div>
                        <Text strong style={{ fontSize: '16px', display: 'block', marginBottom: '16px' }}>
                          <SettingOutlined /> Current Configuration
                        </Text>
                        <Row gutter={[16, 16]}>
                          <Col xs={24} sm={12}>
                            <Card size="small" style={{ background: '#fafafa' }}>
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                  <ClockCircleOutlined /> Frequency
                                </Text>
                                <Text strong style={{ fontSize: '16px' }}>
                                  {currentSchedule.frequency === 'daily' && 'Daily'}
                                  {currentSchedule.frequency === 'every12h' && 'Every 12 Hours'}
                                  {currentSchedule.frequency === 'every6h' && 'Every 6 Hours'}
                                  {currentSchedule.frequency === 'weekly' && 'Weekly'}
                                </Text>
                              </Space>
                            </Card>
                          </Col>
                          <Col xs={24} sm={12}>
                            <Card size="small" style={{ background: '#fafafa' }}>
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                  <ClockCircleOutlined /> Time
                                </Text>
                                <Text strong style={{ fontSize: '16px' }}>
                                  {dayjs(currentSchedule.time, 'HH:mm').format('h:mm A')}
                                </Text>
                              </Space>
                            </Card>
                          </Col>
                          <Col xs={24}>
                            <Card size="small" style={{ background: '#fafafa' }}>
                              <Space direction="vertical" style={{ width: '100%' }}>
                                <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                                  <ThunderboltOutlined /> Scope
                                </Text>
                                <Text strong style={{ fontSize: '16px' }}>
                                  {currentSchedule.scope === 'all' && 'All Workflows'}
                                  {currentSchedule.scope === 'active' && 'Active Workflows Only'}
                                  {currentSchedule.scope === 'selected' && 
                                    `${currentSchedule.selectedWorkflows?.length || 0} Selected Workflows`
                                  }
                                </Text>
                              </Space>
                            </Card>
                          </Col>
                        </Row>
                      </div>

                      <Divider />

                      <Space>
                        <Button
                          type="primary"
                          icon={<SettingOutlined />}
                          onClick={() => setScheduleModalVisible(true)}
                          size="large"
                        >
                          Edit Schedule
                        </Button>
                        <Button
                          danger
                          onClick={() => {
                            localStorage.removeItem('scan_schedule');
                            toast.info('Schedule deleted - Automatic scans have been disabled');
                            window.location.reload();
                          }}
                          size="large"
                        >
                          Delete Schedule
                        </Button>
                      </Space>
                    </>
                  ) : (
                    <>
                      {/* No Schedule Configured */}
                      <div style={{
                        textAlign: 'center',
                        padding: '48px 24px',
                        background: '#fafafa',
                        borderRadius: '12px'
                      }}>
                        <CalendarOutlined style={{ fontSize: '64px', color: '#d9d9d9', marginBottom: '16px' }} />
                        <Title level={4} style={{ color: '#595959' }}>No Schedule Configured</Title>
                        <Text type="secondary" style={{ color: '#8c8c8c' }}>
                          Set up automatic workflow scans to catch issues before they happen
                        </Text>
                        <div style={{ marginTop: '24px' }}>
                          <Button
                            type="primary"
                            size="large"
                            icon={<CalendarOutlined />}
                            onClick={() => setScheduleModalVisible(true)}
                          >
                            Create Schedule
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </Space>
              </Card>
            </Tabs.TabPane>

            {/* Notifications Tab */}
            <Tabs.TabPane 
              tab={
                <span>
                  <BellOutlined /> Notifications
                </span>
              } 
              key="notifications"
            >
              <Card>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Alert
                    message="Stay Updated"
                    description="Control when and how you receive notifications about your workflow analyses."
                    type="info"
                    showIcon
                    icon={<BellOutlined />}
                  />

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Email Notifications</Text>
                        <Text type="secondary" style={{ fontSize: '13px', color: '#8c8c8c' }}>
                          Receive analysis results via email
                        </Text>
                      </div>
                      <Switch 
                        checked={settings.emailNotifications}
                        onChange={(checked) => handleSettingChange('emailNotifications', checked)}
                      />
                    </div>
                    <Divider />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Weekly Summary Reports</Text>
                        <Text type="secondary" style={{ fontSize: '13px', color: '#8c8c8c' }}>
                          Get a weekly digest of all scanned workflows
                        </Text>
                      </div>
                      <Tooltip title={subscription === 'free' ? 'Pro feature' : ''}>
                        <Switch 
                          checked={settings.weeklyReports}
                          disabled={subscription === 'free'}
                          onChange={(checked) => handleSettingChange('weeklyReports', checked)}
                        />
                      </Tooltip>
                    </div>
                    {subscription === 'free' && (
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '12px' }}>
                        <CrownOutlined /> Pro feature - Upgrade to enable
                      </Text>
                    )}
                    <Divider />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Critical Issue Alerts</Text>
                        <Text type="secondary" style={{ fontSize: '13px', color: '#8c8c8c' }}>
                          Instant alerts when critical issues are detected
                        </Text>
                      </div>
                      <Switch 
                        checked={settings.criticalAlerts}
                        onChange={(checked) => handleSettingChange('criticalAlerts', checked)}
                      />
                    </div>
                    <Divider />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div>
                        <Text strong style={{ display: 'block' }}>Auto-Analysis on Workflow Save</Text>
                        <Text type="secondary" style={{ fontSize: '13px', color: '#8c8c8c' }}>
                          Automatically analyze workflows when they're updated
                        </Text>
                      </div>
                      <Tooltip title={subscription === 'free' ? 'Pro feature' : ''}>
                        <Switch 
                          checked={settings.autoAnalysis}
                          disabled={subscription === 'free'}
                          onChange={(checked) => handleSettingChange('autoAnalysis', checked)}
                        />
                      </Tooltip>
                    </div>
                    {subscription === 'free' && (
                      <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                        <CrownOutlined /> Pro feature - Upgrade to enable
                      </Text>
                    )}
                  </div>

                  <Button 
                    type="primary" 
                    size="large" 
                    loading={loading}
                    onClick={handleSave}
                    icon={<CheckCircleOutlined />}
                  >
                    Save Notification Settings
                  </Button>
                </Space>
              </Card>
            </Tabs.TabPane>

            {/* Preferences Tab */}
            <Tabs.TabPane 
              tab={
                <span>
                  <GlobalOutlined /> Preferences
                </span>
              } 
              key="preferences"
            >
              <Card>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Alert
                    message="Personalize Your Experience"
                    description="Customize how the app looks and behaves."
                    type="info"
                    showIcon
                    icon={<GlobalOutlined />}
                  />

                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <Text strong style={{ display: 'block', marginBottom: '8px' }}>Language</Text>
                      <Select 
                        style={{ width: '100%' }}
                        value={settings.language}
                        onChange={(value) => handleSettingChange('language', value)}
                        size="large"
                      >
                        <Option value="en">🇺🇸 English</Option>
                        <Option value="es">🇪🇸 Spanish</Option>
                        <Option value="fr">🇫🇷 French</Option>
                        <Option value="de">🇩🇪 German</Option>
                      </Select>
                    </Col>

                    <Col span={24}>
                      <Text strong style={{ display: 'block', marginBottom: '8px' }}>Timezone</Text>
                      <Select 
                        style={{ width: '100%' }}
                        value={settings.timezone}
                        onChange={(value) => handleSettingChange('timezone', value)}
                        size="large"
                        showSearch
                      >
                        <Option value="America/New_York">Eastern Time (ET)</Option>
                        <Option value="America/Chicago">Central Time (CT)</Option>
                        <Option value="America/Denver">Mountain Time (MT)</Option>
                        <Option value="America/Los_Angeles">Pacific Time (PT)</Option>
                        <Option value="Europe/London">London (GMT)</Option>
                        <Option value="Europe/Paris">Paris (CET)</Option>
                      </Select>
                    </Col>

                    <Col span={24}>
                      <Text strong style={{ display: 'block', marginBottom: '12px' }}>
                        <BulbOutlined /> Theme Appearance
                      </Text>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '16px',
                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f5',
                        borderRadius: '8px'
                      }}>
                        <Space>
                          {isDarkMode ? '🌙' : '☀️'}
                          <div>
                            <Text strong style={{ display: 'block' }}>
                              {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                              {isDarkMode ? 'Easy on the eyes at night' : 'Clear and bright during the day'}
                            </Text>
                          </div>
                        </Space>
                        <Switch 
                          checked={isDarkMode}
                          onChange={() => {
                            toggleDarkMode();
                            toast.success(isDarkMode ? 'Switched to light mode' : 'Switched to dark mode');
                          }}
                          checkedChildren="🌙"
                          unCheckedChildren="☀️"
                        />
                      </div>
                    </Col>

                    <Col span={24}>
                      <Divider />
                      <Text strong style={{ display: 'block', marginBottom: '12px' }}>
                        <RocketOutlined /> Getting Started
                      </Text>
                      <div style={{ 
                        padding: '16px',
                        background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f5',
                        borderRadius: '8px'
                      }}>
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Text type="secondary" style={{ fontSize: '13px', color: '#8c8c8c' }}>
                            Want to see the tutorial again? Restart the guided tour to learn about all features.
                          </Text>
                          <StartTourButton />
                        </Space>
                      </div>
                    </Col>
                  </Row>

                  <Button 
                    type="primary" 
                    size="large" 
                    loading={loading}
                    onClick={handleSave}
                    icon={<CheckCircleOutlined />}
                  >
                    Save Preferences
                  </Button>
                </Space>
              </Card>
            </Tabs.TabPane>

            {/* Security Tab */}
            <Tabs.TabPane 
              tab={
                <span>
                  <SafetyOutlined /> Security
                </span>
              } 
              key="security"
            >
              <Card>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Alert
                    message="Keep Your Account Secure"
                    description="Manage your password and security settings."
                    type="warning"
                    showIcon
                    icon={<LockOutlined />}
                  />

                  <Form layout="vertical">
                    <Form.Item label="Current Password">
                      <Input.Password 
                        size="large" 
                        placeholder="Enter current password"
                      />
                    </Form.Item>
                    <Form.Item label="New Password">
                      <Input.Password 
                        size="large" 
                        placeholder="Enter new password"
                      />
                    </Form.Item>
                    <Form.Item label="Confirm New Password">
                      <Input.Password 
                        size="large" 
                        placeholder="Confirm new password"
                      />
                    </Form.Item>
                  </Form>

                  <Button 
                    type="primary" 
                    size="large" 
                    danger
                    loading={loading}
                    onClick={handleSave}
                    icon={<LockOutlined />}
                  >
                    Update Password
                  </Button>

                  <Divider />

                  <div>
                    <Title level={5}>Two-Factor Authentication</Title>
                    <Paragraph type="secondary">
                      Add an extra layer of security to your account
                    </Paragraph>
                    <Button 
                      size="large"
                      disabled={subscription === 'free'}
                    >
                      {subscription === 'free' ? '2FA (Pro Feature)' : 'Enable 2FA'}
                    </Button>
                  </div>
                </Space>
              </Card>
            </Tabs.TabPane>

            {/* Integrations Tab */}
            <Tabs.TabPane 
              tab={
                <span>
                  <ThunderboltOutlined /> Integrations
                </span>
              } 
              key="integrations"
            >
              <Card>
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  <Alert
                    message="Connect Your Tools"
                    description="Integrate with your favorite platforms."
                    type="info"
                    showIcon
                    icon={<ThunderboltOutlined />}
                  />

                  <div style={{ 
                    padding: '24px', 
                    border: '1px solid #f0f0f0', 
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Space>
                      <Avatar 
                        style={{ background: '#667eea' }}
                        size={48}
                      >
                        GHL
                      </Avatar>
                      <div>
                        <Text strong style={{ display: 'block' }}>GoHighLevel</Text>
                        <Text type="secondary" style={{ color: '#8c8c8c' }}>Connected</Text>
                      </div>
                    </Space>
                    <Badge status="success" text="Active" />
                  </div>

                  <div style={{ 
                    padding: '24px', 
                    border: '1px solid #f0f0f0', 
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Space>
                      <Avatar 
                        style={{ background: '#1890ff' }}
                        size={48}
                      >
                        SL
                      </Avatar>
                      <div>
                        <Text strong style={{ display: 'block' }}>Slack Notifications</Text>
                        <Text type="secondary" style={{ color: '#8c8c8c' }}>Get alerts in Slack</Text>
                      </div>
                    </Space>
                    {subscription === 'free' ? (
                      <Button onClick={() => navigate('/pricing')}>
                        Upgrade to Pro
                      </Button>
                    ) : (
                      <Button 
                        type="primary"
                        loading={slackConnecting}
                        onClick={() => {
                          setSlackConnecting(true);
                          // Simulate OAuth redirect
                          setTimeout(() => {
                            setSlackConnecting(false);
                            toast.info('Slack OAuth coming soon! This will redirect you to authorize WorkflowMD in your Slack workspace.');
                          }, 1000);
                        }}
                      >
                        Connect
                      </Button>
                    )}
                  </div>

                  <div style={{ 
                    padding: '24px', 
                    border: '1px solid #f0f0f0', 
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Space>
                      <Avatar 
                        style={{ background: '#ff4a00' }}
                        size={48}
                      >
                        ZP
                      </Avatar>
                      <div>
                        <Text strong style={{ display: 'block' }}>Zapier</Text>
                        <Text type="secondary" style={{ color: '#8c8c8c' }}>Automate workflows</Text>
                      </div>
                    </Space>
                    {subscription === 'free' ? (
                      <Button onClick={() => navigate('/pricing')}>
                        Upgrade to Pro
                      </Button>
                    ) : (
                      <Button 
                        type="primary"
                        loading={zapierConnecting}
                        onClick={() => {
                          setZapierConnecting(true);
                          setTimeout(() => {
                            setZapierConnecting(false);
                            toast.info('Zapier integration coming soon! You\'ll be able to trigger Zaps when workflow issues are detected.');
                          }, 1000);
                        }}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </Space>
              </Card>
            </Tabs.TabPane>
          </Tabs>
        </Col>
      </Row>

      {/* Schedule Modal */}
      <ScheduleModal
        visible={scheduleModalVisible}
        onClose={() => setScheduleModalVisible(false)}
        workflows={MOCK_WORKFLOWS}
      />
    </div>
  );
};

export default Settings;
