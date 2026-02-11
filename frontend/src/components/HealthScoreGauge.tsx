import React from 'react';
import { motion } from 'framer-motion';
import { Card, Typography, Space } from 'antd';
import {
  RadialBarChart, 
  RadialBar, 
  ResponsiveContainer 
} from 'recharts';

const { Text, Title } = Typography;

interface HealthScoreGaugeProps {
  score: number;
  title?: string;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  animated?: boolean;
}

/**
 * Health Score Gauge - Beautiful radial chart
 * Displays workflow health score with color-coded visualization
 */
const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({
  score,
  title = 'Health Score',
  size = 'medium',
  showLabel = true,
  animated = true,
}) => {
  const getHealthColor = (value: number) => {
    if (value >= 90) return '#52c41a'; // Excellent - Green
    if (value >= 70) return '#1890ff'; // Good - Blue
    if (value >= 50) return '#faad14'; // Needs Attention - Yellow
    if (value >= 30) return '#fa8c16'; // High Risk - Orange
    return '#ff4d4f'; // Critical - Red
  };

  const getHealthLabel = (value: number) => {
    if (value >= 90) return 'Excellent';
    if (value >= 70) return 'Good';
    if (value >= 50) return 'Needs Attention';
    if (value >= 30) return 'High Risk';
    return 'Critical';
  };

  const chartData = [
    {
      name: 'Health Score',
      value: score,
      fill: getHealthColor(score),
    },
  ];

  const sizeMap = {
    small: { width: 150, height: 150, fontSize: '24px' },
    medium: { width: 200, height: 200, fontSize: '32px' },
    large: { width: 280, height: 280, fontSize: '48px' },
  };

  // Make gauge responsive on mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const dimensions = isMobile 
    ? { ...sizeMap[size], width: Math.min(sizeMap[size].width, 200), height: Math.min(sizeMap[size].height, 200), fontSize: '32px' }
    : sizeMap[size];

  return (
    <Card
      style={{
        textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
        border: '1px solid rgba(102, 126, 234, 0.1)',
      }}
    >
      <motion.div
        initial={animated ? { scale: 0.8, opacity: 0 } : {}}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {showLabel && (
            <Text strong style={{ fontSize: '16px' }}>
              {title}
            </Text>
          )}

          <div style={{ position: 'relative', margin: '0 auto', width: dimensions.width }}>
            <ResponsiveContainer width="100%" height={dimensions.height}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="100%"
                barSize={20}
                data={chartData}
                startAngle={180}
                endAngle={0}
              >
                <RadialBar
                  background={{ fill: '#f0f0f0' }}
                  dataKey="value"
                  cornerRadius={10}
                  animationDuration={animated ? 1000 : 0}
                />
              </RadialBarChart>
            </ResponsiveContainer>

            {/* Center Score Display */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
              }}
            >
              <motion.div
                initial={animated ? { scale: 0 } : {}}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3, type: 'spring' }}
              >
                <Title
                  level={2}
                  style={{
                    margin: 0,
                    fontSize: dimensions.fontSize,
                    fontWeight: 700,
                    color: getHealthColor(score),
                    lineHeight: 1,
                  }}
                >
                  {score}
                </Title>
                <Text
                  style={{
                    fontSize: size === 'large' ? '16px' : '12px',
                    color: '#8c8c8c',
                    display: 'block',
                    marginTop: '4px',
                  }}
                >
                  / 100
                </Text>
              </motion.div>
            </div>
          </div>

          <div
            style={{
              padding: '8px 16px',
              background: getHealthColor(score),
              borderRadius: '20px',
              display: 'inline-block',
            }}
          >
            <Text strong style={{ color: 'white', fontSize: '14px' }}>
              {getHealthLabel(score)}
            </Text>
          </div>
        </Space>
      </motion.div>
    </Card>
  );
};

export default HealthScoreGauge;
