import React from 'react';
import { Card, Typography, Space } from 'antd';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

interface TrendDataPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  healthScore?: number;
}

interface IssueTrendsChartProps {
  data: TrendDataPoint[];
  type?: 'line' | 'bar' | 'area';
  title?: string;
  height?: number;
}

/**
 * Issue Trends Chart - Visualize workflow health over time
 * Shows how issues and health scores trend
 */
const IssueTrendsChart: React.FC<IssueTrendsChartProps> = ({
  data,
  type = 'area',
  title = 'Issue Trends',
  height = 300,
}) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card size="small" style={{ minWidth: '200px' }}>
          <Space direction="vertical" size="small">
            <Text strong>{label}</Text>
            {payload.map((entry: any, index: number) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <Text style={{ color: entry.color }}>
                  {entry.name}:
                </Text>
                <Text strong style={{ color: entry.color }}>
                  {entry.value}
                </Text>
              </div>
            ))}
          </Space>
        </Card>
      );
    }
    return null;
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    const xAxisProps = {
      dataKey: 'date',
      style: { fontSize: '12px' },
    };

    const yAxisProps = {
      style: { fontSize: '12px' },
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="critical"
              stroke="#ff4d4f"
              strokeWidth={3}
              dot={{ fill: '#ff4d4f', r: 4 }}
              activeDot={{ r: 6 }}
              name="Critical"
            />
            <Line
              type="monotone"
              dataKey="high"
              stroke="#fa8c16"
              strokeWidth={3}
              dot={{ fill: '#fa8c16', r: 4 }}
              name="High"
            />
            <Line
              type="monotone"
              dataKey="medium"
              stroke="#faad14"
              strokeWidth={3}
              dot={{ fill: '#faad14', r: 4 }}
              name="Medium"
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke="#1890ff"
              strokeWidth={3}
              dot={{ fill: '#1890ff', r: 4 }}
              name="Low"
            />
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="critical" fill="#ff4d4f" name="Critical" radius={[8, 8, 0, 0]} />
            <Bar dataKey="high" fill="#fa8c16" name="High" radius={[8, 8, 0, 0]} />
            <Bar dataKey="medium" fill="#faad14" name="Medium" radius={[8, 8, 0, 0]} />
            <Bar dataKey="low" fill="#1890ff" name="Low" radius={[8, 8, 0, 0]} />
          </BarChart>
        );

      case 'area':
      default:
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ff4d4f" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fa8c16" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#fa8c16" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="mediumGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#faad14" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#faad14" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="lowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1890ff" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#1890ff" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="critical"
              stroke="#ff4d4f"
              strokeWidth={2}
              fill="url(#criticalGradient)"
              name="Critical"
            />
            <Area
              type="monotone"
              dataKey="high"
              stroke="#fa8c16"
              strokeWidth={2}
              fill="url(#highGradient)"
              name="High"
            />
            <Area
              type="monotone"
              dataKey="medium"
              stroke="#faad14"
              strokeWidth={2}
              fill="url(#mediumGradient)"
              name="Medium"
            />
            <Area
              type="monotone"
              dataKey="low"
              stroke="#1890ff"
              strokeWidth={2}
              fill="url(#lowGradient)"
              name="Low"
            />
          </AreaChart>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          <ResponsiveContainer width="100%" height={height}>
            {renderChart()}
          </ResponsiveContainer>
        </Space>
      </Card>
    </motion.div>
  );
};

export default IssueTrendsChart;

/**
 * Generate mock trend data for demo purposes
 */
export const generateMockTrendData = (days: number = 7): TrendDataPoint[] => {
  const data: TrendDataPoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      critical: Math.floor(Math.random() * 3),
      high: Math.floor(Math.random() * 5) + 2,
      medium: Math.floor(Math.random() * 8) + 3,
      low: Math.floor(Math.random() * 10) + 5,
      healthScore: Math.floor(Math.random() * 30) + 60,
    });
  }

  return data;
};
