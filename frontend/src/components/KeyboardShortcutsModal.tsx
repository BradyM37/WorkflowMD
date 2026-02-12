import React from 'react';
import { Modal, Typography, Space, Tag, Divider } from 'antd';
import { 
  DashboardOutlined, 
  SettingOutlined, 
  SearchOutlined,
  QuestionCircleOutlined,
  CloseCircleOutlined,
  LineChartOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

interface KeyboardShortcutsModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  icon: React.ReactNode;
  category: 'navigation' | 'actions' | 'general';
}

const shortcuts: ShortcutItem[] = [
  // Navigation
  { keys: ['Ctrl', 'D'], description: 'Go to Dashboard', icon: <DashboardOutlined />, category: 'navigation' },
  { keys: ['Ctrl', 'G'], description: 'Go to Workflow Graph', icon: <NodeIndexOutlined />, category: 'navigation' },
  { keys: ['Ctrl', 'Shift', 'S'], description: 'Go to Settings', icon: <SettingOutlined />, category: 'navigation' },
  { keys: ['Ctrl', 'R'], description: 'Go to Response Tracker', icon: <LineChartOutlined />, category: 'navigation' },
  
  // Actions
  { keys: ['Ctrl', 'K'], description: 'Quick Search (Command Palette)', icon: <SearchOutlined />, category: 'actions' },
  { keys: ['Esc'], description: 'Close Modal / Clear Search', icon: <CloseCircleOutlined />, category: 'actions' },
  
  // General
  { keys: ['?'], description: 'Show Keyboard Shortcuts', icon: <QuestionCircleOutlined />, category: 'general' },
  { keys: ['Ctrl', '/'], description: 'Show Keyboard Shortcuts', icon: <QuestionCircleOutlined />, category: 'general' },
];

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ visible, onClose }) => {
  const renderShortcuts = (category: 'navigation' | 'actions' | 'general') => {
    const filtered = shortcuts.filter(s => s.category === category);
    return filtered.map((shortcut, index) => (
      <div 
        key={index}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '10px 0',
          borderBottom: index < filtered.length - 1 ? '1px solid #f0f0f0' : 'none'
        }}
      >
        <Space>
          <span style={{ color: '#667eea', fontSize: 16 }}>{shortcut.icon}</span>
          <Text>{shortcut.description}</Text>
        </Space>
        <Space size={4}>
          {shortcut.keys.map((key, i) => (
            <React.Fragment key={i}>
              <Tag 
                style={{ 
                  background: '#f5f5f5',
                  border: '1px solid #d9d9d9',
                  borderRadius: 4,
                  fontFamily: 'monospace',
                  fontWeight: 600,
                  fontSize: 12,
                  padding: '2px 8px',
                  margin: 0
                }}
              >
                {key}
              </Tag>
              {i < shortcut.keys.length - 1 && <Text type="secondary">+</Text>}
            </React.Fragment>
          ))}
        </Space>
      </div>
    ));
  };

  return (
    <Modal
      title={
        <Space>
          <span style={{ fontSize: 24 }}>⌨️</span>
          <Title level={4} style={{ margin: 0 }}>Keyboard Shortcuts</Title>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={500}
      centered
    >
      <div style={{ marginTop: 16 }}>
        <Text type="secondary" strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Navigation
        </Text>
        <div style={{ marginTop: 8, marginBottom: 20 }}>
          {renderShortcuts('navigation')}
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <Text type="secondary" strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Actions
        </Text>
        <div style={{ marginTop: 8, marginBottom: 20 }}>
          {renderShortcuts('actions')}
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <Text type="secondary" strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          General
        </Text>
        <div style={{ marginTop: 8 }}>
          {renderShortcuts('general')}
        </div>
      </div>

      <div style={{ 
        marginTop: 24, 
        padding: 12, 
        background: '#f5f5f5', 
        borderRadius: 8,
        textAlign: 'center'
      }}>
        <Text type="secondary">
          Press <Text keyboard>Esc</Text> to close this modal
        </Text>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsModal;
