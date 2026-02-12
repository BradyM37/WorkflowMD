/**
 * Demo Mode Banner
 * Shows when user is viewing demo data instead of real GHL data
 */

import React from 'react';
import { Alert, Button, Space } from 'antd';
import { ExperimentOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { isDemoMode, clearDemoMode } from '../services/demoApi';

interface DemoBannerProps {
  style?: React.CSSProperties;
}

const DemoBanner: React.FC<DemoBannerProps> = ({ style }) => {
  const navigate = useNavigate();
  
  if (!isDemoMode()) {
    return null;
  }
  
  const handleConnect = () => {
    clearDemoMode();
    navigate('/connect');
  };
  
  return (
    <Alert
      message={
        <Space>
          <ExperimentOutlined />
          <span>
            <strong>Demo Mode</strong> — You're viewing sample data. Connect GoHighLevel for real metrics.
          </span>
        </Space>
      }
      type="info"
      showIcon={false}
      banner
      action={
        <Button 
          size="small" 
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={handleConnect}
        >
          Connect GHL
        </Button>
      }
      style={{
        marginBottom: 16,
        background: 'linear-gradient(90deg, #667eea22 0%, #764ba222 100%)',
        border: '1px solid #667eea44',
        ...style,
      }}
    />
  );
};

export default DemoBanner;
