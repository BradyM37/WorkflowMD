import React from 'react';
import { Typography } from 'antd';
import { ThunderboltFilled } from '@ant-design/icons';

const { Text } = Typography;

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  variant?: 'light' | 'dark'; // light = for dark backgrounds, dark = for light backgrounds
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  showTagline = false, 
  variant = 'dark',
  style 
}) => {
  const sizeMap = {
    small: { icon: 20, text: 18, tagline: 11, gap: 6 },
    medium: { icon: 26, text: 22, tagline: 13, gap: 8 },
    large: { icon: 40, text: 36, tagline: 16, gap: 12 }
  };

  const { icon, text, tagline, gap } = sizeMap[size];
  
  // Brand colors
  const primaryTeal = '#00CED1';
  const gradientTeal = 'linear-gradient(135deg, #00CED1 0%, #20B2AA 50%, #4169E1 100%)';
  
  const textColor = variant === 'light' ? '#ffffff' : '#1a1a2e';
  const taglineColor = variant === 'light' ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap }}>
        {/* Icon with gradient background */}
        <div style={{
          width: icon + 12,
          height: icon + 12,
          borderRadius: 8,
          background: gradientTeal,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0, 206, 209, 0.3)'
        }}>
          <ThunderboltFilled style={{ 
            fontSize: icon, 
            color: '#ffffff'
          }} />
        </div>
        {/* Text logo */}
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{
            fontSize: text,
            fontWeight: 700,
            color: textColor,
            letterSpacing: '-0.5px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}>
            First<span style={{ color: primaryTeal }}>Response</span>
          </span>
        </div>
      </div>
      {showTagline && (
        <Text style={{ 
          fontSize: tagline, 
          color: taglineColor, 
          marginTop: 8,
          fontWeight: 500,
          letterSpacing: '0.5px'
        }}>
          Be the First, Win the Lead
        </Text>
      )}
    </div>
  );
};

export default Logo;
