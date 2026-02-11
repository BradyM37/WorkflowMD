import React, { useState, useEffect } from 'react';
import {
  Modal,
  Form,
  Switch,
  Select,
  TimePicker,
  Radio,
  Space,
  Checkbox,
  Typography,
  Alert,
  Divider,
  List,
  Avatar,
  Tag
} from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { notify } from '../utils/toast';
import { useTheme } from '../contexts/ThemeContext';

const { Text } = Typography;
const { Option } = Select;

export interface ScheduleConfig {
  enabled: boolean;
  frequency: 'daily' | 'every12h' | 'every6h' | 'weekly';
  time: string; // HH:mm format
  scope: 'all' | 'active' | 'selected';
  selectedWorkflows?: string[];
}

interface Workflow {
  id: string;
  name: string;
  status: string;
  category?: string;
}

interface ScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  workflows?: Workflow[];
}

// Helper functions for localStorage
const getSchedule = (): ScheduleConfig | null => {
  const saved = localStorage.getItem('scan_schedule');
  return saved ? JSON.parse(saved) : null;
};

const saveSchedule = (schedule: ScheduleConfig): void => {
  localStorage.setItem('scan_schedule', JSON.stringify(schedule));
};

const ScheduleModal: React.FC<ScheduleModalProps> = ({ visible, onClose, workflows = [] }) => {
  const [form] = Form.useForm();
  const { isDarkMode } = useTheme();
  const existingSchedule = getSchedule();
  
  const [enabled, setEnabled] = useState(existingSchedule?.enabled || false);

  // Theme-aware colors
  const colors = {
    cardBg: isDarkMode ? '#1f1f1f' : '#f5f5f5',
    titleText: isDarkMode ? '#ffffff' : '#1a1a2e',
    bodyText: isDarkMode ? '#d9d9d9' : '#595959',
    mutedText: isDarkMode ? '#8c8c8c' : '#595959',
    border: isDarkMode ? '#303030' : '#d9d9d9',
    listBg: isDarkMode ? '#262626' : '#fafafa',
    listHover: isDarkMode ? '#1a3a5c' : '#e6f7ff',
  };
  const [frequency, setFrequency] = useState<string>(existingSchedule?.frequency || 'daily');
  const [scope, setScope] = useState<string>(existingSchedule?.scope || 'all');
  const [selectedWorkflows, setSelectedWorkflows] = useState<string[]>(
    existingSchedule?.selectedWorkflows || []
  );

  // Initialize form with existing schedule
  useEffect(() => {
    if (existingSchedule) {
      form.setFieldsValue({
        enabled: existingSchedule.enabled,
        frequency: existingSchedule.frequency,
        time: existingSchedule.time ? dayjs(existingSchedule.time, 'HH:mm') : dayjs().hour(2).minute(0),
        scope: existingSchedule.scope,
      });
    } else {
      form.setFieldsValue({
        enabled: false,
        frequency: 'daily',
        time: dayjs().hour(2).minute(0),
        scope: 'all',
      });
    }
  }, [existingSchedule, form, visible]);

  const handleSave = () => {
    form.validateFields().then((values) => {
      const schedule: ScheduleConfig = {
        enabled: values.enabled,
        frequency: values.frequency,
        time: values.time.format('HH:mm'),
        scope: values.scope,
        selectedWorkflows: values.scope === 'selected' ? selectedWorkflows : undefined,
      };

      saveSchedule(schedule);
      
      if (schedule.enabled) {
        notify.success(
          `Schedule Enabled: Scans will run ${getFrequencyText(schedule.frequency)} at ${schedule.time}`
        );
      } else {
        notify.info('Schedule Disabled - Automatic scans have been turned off');
      }
      
      onClose();
    });
  };

  const getFrequencyText = (freq: string): string => {
    switch (freq) {
      case 'daily': return 'daily';
      case 'every12h': return 'every 12 hours';
      case 'every6h': return 'every 6 hours';
      case 'weekly': return 'weekly';
      default: return freq;
    }
  };

  const getNextScanTime = (): string => {
    const time = form.getFieldValue('time');
    if (!time || !enabled) return 'Not scheduled';

    const freq = form.getFieldValue('frequency') || 'daily';
    const now = dayjs();
    const scheduledTime = dayjs().hour(time.hour()).minute(time.minute());
    
    if (freq === 'daily') {
      return `Tomorrow at ${scheduledTime.format('h:mm A')}`;
    } else if (freq === 'every12h') {
      return `Every 12 hours starting ${scheduledTime.format('h:mm A')}`;
    } else if (freq === 'every6h') {
      return `Every 6 hours starting ${scheduledTime.format('h:mm A')}`;
    } else if (freq === 'weekly') {
      const daysUntil = 7 - now.day();
      return `Next ${now.add(daysUntil, 'day').format('dddd')} at ${scheduledTime.format('h:mm A')}`;
    }

    return 'Not scheduled';
  };

  const handleWorkflowToggle = (workflowId: string) => {
    setSelectedWorkflows(prev => {
      if (prev.includes(workflowId)) {
        return prev.filter(id => id !== workflowId);
      } else {
        return [...prev, workflowId];
      }
    });
  };

  return (
    <Modal
      title={
        <Space>
          <CalendarOutlined style={{ color: '#667eea' }} />
          <span>Schedule Automatic Scans</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      onOk={handleSave}
      okText="Save Schedule"
      cancelText="Cancel"
      width={700}
      okButtonProps={{
        icon: <CheckCircleOutlined />
      }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          enabled: false,
          frequency: 'daily',
          time: dayjs().hour(2).minute(0),
          scope: 'all',
        }}
      >
        {/* Enable/Disable Toggle */}
        <Alert
          message="Automate Workflow Analysis"
          description="Schedule regular scans to catch issues before they impact your clients."
          type="info"
          showIcon
          icon={<ClockCircleOutlined />}
          style={{ marginBottom: '24px' }}
        />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px',
          background: enabled 
            ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)' 
            : colors.cardBg,
          borderRadius: '8px',
          border: enabled ? '2px solid #667eea' : `1px solid ${colors.border}`,
          transition: 'all 0.3s ease',
          marginBottom: '16px'
        }}>
          <div>
            <Text strong style={{ display: 'block', fontSize: '16px', color: colors.titleText }}>
              Enable Scheduled Scans
            </Text>
            <Text style={{ fontSize: '13px', color: colors.bodyText }}>
              Automatically scan workflows on a regular schedule
            </Text>
          </div>
          <Switch
            checked={enabled}
            onChange={(checked) => {
              setEnabled(checked);
              form.setFieldValue('enabled', checked);
            }}
            checkedChildren="ON"
            unCheckedChildren="OFF"
            size="default"
          />
        </div>

        <Divider />

        {/* Frequency Selection */}
        <Form.Item
          label={<Text strong style={{ color: colors.titleText }}>Scan Frequency</Text>}
          name="frequency"
        >
          <Select
            size="large"
            onChange={setFrequency}
            disabled={!enabled}
            style={{ width: '100%' }}
            placeholder="Select frequency"
          >
            <Option value="daily">
              <Space>
                <CalendarOutlined />
                Daily
              </Space>
            </Option>
            <Option value="every12h">
              <Space>
                <ClockCircleOutlined />
                Every 12 Hours
              </Space>
            </Option>
            <Option value="every6h">
              <Space>
                <ClockCircleOutlined />
                Every 6 Hours
              </Space>
            </Option>
            <Option value="weekly">
              <Space>
                <CalendarOutlined />
                Weekly
              </Space>
            </Option>
          </Select>
        </Form.Item>

        {/* Time Picker */}
        <Form.Item
          label={<Text strong style={{ color: colors.titleText }}>Scan Time</Text>}
          name="time"
          extra={
            <Text style={{ fontSize: '12px', color: colors.mutedText }}>
              {enabled ? `Next scan: ${getNextScanTime()}` : 'Enable scheduling to set scan time'}
            </Text>
          }
        >
          <TimePicker
            size="large"
            format="h:mm A"
            use12Hours
            disabled={!enabled}
            style={{ width: '100%' }}
            showNow={false}
          />
        </Form.Item>

        <Divider />

        {/* Scope Selection */}
        <Form.Item
          label={<Text strong style={{ color: colors.titleText }}>Scan Scope</Text>}
          name="scope"
        >
          <Radio.Group
            onChange={(e) => setScope(e.target.value)}
            disabled={!enabled}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="all">
                <Space>
                  <ThunderboltOutlined style={{ color: colors.titleText }} />
                  <div>
                    <Text strong style={{ color: colors.titleText }}>All Workflows</Text>
                    <br />
                    <Text style={{ fontSize: '12px', color: colors.mutedText }}>
                      Scan all {workflows.length} workflows in your account
                    </Text>
                  </div>
                </Space>
              </Radio>
              <Radio value="active">
                <Space>
                  <CheckCircleOutlined style={{ color: colors.titleText }} />
                  <div>
                    <Text strong style={{ color: colors.titleText }}>Active Workflows Only</Text>
                    <br />
                    <Text style={{ fontSize: '12px', color: colors.mutedText }}>
                      Only scan workflows with "active" status (
                      {workflows.filter(w => w.status === 'active').length} workflows)
                    </Text>
                  </div>
                </Space>
              </Radio>
              <Radio value="selected">
                <Space>
                  <CheckCircleOutlined style={{ color: colors.titleText }} />
                  <div>
                    <Text strong style={{ color: colors.titleText }}>Selected Workflows</Text>
                    <br />
                    <Text style={{ fontSize: '12px', color: colors.mutedText }}>
                      Choose specific workflows to scan ({selectedWorkflows.length} selected)
                    </Text>
                  </div>
                </Space>
              </Radio>
            </Space>
          </Radio.Group>
        </Form.Item>

        {/* Workflow Selection (if scope is 'selected') */}
        {scope === 'selected' && enabled && (
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '12px',
            background: colors.listBg
          }}>
            <Text strong style={{ display: 'block', marginBottom: '12px', color: colors.titleText }}>
              Select Workflows to Scan:
            </Text>
            <List
              dataSource={workflows}
              renderItem={(workflow) => (
                <List.Item
                  style={{
                    padding: '8px',
                    cursor: 'pointer',
                    background: selectedWorkflows.includes(workflow.id) ? colors.listHover : 'transparent',
                    borderRadius: '4px',
                    marginBottom: '4px'
                  }}
                  onClick={() => handleWorkflowToggle(workflow.id)}
                >
                  <Checkbox
                    checked={selectedWorkflows.includes(workflow.id)}
                    onChange={() => handleWorkflowToggle(workflow.id)}
                    style={{ marginRight: '12px' }}
                  />
                  <List.Item.Meta
                    avatar={
                      <Avatar style={{ background: workflow.status === 'active' ? '#52c41a' : '#8c8c8c' }}>
                        {workflow.name.charAt(0)}
                      </Avatar>
                    }
                    title={
                      <Space>
                        <Text strong style={{ color: colors.titleText }}>{workflow.name}</Text>
                        <Tag color={workflow.status === 'active' ? 'success' : 'default'}>
                          {workflow.status}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Text style={{ fontSize: '12px', color: colors.mutedText }}>
                        {workflow.category || 'Uncategorized'}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </Form>

      {enabled && (
        <Alert
          message={`Scheduled: ${getNextScanTime()}`}
          description={`${
            scope === 'all' ? 'All workflows' :
            scope === 'active' ? 'Active workflows only' :
            `${selectedWorkflows.length} selected workflows`
          } will be scanned ${getFrequencyText(frequency)}`}
          type="success"
          showIcon
          icon={<CalendarOutlined />}
          style={{ marginTop: '16px' }}
        />
      )}
    </Modal>
  );
};

export default ScheduleModal;
