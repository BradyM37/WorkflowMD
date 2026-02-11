import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ConfigProvider, Layout, Space, Button, Switch, Spin, Drawer } from 'antd';
import { 
  DashboardOutlined, 
  CrownOutlined, 
  LineChartOutlined, 
  SettingOutlined,
  BulbOutlined,
  BulbFilled,
  MenuOutlined
} from '@ant-design/icons';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ConnectGHL from './pages/ConnectGHL';
import EmailVerificationSent from './pages/EmailVerificationSent';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Pricing from './pages/Pricing';
import Settings from './pages/Settings';
import WorkflowAnalysis from './pages/WorkflowAnalysis';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import PrivateRoute from './components/PrivateRoute';
import UserProfileDropdown from './components/UserProfileDropdown';
import ErrorBoundary from './components/ErrorBoundary';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import './App.css';

const { Header, Content, Footer } = Layout;
const queryClient = new QueryClient();

function AppHeader() {
  const navigate = useNavigate();
  const { isAuthenticated, subscription } = useAuth();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);

  return (
    <>
      <Header className="gradient-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '0 clamp(16px, 4vw, 50px)',
        background: isDarkMode 
          ? '#141414' 
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1, minWidth: 0 }}
          onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
        >
          <h1 style={{ 
            color: 'white', 
            margin: 0, 
            fontSize: 'clamp(16px, 4vw, 24px)', 
            fontWeight: '600',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            🔍 GHL Workflow Debugger
          </h1>
        </div>
        
        {isAuthenticated && (
          <>
            {/* Desktop Menu (hidden on mobile) */}
            <Space size="small" style={{ display: 'none' }} className="desktop-nav">
              <Space style={{ color: 'white', fontSize: '14px' }}>
                {isDarkMode ? <BulbFilled /> : <BulbOutlined />}
                <Switch 
                  checked={isDarkMode}
                  onChange={toggleDarkMode}
                  checkedChildren="🌙"
                  unCheckedChildren="☀️"
                />
              </Space>
              
              <Button 
                icon={<LineChartOutlined />}
                onClick={() => navigate('/workflow-graph')}
                type="primary"
                style={{ 
                  background: isDarkMode ? '#667eea' : 'rgba(255,255,255,0.95)', 
                  color: isDarkMode ? 'white' : '#667eea',
                  fontWeight: 600,
                  border: 'none'
                }}
              >
                View Graph
              </Button>
              <Button 
                icon={<DashboardOutlined />}
                onClick={() => navigate('/dashboard')}
                type="text"
                style={{ color: 'white' }}
              >
                Dashboard
              </Button>
              <Button 
                icon={<SettingOutlined />}
                onClick={() => navigate('/settings')}
                type="text"
                style={{ color: 'white' }}
              >
                Settings
              </Button>
              {subscription !== 'pro' && (
                <Button 
                  icon={<CrownOutlined />}
                  onClick={() => navigate('/pricing')}
                  style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white'
                  }}
                >
                  Upgrade to Pro
                </Button>
              )}
              
              {/* User Profile Dropdown */}
              <UserProfileDropdown />
            </Space>

            {/* Mobile Hamburger (visible on mobile) */}
            <Button
              className="mobile-menu-btn"
              icon={<MenuOutlined />}
              onClick={() => setMobileMenuVisible(true)}
              type="text"
              size="large"
              style={{ color: 'white', display: 'block' }}
            />
          </>
        )}
      </Header>

      {/* Mobile Drawer Menu */}
      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        width={Math.min(280, window.innerWidth * 0.8)}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Dark Mode Toggle */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '12px',
            background: isDarkMode ? 'rgba(255,255,255,0.05)' : '#f5f5f5',
            borderRadius: '8px'
          }}>
            <Space>
              {isDarkMode ? <BulbFilled /> : <BulbOutlined />}
              <span>Dark Mode</span>
            </Space>
            <Switch 
              checked={isDarkMode}
              onChange={toggleDarkMode}
              checkedChildren="🌙"
              unCheckedChildren="☀️"
            />
          </div>

          <Button 
            icon={<LineChartOutlined />}
            onClick={() => {
              navigate('/workflow-graph');
              setMobileMenuVisible(false);
            }}
            type="primary"
            size="large"
            block
          >
            View Workflow Graph
          </Button>

          <Button 
            icon={<DashboardOutlined />}
            onClick={() => {
              navigate('/dashboard');
              setMobileMenuVisible(false);
            }}
            size="large"
            block
          >
            Dashboard
          </Button>

          <Button 
            icon={<SettingOutlined />}
            onClick={() => {
              navigate('/settings');
              setMobileMenuVisible(false);
            }}
            size="large"
            block
          >
            Settings
          </Button>

          {subscription !== 'pro' && (
            <Button 
              icon={<CrownOutlined />}
              onClick={() => {
                navigate('/pricing');
                setMobileMenuVisible(false);
              }}
              type="primary"
              size="large"
              block
              style={{ background: '#faad14', borderColor: '#faad14' }}
            >
              Upgrade to Pro
            </Button>
          )}

          <div style={{ padding: '12px' }}>
            <UserProfileDropdown />
          </div>
        </Space>
      </Drawer>
    </>
  );
}

function AppContent() {
  const { isDarkMode } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  
  // Initialize keyboard shortcuts
  useKeyboardShortcuts();

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        background: isDarkMode ? '#1f1f1f' : '#f0f2f5'
      }}>
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <AppHeader />
      <Content style={{ 
        padding: 'clamp(16px, 4vw, 30px) clamp(16px, 4vw, 50px)', 
        background: isDarkMode ? '#1f1f1f' : '#f0f2f5',
        minHeight: 'calc(100vh - 64px - 70px)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <ErrorBoundary>
            <Routes>
              {/* Public Routes */}
              <Route 
                path="/" 
                element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/login" 
                element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />} 
              />
              <Route 
                path="/register" 
                element={isAuthenticated ? <Navigate to="/dashboard" /> : <Register />} 
              />
              <Route 
                path="/forgot-password" 
                element={isAuthenticated ? <Navigate to="/dashboard" /> : <ForgotPassword />} 
              />
              <Route 
                path="/reset-password/:token" 
                element={isAuthenticated ? <Navigate to="/dashboard" /> : <ResetPassword />} 
              />
              <Route 
                path="/email-verification-sent" 
                element={<EmailVerificationSent />} 
              />
              <Route path="/pricing" element={<Pricing />} />
              
              {/* Protected Routes - Require Login */}
              <Route
                path="/connect-ghl"
                element={
                  <PrivateRoute>
                    <ConnectGHL />
                  </PrivateRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/analysis/:id"
                element={
                  <PrivateRoute>
                    <Analysis />
                  </PrivateRoute>
                }
              />
              <Route
                path="/workflow-graph"
                element={
                  <PrivateRoute>
                    <WorkflowAnalysis />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute>
                    <Settings />
                  </PrivateRoute>
                }
              />
              
              {/* 404 Fallback */}
              <Route 
                path="*" 
                element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} 
              />
            </Routes>
          </ErrorBoundary>
        </div>
      </Content>
      <Footer style={{ 
        textAlign: 'center', 
        background: isDarkMode ? '#141414' : 'white',
        borderTop: isDarkMode ? '1px solid #303030' : '1px solid #f0f0f0',
        color: isDarkMode ? '#8c8c8c' : '#595959',
        padding: 'clamp(12px, 3vw, 24px)'
      }}>
        <div style={{ fontSize: 'clamp(12px, 2.5vw, 14px)' }}>
          GHL Workflow Debugger ©2026 - Find workflow issues in seconds
          <br />
          <span style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: isDarkMode ? '#595959' : '#8c8c8c' }}>
            Analyze • Optimize • Scale
          </span>
        </div>
      </Footer>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ThemeConfigWrapper />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// Separate component to access theme context
function ThemeConfigWrapper() {
  const { themeConfig, isDarkMode } = useTheme();
  
  return (
    <ConfigProvider theme={themeConfig}>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ConfigProvider>
  );
}

export default App;
