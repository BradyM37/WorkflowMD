import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Collapse,
  Select,
  DatePicker,
  Slider,
  Button,
  Space,
  Badge,
  Tag,
  Typography,
  Row,
  Col,
  Divider,
  Tooltip,
  theme,
} from 'antd';
import {
  FilterOutlined,
  ClearOutlined,
  DownloadOutlined,
  MessageOutlined,
  MailOutlined,
  PhoneOutlined,
  FacebookOutlined,
  InstagramOutlined,
  WhatsAppOutlined,
  GlobalOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

const { Panel } = Collapse;
const { RangePicker } = DatePicker;
const { Text } = Typography;
const { useToken } = theme;

export interface FilterValues {
  channels: string[];
  status: string[];
  userId: string | null;
  responseTimeRange: [number, number]; // in seconds
  dateRange: [Dayjs | null, Dayjs | null];
}

export interface FilterPanelProps {
  onFilterChange: (filters: FilterValues) => void;
  onExport: (format: 'csv' | 'json') => void;
  users: { id: string; name: string }[];
  initialFilters?: Partial<FilterValues>;
  loading?: boolean;
  resultCount?: number;
}

const channelOptions = [
  { label: 'SMS', value: 'sms', icon: <MessageOutlined /> },
  { label: 'Email', value: 'email', icon: <MailOutlined /> },
  { label: 'Phone', value: 'phone', icon: <PhoneOutlined /> },
  { label: 'Facebook', value: 'facebook', icon: <FacebookOutlined /> },
  { label: 'Instagram', value: 'instagram', icon: <InstagramOutlined /> },
  { label: 'WhatsApp', value: 'whatsapp', icon: <WhatsAppOutlined /> },
  { label: 'Live Chat', value: 'live_chat', icon: <GlobalOutlined /> },
  { label: 'GMB', value: 'gmb', icon: <GlobalOutlined /> },
];

const statusOptions = [
  { label: 'Missed', value: 'missed', color: 'red', icon: <WarningOutlined /> },
  { label: 'Responded', value: 'responded', color: 'green', icon: <CheckCircleOutlined /> },
  { label: 'Pending', value: 'pending', color: 'orange', icon: <SyncOutlined /> },
];

const responseTimeMarks: { [key: number]: string } = {
  0: '0s',
  60: '1m',
  300: '5m',
  900: '15m',
  1800: '30m',
  3600: '1h',
  7200: '2h+',
};

const defaultFilters: FilterValues = {
  channels: [],
  status: [],
  userId: null,
  responseTimeRange: [0, 7200],
  dateRange: [null, null],
};

const FilterPanel: React.FC<FilterPanelProps> = ({
  onFilterChange,
  onExport,
  users,
  initialFilters,
  loading = false,
  resultCount,
}) => {
  const { token } = useToken();
  const [filters, setFilters] = useState<FilterValues>({
    ...defaultFilters,
    ...initialFilters,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  // Count active filters
  const activeFilterCount = 
    filters.channels.length +
    filters.status.length +
    (filters.userId ? 1 : 0) +
    (filters.responseTimeRange[0] > 0 || filters.responseTimeRange[1] < 7200 ? 1 : 0) +
    (filters.dateRange[0] || filters.dateRange[1] ? 1 : 0);

  const updateFilters = useCallback((updates: Partial<FilterValues>) => {
    setFilters((prev) => {
      const newFilters = { ...prev, ...updates };
      onFilterChange(newFilters);
      return newFilters;
    });
  }, [onFilterChange]);

  const clearFilters = useCallback(() => {
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  }, [onFilterChange]);

  const handleChannelToggle = useCallback((channel: string) => {
    const newChannels = filters.channels.includes(channel)
      ? filters.channels.filter((c) => c !== channel)
      : [...filters.channels, channel];
    updateFilters({ channels: newChannels });
  }, [filters.channels, updateFilters]);

  const handleStatusToggle = useCallback((status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    updateFilters({ status: newStatus });
  }, [filters.status, updateFilters]);

  return (
    <Card
      size="small"
      style={{
        marginBottom: 16,
        borderRadius: token.borderRadiusLG,
      }}
      bodyStyle={{ padding: 0 }}
    >
      <Collapse
        ghost
        activeKey={isExpanded ? ['filters'] : []}
        onChange={(keys) => setIsExpanded(keys.includes('filters'))}
      >
        <Panel
          key="filters"
          header={
            <Space>
              <FilterOutlined />
              <Text strong>Filters</Text>
              {activeFilterCount > 0 && (
                <Badge count={activeFilterCount} style={{ backgroundColor: token.colorPrimary }} />
              )}
              {resultCount !== undefined && (
                <Text type="secondary" style={{ marginLeft: 8 }}>
                  ({resultCount} results)
                </Text>
              )}
            </Space>
          }
          extra={
            <Space onClick={(e) => e.stopPropagation()}>
              {activeFilterCount > 0 && (
                <Button
                  type="text"
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={clearFilters}
                  disabled={loading}
                >
                  Clear
                </Button>
              )}
              <Tooltip title="Export filtered results">
                <Button
                  type="primary"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => onExport('csv')}
                  disabled={loading}
                >
                  Export CSV
                </Button>
              </Tooltip>
            </Space>
          }
        >
          <div style={{ padding: '0 16px 16px' }}>
            {/* Channel Filter */}
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                <MessageOutlined /> Channel
              </Text>
              <Space wrap>
                {channelOptions.map((channel) => (
                  <Tag.CheckableTag
                    key={channel.value}
                    checked={filters.channels.includes(channel.value)}
                    onChange={() => handleChannelToggle(channel.value)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: token.borderRadiusSM,
                      border: `1px solid ${
                        filters.channels.includes(channel.value)
                          ? token.colorPrimary
                          : token.colorBorder
                      }`,
                    }}
                  >
                    <Space size={4}>
                      {channel.icon}
                      {channel.label}
                    </Space>
                  </Tag.CheckableTag>
                ))}
              </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            {/* Status Filter */}
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                <CheckCircleOutlined /> Status
              </Text>
              <Space wrap>
                {statusOptions.map((status) => (
                  <Tag.CheckableTag
                    key={status.value}
                    checked={filters.status.includes(status.value)}
                    onChange={() => handleStatusToggle(status.value)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: token.borderRadiusSM,
                      border: `1px solid ${
                        filters.status.includes(status.value)
                          ? token.colorPrimary
                          : token.colorBorder
                      }`,
                    }}
                  >
                    <Space size={4}>
                      {status.icon}
                      {status.label}
                    </Space>
                  </Tag.CheckableTag>
                ))}
              </Space>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <Row gutter={24}>
              {/* Assigned User Filter */}
              <Col xs={24} sm={12} md={8}>
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                    <UserOutlined /> Assigned To
                  </Text>
                  <Select
                    style={{ width: '100%' }}
                    placeholder="All users"
                    allowClear
                    value={filters.userId}
                    onChange={(value) => updateFilters({ userId: value || null })}
                    disabled={loading}
                    options={[
                      { label: 'Unassigned', value: 'unassigned' },
                      ...users.map((user) => ({
                        label: user.name,
                        value: user.id,
                      })),
                    ]}
                  />
                </div>
              </Col>

              {/* Date Range Filter */}
              <Col xs={24} sm={12} md={8}>
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                    <ClockCircleOutlined /> Date Range
                  </Text>
                  <RangePicker
                    style={{ width: '100%' }}
                    value={filters.dateRange as [Dayjs | null, Dayjs | null]}
                    onChange={(dates) =>
                      updateFilters({
                        dateRange: dates || [null, null],
                      })
                    }
                    disabled={loading}
                    presets={[
                      { label: 'Today', value: [dayjs().startOf('day'), dayjs()] },
                      { label: 'Yesterday', value: [dayjs().subtract(1, 'day').startOf('day'), dayjs().subtract(1, 'day').endOf('day')] },
                      { label: 'Last 7 Days', value: [dayjs().subtract(7, 'day'), dayjs()] },
                      { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day'), dayjs()] },
                      { label: 'This Month', value: [dayjs().startOf('month'), dayjs()] },
                    ]}
                  />
                </div>
              </Col>

              {/* Response Time Range Filter */}
              <Col xs={24} md={8}>
                <div style={{ marginBottom: 16 }}>
                  <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                    <ClockCircleOutlined /> Response Time
                  </Text>
                  <Slider
                    range
                    min={0}
                    max={7200}
                    step={60}
                    marks={responseTimeMarks}
                    value={filters.responseTimeRange}
                    onChange={(value) => updateFilters({ responseTimeRange: value as [number, number] })}
                    disabled={loading}
                    tooltip={{
                      formatter: (value) => {
                        if (!value) return '0s';
                        if (value < 60) return `${value}s`;
                        if (value < 3600) return `${Math.floor(value / 60)}m`;
                        return `${(value / 3600).toFixed(1)}h`;
                      },
                    }}
                  />
                </div>
              </Col>
            </Row>

            {/* Active Filters Summary */}
            {activeFilterCount > 0 && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Space wrap>
                  <Text type="secondary">Active:</Text>
                  {filters.channels.map((ch) => (
                    <Tag
                      key={ch}
                      closable
                      onClose={() => handleChannelToggle(ch)}
                      color="blue"
                    >
                      {channelOptions.find((c) => c.value === ch)?.label || ch}
                    </Tag>
                  ))}
                  {filters.status.map((st) => {
                    const statusOption = statusOptions.find((s) => s.value === st);
                    return (
                      <Tag
                        key={st}
                        closable
                        onClose={() => handleStatusToggle(st)}
                        color={statusOption?.color || 'default'}
                      >
                        {statusOption?.label || st}
                      </Tag>
                    );
                  })}
                  {filters.userId && (
                    <Tag closable onClose={() => updateFilters({ userId: null })} color="purple">
                      {filters.userId === 'unassigned'
                        ? 'Unassigned'
                        : users.find((u) => u.id === filters.userId)?.name || 'User'}
                    </Tag>
                  )}
                  {(filters.dateRange[0] || filters.dateRange[1]) && (
                    <Tag
                      closable
                      onClose={() => updateFilters({ dateRange: [null, null] })}
                      color="cyan"
                    >
                      {filters.dateRange[0]?.format('MMM D')} -{' '}
                      {filters.dateRange[1]?.format('MMM D')}
                    </Tag>
                  )}
                  {(filters.responseTimeRange[0] > 0 || filters.responseTimeRange[1] < 7200) && (
                    <Tag
                      closable
                      onClose={() => updateFilters({ responseTimeRange: [0, 7200] })}
                      color="orange"
                    >
                      {filters.responseTimeRange[0] < 60
                        ? `${filters.responseTimeRange[0]}s`
                        : `${Math.floor(filters.responseTimeRange[0] / 60)}m`}{' '}
                      -{' '}
                      {filters.responseTimeRange[1] >= 7200
                        ? '2h+'
                        : filters.responseTimeRange[1] < 60
                        ? `${filters.responseTimeRange[1]}s`
                        : `${Math.floor(filters.responseTimeRange[1] / 60)}m`}
                    </Tag>
                  )}
                </Space>
              </>
            )}
          </div>
        </Panel>
      </Collapse>
    </Card>
  );
};

export default FilterPanel;
