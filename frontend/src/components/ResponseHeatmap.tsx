import React from 'react';
import { useQuery } from 'react-query';
import { Card, Spin, Empty, Typography, Space, Tag, Tooltip } from 'antd';
import { FireOutlined, ThunderboltOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const { Text } = Typography;

interface HeatmapData {
  heatmap: number[][];
  conversationCounts: number[][];
  insights: {
    slowest: { day: string; hour: string; avgResponseTime: number } | null;
    fastest: { day: string; hour: string; avgResponseTime: number } | null;
    busiest: { day: string; hour: string; conversationCount: number } | null;
  };
}

const formatTime = (seconds: number): string => {
  if (!seconds || seconds === 0) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
};

const getHeatColor = (seconds: number, isDark: boolean): string => {
  if (!seconds || seconds === 0) return isDark ? '#1f1f1f' : '#fafafa';
  if (seconds < 60) return '#52c41a';      // Green - excellent
  if (seconds < 300) return '#73d13d';     // Light green - good
  if (seconds < 900) return '#faad14';     // Yellow - average
  if (seconds < 1800) return '#ff7a45';    // Orange - poor
  return '#ff4d4f';                         // Red - critical
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface Props {
  days?: number;
}

const ResponseHeatmap: React.FC<Props> = ({ days = 30 }) => {
  const { isDarkMode } = useTheme();
  
  const { data, isLoading } = useQuery<{ data: HeatmapData }>(
    ['metrics-hourly', days],
    () => api.get(`/api/metrics/hourly?days=${days}`).then(res => res.data),
    { staleTime: 60000 }
  );

  if (isLoading) {
    return (
      <Card title="Response Time by Hour">
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin />
        </div>
      </Card>
    );
  }

  const heatmapData = data?.data;
  
  if (!heatmapData || !heatmapData.heatmap) {
    return (
      <Card title="Response Time by Hour">
        <Empty description="No data yet. Sync conversations to see patterns." />
      </Card>
    );
  }

  const { heatmap, conversationCounts, insights } = heatmapData;

  return (
    <Card 
      title={
        <Space>
          <ClockCircleOutlined />
          <span>Response Time by Hour</span>
        </Space>
      }
      extra={<Text type="secondary">{days} day period</Text>}
    >
      {/* Insights */}
      {(insights.slowest || insights.fastest || insights.busiest) && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {insights.fastest && (
            <Tag color="green" icon={<ThunderboltOutlined />}>
              Fastest: {insights.fastest.day} {insights.fastest.hour} ({formatTime(insights.fastest.avgResponseTime)})
            </Tag>
          )}
          {insights.slowest && (
            <Tag color="red" icon={<FireOutlined />}>
              Slowest: {insights.slowest.day} {insights.slowest.hour} ({formatTime(insights.slowest.avgResponseTime)})
            </Tag>
          )}
          {insights.busiest && (
            <Tag color="blue">
              Busiest: {insights.busiest.day} {insights.busiest.hour} ({insights.busiest.conversationCount} convos)
            </Tag>
          )}
        </div>
      )}

      {/* Heatmap Grid */}
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 600 }}>
          {/* Hour labels */}
          <div style={{ display: 'flex', marginLeft: 50, marginBottom: 4 }}>
            {HOURS.filter((_, i) => i % 3 === 0).map(hour => (
              <div 
                key={hour} 
                style={{ 
                  width: 60, // 3 cells wide
                  textAlign: 'left',
                  fontSize: 10,
                  color: isDarkMode ? '#8c8c8c' : '#595959'
                }}
              >
                {hour === 0 ? '12a' : hour === 12 ? '12p' : hour < 12 ? `${hour}a` : `${hour-12}p`}
              </div>
            ))}
          </div>
          
          {/* Rows */}
          {DAYS.map((day, dayIndex) => (
            <div key={day} style={{ display: 'flex', alignItems: 'center', marginBottom: 2 }}>
              <div style={{ 
                width: 45, 
                fontSize: 12, 
                fontWeight: 500,
                color: isDarkMode ? '#d9d9d9' : '#262626'
              }}>
                {day}
              </div>
              <div style={{ display: 'flex', gap: 1 }}>
                {HOURS.map(hour => {
                  const avgTime = heatmap[dayIndex]?.[hour] || 0;
                  const count = conversationCounts[dayIndex]?.[hour] || 0;
                  
                  return (
                    <Tooltip 
                      key={hour}
                      title={
                        count > 0 ? (
                          <div>
                            <div><strong>{day} {hour === 0 ? '12' : hour > 12 ? hour - 12 : hour}{hour < 12 ? 'AM' : 'PM'}</strong></div>
                            <div>Avg response: {formatTime(avgTime)}</div>
                            <div>Conversations: {count}</div>
                          </div>
                        ) : 'No data'
                      }
                    >
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          backgroundColor: getHeatColor(avgTime, isDarkMode),
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'transform 0.1s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      />
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          ))}
          
          {/* Legend */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8, 
            marginTop: 16,
            marginLeft: 50,
            fontSize: 11,
            color: isDarkMode ? '#8c8c8c' : '#595959'
          }}>
            <span>Faster</span>
            {['#52c41a', '#73d13d', '#faad14', '#ff7a45', '#ff4d4f'].map((color, i) => (
              <div 
                key={i}
                style={{ 
                  width: 16, 
                  height: 16, 
                  backgroundColor: color,
                  borderRadius: 2
                }} 
              />
            ))}
            <span>Slower</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ResponseHeatmap;
