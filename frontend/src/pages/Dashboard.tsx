import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, List, Button, Typography, Space, Tag, Row, Col, 
  Statistic, Badge, Avatar, Input, Select, Empty,
  Tabs
} from 'antd';
import { 
  ThunderboltOutlined, 
  HistoryOutlined, 
  CrownOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  RocketOutlined,
  SafetyOutlined,
  SearchOutlined,
  TrophyOutlined,
  AlertOutlined,
  DashboardOutlined,
  LineChartOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import LoadingState from '../components/LoadingState';
import ScheduleModal from '../components/ScheduleModal';
import ScanHistoryPanel from '../components/ScanHistoryPanel';
import { toast, notify } from '../utils/toast';
import { MOCK_WORKFLOWS, createMockAnalysisForWorkflow } from '../mocks/mockData';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  lastModified?: string;
  category?: string;
}

interface AnalysisHistory {
  id: string;
  workflow_name: string;
  workflow_id: string;
  health_score: number;
  grade: string;
  issues_found: number;
  created_at: string;
  issues?: any[];
}

// Mock workflows imported from centralized mock data

// Get saved history from localStorage (with migration for old risk_score data)
function getSavedHistory(): AnalysisHistory[] {
  const saved = localStorage.getItem('analysis_history');
  if (!saved) return [];
  
  const history = JSON.parse(saved);
  // Migrate old risk_score to health_score if needed
  return history.map((item: any) => ({
    ...item,
    health_score: item.health_score ?? (item.risk_score ? (100 - item.risk_score) : 50)
  }));
}

// Save history to localStorage
function saveHistory(newAnalysis: AnalysisHistory) {
  const history = getSavedHistory();
  const updated = [newAnalysis, ...history].slice(0, 20); // Keep last 20
  localStorage.setItem('analysis_history', JSON.stringify(updated));
  return updated;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { subscription, checkAuth } = useAuth();
  const { isDarkMode } = useTheme();
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [localHistory, setLocalHistory] = useState<AnalysisHistory[]>(getSavedHistory());
  const [activeTab, setActiveTab] = useState('workflows');
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);

  // Handle SSO success - clear demo mode and use real session
  useEffect(() => {
    const ssoSuccess = searchParams.get('sso');
    if (ssoSuccess === 'success') {
      // Clear demo mode to use real data
      localStorage.removeItem('demo_mode');
      localStorage.removeItem('user');
      localStorage.removeItem('auth_token');
      
      // Re-check auth to pick up the real session from cookies
      checkAuth();
      
      // Invalidate cached queries to fetch real data
      queryClient.invalidateQueries('workflows');
      
      // Clean up the URL
      searchParams.delete('sso');
      setSearchParams(searchParams, { replace: true });
      
      toast.success('Connected to GoHighLevel!');
    }
  }, [searchParams, setSearchParams, checkAuth, queryClient]);

  // Theme-aware colors
  const colors = {
    cardBg: isDarkMode ? '#262626' : 'white',
    titleText: isDarkMode ? '#ffffff' : '#1a1a2e',
    bodyText: isDarkMode ? '#d9d9d9' : '#595959',
    mutedText: isDarkMode ? '#8c8c8c' : '#8c8c8c',
  };
  
  // Get current schedule from localStorage
  const currentSchedule = JSON.parse(localStorage.getItem('scan_schedule') || 'null');

  // Fetch workflows from API
  const { 
    data: workflows, 
    isLoading: loadingWorkflows
  } = useQuery<Workflow[]>(
    'workflows',
    () => {
      return api.get('/api/workflows').then(res => res.data.data || res.data);
    },
    {
      retry: 1,
      onError: (error) => {
        console.error('Error fetching workflows:', error);
        toast.error('Failed to load workflows');
      }
    }
  );

  // Filter workflows based on search and filters
  const filteredWorkflows = workflows?.filter(workflow => {
    const matchesSearch = (workflow.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (workflow.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || workflow.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || workflow.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get categories from workflows
  const categories = Array.from(new Set(workflows?.map(w => w.category).filter(Boolean)));

  const handleAnalyze = async (workflow: Workflow) => {
    console.log('Analyzing workflow:', workflow.id);
    setAnalyzing(workflow.id);
    toast.info('Analyzing workflow...');
    
    try {
      // Call real analysis API
      const response = await api.post('/api/analyze', { workflowId: workflow.id });
      const analysisResult = response.data.data || response.data;
      
      // Convert to AnalysisHistory format
      const analysis: AnalysisHistory = {
        id: analysisResult.id,
        workflow_id: analysisResult.workflowId,
        workflow_name: analysisResult.workflowName || workflow.name,
        health_score: analysisResult.healthScore,
        grade: analysisResult.grade,
        issues_found: analysisResult.issuesFound,
        created_at: analysisResult.created_at || new Date().toISOString(),
        issues: analysisResult.issues
      };
      
      // Save to history
      const updatedHistory = saveHistory(analysis);
      setLocalHistory(updatedHistory);
      
      setAnalyzing(null);
      toast.success('Workflow analyzed successfully');
      
      navigate(`/analysis/${analysis.id}`, { 
        state: { 
          analysis: analysisResult
        }
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      setAnalyzing(null);
      toast.error(error.response?.data?.error?.message || 'Failed to analyze workflow');
    }
  };

  // Calculate stats from history
  const stats = {
    totalScans: localHistory.length,
    todayScans: localHistory.filter(h => {
      const today = new Date().toDateString();
      return new Date(h.created_at).toDateString() === today;
    }).length,
    avgHealthScore: localHistory.length > 0 
      ? Math.round(localHistory.reduce((acc, h) => acc + h.health_score, 0) / localHistory.length)
      : 0,
    criticalWorkflows: localHistory.filter(h => h.health_score < 30).length  // Critical if health score < 30
  };

  if (loadingWorkflows) {
    return (
      <LoadingState 
        message="Loading Your Workflows" 
        tip="Fetching workflow data from GoHighLevel..."
      />
    );
  }

  return (
    <div>
      {/* Hero Section */}
      <Card style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        border: 'none',
        marginBottom: '24px'
      }}>
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={16}>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              <DashboardOutlined /> Workflow Analysis Dashboard
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.9)', fontSize: '16px', marginTop: '8px' }}>
              Analyze your GoHighLevel workflows to find configuration errors, performance issues, and optimization opportunities.
            </Paragraph>
            <Space style={{ marginTop: '16px' }}>
              <Button 
                type="default"
                icon={<LineChartOutlined />} 
                size="large"
                onClick={() => navigate('/workflow-graph')}
                style={{ 
                  background: 'white',
                  borderColor: 'white',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  color: '#667eea'
                }}
              >
                View Workflow Graph
              </Button>
              {subscription === 'free' && (
                <Button 
                  icon={<CrownOutlined />} 
                  size="large"
                  onClick={() => navigate('/pricing')}
                >
                  Upgrade to Pro - See All Issues
                </Button>
              )}
            </Space>
          </Col>
          <Col xs={24} lg={8}>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div style={{ textAlign: 'center', color: 'white' }}>
                  <TrophyOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.totalScans}</div>
                  <div style={{ fontSize: '12px' }}>Total Scans</div>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ textAlign: 'center', color: 'white' }}>
                  <AlertOutlined style={{ fontSize: '32px', marginBottom: '8px' }} />
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{stats.criticalWorkflows}</div>
                  <div style={{ fontSize: '12px' }}>Critical Issues</div>
                </div>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Workflows"
              value={workflows?.length || 0}
              prefix={<RocketOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Scans Today"
              value={stats.todayScans}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Avg Health Score"
              value={stats.avgHealthScore}
              prefix={<SafetyOutlined />}
              suffix="/100"
              valueStyle={{ color: stats.avgHealthScore >= 70 ? '#52c41a' : stats.avgHealthScore >= 50 ? '#faad14' : '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Analyses"
              value={stats.totalScans}
              prefix={<LineChartOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content with Tabs */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane 
            tab={
              <span>
                <ThunderboltOutlined /> Workflows
                <Badge count={filteredWorkflows?.length || 0} style={{ marginLeft: '8px' }} />
              </span>
            } 
            key="workflows"
          >
            {/* Schedule Status Banner */}
            {currentSchedule?.enabled && (
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '16px 20px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Space>
                  <CalendarOutlined style={{ fontSize: '20px', color: 'white' }} />
                  <div>
                    <Text strong style={{ color: 'white', display: 'block', fontSize: '14px' }}>
                      Scheduled Scans Enabled
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px' }}>
                      Next scan: {(() => {
                        const time = dayjs(currentSchedule.time, 'HH:mm');
                        const freq = currentSchedule.frequency;
                        if (freq === 'daily') return `Tomorrow at ${time.format('h:mm A')}`;
                        if (freq === 'every12h') return `Every 12 hours at ${time.format('h:mm A')}`;
                        if (freq === 'every6h') return `Every 6 hours at ${time.format('h:mm A')}`;
                        if (freq === 'weekly') return `Next week at ${time.format('h:mm A')}`;
                        return 'Scheduled';
                      })()}
                    </Text>
                  </div>
                </Space>
                <Button 
                  onClick={() => setScheduleModalVisible(true)}
                  style={{ background: 'white', color: '#667eea', borderColor: 'white' }}
                >
                  Manage Schedule
                </Button>
              </div>
            )}

            {/* Search and Filters */}
            <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
              <Col xs={24} sm={10}>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="Search workflows by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="large"
                  allowClear
                />
              </Col>
              <Col xs={24} sm={5}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Filter by status"
                  value={filterStatus}
                  onChange={setFilterStatus}
                  size="large"
                >
                  <Option value="all">All Status</Option>
                  <Option value="active">Active</Option>
                  <Option value="inactive">Inactive</Option>
                </Select>
              </Col>
              <Col xs={24} sm={5}>
                <Select
                  style={{ width: '100%' }}
                  placeholder="Filter by category"
                  value={filterCategory}
                  onChange={setFilterCategory}
                  size="large"
                >
                  <Option value="all">All Categories</Option>
                  {categories.map(cat => (
                    <Option key={cat} value={cat}>{cat}</Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={4}>
                <Button
                  icon={<CalendarOutlined />}
                  size="large"
                  block
                  onClick={() => setScheduleModalVisible(true)}
                  style={{
                    background: currentSchedule?.enabled ? '#52c41a' : 'white',
                    color: currentSchedule?.enabled ? 'white' : '#595959',
                    borderColor: currentSchedule?.enabled ? '#52c41a' : '#d9d9d9'
                  }}
                >
                  {currentSchedule?.enabled ? 'Scheduled' : 'Schedule'}
                </Button>
              </Col>
            </Row>

            {/* Workflows List */}
            {filteredWorkflows && filteredWorkflows.length > 0 ? (
              <List
                grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2, xl: 2, xxl: 3 }}
                dataSource={filteredWorkflows}
                renderItem={(workflow) => (
                  <List.Item>
                    <Card
                      hoverable
                      style={{ 
                        height: '100%',
                        background: analyzing === workflow.id 
                          ? (isDarkMode ? 'rgba(102, 126, 234, 0.15)' : 'rgba(102, 126, 234, 0.05)') 
                          : colors.cardBg
                      }}
                    >
                      <Card.Meta
                        avatar={
                          <Avatar 
                            size={48}
                            style={{ 
                              background: workflow.status === 'active' 
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                                : '#8c8c8c' 
                            }}
                          >
                            {workflow.name.charAt(0)}
                          </Avatar>
                        }
                        title={
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Space>
                              <Text strong style={{ fontSize: '16px', color: colors.titleText }}>{workflow.name}</Text>
                            </Space>
                            <Space>
                              <Tag color={workflow.status === 'active' ? 'success' : 'default'}>
                                {workflow.status}
                              </Tag>
                              {workflow.category && (
                                <Tag color="blue">{workflow.category}</Tag>
                              )}
                            </Space>
                          </Space>
                        }
                        description={
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Text style={{ display: 'block', marginTop: '8px', color: colors.bodyText }}>
                              {workflow.description}
                            </Text>
                            {workflow.lastModified && (
                              <Text style={{ fontSize: '12px', color: colors.mutedText }}>
                                <ClockCircleOutlined /> Updated: {workflow.lastModified}
                              </Text>
                            )}
                            {/* Show last scanned info if available */}
                            {(() => {
                              const lastScan = localHistory.find(h => h.workflow_id === workflow.id);
                              if (lastScan) {
                                const hoursAgo = Math.floor(
                                  (Date.now() - new Date(lastScan.created_at).getTime()) / (1000 * 60 * 60)
                                );
                                return (
                                  <Text style={{ fontSize: '12px', color: colors.mutedText }}>
                                    <CheckCircleOutlined style={{ color: '#52c41a' }} /> Last scanned: {
                                      hoursAgo < 1 ? 'Less than 1 hour ago' :
                                      hoursAgo === 1 ? '1 hour ago' :
                                      hoursAgo < 24 ? `${hoursAgo} hours ago` :
                                      `${Math.floor(hoursAgo / 24)} days ago`
                                    }
                                  </Text>
                                );
                              }
                              return null;
                            })()}
                          </Space>
                        }
                      />
                      <Button
                        type="primary"
                        icon={<ThunderboltOutlined />}
                        loading={analyzing === workflow.id}
                        onClick={() => handleAnalyze(workflow)}
                        size="large"
                        block
                        style={{ marginTop: '16px' }}
                      >
                        {analyzing === workflow.id ? 'Analyzing...' : 'Analyze Workflow'}
                      </Button>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  searchTerm || filterStatus !== 'all' || filterCategory !== 'all'
                    ? "No workflows match your filters"
                    : "No workflows found"
                }
              />
            )}
          </TabPane>

          <TabPane 
            tab={
              <span>
                <HistoryOutlined /> Scan History
                <Badge count={localHistory.length} style={{ marginLeft: '8px' }} />
              </span>
            } 
            key="history"
          >
            <ScanHistoryPanel 
              history={localHistory}
              onClearHistory={() => {
                localStorage.removeItem('analysis_history');
                setLocalHistory([]);
                notify.info('History Cleared - All scan history has been removed');
              }}
            />
          </TabPane>
        </Tabs>
      </Card>

      {/* Upgrade Card for Free Users */}
      {subscription === 'free' && (
        <Card 
          style={{ 
            background: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)',
            border: 'none',
            marginTop: '24px'
          }}
        >
          <Row gutter={[24, 24]} align="middle">
            <Col xs={24} lg={18}>
              <Space direction="vertical">
                <Title level={3} style={{ color: 'white', margin: 0 }}>
                  <CrownOutlined /> Unlock Pro Features
                </Title>
                <Paragraph style={{ color: 'rgba(255,255,255,0.9)', margin: 0 }}>
                  • Unlimited sub-accounts • See all issues found • White-label reports • 90-day history • Priority support
                </Paragraph>
              </Space>
            </Col>
            <Col xs={24} lg={6}>
              <Button 
                size="large" 
                block
                onClick={() => navigate('/pricing')}
                style={{ fontWeight: 'bold' }}
              >
                Upgrade to Pro - $297/month
              </Button>
            </Col>
          </Row>
        </Card>
      )}

      {/* Schedule Modal */}
      <ScheduleModal
        visible={scheduleModalVisible}
        onClose={() => setScheduleModalVisible(false)}
        workflows={workflows || []}
      />
    </div>
  );
};

export default Dashboard;