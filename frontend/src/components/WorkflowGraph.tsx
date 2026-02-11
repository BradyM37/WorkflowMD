import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './WorkflowGraph.css';

// Custom node types for GHL workflow steps
import TriggerNode from './nodes/TriggerNode';
import ActionNode from './nodes/ActionNode';
import ConditionNode from './nodes/ConditionNode';
import DelayNode from './nodes/DelayNode';

// Type definitions for node data
type BaseNodeData = {
  label: string;
  icon: string;
  [key: string]: any; // Allow flexible properties
};

// Mock data structure matching expected GHL workflow format
const mockWorkflowData = {
  id: 'workflow_123',
  name: 'Lead Nurture Sequence',
  nodes: [
    {
      id: '1',
      type: 'trigger',
      position: { x: 250, y: 50 },
      data: {
        label: 'Contact Created',
        triggerType: 'contact_created',
        icon: '👤',
        status: 'active',
      },
    },
    {
      id: '2',
      type: 'delay',
      position: { x: 250, y: 150 },
      data: {
        label: 'Wait 1 Hour',
        duration: '1h',
        icon: '⏱️',
      },
    },
    {
      id: '3',
      type: 'action',
      position: { x: 250, y: 250 },
      data: {
        label: 'Send Welcome Email',
        actionType: 'send_email',
        icon: '📧',
        hasIssue: true,
        issueDetails: {
          type: 'missing_error_handling',
          description: 'No error handling for email send',
          pointsDeducted: 20,
          severity: 'high' as const,
        },
      },
    },
    {
      id: '4',
      type: 'delay',
      position: { x: 250, y: 350 },
      data: {
        label: 'Wait 2 Days',
        duration: '2d',
        icon: '⏱️',
      },
    },
    {
      id: '5',
      type: 'condition',
      position: { x: 250, y: 450 },
      data: {
        label: 'Email Opened?',
        conditionType: 'email_opened',
        icon: '🔀',
      },
    },
    {
      id: '6',
      type: 'action',
      position: { x: 100, y: 580 },
      data: {
        label: 'Send Follow-up',
        actionType: 'send_email',
        icon: '📧',
        hasIssue: false,
      },
    },
    {
      id: '7',
      type: 'action',
      position: { x: 400, y: 580 },
      data: {
        label: 'Tag as Cold Lead',
        actionType: 'add_tag',
        icon: '🏷️',
        hasIssue: false,
      },
    },
    {
      id: '8',
      type: 'trigger',
      position: { x: 100, y: 680 },
      data: {
        label: 'Link Clicked',
        triggerType: 'link_clicked',
        icon: '🔗',
        status: 'warning',
        hasConflict: true,
        conflictDetails: {
          description: 'May fire simultaneously with Contact Created',
          pointsDeducted: 15,
          severity: 'medium' as const,
          conflictingTriggers: ['Contact Created'],
        },
      },
    },
    {
      id: '9',
      type: 'action',
      position: { x: 100, y: 780 },
      data: {
        label: 'Create Task',
        actionType: 'create_task',
        icon: '✅',
        hasIssue: true,
        issueDetails: {
          type: 'slow_action',
          description: 'High execution time (avg 2.3s)',
          pointsDeducted: 10,
          severity: 'medium' as const,
        },
      },
    },
    {
      id: '10',
      type: 'condition',
      position: { x: 100, y: 880 },
      data: {
        label: 'Has Phone Number?',
        conditionType: 'field_check',
        icon: '🔀',
      },
    },
    {
      id: '11',
      type: 'action',
      position: { x: -50, y: 1010 },
      data: {
        label: 'Send SMS',
        actionType: 'send_sms',
        icon: '💬',
        hasIssue: false,
      },
    },
    {
      id: '12',
      type: 'action',
      position: { x: 250, y: 1010 },
      data: {
        label: 'Send Email Instead',
        actionType: 'send_email',
        icon: '📧',
        hasIssue: false,
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: '1', target: '2', animated: true },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e3-4', source: '3', target: '4' },
    { id: 'e4-5', source: '4', target: '5' },
    {
      id: 'e5-6',
      source: '5',
      target: '6',
      label: 'Yes',
      type: 'smoothstep',
      style: { stroke: '#10b981' },
    },
    {
      id: 'e5-7',
      source: '5',
      target: '7',
      label: 'No',
      type: 'smoothstep',
      style: { stroke: '#ef4444' },
    },
    { id: 'e6-8', source: '6', target: '8', animated: true },
    { id: 'e8-9', source: '8', target: '9' },
    { id: 'e9-10', source: '9', target: '10' },
    {
      id: 'e10-11',
      source: '10',
      target: '11',
      label: 'Yes',
      type: 'smoothstep',
      style: { stroke: '#10b981' },
    },
    {
      id: 'e10-12',
      source: '10',
      target: '12',
      label: 'No',
      type: 'smoothstep',
      style: { stroke: '#ef4444' },
    },
    // Simulated loop - this would be detected by analysis
    {
      id: 'e12-4',
      source: '12',
      target: '4',
      label: 'Loop',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#f59e0b', strokeDasharray: '5,5' },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#f59e0b',
      },
    },
  ],
};

interface WorkflowGraphProps {
  workflowId?: string;
  data?: {
    id: string;
    name: string;
    nodes: Node<BaseNodeData>[];
    edges: Edge[];
  } | null;
  onNodeClick?: (node: Node) => void;
  onEdgeClick?: (edge: Edge) => void;
  highlightIssues?: boolean;
}

const WorkflowGraph: React.FC<WorkflowGraphProps> = ({
  data = mockWorkflowData,
  onNodeClick,
  onEdgeClick,
  highlightIssues = true,
}) => {
  // Use mock data if no real data provided
  const workflowData = data || mockWorkflowData;

  const [nodes, , onNodesChange] = useNodesState<BaseNodeData>(workflowData.nodes as Node<BaseNodeData>[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflowData.edges);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (onNodeClick) {
        onNodeClick(node);
      }
    },
    [onNodeClick]
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      if (onEdgeClick) {
        onEdgeClick(edge);
      }
    },
    [onEdgeClick]
  );

  // Define custom node types
  const nodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      action: ActionNode,
      condition: ConditionNode,
      delay: DelayNode,
    }),
    []
  );

  return (
    <div className="workflow-graph-container">
      <div className="workflow-header">
        <h2>{workflowData.name}</h2>
        {highlightIssues && (
          <div className="workflow-stats">
            <span className="stat-badge warning">⚠️ 1 Loop Detected</span>
            <span className="stat-badge error">🐌 1 Performance Issue</span>
            <span className="stat-badge conflict">⚡ 1 Trigger Conflict</span>
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        minZoom={0.2}
        maxZoom={1.5}
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.data.hasIssue) return '#ef4444';
            if (node.data.hasConflict) return '#f59e0b';
            switch (node.type) {
              case 'trigger':
                return '#3b82f6';
              case 'action':
                return '#10b981';
              case 'condition':
                return '#8b5cf6';
              case 'delay':
                return '#f97316';
              default:
                return '#6b7280';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          style={{ background: '#f9fafb' }}
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default WorkflowGraph;
