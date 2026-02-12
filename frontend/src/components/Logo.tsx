import React from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', showTagline = false, style }) => {
  const sizeMap = {
    small: { height: 32, fontSize: 12 },
    medium: { height: 40, fontSize: 14 },
    large: { height: 80, fontSize: 18 }
  };

  const { height, fontSize } = sizeMap[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
      <img 
        src="/logo-full.jpg" 
        alt="FirstResponse" 
        style={{ 
          height, 
          width: 'auto',
          objectFit: 'contain',
          borderRadius: size === 'large' ? 8 : 4
        }} 
      />
      {showTagline && (
        <Text style={{ 
          fontSize, 
          color: 'rgba(255,255,255,0.8)', 
          marginTop: 8,
          textAlign: 'center'
        }}>
          Be the First, Win the Lead
        </Text>
      )}
    </div>
  );
};

export default Logo;
