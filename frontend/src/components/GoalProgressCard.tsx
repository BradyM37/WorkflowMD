import React, { useEffect, useState } from 'react';
import { 
  Card, 
  Progress, 
  Typography, 
  Space, 
  Button,
  Row,
  Col,
  Tooltip,
  Statistic
} from 'antd';
import {
  TrophyOutlined,
  RocketOutlined,
  EditOutlined,
  FireOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  StarOutlined
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import confetti from 'canvas-confetti';
import GoalSettingModal from './GoalSettingModal';

const { Text, Title } = Typography;

interface GoalProgressCardProps {
  days: number;
}

interface GoalData {
  goal: {
    targetSeconds: number;
    targetFormatted: string;
  };
  progress: {
    totalResponses: number;
    responsesMeetingGoal: number;
    percentage: number;
    avgResponseTime: number;
    bestResponseTime: number;
  };
  today: {
    totalResponses: number;
    responsesMeetingGoal: number;
    percentage: number;
    goalAchieved: boolean;
  };
  shouldCelebrate: boolean;
  dailyProgress: Array<{
    date: string;
    percentage: number;
  }>;
}

const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ days }) => {
  const queryClient = useQueryClient();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [celebrated, setCelebrated] = useState(false);

  const { data: goalData, isLoading } = useQuery<{ data: GoalData }>(
    ['metrics-goals', days],
    () => api.get(`/api/metrics/goals?days=${days}`).then(res => res.data),
    { refetchInterval: 60000 }
  );

  const celebrateMutation = useMutation(
    () => api.post('/api/metrics/goals/celebrate'),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('metrics-goals');
      }
    }
  );

  // Trigger celebration when goal is achieved
  useEffect(() => {
    if (goalData?.data?.shouldCelebrate && !celebrated) {
      setCelebrated(true);
      
      // Epic celebration animation!
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          celebrateMutation.mutate();
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [goalData?.data?.shouldCelebrate, celebrated, celebrateMutation]);

  if (isLoading || !goalData?.data) {
    return (
      <Card loading style={{ height: 200 }} />
    );
  }

  const { goal, progress, today } = goalData.data;

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return '#52c41a';  // Success green
    if (percentage >= 70) return '#faad14';  // Warning yellow
    if (percentage >= 50) return '#fa8c16';  // Orange
    return '#ff4d4f';                        // Error red
  };

  const getProgressEmoji = (percentage: number): string => {
    if (percentage >= 90) return '🏆';
    if (percentage >= 70) return '🚀';
    if (percentage >= 50) return '⚡';
    return '🔥';
  };

  const getMotivationalMessage = (percentage: number): string => {
    if (percentage >= 95) return "Outstanding! You're crushing it!";
    if (percentage >= 90) return "Amazing work! Goal achieved! 🎉";
    if (percentage >= 70) return "Great progress! Keep pushing!";
    if (percentage >= 50) return "You're halfway there!";
    if (percentage >= 25) return "Good start, keep going!";
    return "Every response counts. You got this!";
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <>
      <Card 
        className="goal-progress-card"
        style={{
          background: progress.percentage >= 90 
            ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
            : progress.percentage >= 70
            ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
            : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}
      >
        <Row gutter={[24, 16]} align="middle">
          {/* Main Progress */}
          <Col xs={24} md={10}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative' }}>
                <Progress
                  type="circle"
                  percent={progress.percentage}
                  strokeColor={getProgressColor(progress.percentage)}
                  trailColor="rgba(0,0,0,0.06)"
                  width={100}
                  format={() => (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: getProgressColor(progress.percentage) }}>
                        {progress.percentage}%
                      </div>
                    </div>
                  )}
                />
                {progress.percentage >= 90 && (
                  <div style={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    fontSize: 24
                  }}>
                    🏆
                  </div>
                )}
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>RESPONSE TIME GOAL</Text>
                <Title level={4} style={{ margin: '4px 0', color: getProgressColor(progress.percentage) }}>
                  {getProgressEmoji(progress.percentage)} {getMotivationalMessage(progress.percentage)}
                </Title>
                <Text>
                  <strong>{progress.responsesMeetingGoal}</strong> of <strong>{progress.totalResponses}</strong> responses met your <strong>{goal.targetFormatted}</strong> goal
                </Text>
              </div>
            </div>
          </Col>

          {/* Stats */}
          <Col xs={24} md={8}>
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 11 }}>Today</Text>}
                  value={today.percentage}
                  suffix="%"
                  valueStyle={{ 
                    fontSize: 20, 
                    color: getProgressColor(today.percentage),
                    fontWeight: 600
                  }}
                  prefix={today.goalAchieved ? <CheckCircleOutlined /> : <ThunderboltOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<Text type="secondary" style={{ fontSize: 11 }}>Best Time</Text>}
                  value={formatTime(progress.bestResponseTime)}
                  valueStyle={{ fontSize: 20, fontWeight: 600 }}
                  prefix={<StarOutlined style={{ color: '#faad14' }} />}
                />
              </Col>
            </Row>
            {today.goalAchieved && (
              <div style={{ 
                marginTop: 8, 
                padding: '4px 12px', 
                background: '#52c41a20', 
                borderRadius: 16,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <TrophyOutlined style={{ color: '#52c41a' }} />
                <Text style={{ color: '#15803d', fontWeight: 600, fontSize: 12 }}>
                  Daily goal achieved!
                </Text>
              </div>
            )}
          </Col>

          {/* Action */}
          <Col xs={24} md={6} style={{ textAlign: 'right' }}>
            <Space direction="vertical" align="end">
              <Tooltip title="Edit your response time goal">
                <Button 
                  icon={<EditOutlined />}
                  onClick={() => setShowGoalModal(true)}
                >
                  Edit Goal
                </Button>
              </Tooltip>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Current goal: {goal.targetFormatted}
              </Text>
            </Space>
          </Col>
        </Row>

        {/* Daily streak indicator */}
        {goalData.data.dailyProgress.length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <Text type="secondary" style={{ fontSize: 11, marginBottom: 8, display: 'block' }}>
              Last {goalData.data.dailyProgress.length} days:
            </Text>
            <Space size={4}>
              {goalData.data.dailyProgress.slice(-14).map((day, i) => (
                <Tooltip key={day.date} title={`${day.date}: ${day.percentage}%`}>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      background: day.percentage >= 90 
                        ? '#52c41a' 
                        : day.percentage >= 70 
                        ? '#faad14' 
                        : day.percentage >= 50
                        ? '#fa8c16'
                        : day.percentage > 0
                        ? '#ff4d4f'
                        : '#f0f0f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: day.percentage > 0 ? 'white' : '#bfbfbf',
                      cursor: 'pointer'
                    }}
                  >
                    {day.percentage >= 90 ? '✓' : day.percentage > 0 ? '' : '−'}
                  </div>
                </Tooltip>
              ))}
            </Space>
          </div>
        )}
      </Card>

      <GoalSettingModal
        visible={showGoalModal}
        onClose={() => setShowGoalModal(false)}
        currentGoal={goal.targetSeconds}
        progress={progress}
      />
    </>
  );
};

export default GoalProgressCard;
