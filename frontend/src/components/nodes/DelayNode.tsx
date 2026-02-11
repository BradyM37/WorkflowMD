import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import './NodeStyles.css';

interface DelayNodeData {
  label: string;
  duration: string;
  icon: string;
}

const DelayNode: React.FC<NodeProps<DelayNodeData>> = ({ data }) => {
  const { label, icon, duration } = data;

  return (
    <div className="custom-node delay-node">
      <Handle type="target" position={Position.Top} className="handle" />
      <div className="node-icon">{icon}</div>
      <div className="node-content">
        <div className="node-type-label">DELAY</div>
        <div className="node-label">{label}</div>
        <div className="node-meta">{duration}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="handle" />
    </div>
  );
};

export default DelayNode;
