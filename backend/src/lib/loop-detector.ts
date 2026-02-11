/**
 * Loop Detection Algorithm
 * Uses DFS with recursion stack to detect cycles in workflow DAG
 */

import { ReactFlowEdge, buildAdjacencyList } from './workflow-parser';

export interface Loop {
  nodes: string[];
  description: string;
  hasExitCondition: boolean;
}

/**
 * Detect all loops/cycles in the workflow graph
 * Uses Depth-First Search with recursion stack
 */
export function detectLoops(edges: ReactFlowEdge[]): Loop[] {
  const graph = buildAdjacencyList(edges);
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const loops: Loop[] = [];
  const currentPath: string[] = [];

  // Get all unique nodes from edges
  const allNodes = new Set<string>();
  edges.forEach(edge => {
    allNodes.add(edge.source);
    allNodes.add(edge.target);
  });

  // Run DFS from each unvisited node
  for (const node of allNodes) {
    if (!visited.has(node)) {
      dfsDetectCycle(node, graph, visited, recursionStack, currentPath, loops, edges);
    }
  }

  return loops;
}

/**
 * DFS helper function to detect cycles
 */
function dfsDetectCycle(
  node: string,
  graph: Map<string, string[]>,
  visited: Set<string>,
  recursionStack: Set<string>,
  currentPath: string[],
  loops: Loop[],
  edges: ReactFlowEdge[]
): void {
  visited.add(node);
  recursionStack.add(node);
  currentPath.push(node);

  const neighbors = graph.get(node) || [];

  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      // Continue DFS
      dfsDetectCycle(neighbor, graph, visited, recursionStack, currentPath, loops, edges);
    } else if (recursionStack.has(neighbor)) {
      // Cycle detected!
      const cycleStartIndex = currentPath.indexOf(neighbor);
      const loopNodes = currentPath.slice(cycleStartIndex);
      loopNodes.push(neighbor); // Close the loop

      const hasExitCondition = checkForExitCondition(loopNodes, edges);

      loops.push({
        nodes: loopNodes,
        description: `Loop detected: ${loopNodes.join(' → ')}`,
        hasExitCondition
      });
    }
  }

  // Backtrack
  recursionStack.delete(node);
  currentPath.pop();
}

/**
 * Check if a loop has an exit condition (e.g., a branch that leads outside)
 */
function checkForExitCondition(loopNodes: string[], edges: ReactFlowEdge[]): boolean {
  const loopNodeSet = new Set(loopNodes);
  
  for (const node of loopNodes) {
    const outgoingEdges = edges.filter(e => e.source === node);
    
    // Check if any edge leads outside the loop
    const hasExit = outgoingEdges.some(edge => !loopNodeSet.has(edge.target));
    
    if (hasExit) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect trigger conflicts - multiple triggers that could fire simultaneously
 */
export interface TriggerConflict {
  triggers: string[];
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export function detectTriggerConflicts(nodes: any[]): TriggerConflict[] {
  const conflicts: TriggerConflict[] = [];
  const triggers = nodes.filter(n => n.type === 'trigger');

  if (triggers.length <= 1) {
    return conflicts;
  }

  // Check for overlapping trigger conditions
  for (let i = 0; i < triggers.length; i++) {
    for (let j = i + 1; j < triggers.length; j++) {
      const trigger1 = triggers[i];
      const trigger2 = triggers[j];

      if (canTriggersConflict(trigger1, trigger2)) {
        conflicts.push({
          triggers: [trigger1.id, trigger2.id],
          description: `Triggers "${trigger1.data.label}" and "${trigger2.data.label}" may fire simultaneously`,
          severity: 'high'
        });
      }
    }
  }

  return conflicts;
}

/**
 * Check if two triggers can fire for the same contact/event
 */
function canTriggersConflict(trigger1: any, trigger2: any): boolean {
  const type1 = trigger1.data.nodeType;
  const type2 = trigger2.data.nodeType;

  // Same trigger type = likely conflict
  if (type1 === type2) {
    return true;
  }

  // Known conflicting pairs
  const conflictPairs = [
    ['contact_tag_added', 'contact_updated'],
    ['form_submit', 'webhook'],
    ['contact_created', 'contact_tag_added']
  ];

  return conflictPairs.some(pair => 
    (pair.includes(type1) && pair.includes(type2))
  );
}

/**
 * Perform topological sort to verify DAG structure
 * Returns null if cycle detected, otherwise returns sorted order
 */
export function topologicalSort(edges: ReactFlowEdge[]): string[] | null {
  const graph = buildAdjacencyList(edges);
  const inDegree = new Map<string, number>();
  const allNodes = new Set<string>();

  // Initialize in-degrees
  edges.forEach(edge => {
    allNodes.add(edge.source);
    allNodes.add(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    if (!inDegree.has(edge.source)) {
      inDegree.set(edge.source, 0);
    }
  });

  // Find all nodes with in-degree 0
  const queue: string[] = [];
  for (const node of allNodes) {
    if ((inDegree.get(node) || 0) === 0) {
      queue.push(node);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      const degree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, degree);

      if (degree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If sorted doesn't include all nodes, there's a cycle
  if (sorted.length !== allNodes.size) {
    return null;
  }

  return sorted;
}
