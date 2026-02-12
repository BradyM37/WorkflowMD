import React from 'react';
import { Dropdown, Space, Typography, Avatar, Badge, Divider, Spin } from 'antd';
import {
  EnvironmentOutlined,
  SwapOutlined,
  PlusCircleOutlined,
  CheckOutlined,
  DownOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import type { MenuProps } from 'antd';

const { Text } = Typography;

const LocationSwitcher: React.FC = () => {
  const { locations, currentLocationId, switchLocation, ghlConnected } = useAuth();
  const { isDarkMode } = useTheme();

  if (!ghlConnected || !locations || locations.length === 0) {
    return null;
  }

  const currentLocation = locations.find(loc => loc.id === currentLocationId) || locations[0];

  const handleSwitch = async (locationId: string) => {
    if (locationId === currentLocationId) return;
    await switchLocation(locationId);
  };

  const handleConnectAnother = () => {
    // Redirect to GHL OAuth flow for adding another location
    const clientId = import.meta.env.VITE_GHL_CLIENT_ID;
    const redirectUri = encodeURIComponent(`${import.meta.env.VITE_API_URL}/auth/ghl/callback`);
    const scope = encodeURIComponent('locations.readonly workflows.readonly');
    window.location.href = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'header',
      type: 'group',
      label: (
        <Text style={{ color: isDarkMode ? '#8c8c8c' : '#595959', fontSize: '12px' }}>
          YOUR LOCATIONS
        </Text>
      ),
    },
    ...locations.map(location => ({
      key: location.id,
      label: (
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Avatar 
              size="small" 
              style={{ 
                background: location.id === currentLocationId 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : '#d9d9d9' 
              }}
            >
              {location.name.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text strong style={{ display: 'block', color: isDarkMode ? '#fff' : '#1a1a2e' }}>
                {location.name}
              </Text>
              {location.companyName && (
                <Text style={{ fontSize: '11px', color: isDarkMode ? '#8c8c8c' : '#8c8c8c' }}>
                  {location.companyName}
                </Text>
              )}
            </div>
          </Space>
          {location.id === currentLocationId && (
            <CheckOutlined style={{ color: '#52c41a' }} />
          )}
        </Space>
      ),
      onClick: () => handleSwitch(location.id),
    })),
    { type: 'divider' as const },
    {
      key: 'connect',
      icon: <PlusCircleOutlined style={{ color: '#667eea' }} />,
      label: (
        <Text style={{ color: '#667eea', fontWeight: 500 }}>
          Connect Another Location
        </Text>
      ),
      onClick: handleConnectAnother,
    },
  ];

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      placement="bottomRight"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '8px',
          cursor: 'pointer',
          background: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          border: `1px solid ${isDarkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}`,
          transition: 'all 0.2s',
        }}
      >
        <Badge dot status={ghlConnected ? 'success' : 'default'}>
          <Avatar
            size="small"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {currentLocation?.name?.charAt(0).toUpperCase() || 'L'}
          </Avatar>
        </Badge>
        <div style={{ maxWidth: '150px' }}>
          <Text
            strong
            ellipsis
            style={{
              display: 'block',
              fontSize: '13px',
              color: isDarkMode ? '#fff' : '#1a1a2e',
              lineHeight: 1.2,
            }}
          >
            {currentLocation?.name || 'Select Location'}
          </Text>
          {locations.length > 1 && (
            <Text
              style={{
                fontSize: '11px',
                color: isDarkMode ? '#8c8c8c' : '#8c8c8c',
              }}
            >
              {locations.length} locations
            </Text>
          )}
        </div>
        <DownOutlined style={{ fontSize: '10px', color: isDarkMode ? '#8c8c8c' : '#595959' }} />
      </div>
    </Dropdown>
  );
};

export default LocationSwitcher;
