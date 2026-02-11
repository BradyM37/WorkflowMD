import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import './NodeStyles.css';

interface TriggerNodeData {
  label: string;
  triggerType: string;
  icon: string;
  status?: 'active' | 'warning' | 'error';
  hasConflict?: boolean;
  conflictDetails?: {
    description: string;
    pointsDeducted: number;
    severity: 'high' | 'medium' | 'low';
    conflictingTriggers: string[];
  };
}

const TriggerNode: React.FC<NodeProps<TriggerNodeData>> = ({ data }) => {
  const { label, icon, status = 'active', hasConflict, conflictDetails } = data;

  const getSeverityStyle = (severity?: 'high' | 'medium' | 'low') => {
    if (!severity) return {};
    
    // Using Ant Design standard colors
    const styles = {
      high: {
        borderColor: '#ff4d4f',
        boxShadow: '0 0 0 2px rgba(255, 77, 79, 0.3)',
      },
      medium: {
        borderColor: '#faad14',
        boxShadow: '0 0 0 2px rgba(250, 173, 20, 0.3)',
      },
      low: {
        borderColor: '#1890ff',
        boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.3)',
      },
    };
    
    return styles[severity];
  };

  const tooltipText = conflictDetails 
    ? `⚡ ${conflictDetails.description}\n-${conflictDetails.pointsDeducted} points\nConflicts with: ${conflictDetails.conflictingTriggers.join(', ')}`
    : 'Trigger conflict detected';

  return (
    <div 
      className={`custom-node trigger-node ${status} ${hasConflict ? 'has-conflict' : ''}`}
      style={hasConflict && conflictDetails ? getSeverityStyle(conflictDetails.severity) : {}}
      title={hasConflict ? tooltipText : undefined}
    >
      {hasConflict && conflictDetails && (
        <div 
          className="conflict-indicator"
          style={{
            background: conflictDetails.severity === 'high' ? '#ff4d4f' : 
                       conflictDetails.severity === 'medium' ? '#faad14' : '#1890ff',
          }}
        >
          -{conflictDetails.pointsDeducted}
        </div>
      )}
      <div className="node-icon">{icon}</div>
      <div className="node-content">
        <div className="node-type-label">TRIGGER</div>
        <div className="node-label">{label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="handle" />
    </div>
  );
};

export default TriggerNode;
