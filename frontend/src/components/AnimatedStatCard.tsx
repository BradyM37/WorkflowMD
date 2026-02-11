import React, { useEffect, useState, useRef } from 'react';
import { Card, Typography, Tag, Progress, Tooltip, theme } from 'antd';
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  TrophyOutlined
} from '@ant-design/icons';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';

const { Text } = Typography;

interface AnimatedStatCardProps {
  type: 'responseTime' | 'responseRate' | 'missedLeads' | 'fastestResponse';
  value: number;
  grade?: string;
  suffix?: string;
  totalConversations?: number;
  respondedConversations?: number;
  onPerfectScore?: () => void;
}

// Animated counter hook
const useCountUp = (end: number, duration: number = 1000, decimals: number = 0) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = countRef.current;
    const endValue = end;
    
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing function (ease out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;
      
      countRef.current = currentValue;
      setCount(parseFloat(currentValue.toFixed(decimals)));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    startTimeRef.current = null;
    requestAnimationFrame(animate);
    
    return () => {
      startTimeRef.current = null;
    };
  }, [end, duration, decimals]);
  
  return count;
};

// Format time helper
const formatTime = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${Math.round(seconds / 86400)}d`;
};

const getGradeColor = (grade: string): string => {
  const colors: Record<string, string> = {
    'Excellent': '#52c41a',
    'Good': '#73d13d',
    'Average': '#faad14',
    'Poor': '#ff7a45',
    'Critical': '#ff4d4f'
  };
  return colors[grade] || '#8c8c8c';
};

const getGradeEmoji = (grade: string): string => {
  const emojis: Record<string, string> = {
    'Excellent': '🚀',
    'Good': '✅',
    'Average': '⚡',
    'Poor': '⚠️',
    'Critical': '🔥'
  };
  return emojis[grade] || '📊';
};

const AnimatedStatCard: React.FC<AnimatedStatCardProps> = ({
  type,
  value,
  grade = 'Average',
  suffix = '',
  totalConversations = 0,
  respondedConversations = 0,
  onPerfectScore
}) => {
  const { token } = theme.useToken();
  const controls = useAnimation();
  const [hasTriggeredPerfect, setHasTriggeredPerfect] = useState(false);
  
  // Animated values based on type
  const animatedValue = useCountUp(value, 1200, type === 'responseRate' ? 1 : 0);
  const animatedResponded = useCountUp(respondedConversations, 1200, 0);
  const animatedTotal = useCountUp(totalConversations, 1200, 0);
  
  // Check for 100% response rate
  useEffect(() => {
    if (type === 'responseRate' && value === 100 && !hasTriggeredPerfect && onPerfectScore) {
      setHasTriggeredPerfect(true);
      onPerfectScore();
    }
  }, [type, value, hasTriggeredPerfect, onPerfectScore]);
  
  // Pulse animation for missed leads > 0
  useEffect(() => {
    if (type === 'missedLeads' && value > 0) {
      controls.start({
        scale: [1, 1.02, 1],
        boxShadow: [
          '0 0 0 0 rgba(255, 77, 79, 0)',
          '0 0 0 8px rgba(255, 77, 79, 0.3)',
          '0 0 0 0 rgba(255, 77, 79, 0)'
        ],
        transition: {
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }
      });
    } else {
      controls.stop();
      controls.set({ scale: 1, boxShadow: '0 0 0 0 rgba(255, 77, 79, 0)' });
    }
  }, [type, value, controls]);

  // Response Time Card
  if (type === 'responseTime') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="stat-card hero-stat" hoverable>
          <div className="stat-content">
            <div className="stat-icon">
              <ClockCircleOutlined />
            </div>
            <div className="stat-details">
              <Text className="stat-label">Avg Response Time</Text>
              <motion.div 
                className="stat-value"
                style={{ color: getGradeColor(grade) }}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              >
                {formatTime(animatedValue)}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Tag 
                  color={getGradeColor(grade)} 
                  style={{ marginTop: 4, fontWeight: 600 }}
                >
                  {getGradeEmoji(grade)} {grade}
                </Tag>
              </motion.div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }
  
  // Response Rate Card
  if (type === 'responseRate') {
    const isPerfect = value === 100;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card className="stat-card" hoverable>
          <div style={{ position: 'relative' }}>
            <Text style={{ color: token.colorTextSecondary, display: 'block', marginBottom: 8 }}>
              Response Rate
            </Text>
            <motion.div
              style={{ 
                fontSize: 28, 
                fontWeight: 700,
                color: value >= 90 ? '#52c41a' : value >= 70 ? '#faad14' : '#ff4d4f',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
            >
              <CheckCircleOutlined style={{ color: value >= 90 ? '#52c41a' : '#faad14' }} />
              <span>{animatedValue.toFixed(1)}{suffix}</span>
              {isPerfect && (
                <motion.span
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 10, delay: 0.8 }}
                >
                  🎉
                </motion.span>
              )}
            </motion.div>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Progress 
                percent={animatedValue} 
                showInfo={false} 
                strokeColor={value >= 90 ? '#52c41a' : value >= 70 ? '#faad14' : '#ff4d4f'}
                size="small"
              />
            </motion.div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {animatedResponded} of {animatedTotal} conversations
            </Text>
          </div>
        </Card>
      </motion.div>
    );
  }
  
  // Missed Leads Card with Pulse Animation
  if (type === 'missedLeads') {
    const hasMissed = value > 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <motion.div animate={controls}>
          <Card 
            className={`stat-card ${hasMissed ? 'warning-card' : 'success-card'}`} 
            hoverable
            style={{
              transition: 'all 0.3s ease'
            }}
          >
            <Text style={{ color: token.colorTextSecondary, display: 'block', marginBottom: 8 }}>
              Missed Leads
            </Text>
            <motion.div
              style={{ 
                fontSize: 28, 
                fontWeight: 700,
                color: hasMissed ? '#ff4d4f' : '#52c41a',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              initial={{ scale: 0.5 }}
              animate={hasMissed ? {
                scale: [1, 1.1, 1],
                transition: { 
                  duration: 0.5, 
                  delay: 0.3,
                  repeat: hasMissed ? 3 : 0
                }
              } : { scale: 1 }}
            >
              {hasMissed ? <WarningOutlined /> : <CheckCircleOutlined />}
              <span>{animatedValue}</span>
            </motion.div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {hasMissed 
                ? '⚠️ No response after 1 hour' 
                : '✅ All leads contacted!'}
            </Text>
          </Card>
        </motion.div>
      </motion.div>
    );
  }
  
  // Fastest Response Card
  if (type === 'fastestResponse') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Card className="stat-card" hoverable>
          <Text style={{ color: token.colorTextSecondary, display: 'block', marginBottom: 8 }}>
            Fastest Response
          </Text>
          <motion.div
            style={{ 
              fontSize: 28, 
              fontWeight: 700,
              color: '#52c41a',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.4 }}
          >
            <motion.span
              animate={{ 
                rotate: [0, 15, -15, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 0.5,
                delay: 0.8,
                ease: 'easeInOut'
              }}
            >
              <TrophyOutlined style={{ color: '#faad14' }} />
            </motion.span>
            <span>{formatTime(animatedValue)}</span>
          </motion.div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Your best time this period 🏆
          </Text>
        </Card>
      </motion.div>
    );
  }
  
  return null;
};

export default AnimatedStatCard;
