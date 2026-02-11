import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import './NodeStyles.css';

interface ConditionNodeData {
  label: string;
  conditionType: string;
  icon: string;
}

const ConditionNode: React.FC<NodeProps<ConditionNodeData>> = ({ data }) => {
  const { label, icon } = data;

  return (
    <div className="custom-node condition-node">
      <Handle type="target" position={Position.Top} className="handle" />
      <div className="node-icon">{icon}</div>
      <div className="node-content">
        <div className="node-type-label">CONDITION</div>
        <div className="node-label">{label}</div>
      </div>
      <Handle type="source" position={Position.Bottom} id="yes" className="handle handle-yes" />
      <Handle type="source" position={Position.Bottom} id="no" className="handle handle-no" style={{ left: 'auto', right: 10 }} />
    </div>
  );
};

export default ConditionNode;
