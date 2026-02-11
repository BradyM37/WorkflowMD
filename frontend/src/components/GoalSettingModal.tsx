import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Radio, 
  InputNumber, 
  Space, 
  Typography, 
  Button,
  Progress,
  Card,
  Row,
  Col,
  Statistic,
  Alert
} from 'antd';
import {
  TrophyOutlined,
  RocketOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  FireOutlined
} from '@ant-design/icons';
import { useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import confetti from 'canvas-confetti';

const { Title, Text, Paragraph } = Typography;

interface GoalSettingModalProps {
  visible: boolean;
  onClose: () => void;
  currentGoal?: number; // in seconds
  progress?: {
    percentage: number;
    totalResponses: number;
    responsesMeetingGoal: number;
  };
}

const PRESET_GOALS = [
  { value: 60, label: '1 minute', emoji: '🚀', description: 'Elite performer' },
  { value: 120, label: '2 minutes', emoji: '⚡', description: 'Recommended' },
  { value: 300, label: '5 minutes', emoji: '✅', description: 'Industry standard' },
  { value: 0, label: 'Custom', emoji: '🎯', description: 'Set your own' }
];

const GoalSettingModal: React.FC<GoalSettingModalProps> = ({
  visible,
  onClose,
  currentGoal = 120,
  progress
}) => {
  const queryClient = useQueryClient();
  const [selectedPreset, setSelectedPreset] = useState<number>(currentGoal);
  const [customValue, setCustomValue] = useState<number>(currentGoal / 60);
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (visible) {
      const preset = PRESET_GOALS.find(p => p.value === currentGoal);
      if (preset && preset.value !== 0) {
        setSelectedPreset(currentGoal);
        setIsCustom(false);
      } else {
        setSelectedPreset(0);
        setCustomValue(currentGoal / 60);
        setIsCustom(true);
      }
    }
  }, [visible, currentGoal]);

  const saveMutation = useMutation(
    (targetSeconds: number) => api.put('/api/settings/response', {
      targetResponseTime: targetSeconds
    }),
    {
      onSuccess: () => {
        toast.success('Response time goal updated!');
        queryClient.invalidateQueries('response-settings');
        queryClient.invalidateQueries('metrics-goals');
        onClose();
        
        // Celebratory confetti!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error?.message || 'Failed to save goal');
      }
    }
  );

  const handleSave = () => {
    const targetSeconds = isCustom ? customValue * 60 : selectedPreset;
    if (targetSeconds < 30) {
      toast.error('Goal must be at least 30 seconds');
      return;
    }
    if (targetSeconds > 3600) {
      toast.error('Goal must be less than 1 hour');
      return;
    }
    saveMutation.mutate(targetSeconds);
  };

  const formatGoal = (seconds: number): string => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds === 60) return '1 minute';
    if (seconds < 3600) return `${seconds / 60} minutes`;
    return '1 hour';
  };

  const getGoalColor = (percentage: number): string => {
    if (percentage >= 90) return '#52c41a';
    if (percentage >= 70) return '#faad14';
    return '#ff4d4f';
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      title={
        <Space>
          <TrophyOutlined style={{ color: '#faad14', fontSize: 24 }} />
          <span>Set Response Time Goal</span>
        </Space>
      }
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          loading={saveMutation.isLoading}
          onClick={handleSave}
          icon={<RocketOutlined />}
        >
          Set Goal
        </Button>
      ]}
      width={600}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Current Progress Card */}
        {progress && progress.totalResponses > 0 && (
          <Card 
            size="small"
            style={{
              background: `linear-gradient(135deg, ${getGoalColor(progress.percentage)}15, ${getGoalColor(progress.percentage)}05)`,
              border: `1px solid ${getGoalColor(progress.percentage)}30`
            }}
          >
            <Row align="middle" gutter={16}>
              <Col xs={24} sm={12}>
                <Statistic
                  title={<Text type="secondary">Current Progress</Text>}
                  value={progress.percentage}
                  suffix="%"
                  valueStyle={{ 
                    color: getGoalColor(progress.percentage),
                    fontWeight: 700
                  }}
                  prefix={
                    progress.percentage >= 90 
                      ? <CheckCircleOutlined /> 
                      : progress.percentage >= 70 
                      ? <ThunderboltOutlined />
                      : <FireOutlined />
                  }
                />
              </Col>
              <Col xs={24} sm={12}>
                <Progress
                  percent={progress.percentage}
                  strokeColor={getGoalColor(progress.percentage)}
                  trailColor="rgba(0,0,0,0.1)"
                  showInfo={false}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {progress.responsesMeetingGoal} of {progress.totalResponses} met goal
                </Text>
              </Col>
            </Row>
          </Card>
        )}

        <Alert
          message="Why set a response time goal?"
          description="Studies show that responding within 5 minutes makes you 100x more likely to connect with leads. The faster you respond, the higher your conversion rate."
          type="info"
          showIcon
          icon={<ThunderboltOutlined />}
        />

        {/* Goal Presets */}
        <div>
          <Text strong style={{ marginBottom: 12, display: 'block' }}>
            Choose your target response time:
          </Text>
          
          <Radio.Group 
            value={isCustom ? 0 : selectedPreset}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 0) {
                setIsCustom(true);
              } else {
                setIsCustom(false);
                setSelectedPreset(value);
              }
            }}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {PRESET_GOALS.map((preset) => (
                <Radio 
                  key={preset.value} 
                  value={preset.value}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    marginRight: 0,
                    background: (isCustom && preset.value === 0) || (!isCustom && selectedPreset === preset.value)
                      ? 'linear-gradient(135deg, #667eea15, #764ba215)'
                      : 'transparent'
                  }}
                >
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Space>
                      <span style={{ fontSize: 20 }}>{preset.emoji}</span>
                      <div>
                        <Text strong>{preset.label}</Text>
                        {preset.value === 120 && (
                          <Text 
                            type="secondary" 
                            style={{ 
                              marginLeft: 8, 
                              fontSize: 12,
                              background: '#52c41a20',
                              padding: '2px 8px',
                              borderRadius: 4,
                              color: '#52c41a'
                            }}
                          >
                            RECOMMENDED
                          </Text>
                        )}
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {preset.description}
                        </Text>
                      </div>
                    </Space>
                  </Space>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        </div>

        {/* Custom Input */}
        {isCustom && (
          <Card size="small" style={{ background: '#fafafa' }}>
            <Space align="center">
              <ClockCircleOutlined style={{ fontSize: 18, color: '#667eea' }} />
              <Text>Custom goal:</Text>
              <InputNumber
                min={0.5}
                max={60}
                step={0.5}
                value={customValue}
                onChange={(value) => setCustomValue(value || 1)}
                style={{ width: 100 }}
                addonAfter="min"
              />
              <Text type="secondary">({customValue * 60} seconds)</Text>
            </Space>
          </Card>
        )}

        {/* Preview */}
        <Card 
          size="small" 
          style={{ 
            background: 'linear-gradient(135deg, #667eea15, #764ba215)',
            border: '1px solid #667eea30'
          }}
        >
          <Row align="middle" justify="center">
            <Col>
              <Space direction="vertical" align="center">
                <RocketOutlined style={{ fontSize: 32, color: '#667eea' }} />
                <Text strong style={{ fontSize: 18 }}>
                  Your Goal: Respond within {formatGoal(isCustom ? customValue * 60 : selectedPreset)}
                </Text>
                <Text type="secondary">
                  Track your progress on the dashboard
                </Text>
              </Space>
            </Col>
          </Row>
        </Card>
      </Space>
    </Modal>
  );
};

export default GoalSettingModal;
