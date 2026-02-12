import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Typography } from 'antd';
import OnboardingWizard from '../components/OnboardingWizard';
import { useTheme } from '../contexts/ThemeContext';

const { Content } = Layout;

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const handleOnboardingComplete = () => {
    navigate('/response-tracker');
  };

  return (
    <Layout style={{ 
      minHeight: '100vh',
      background: isDarkMode 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
    }}>
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '24px',
        color: 'white',
        fontSize: '24px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        🔍 WorkflowMD
      </div>
      
      <Content style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: '80px 20px 40px'
      }}>
        <OnboardingWizard onComplete={handleOnboardingComplete} />
      </Content>

      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '13px'
      }}>
        © 2026 WorkflowMD • Speed-to-Lead Analytics
      </div>
    </Layout>
  );
};

export default Onboarding;
