import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import './NodeStyles.css';

interface ActionNodeData {
  label: string;
  actionType: string;
  icon: string;
  hasIssue?: boolean;
  issueDetails?: {
    type: string;
    description: string;
    pointsDeducted: number;
    severity: 'high' | 'medium' | 'low';
  };
}

const ActionNode: React.FC<NodeProps<ActionNodeData>> = ({ data }) => {
  const { label, icon, hasIssue, issueDetails } = data;

  const getSeverityStyle = (severity?: 'high' | 'medium' | 'low') => {
    if (!severity) return {};
    
    // Using Ant Design standard colors
    const styles = {
      high: {
        borderColor: '#ff4d4f',
        boxShadow: '0 0 0 2px rgba(255, 77, 79, 0.3)',
        background: 'rgba(255, 77, 79, 0.05)',
      },
      medium: {
        borderColor: '#faad14',
        boxShadow: '0 0 0 2px rgba(250, 173, 20, 0.3)',
        background: 'rgba(250, 173, 20, 0.05)',
      },
      low: {
        borderColor: '#1890ff',
        boxShadow: '0 0 0 2px rgba(24, 144, 255, 0.3)',
        background: 'rgba(24, 144, 255, 0.05)',
      },
    };
    
    return styles[severity];
  };

  const tooltipText = issueDetails 
    ? `⚠️ ${issueDetails.description}\n-${issueDetails.pointsDeducted} points (${issueDetails.severity} severity)`
    : 'Performance issue detected';

  return (
    <div 
      className={`custom-node action-node ${hasIssue ? 'has-issue' : ''}`}
      style={hasIssue && issueDetails ? getSeverityStyle(issueDetails.severity) : {}}
      title={hasIssue ? tooltipText : undefined}
    >
      {hasIssue && issueDetails && (
        <div 
          className="issue-indicator" 
          style={{
            background: issueDetails.severity === 'high' ? '#ff4d4f' : 
                       issueDetails.severity === 'medium' ? '#faad14' : '#1890ff',
          }}
        >
          -{issueDetails.pointsDeducted}
        </div>
      )}
      <Handle type="target" position={Position.Top} className="handle" />
      <div className="node-icon">{icon}</div>
      <div className="node-content">
        <div className="node-type-label">ACTION</div>
        <div className="node-label">{label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="handle" />
    </div>
  );
};

export default ActionNode;
