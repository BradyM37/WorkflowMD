import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Badge, Tooltip, Modal, Spin, Space, Typography } from 'antd';
import { TrophyOutlined, RiseOutlined, FallOutlined, MinusOutlined } from '@ant-design/icons';
import api from '../services/api';
import BenchmarkCard from './BenchmarkCard';
import { useTheme } from '../contexts/ThemeContext';

const { Text } = Typography;

interface BenchmarkSummary {
  percentile: number;
  tier: string;
  tierEmoji: string;
  tierName: string;
  tierColor: string;
  aheadOfPercent: number;
  trend: 'improving' | 'declining' | 'stable';
}

interface BenchmarkBadgeProps {
  size?: 'small' | 'default';
  showTrend?: boolean;
  onClick?: () => void;
}

const BenchmarkBadge: React.FC<BenchmarkBadgeProps> = ({ 
  size = 'default',
  showTrend = true,
  onClick 
}) => {
  const { isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Fetch lightweight summary data
  const { data: summary, isLoading, error } = useQuery<BenchmarkSummary>(
    'benchmark-summary',
    () => api.get('/api/benchmarks/summary').then(res => res.data.data || res.data),
    {
      staleTime: 120000, // 2 minutes - longer cache for badge
      refetchOnWindowFocus: false,
      retry: 1
    }
  );

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setModalVisible(true);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{ 
        padding: size === 'small' ? '4px 8px' : '6px 12px',
        background: isDarkMode ? '#262626' : '#f5f5f5',
        borderRadius: '8px',
        display: 'inline-flex',
        alignItems: 'center'
      }}>
        <Spin size="small" />
      </div>
    );
  }

  // Error or no data state
  if (error || !summary) {
    return null; // Don't show badge if no data
  }

  // Background colors by tier
  const tierBgColors: Record<string, string> = {
    bronze: 'linear-gradient(135deg, #CD7F32 0%, #8B5A2B 100%)',
    silver: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)',
    gold: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    platinum: 'linear-gradient(135deg, #E5E4E2 0%, #B0C4DE 50%, #87CEEB 100%)'
  };

  // Text colors by tier (for contrast)
  const tierTextColors: Record<string, string> = {
    bronze: 'white',
    silver: '#1a1a2e',
    gold: '#1a1a2e',
    platinum: '#1a1a2e'
  };

  // Trend icons
  const trendIcons: Record<string, React.ReactNode> = {
    improving: <RiseOutlined style={{ color: '#52c41a', fontSize: '10px' }} />,
    declining: <FallOutlined style={{ color: '#ff4d4f', fontSize: '10px' }} />,
    stable: <MinusOutlined style={{ color: '#faad14', fontSize: '10px' }} />
  };

  const badgeStyle: React.CSSProperties = {
    background: tierBgColors[summary.tier] || tierBgColors.bronze,
    padding: size === 'small' ? '4px 10px' : '6px 14px',
    borderRadius: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: 'none'
  };

  const tooltipContent = (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        {summary.tierEmoji} {summary.tierName} Tier
      </div>
      <div>Top {100 - summary.percentile}% of your industry</div>
      <div style={{ fontSize: '11px', marginTop: '4px', color: '#d9d9d9' }}>
        Click to see full benchmark details
      </div>
    </div>
  );

  return (
    <>
      <Tooltip title={tooltipContent} placement="bottom">
        <button
          onClick={handleClick}
          style={{
            ...badgeStyle,
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          }}
        >
          <span style={{ fontSize: size === 'small' ? '14px' : '18px' }}>
            {summary.tierEmoji}
          </span>
          
          <Text strong style={{ 
            color: tierTextColors[summary.tier] || 'white',
            fontSize: size === 'small' ? '12px' : '13px'
          }}>
            {summary.tierName}
          </Text>

          {showTrend && (
            <span style={{ 
              display: 'flex', 
              alignItems: 'center',
              marginLeft: '2px'
            }}>
              {trendIcons[summary.trend]}
            </span>
          )}
        </button>
      </Tooltip>

      {/* Full Benchmark Modal */}
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
        style={{ top: 20 }}
      >
        <BenchmarkCard 
          expanded={true} 
          onClose={() => setModalVisible(false)} 
        />
      </Modal>
    </>
  );
};

// Compact version for inline use
export const BenchmarkBadgeCompact: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { data: summary, isLoading } = useQuery<BenchmarkSummary>(
    'benchmark-summary',
    () => api.get('/api/benchmarks/summary').then(res => res.data.data || res.data),
    {
      staleTime: 120000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  );

  if (isLoading || !summary) return null;

  return (
    <Tooltip title={`${summary.tierName} Tier - Top ${100 - summary.percentile}%`}>
      <span 
        onClick={onClick}
        style={{ 
          cursor: 'pointer',
          fontSize: '20px',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
        }}
      >
        {summary.tierEmoji}
      </span>
    </Tooltip>
  );
};

export default BenchmarkBadge;
