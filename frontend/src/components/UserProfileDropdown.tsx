import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Space, Avatar, Typography, Badge } from 'antd';
import type { MenuProps } from 'antd';
import { 
  UserOutlined, 
  SettingOutlined, 
  LogoutOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Text } = Typography;

const UserProfileDropdown: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, locationId, subscription, ghlConnected } = useAuth();

  const handleLogout = () => {
    logout();
    localStorage.removeItem('demo_mode');
    localStorage.removeItem('location_id');
    localStorage.removeItem('ghl_connected');
    navigate('/login');
  };

  const items: MenuProps['items'] = [
    {
      key: 'user-info',
      label: (
        <div style={{ padding: '8px 0' }}>
          <Text strong style={{ fontSize: '15px', display: 'block' }}>
            {user?.name || 'Demo User'}
          </Text>
          <Text style={{ fontSize: '13px', color: '#8c8c8c', display: 'block' }}>
            {user?.email || 'demo@example.com'}
          </Text>
          {user?.companyName && (
            <Text style={{ fontSize: '12px', color: '#8c8c8c', display: 'block', marginTop: '4px' }}>
              {user.companyName}
            </Text>
          )}
          <div style={{ marginTop: '8px' }}>
            <Badge 
              count={subscription === 'pro' ? 'PRO' : 'FREE'}
              style={{ 
                backgroundColor: subscription === 'pro' ? '#52c41a' : '#8c8c8c',
                fontSize: '11px'
              }}
            />
          </div>
        </div>
      ),
      disabled: true
    },
    {
      type: 'divider'
    },
    {
      key: 'ghl-status',
      label: (
        <Space>
          {ghlConnected ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
          )}
          <div>
            <Text strong style={{ fontSize: '13px' }}>GHL Connection</Text>
            <br />
            <Text style={{ fontSize: '12px', color: '#8c8c8c' }}>
              {ghlConnected ? `Connected: ${locationId || 'Demo Mode'}` : 'Not Connected'}
            </Text>
          </div>
        </Space>
      ),
      disabled: true
    },
    {
      type: 'divider'
    },
    {
      key: 'settings',
      label: 'Profile Settings',
      icon: <SettingOutlined />,
      onClick: () => navigate('/settings')
    },
    {
      key: 'connect-ghl',
      label: ghlConnected ? 'Manage GHL Connection' : 'Connect GHL Account',
      icon: <ApiOutlined />,
      onClick: () => navigate('/connect-ghl')
    }
  ];

  // Add upgrade option if not pro
  if (subscription !== 'pro') {
    items.push({
      type: 'divider'
    });
    items.push({
      key: 'upgrade',
      label: (
        <Space>
          <CrownOutlined style={{ color: '#faad14' }} />
          <Text strong style={{ color: '#faad14' }}>Upgrade to Pro</Text>
        </Space>
      ),
      onClick: () => navigate('/pricing')
    });
  }

  items.push({
    type: 'divider'
  });
  items.push({
    key: 'logout',
    label: 'Logout',
    icon: <LogoutOutlined />,
    danger: true,
    onClick: handleLogout
  });

  return (
    <Dropdown 
      menu={{ items }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Space style={{ cursor: 'pointer' }}>
        <Avatar 
          style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            cursor: 'pointer'
          }}
          icon={<UserOutlined />}
        />
        <Text style={{ color: 'white', fontWeight: 500 }}>
          {user?.name?.split(' ')[0] || 'Demo'}
        </Text>
      </Space>
    </Dropdown>
  );
};

export default UserProfileDropdown;
