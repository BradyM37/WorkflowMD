/**
 * Workflow Parser - Transform GHL workflow format to React Flow format
 */

interface GHLWorkflowNode {
  id: string;
  type: string;
  name?: string;
  config?: any;
  next?: string | string[]; // Single next or multiple (for conditions)
  branches?: { condition: string; next: string }[];
}

interface GHLWorkflow {
  id: string;
  name: string;
  status: string;
  nodes?: GHLWorkflowNode[];
  actions?: any[]; // Legacy format
  triggers?: any[];
  connections?: { from: string; to: string; branch?: string }[];
}

export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string;
    config: any;
  };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: any;
}

export interface WorkflowStructure {
  workflow: {
    id: string;
    name: string;
    status: string;
  };
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

/**
 * Parse GHL workflow into React Flow format
 */
export function parseWorkflowForReactFlow(ghlWorkflow: GHLWorkflow): WorkflowStructure {
  const nodes: ReactFlowNode[] = [];
  const edges: ReactFlowEdge[] = [];
  
  // Handle modern format (nodes + connections)
  if (ghlWorkflow.nodes && ghlWorkflow.connections) {
    return parseModernFormat(ghlWorkflow);
  }
  
  // Handle legacy format (actions array)
  if (ghlWorkflow.actions) {
    return parseLegacyFormat(ghlWorkflow);
  }

  // Fallback: empty structure
  return {
    workflow: {
      id: ghlWorkflow.id,
      name: ghlWorkflow.name,
      status: ghlWorkflow.status
    },
    nodes: [],
    edges: []
  };
}

/**
 * Parse modern GHL workflow format (nodes + connections)
 */
function parseModernFormat(ghlWorkflow: GHLWorkflow): WorkflowStructure {
  const nodes: ReactFlowNode[] = [];
  const edges: ReactFlowEdge[] = [];

  // Convert nodes
  ghlWorkflow.nodes?.forEach((node, index) => {
    nodes.push({
      id: node.id,
      type: mapNodeType(node.type),
      position: autoLayoutPosition(index, ghlWorkflow.nodes?.length || 0),
      data: {
        label: node.name || `${node.type} ${index + 1}`,
        nodeType: node.type,
        config: node.config || {}
      }
    });
  });

  // Convert connections
  ghlWorkflow.connections?.forEach((conn, index) => {
    edges.push({
      id: `edge_${conn.from}_${conn.to}_${index}`,
      source: conn.from,
      target: conn.to,
      label: conn.branch,
      animated: false
    });
  });

  return {
    workflow: {
      id: ghlWorkflow.id,
      name: ghlWorkflow.name,
      status: ghlWorkflow.status
    },
    nodes,
    edges
  };
}

/**
 * Parse legacy GHL workflow format (actions array)
 */
function parseLegacyFormat(ghlWorkflow: GHLWorkflow): WorkflowStructure {
  const nodes: ReactFlowNode[] = [];
  const edges: ReactFlowEdge[] = [];

  // Add trigger nodes
  ghlWorkflow.triggers?.forEach((trigger, index) => {
    nodes.push({
      id: trigger.id || `trigger_${index}`,
      type: 'trigger',
      position: { x: 100, y: 50 + index * 100 },
      data: {
        label: trigger.name || `Trigger ${index + 1}`,
        nodeType: trigger.type || 'unknown',
        config: trigger.config || {}
      }
    });
  });

  // Add action nodes
  const actions = ghlWorkflow.actions || [];
  actions.forEach((action, index) => {
    const nodeId = action.id || `action_${index}`;
    
    nodes.push({
      id: nodeId,
      type: mapNodeType(action.type),
      position: autoLayoutPosition(index + (ghlWorkflow.triggers?.length || 0), 
                                     actions.length + (ghlWorkflow.triggers?.length || 0)),
      data: {
        label: action.name || `${action.type} ${index + 1}`,
        nodeType: action.type,
        config: action.config || {}
      }
    });

    // Create edges for sequential flow
    if (index > 0 || ghlWorkflow.triggers?.length) {
      const prevNodeId = index === 0 && ghlWorkflow.triggers?.length
        ? ghlWorkflow.triggers[0].id || 'trigger_0'
        : actions[index - 1].id || `action_${index - 1}`;
      
      edges.push({
        id: `edge_${prevNodeId}_${nodeId}`,
        source: prevNodeId,
        target: nodeId,
        animated: false
      });
    }
  });

  return {
    workflow: {
      id: ghlWorkflow.id,
      name: ghlWorkflow.name,
      status: ghlWorkflow.status
    },
    nodes,
    edges
  };
}

/**
 * Map GHL node types to React Flow node types
 */
function mapNodeType(ghlType: string): string {
  const typeMapping: Record<string, string> = {
    'trigger': 'trigger',
    'contact_tag_added': 'trigger',
    'form_submit': 'trigger',
    'webhook': 'trigger',
    
    'email': 'action',
    'send_email': 'action',
    'sms': 'action',
    'send_sms': 'action',
    'api': 'action',
    'webhook_call': 'action',
    'bulk_email': 'action',
    'bulk_sms': 'action',
    'payment': 'action',
    'add_tag': 'action',
    'remove_tag': 'action',
    
    'condition': 'condition',
    'if': 'condition',
    'branch': 'condition',
    
    'delay': 'delay',
    'wait': 'delay'
  };

  return typeMapping[ghlType.toLowerCase()] || 'action';
}

/**
 * Auto-layout nodes in a vertical flow
 */
function autoLayoutPosition(index: number, total: number): { x: number; y: number } {
  const VERTICAL_SPACING = 150;
  const HORIZONTAL_OFFSET = 250;
  
  return {
    x: HORIZONTAL_OFFSET,
    y: 100 + index * VERTICAL_SPACING
  };
}

/**
 * Build adjacency list for graph analysis
 */
export function buildAdjacencyList(edges: ReactFlowEdge[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  
  edges.forEach(edge => {
    if (!graph.has(edge.source)) {
      graph.set(edge.source, []);
    }
    graph.get(edge.source)!.push(edge.target);
  });
  
  return graph;
}

/**
 * Get all nodes that are part of the workflow (for validation)
 */
export function getAllNodeIds(nodes: ReactFlowNode[]): Set<string> {
  return new Set(nodes.map(n => n.id));
}
