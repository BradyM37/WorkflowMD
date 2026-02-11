/**
 * ROI Dashboard Component - THE KILLER FEATURE
 * 
 * Shows users the MONEY impact of their response times.
 * This is what makes people pay $100/month.
 * 
 * "Fast responses generated $X this month"
 * "Estimated $Y lost from 23 missed leads"
 * "If you improve to 3-min avg, you'd gain $Z"
 */

import React, { useState } from 'react';
import { useQuery } from 'react-query';
import {
  Card,
  Row,
  Col,
  Typography,
  Statistic,
  Progress,
  Tooltip,
  Spin,
  Empty,
  Slider,
  InputNumber,
  Space,
  Tag,
  Alert,
  Divider,
  Badge,
  Button
} from 'antd';
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  TrophyOutlined,
  CalculatorOutlined,
  FireOutlined,
  RocketOutlined,
  InfoCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import './ROIDashboard.css';

const { Title, Text, Paragraph } = Typography;

interface RevenueSummary {
  summary: {
    fastResponsesGenerated: {
      value: number;
      formatted: string;
      label: string;
      subtext: string;
    };
    potentialLost: {
      value: number;
      formatted: string;
      label: string;
      subtext: string;
    };
    improvementGain: {
      value: number;
      formatted: string;
      label: string;
      subtext: string;
    };
    speedMultiplier: {
      value: number;
      formatted: string;
      label: string;
      subtext: string;
    };
    missedLeadCost: {
      value: number;
      formatted: string;
      label: string;
      subtext: string;
    };
    valuePerMinute: {
      value: number;
      formatted: string;
      label: string;
      subtext: string;
    };
  };
  conversionFunnel: {
    bucket: string;
    leads: number;
    conversions: number;
    conversionRate: string;
    benchmarkRate: string;
    revenue: string;
    lost: string;
  }[];
}

interface ROICalculation {
  scenario: {
    currentAvgMinutes: number;
    targetAvgMinutes: number;
    monthlyLeads: number;
    improvementMinutes: number;
  };
  roi: {
    currentMonthlyRevenue: number;
    projectedMonthlyRevenue: number;
    additionalRevenue: number;
    roi: number;
    breakeven: string;
  };
  recommendation: string;
}

// Using Ant Design standard colors
const FUNNEL_COLORS = ['#52c41a', '#73d13d', '#faad14', '#fa8c16', '#ff4d4f', '#8c8c8c'];

const ROIDashboard: React.FC<{ days?: number }> = ({ days = 30 }) => {
  const { isDarkMode } = useTheme();
  const [roiInputs, setRoiInputs] = useState({
    currentAvg: 10,
    targetAvg: 3,
    monthlyLeads: 100
  });

  // Fetch revenue summary
  const { data: summaryData, isLoading: loadingSummary } = useQuery<{ data: RevenueSummary }>(
    ['revenue-summary', days],
    () => api.get(`/api/metrics/revenue/summary?days=${days}`).then(res => res.data),
    { refetchInterval: 60000 }
  );

  // Fetch ROI calculation (when inputs change)
  const { data: roiData, isLoading: loadingRoi } = useQuery<{ data: ROICalculation }>(
    ['revenue-roi', roiInputs],
    () => api.get(`/api/metrics/revenue/roi-calculator`, {
      params: {
        currentAvg: roiInputs.currentAvg,
        targetAvg: roiInputs.targetAvg,
        monthlyLeads: roiInputs.monthlyLeads
      }
    }).then(res => res.data),
    { enabled: true }
  );

  const summary = summaryData?.data?.summary;
  const funnel = summaryData?.data?.conversionFunnel;
  const roi = roiData?.data;

  const colors = {
    cardBg: isDarkMode ? '#1f1f1f' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#000000',
    subtext: isDarkMode ? '#8c8c8c' : '#595959',
    success: '#52c41a',
    warning: '#faad14',
    danger: '#ff4d4f',
    primary: '#667eea'
  };

  if (loadingSummary) {
    return (
      <Card className="roi-dashboard loading">
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin size="large" />
          <Text style={{ display: 'block', marginTop: 16 }}>Calculating revenue impact...</Text>
        </div>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="roi-dashboard">
        <Empty 
          description="No revenue data available yet. Sync conversations and link opportunities to see ROI metrics."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <div className="roi-dashboard">
      {/* Hero Section - The Money Numbers */}
      <Card 
        className="roi-hero-card"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          marginBottom: 24
        }}
      >
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} md={8}>
            <div className="hero-stat">
              <DollarOutlined style={{ fontSize: 48, color: '#fff', opacity: 0.8 }} />
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>{summary.fastResponsesGenerated.label}</span>}
                value={summary.fastResponsesGenerated.formatted}
                valueStyle={{ color: '#fff', fontSize: 36, fontWeight: 700 }}
              />
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                {summary.fastResponsesGenerated.subtext}
              </Text>
            </div>
          </Col>
          
          <Col xs={24} md={8}>
            <div className="hero-stat warning">
              <WarningOutlined style={{ fontSize: 48, color: '#fff', opacity: 0.8 }} />
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>{summary.potentialLost.label}</span>}
                value={summary.potentialLost.formatted}
                valueStyle={{ color: '#ffe58f', fontSize: 36, fontWeight: 700 }}
                prefix={<FallOutlined />}
              />
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                {summary.potentialLost.subtext}
              </Text>
            </div>
          </Col>
          
          <Col xs={24} md={8}>
            <div className="hero-stat success">
              <RocketOutlined style={{ fontSize: 48, color: '#fff', opacity: 0.8 }} />
              <Statistic
                title={<span style={{ color: 'rgba(255,255,255,0.9)' }}>{summary.improvementGain.label}</span>}
                value={summary.improvementGain.formatted}
                valueStyle={{ color: '#b7eb8f', fontSize: 36, fontWeight: 700 }}
                prefix={<ArrowUpOutlined />}
              />
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                {summary.improvementGain.subtext}
              </Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Quick Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card hoverable className="stat-card">
            <Statistic
              title={<><ThunderboltOutlined style={{ color: colors.success }} /> {summary.speedMultiplier.label}</>}
              value={summary.speedMultiplier.formatted}
              valueStyle={{ color: colors.success, fontWeight: 700 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>{summary.speedMultiplier.subtext}</Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card hoverable className="stat-card">
            <Statistic
              title={<><WarningOutlined style={{ color: colors.danger }} /> {summary.missedLeadCost.label}</>}
              value={summary.missedLeadCost.formatted}
              valueStyle={{ color: colors.danger, fontWeight: 700 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>{summary.missedLeadCost.subtext}</Text>
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card hoverable className="stat-card">
            <Statistic
              title={<><ClockCircleOutlined style={{ color: colors.primary }} /> {summary.valuePerMinute.label}</>}
              value={summary.valuePerMinute.formatted}
              valueStyle={{ color: colors.primary, fontWeight: 700 }}
              suffix="/mo"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>{summary.valuePerMinute.subtext}</Text>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Conversion Funnel */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <Space>
                <TrophyOutlined style={{ color: colors.warning }} />
                <span>Conversion by Response Speed</span>
              </Space>
            }
            className="funnel-card"
          >
            {funnel && funnel.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={funnel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={colors.subtext} opacity={0.2} />
                    <XAxis type="number" stroke={colors.subtext} />
                    <YAxis 
                      type="category" 
                      dataKey="bucket" 
                      stroke={colors.subtext}
                      width={100}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? '#1f1f1f' : '#fff',
                        border: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
                        borderRadius: 8
                      }}
                      formatter={(value: any, name: any) => {
                        if (name === 'leads') return [value, 'Total Leads'];
                        if (name === 'conversions') return [value, 'Converted'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="leads" name="leads" fill={colors.primary} opacity={0.3} />
                    <Bar dataKey="conversions" name="conversions">
                      {funnel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={FUNNEL_COLORS[index % FUNNEL_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                
                {/* Funnel breakdown table */}
                <div className="funnel-breakdown">
                  <Row gutter={[8, 8]} style={{ marginTop: 16 }}>
                    {funnel.map((bucket, idx) => (
                      <Col key={bucket.bucket} span={24}>
                        <div className="funnel-row" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div 
                            style={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: 2,
                              backgroundColor: FUNNEL_COLORS[idx % FUNNEL_COLORS.length]
                            }} 
                          />
                          <Text strong style={{ width: 100 }}>{bucket.bucket}</Text>
                          <Tag color="blue">{bucket.leads} leads</Tag>
                          <Tag color="green">{bucket.conversions} won</Tag>
                          <Tag>{bucket.conversionRate}</Tag>
                          <Tooltip title="Industry benchmark">
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              (benchmark: {bucket.benchmarkRate})
                            </Text>
                          </Tooltip>
                          <Text strong style={{ marginLeft: 'auto', color: colors.success }}>
                            {bucket.revenue}
                          </Text>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              </>
            ) : (
              <Empty description="No conversion data yet" />
            )}
          </Card>
        </Col>

        {/* ROI Calculator */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <Space>
                <CalculatorOutlined style={{ color: colors.primary }} />
                <span>ROI Calculator</span>
              </Space>
            }
            className="roi-calculator-card"
            extra={
              <Tooltip title="Calculate potential revenue gain from improving response time">
                <InfoCircleOutlined />
              </Tooltip>
            }
          >
            <div className="calculator-inputs">
              <div className="input-group">
                <Text strong>Current Avg Response (min)</Text>
                <Slider
                  min={1}
                  max={60}
                  value={roiInputs.currentAvg}
                  onChange={(val) => setRoiInputs(prev => ({ ...prev, currentAvg: val }))}
                  marks={{ 1: '1m', 15: '15m', 30: '30m', 60: '60m' }}
                />
                <InputNumber
                  min={1}
                  max={120}
                  value={roiInputs.currentAvg}
                  onChange={(val) => setRoiInputs(prev => ({ ...prev, currentAvg: val || 10 }))}
                  style={{ width: 80 }}
                  suffix="min"
                />
              </div>
              
              <div className="input-group" style={{ marginTop: 16 }}>
                <Text strong>Target Avg Response (min)</Text>
                <Slider
                  min={1}
                  max={30}
                  value={roiInputs.targetAvg}
                  onChange={(val) => setRoiInputs(prev => ({ ...prev, targetAvg: val }))}
                  marks={{ 1: '1m', 3: '3m', 5: '5m', 15: '15m', 30: '30m' }}
                  trackStyle={{ backgroundColor: colors.success }}
                />
                <InputNumber
                  min={1}
                  max={30}
                  value={roiInputs.targetAvg}
                  onChange={(val) => setRoiInputs(prev => ({ ...prev, targetAvg: val || 3 }))}
                  style={{ width: 80 }}
                  suffix="min"
                />
              </div>
              
              <div className="input-group" style={{ marginTop: 16 }}>
                <Text strong>Monthly Lead Volume</Text>
                <InputNumber
                  min={10}
                  max={10000}
                  value={roiInputs.monthlyLeads}
                  onChange={(val) => setRoiInputs(prev => ({ ...prev, monthlyLeads: val || 100 }))}
                  style={{ width: 120 }}
                  suffix="leads"
                />
              </div>
            </div>

            <Divider />

            {loadingRoi ? (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <Spin />
              </div>
            ) : roi ? (
              <div className="roi-results">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic
                      title="Current Revenue"
                      value={roi.roi.currentMonthlyRevenue}
                      prefix="$"
                      precision={0}
                      valueStyle={{ fontSize: 20 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Projected Revenue"
                      value={roi.roi.projectedMonthlyRevenue}
                      prefix="$"
                      precision={0}
                      valueStyle={{ fontSize: 20, color: colors.success }}
                    />
                  </Col>
                </Row>
                
                <Alert
                  type={roi.roi.additionalRevenue > 100 ? 'success' : 'info'}
                  style={{ marginTop: 16 }}
                  message={
                    <Space>
                      <FireOutlined style={{ color: colors.warning }} />
                      <span>
                        Potential Gain: <strong>${roi.roi.additionalRevenue.toLocaleString()}/month</strong>
                      </span>
                    </Space>
                  }
                  description={
                    <>
                      <Paragraph style={{ marginBottom: 8 }}>{roi.recommendation}</Paragraph>
                      <Space>
                        <Tag color="green">
                          <RiseOutlined /> {roi.roi.roi}% ROI
                        </Tag>
                        <Tag color="blue">{roi.roi.breakeven}</Tag>
                      </Space>
                    </>
                  }
                />
              </div>
            ) : null}
          </Card>
        </Col>
      </Row>

      {/* Call to Action */}
      <Card 
        className="cta-card"
        style={{ 
          marginTop: 24,
          background: isDarkMode 
            ? 'linear-gradient(135deg, #1f1f1f 0%, #2d2d2d 100%)'
            : 'linear-gradient(135deg, #f6f9fc 0%, #e9ecef 100%)',
          border: 'none'
        }}
      >
        <Row align="middle" gutter={[24, 16]}>
          <Col xs={24} md={18}>
            <Title level={4} style={{ marginBottom: 8 }}>
              <ThunderboltOutlined style={{ color: colors.warning }} /> Want More Accurate ROI Data?
            </Title>
            <Text type="secondary">
              Link your GHL opportunities to conversations for real revenue attribution. 
              See exactly how much each fast response is worth to your business.
            </Text>
          </Col>
          <Col xs={24} md={6} style={{ textAlign: 'right' }}>
            <Button 
              type="primary" 
              size="large"
              icon={<RocketOutlined />}
              onClick={() => window.open('https://app.gohighlevel.com', '_blank')}
            >
              Link Opportunities
            </Button>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default ROIDashboard;
