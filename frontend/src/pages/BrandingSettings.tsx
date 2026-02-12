/**
 * BrandingSettings.tsx
 * White-label branding settings for agencies
 * Premium feature - $50/month upsell
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Space, 
  Typography, 
  Divider,
  Alert,
  Spin,
  Row,
  Col,
  Table,
  Popconfirm,
  Modal,
  Tag,
  Tooltip,
  Switch
} from 'antd';
import {
  CrownOutlined,
  PictureOutlined,
  BgColorsOutlined,
  ShareAltOutlined,
  CopyOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  LinkOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

// BrandingData and ReportSettingsData types - see API response format

interface SharedLink {
  id: string;
  shareToken: string;
  shareUrl: string;
  days: number;
  expiresAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  createdAt: string;
  isExpired: boolean;
}

const BrandingSettings: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { subscription } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [createLinkModal, setCreateLinkModal] = useState(false);
  const [linkDays, setLinkDays] = useState(7);
  const [linkExpiresIn, setLinkExpiresIn] = useState(30);

  const isPro = subscription === 'pro';

  // Fetch branding settings
  const { isLoading } = useQuery(
    'branding-settings',
    () => api.get('/api/branding').then(res => res.data.data),
    {
      enabled: isPro,
      onSuccess: (data) => {
        form.setFieldsValue({
          companyName: data.branding.companyName,
          tagline: data.branding.tagline,
          logoUrl: data.branding.logoUrl,
          primaryColor: data.branding.primaryColor,
          secondaryColor: data.branding.secondaryColor,
          accentColor: data.branding.accentColor,
          includeBranding: data.reportSettings.includeBranding,
          customFooterText: data.reportSettings.customFooterText,
          hidePoweredBy: data.reportSettings.hidePoweredBy,
          emailFromName: data.reportSettings.emailFromName,
          reportTitleTemplate: data.reportSettings.reportTitleTemplate
        });
      }
    }
  );

  // Fetch shared links
  const { data: sharesData, isLoading: sharesLoading } = useQuery(
    'shared-links',
    () => api.get('/api/branding/shares').then(res => res.data.data),
    { enabled: isPro }
  );

  // Save branding mutation
  const saveMutation = useMutation(
    (values: any) => api.put('/api/branding', {
      branding: {
        companyName: values.companyName,
        tagline: values.tagline,
        logoUrl: values.logoUrl,
        primaryColor: values.primaryColor,
        secondaryColor: values.secondaryColor,
        accentColor: values.accentColor
      },
      reportSettings: {
        includeBranding: values.includeBranding,
        customFooterText: values.customFooterText,
        hidePoweredBy: values.hidePoweredBy,
        emailFromName: values.emailFromName,
        reportTitleTemplate: values.reportTitleTemplate
      }
    }),
    {
      onSuccess: () => {
        toast.success('Branding settings saved!');
        queryClient.invalidateQueries('branding-settings');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error?.message || 'Failed to save settings');
      }
    }
  );

  // Create shareable link mutation
  const createLinkMutation = useMutation(
    (params: { days: number; expiresInDays: number }) => 
      api.post('/api/branding/share', params),
    {
      onSuccess: (response) => {
        const { shareUrl } = response.data.data;
        navigator.clipboard.writeText(shareUrl);
        toast.success('Shareable link created and copied to clipboard!');
        setCreateLinkModal(false);
        queryClient.invalidateQueries('shared-links');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error?.message || 'Failed to create link');
      }
    }
  );

  // Revoke link mutation
  const revokeMutation = useMutation(
    (token: string) => api.delete(`/api/branding/share/${token}`),
    {
      onSuccess: () => {
        toast.success('Link revoked');
        queryClient.invalidateQueries('shared-links');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error?.message || 'Failed to revoke link');
      }
    }
  );

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard!');
  };

  // Shared links table columns
  const columns = [
    {
      title: 'Report',
      dataIndex: 'days',
      key: 'days',
      render: (days: number) => <Tag color="blue">{days} Day Report</Tag>
    },
    {
      title: 'Views',
      dataIndex: 'viewCount',
      key: 'viewCount',
      render: (count: number) => (
        <Space>
          <EyeOutlined />
          {count}
        </Space>
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: SharedLink) => (
        record.isExpired 
          ? <Tag color="red">Expired</Tag>
          : <Tag color="green">Active</Tag>
      )
    },
    {
      title: 'Expires',
      dataIndex: 'expiresAt',
      key: 'expiresAt',
      render: (date: string | null) => 
        date ? new Date(date).toLocaleDateString() : 'Never'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: SharedLink) => (
        <Space>
          <Tooltip title="Copy Link">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={() => copyToClipboard(record.shareUrl)}
            />
          </Tooltip>
          <Tooltip title="Open Link">
            <Button 
              type="text" 
              icon={<LinkOutlined />} 
              onClick={() => window.open(record.shareUrl, '_blank')}
            />
          </Tooltip>
          <Popconfirm
            title="Revoke this link?"
            description="This will permanently disable this shared link."
            onConfirm={() => revokeMutation.mutate(record.shareToken)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  // Show upgrade prompt for free users
  if (!isPro) {
    return (
      <div style={{ padding: '24px' }}>
        <Card 
          style={{ 
            textAlign: 'center', 
            maxWidth: 600, 
            margin: '0 auto',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
          }}
        >
          <CrownOutlined style={{ fontSize: 64, color: '#faad14', marginBottom: 24 }} />
          <Title level={2}>White-Label Branding</Title>
          <Paragraph style={{ fontSize: 16, marginBottom: 24 }}>
            Brand your reports with your agency's logo, colors, and company name.
            Impress your clients with professional, fully-customized reports.
          </Paragraph>
          
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div style={{ textAlign: 'left', padding: '0 24px' }}>
              <Space direction="vertical" size="small">
                <Text><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />Custom logo on all reports</Text>
                <Text><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />Your brand colors throughout</Text>
                <Text><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />Remove "Powered by FirstResponse"</Text>
                <Text><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />Shareable client links</Text>
                <Text><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />Custom footer text</Text>
              </Space>
            </div>
            
            <Button 
              type="primary" 
              size="large" 
              icon={<CrownOutlined />}
              onClick={() => navigate('/pricing')}
            >
              Upgrade to Pro - $50/month
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading branding settings...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          <BgColorsOutlined /> White-Label Branding
        </Title>
        <Text type="secondary">
          Customize how your reports look when shared with clients
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Branding Settings */}
        <Col xs={24} lg={14}>
          <Card title="Brand Settings">
            <Form
              form={form}
              layout="vertical"
              onFinish={(values) => saveMutation.mutate(values)}
            >
              <Form.Item
                label="Company Name"
                name="companyName"
                tooltip="This appears on report headers"
              >
                <Input placeholder="Your Agency Name" />
              </Form.Item>

              <Form.Item
                label="Tagline"
                name="tagline"
                tooltip="Optional subtitle for your reports"
              >
                <Input placeholder="Your tagline or slogan" />
              </Form.Item>

              <Form.Item
                label="Logo URL"
                name="logoUrl"
                tooltip="URL to your company logo (recommended: 200x50px PNG)"
              >
                <Input 
                  placeholder="https://your-site.com/logo.png" 
                  suffix={<PictureOutlined />}
                />
              </Form.Item>

              <Divider>Brand Colors</Divider>

              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item
                    label="Primary Color"
                    name="primaryColor"
                    tooltip="Main brand color for headers"
                  >
                    <Input type="color" style={{ width: '100%', height: 40 }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Secondary Color"
                    name="secondaryColor"
                    tooltip="Accent color for highlights"
                  >
                    <Input type="color" style={{ width: '100%', height: 40 }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Accent Color"
                    name="accentColor"
                    tooltip="Color for success states"
                  >
                    <Input type="color" style={{ width: '100%', height: 40 }} />
                  </Form.Item>
                </Col>
              </Row>

              <Divider>Report Settings</Divider>

              <Form.Item
                label="Report Title"
                name="reportTitleTemplate"
              >
                <Input placeholder="Response Time Report" />
              </Form.Item>

              <Form.Item
                label="Custom Footer Text"
                name="customFooterText"
                tooltip="Appears at bottom of every page"
              >
                <Input placeholder="© 2024 Your Agency. All rights reserved." />
              </Form.Item>

              <Form.Item
                label="Email From Name"
                name="emailFromName"
                tooltip="Name shown when sending reports via email"
              >
                <Input placeholder="Your Agency Reports" />
              </Form.Item>

              <Form.Item
                name="hidePoweredBy"
                valuePropName="checked"
              >
                <Space>
                  <Switch />
                  <Text>Remove "Powered by WorkflowMD" branding</Text>
                </Space>
              </Form.Item>

              <Button 
                type="primary" 
                htmlType="submit" 
                loading={saveMutation.isLoading}
                icon={<CheckCircleOutlined />}
                size="large"
              >
                Save Branding Settings
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Live Preview */}
        <Col xs={24} lg={10}>
          <Card 
            title="Live Preview" 
            extra={
              <Button 
                type="link" 
                icon={<DownloadOutlined />}
                onClick={() => window.open('/api/reports/pdf?days=7', '_blank')}
              >
                Download Sample
              </Button>
            }
          >
            <div 
              style={{ 
                background: form.getFieldValue('primaryColor') || '#667eea',
                padding: '20px',
                borderRadius: '8px 8px 0 0',
                color: 'white'
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                ⚡ {form.getFieldValue('reportTitleTemplate') || 'Response Time Report'}
              </div>
              <div style={{ fontSize: 14, opacity: 0.9, marginTop: 4 }}>
                {form.getFieldValue('companyName') || 'Your Company'}
              </div>
              {form.getFieldValue('tagline') && (
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
                  {form.getFieldValue('tagline')}
                </div>
              )}
            </div>
            <div style={{ 
              padding: '20px', 
              background: isDarkMode ? '#1f1f1f' : '#f5f5f5',
              borderRadius: '0 0 8px 8px'
            }}>
              <div style={{ 
                display: 'flex', 
                gap: 12,
                marginBottom: 16
              }}>
                {[
                  { label: 'Avg Response', value: '2m 34s', color: '#52c41a' },
                  { label: 'Response Rate', value: '94%', color: '#faad14' },
                  { label: 'Missed', value: '3', color: '#ff4d4f' }
                ].map((stat, i) => (
                  <div 
                    key={i}
                    style={{ 
                      flex: 1, 
                      background: stat.color, 
                      color: 'white',
                      padding: '12px',
                      borderRadius: 8,
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: 20, fontWeight: 'bold' }}>{stat.value}</div>
                    <div style={{ fontSize: 10 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
              
              <div style={{ 
                fontSize: 11, 
                textAlign: 'center', 
                color: '#8c8c8c',
                borderTop: '1px solid #d9d9d9',
                paddingTop: 12
              }}>
                {form.getFieldValue('customFooterText') || 
                  (form.getFieldValue('hidePoweredBy') 
                    ? form.getFieldValue('companyName') || 'Your Company'
                    : 'FirstResponse'
                  )
                }
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Shareable Links Section */}
      <Card 
        title={
          <Space>
            <ShareAltOutlined />
            <span>Client-Shareable Report Links</span>
          </Space>
        }
        style={{ marginTop: 24 }}
        extra={
          <Button 
            type="primary" 
            icon={<LinkOutlined />}
            onClick={() => setCreateLinkModal(true)}
          >
            Create Shareable Link
          </Button>
        }
      >
        <Alert
          message="Share branded reports with clients"
          description="Create shareable links that let your clients view their response time reports without logging in. Reports are automatically branded with your agency's look."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Table
          dataSource={sharesData?.shares || []}
          columns={columns}
          loading={sharesLoading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: 'No shared links yet. Create one to share with clients!' }}
        />
      </Card>

      {/* Create Link Modal */}
      <Modal
        title="Create Shareable Report Link"
        open={createLinkModal}
        onCancel={() => setCreateLinkModal(false)}
        onOk={() => createLinkMutation.mutate({ days: linkDays, expiresInDays: linkExpiresIn })}
        confirmLoading={createLinkMutation.isLoading}
        okText="Create & Copy Link"
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong>Report Period</Text>
            <div style={{ marginTop: 8 }}>
              <Space>
                {[7, 14, 30, 90].map(d => (
                  <Button 
                    key={d}
                    type={linkDays === d ? 'primary' : 'default'}
                    onClick={() => setLinkDays(d)}
                  >
                    {d} Days
                  </Button>
                ))}
              </Space>
            </div>
          </div>

          <div>
            <Text strong>Link Expiration</Text>
            <div style={{ marginTop: 8 }}>
              <Space>
                {[7, 30, 90, 365].map(d => (
                  <Button 
                    key={d}
                    type={linkExpiresIn === d ? 'primary' : 'default'}
                    onClick={() => setLinkExpiresIn(d)}
                  >
                    {d === 365 ? '1 Year' : `${d} Days`}
                  </Button>
                ))}
              </Space>
            </div>
          </div>

          <Alert
            message="Link will be copied to clipboard"
            description="Share this link with your client. They can view the branded report without needing to log in."
            type="info"
            showIcon
          />
        </Space>
      </Modal>
    </div>
  );
};

export default BrandingSettings;
