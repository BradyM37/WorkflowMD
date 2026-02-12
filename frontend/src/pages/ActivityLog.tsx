import React, { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Table,
  Select,
  DatePicker,
  Space,
  Tag,
  Button,
  Empty,
  Spin,
  Tooltip,
  Row,
  Col
} from 'antd';
import {
  HistoryOutlined,
  FilterOutlined,
  ReloadOutlined,
  SettingOutlined,
  FileTextOutlined,
  DownloadOutlined,
  UserOutlined,
  LinkOutlined,
  CreditCardOutlined,
  TeamOutlined,
  LoginOutlined,
  AimOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

interface ActivityLog {
  id: number;
  location_id: string;
  user_id: string;
  action: string;
  actionDisplay: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
  ip_address: string;
  created_at: string;
}

interface ActionType {
  value: string;
  label: string;
}

const getActionIcon = (action: string) => {
  if (action.includes('settings') || action.includes('branding') || action.includes('hours')) {
    return <SettingOutlined style={{ color: '#1890ff' }} />;
  }
  if (action.includes('report')) {
    return <FileTextOutlined style={{ color: '#52c41a' }} />;
  }
  if (action.includes('export') || action.includes('pdf')) {
    return <DownloadOutlined style={{ color: '#722ed1' }} />;
  }
  if (action.includes('goal')) {
    return <AimOutlined style={{ color: '#fa8c16' }} />;
  }
  if (action.includes('slack') || action.includes('webhook')) {
    return <LinkOutlined style={{ color: '#13c2c2' }} />;
  }
  if (action.includes('subscription')) {
    return <CreditCardOutlined style={{ color: '#eb2f96' }} />;
  }
  if (action.includes('team')) {
    return <TeamOutlined style={{ color: '#2f54eb' }} />;
  }
  if (action.includes('login') || action.includes('logout')) {
    return <LoginOutlined style={{ color: '#8c8c8c' }} />;
  }
  return <HistoryOutlined style={{ color: '#8c8c8c' }} />;
};

const getActionColor = (action: string): string => {
  if (action.includes('deleted') || action.includes('removed') || action.includes('cancelled')) {
    return 'red';
  }
  if (action.includes('created') || action.includes('added') || action.includes('upgraded')) {
    return 'green';
  }
  if (action.includes('updated') || action.includes('changed')) {
    return 'blue';
  }
  if (action.includes('generated') || action.includes('downloaded') || action.includes('sent')) {
    return 'purple';
  }
  return 'default';
};

const ActivityLog: React.FC = () => {
  const { locationId } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [actionFilter, setActionFilter] = useState<string | undefined>();
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [actionTypes, setActionTypes] = useState<ActionType[]>([]);

  const fetchActivityLogs = async () => {
    if (!locationId) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString()
      });

      if (actionFilter) params.append('action', actionFilter);
      if (dateRange?.[0]) params.append('startDate', dateRange[0].toISOString());
      if (dateRange?.[1]) params.append('endDate', dateRange[1].toISOString());

      const response = await fetch(`/api/activity?${params}`, {
        headers: {
          'x-location-id': locationId
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.data.logs);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActionTypes = async () => {
    try {
      const response = await fetch('/api/activity/actions', {
        headers: locationId ? { 'x-location-id': locationId } : {}
      });

      if (response.ok) {
        const data = await response.json();
        setActionTypes(data.data.actions);
      }
    } catch (error) {
      console.error('Failed to fetch action types:', error);
    }
  };

  useEffect(() => {
    fetchActionTypes();
  }, []);

  useEffect(() => {
    fetchActivityLogs();
  }, [locationId, page, actionFilter, dateRange]);

  const columns = [
    {
      title: 'Time',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => (
        <Tooltip title={dayjs(date).format('YYYY-MM-DD HH:mm:ss')}>
          <Text type="secondary">{dayjs(date).fromNow()}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action: string, record: ActivityLog) => (
        <Space>
          {getActionIcon(action)}
          <Tag color={getActionColor(action)}>{record.actionDisplay}</Tag>
        </Space>
      )
    },
    {
      title: 'Entity',
      key: 'entity',
      render: (_: any, record: ActivityLog) => (
        record.entity_type ? (
          <Text type="secondary">
            {record.entity_type}
            {record.entity_id && ` #${record.entity_id.slice(0, 8)}`}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      )
    },
    {
      title: 'Details',
      dataIndex: 'metadata',
      key: 'metadata',
      render: (metadata: Record<string, any>) => {
        if (!metadata || Object.keys(metadata).length === 0) {
          return <Text type="secondary">-</Text>;
        }
        
        const entries = Object.entries(metadata).slice(0, 2);
        return (
          <Tooltip title={JSON.stringify(metadata, null, 2)}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {entries.map(([k, v]) => `${k}: ${typeof v === 'object' ? '...' : v}`).join(', ')}
              {Object.keys(metadata).length > 2 && '...'}
            </Text>
          </Tooltip>
        );
      }
    },
    {
      title: 'User',
      dataIndex: 'user_id',
      key: 'user_id',
      width: 120,
      render: (userId: string) => (
        userId ? (
          <Tooltip title={userId}>
            <Space>
              <UserOutlined />
              <Text type="secondary">{userId.slice(0, 8)}...</Text>
            </Space>
          </Tooltip>
        ) : (
          <Text type="secondary">System</Text>
        )
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ margin: 0 }}>
            <HistoryOutlined style={{ marginRight: 12 }} />
            Activity Log
          </Title>
          <Text type="secondary">Track all actions and changes in your account</Text>
        </Col>
        <Col>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchActivityLogs}
            loading={loading}
          >
            Refresh
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Space wrap>
          <FilterOutlined />
          <Select
            placeholder="Filter by action"
            allowClear
            style={{ width: 200 }}
            value={actionFilter}
            onChange={setActionFilter}
            options={actionTypes}
          />
          <RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates)}
            placeholder={['Start date', 'End date']}
          />
          {(actionFilter || dateRange) && (
            <Button
              type="link"
              onClick={() => {
                setActionFilter(undefined);
                setDateRange(null);
              }}
            >
              Clear filters
            </Button>
          )}
        </Space>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: setPage,
            showTotal: (t) => `${t} total activities`
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No activity logs yet"
              />
            )
          }}
        />
      </Card>
    </div>
  );
};

export default ActivityLog;
