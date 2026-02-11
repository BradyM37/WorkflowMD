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
    
    const styles = {
      high: {
        borderColor: '#dc2626',
        boxShadow: '0 0 0 2px rgba(220, 38, 38, 0.3)',
        background: 'rgba(220, 38, 38, 0.05)',
      },
      medium: {
        borderColor: '#f59e0b',
        boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.3)',
        background: 'rgba(245, 158, 11, 0.05)',
      },
      low: {
        borderColor: '#3b82f6',
        boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)',
        background: 'rgba(59, 130, 246, 0.05)',
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
            background: issueDetails.severity === 'high' ? '#dc2626' : 
                       issueDetails.severity === 'medium' ? '#f59e0b' : '#3b82f6',
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
