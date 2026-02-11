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
    
    const styles = {
      high: {
        borderColor: '#dc2626',
        boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.3)',
      },
      medium: {
        borderColor: '#f59e0b',
        boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.3)',
      },
      low: {
        borderColor: '#3b82f6',
        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)',
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
            background: conflictDetails.severity === 'high' ? '#dc2626' : 
                       conflictDetails.severity === 'medium' ? '#f59e0b' : '#3b82f6',
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
