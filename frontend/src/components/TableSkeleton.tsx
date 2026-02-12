import React from 'react';
import { Skeleton, Space } from 'antd';
import { useTheme } from '../contexts/ThemeContext';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  compact?: boolean;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 5, 
  columns = 4,
  showHeader = true,
  compact = false
}) => {
  const { isDarkMode } = useTheme();
  
  const rowPadding = compact ? '10px 16px' : '16px';
  const rowHeight = compact ? 14 : 16;

  // Generate varied column widths for more realistic appearance
  const columnWidths = [
    [150, 80, 100, 80],      // 4 columns
    [150, 70, 80, 70, 80],   // 5 columns  
    [120, 60, 70, 60, 70, 80], // 6 columns
  ];
  
  const widths = columns <= 4 
    ? columnWidths[0].slice(0, columns)
    : columns <= 5 
    ? columnWidths[1].slice(0, columns)
    : columnWidths[2].slice(0, columns);

  return (
    <div className="table-skeleton">
      {/* Table header */}
      {showHeader && (
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          padding: rowPadding,
          background: isDarkMode ? '#27272a' : '#fafafa',
          borderRadius: '8px 8px 0 0',
          borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
        }}>
          {widths.map((w, i) => (
            <div key={i} style={{ flex: i === 0 ? 2 : 1 }}>
              <Skeleton.Input 
                active 
                style={{ width: Math.min(w, 100), height: rowHeight - 2 }} 
              />
            </div>
          ))}
        </div>
      )}
      
      {/* Table rows */}
      {Array(rows).fill(0).map((_, rowIndex) => (
        <div 
          key={rowIndex}
          style={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 16, 
            padding: rowPadding,
            borderBottom: rowIndex < rows - 1 
              ? `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`
              : 'none',
            animation: 'fadeIn 0.3s ease-out',
            animationDelay: `${rowIndex * 0.05}s`,
            animationFillMode: 'both',
          }}
        >
          {/* First column - typically has avatar or name with subtext */}
          <div style={{ flex: 2 }}>
            {rowIndex % 2 === 0 ? (
              <Space>
                <Skeleton.Avatar active size={32} />
                <div>
                  <Skeleton.Input 
                    active 
                    style={{ 
                      width: 80 + Math.random() * 40, 
                      height: rowHeight, 
                      marginBottom: 4 
                    }} 
                  />
                  <Skeleton.Input 
                    active 
                    style={{ 
                      width: 60 + Math.random() * 20, 
                      height: 12 
                    }} 
                  />
                </div>
              </Space>
            ) : (
              <div>
                <Skeleton.Input 
                  active 
                  style={{ 
                    width: 100 + Math.random() * 50, 
                    height: rowHeight, 
                    marginBottom: 4 
                  }} 
                />
                <Skeleton.Input 
                  active 
                  style={{ 
                    width: 70 + Math.random() * 30, 
                    height: 12 
                  }} 
                />
              </div>
            )}
          </div>
          
          {/* Middle columns - tags, values, etc */}
          {widths.slice(1, -1).map((w, i) => (
            <div key={i} style={{ flex: 1 }}>
              {i % 2 === 0 ? (
                <Skeleton.Button 
                  active 
                  size="small" 
                  style={{ width: w - 10 + Math.random() * 20 }} 
                />
              ) : (
                <Skeleton.Input 
                  active 
                  style={{ 
                    width: w - 20 + Math.random() * 30, 
                    height: rowHeight 
                  }} 
                />
              )}
            </div>
          ))}
          
          {/* Last column - typically action button */}
          <div style={{ flex: 1, textAlign: 'right' }}>
            <Skeleton.Button active size="small" style={{ width: 70 }} />
          </div>
        </div>
      ))}

      <style>{`
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(4px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .table-skeleton .ant-skeleton-input,
        .table-skeleton .ant-skeleton-button,
        .table-skeleton .ant-skeleton-avatar {
          background: ${isDarkMode 
            ? 'linear-gradient(90deg, #27272a 25%, #3f3f46 37%, #27272a 63%)' 
            : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%)'} !important;
          background-size: 400% 100% !important;
          animation: skeleton-loading 1.4s ease infinite !important;
        }
        
        @keyframes skeleton-loading {
          0% { background-position: 100% 50%; }
          100% { background-position: 0 50%; }
        }
      `}</style>
    </div>
  );
};

export default TableSkeleton;
