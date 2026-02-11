import { parseWorkflowForReactFlow } from './workflow-parser';
import { detectLoops, detectTriggerConflicts, topologicalSort } from './loop-detector';

interface WorkflowIssue {
  type: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionId?: string;
  fix: string;
  nodes?: string[];
  penalty: number; // Raw penalty before multipliers
}

interface AnalysisResult {
  workflowId: string;
  workflowName: string;
  healthScore: number; // 0-100, higher = better
  grade: 'Excellent' | 'Good' | 'Needs Attention' | 'High Risk' | 'Critical';
  confidence: 'High' | 'Medium' | 'Low'; // NEW: confidence indicator
  issues: WorkflowIssue[];
  timestamp: Date;
  recommendations?: string[];
  performance?: {
    estimatedSteps: number;
    estimatedTime: string;
    complexity: 'low' | 'medium' | 'high' | 'very_high';
    bottlenecks: string[];
  };
  metadata?: {
    isActive: boolean;
    contactCount: number;
    severityMultiplier: number;
    analyzedNodes: number;
    totalNodes: number;
  };
}

// NEW: Enhanced penalty weights based on real-world impact
const ISSUE_PENALTIES = {
  // Critical issues (will definitely break)
  infinite_loop: 40,
  missing_required_field: 30,
  broken_webhook_url: 30,
  payment_no_retry: 35,
  
  // High severity issues
  trigger_conflict: 25,
  api_no_error_handling: 20,
  rate_limit_risk: 15,
  webhook_no_timeout: 15,
  
  // Medium severity issues
  contact_field_validation: 15,
  no_wait_after_api: 10,
  dead_branch: 10,
  duplicate_action: 8,
  excessive_wait_time: 12,
  high_complexity: 10,
  
  // Low severity issues
  missing_description: 3,
  deprecated_action: 5,
  unused_variable: 4
};

const SEVERITY_SCORES = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3
};

/**
 * Normalize GHL action types to internal format
 * GHL uses PascalCase (SendEmail, SendSMS) while we use lowercase (email, sms)
 */
function normalizeActionType(type: string): string {
  const mapping: Record<string, string> = {
    'SendEmail': 'email',
    'SendSMS': 'sms',
    'CustomWebhook': 'webhook',
    'ChargeCustomer': 'payment',
    'AddTag': 'tag',
    'RemoveTag': 'tag',
    'UpdateContact': 'update',
    'CreateTask': 'task',
    'CreateOpportunity': 'opportunity',
    'AssignToUser': 'assign',
    'Wait': 'delay',
    'IfElse': 'condition',
    'AddToCampaign': 'campaign',
    'SendNotification': 'notification',
    'FormSubmitted': 'form_trigger',
    'ContactCreated': 'contact_created',
    'ContactUpdated': 'contact_updated',
    'TagAdded': 'tag_added'
  };
  
  return mapping[type] || type.toLowerCase();
}

export function analyzeWorkflow(workflow: any): AnalysisResult {
  const issues: WorkflowIssue[] = [];
  
  // Parse workflow into React Flow format for graph analysis
  const structure = parseWorkflowForReactFlow(workflow);
  
  // Track analysis metadata
  const metadata = {
    isActive: workflow.status === 'active' || workflow.status === 'published',
    contactCount: workflow.contacts?.length || workflow.estimatedContacts || 0,
    severityMultiplier: 1.0,
    analyzedNodes: 0,
    totalNodes: structure.nodes.length
  };
  
  // Run all analysis checks
  issues.push(...checkCriticalIssues(workflow));
  issues.push(...checkGraphIssues(structure));
  issues.push(...checkHighPriorityIssues(workflow));
  issues.push(...checkMediumPriorityIssues(workflow, structure));
  issues.push(...checkLowPriorityIssues(workflow));
  
  // NEW: Enhanced detection signals
  issues.push(...checkApiErrorHandling(workflow));
  issues.push(...checkContactValidation(workflow));
  issues.push(...checkWebhookTimeouts(workflow));
  issues.push(...checkExcessiveWaitTimes(workflow));
  issues.push(...checkComplexity(structure));

  // Count how many nodes we successfully analyzed
  metadata.analyzedNodes = countAnalyzableNodes(structure.nodes);

  // NEW: Calculate severity multiplier
  metadata.severityMultiplier = calculateSeverityMultiplier(metadata);

  // Calculate health score with multipliers
  const healthScore = calculateHealthScore(issues, workflow, metadata);
  const grade = getGrade(healthScore);
  
  // NEW: Calculate confidence based on how much we could analyze
  const confidence = calculateConfidence(metadata, structure);

  // Calculate performance metrics
  const performance = calculatePerformance(structure, workflow);

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    healthScore,
    grade,
    confidence,
    issues,
    timestamp: new Date(),
    recommendations: generateRecommendations(issues, metadata),
    performance,
    metadata
  };
}

function checkCriticalIssues(workflow: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];

  // Check for missing required fields
  workflow.actions?.forEach((action: any) => {
    const normalizedType = normalizeActionType(action.type);
    
    if (normalizedType === 'email' && !action.config?.recipient) {
      issues.push({
        type: 'critical',
        title: 'Email action missing recipient',
        description: 'Email action will fail without a recipient',
        actionId: action.id,
        fix: 'Add a recipient email address or merge field',
        penalty: ISSUE_PENALTIES.missing_required_field
      });
    }

    if (normalizedType === 'webhook' && !action.config?.url) {
      issues.push({
        type: 'critical',
        title: 'Webhook missing URL',
        description: 'Webhook has no destination URL configured',
        actionId: action.id,
        fix: 'Add a valid webhook URL',
        penalty: ISSUE_PENALTIES.missing_required_field
      });
    }

    if (normalizedType === 'sms' && !action.config?.phoneNumber && !action.config?.recipient && !action.config?.phoneField) {
      issues.push({
        type: 'critical',
        title: 'SMS action missing phone number',
        description: 'SMS cannot be sent without a phone number',
        actionId: action.id,
        fix: 'Add a phone number or select a contact field',
        penalty: ISSUE_PENALTIES.missing_required_field
      });
    }
  });

  // Check for broken webhook URLs (both in webhooks array and webhook actions)
  workflow.webhooks?.forEach((webhook: any) => {
    if (webhook.url?.includes('localhost') || webhook.url?.includes('127.0.0.1')) {
      issues.push({
        type: 'critical',
        title: 'Webhook points to localhost',
        description: 'Webhook URL is not accessible from external services',
        actionId: webhook.id,
        fix: 'Replace localhost with a public URL',
        penalty: ISSUE_PENALTIES.broken_webhook_url
      });
    }
  });

  // Also check webhook actions for localhost
  workflow.actions?.forEach((action: any) => {
    const normalizedType = normalizeActionType(action.type);
    if (normalizedType === 'webhook' && action.config?.url) {
      if (action.config.url.includes('localhost') || action.config.url.includes('127.0.0.1')) {
        issues.push({
          type: 'critical',
          title: 'Webhook points to localhost',
          description: 'Webhook URL is not accessible from external services',
          actionId: action.id,
          fix: 'Replace localhost with a public URL',
          penalty: ISSUE_PENALTIES.broken_webhook_url
        });
      }
    }
  });

  // Check for payment-related issues
  workflow.actions?.forEach((action: any) => {
    const normalizedType = normalizeActionType(action.type);
    if (normalizedType === 'payment' && !action.config?.retryLogic && !action.config?.retryCount) {
      issues.push({
        type: 'critical',
        title: 'Payment action without retry logic',
        description: 'Payment failures could result in lost revenue',
        actionId: action.id,
        fix: 'Add retry logic for failed payment attempts',
        penalty: ISSUE_PENALTIES.payment_no_retry
      });
    }
  });

  return issues;
}

function checkGraphIssues(structure: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];

  // Detect loops/cycles
  const loops = detectLoops(structure.edges);
  loops.forEach(loop => {
    const isInfinite = !loop.hasExitCondition;
    issues.push({
      type: isInfinite ? 'critical' : 'high',
      title: isInfinite ? 'Infinite loop detected' : 'Loop detected with exit condition',
      description: loop.description,
      nodes: loop.nodes,
      fix: isInfinite 
        ? 'Add a clear exit condition or maximum iteration limit' 
        : 'Verify exit condition is reliable',
      penalty: isInfinite ? ISSUE_PENALTIES.infinite_loop : 15
    });
  });

  // Detect trigger conflicts
  const conflicts = detectTriggerConflicts(structure.nodes);
  conflicts.forEach(conflict => {
    issues.push({
      type: conflict.severity,
      title: 'Trigger conflict detected',
      description: conflict.description,
      nodes: conflict.triggers,
      fix: 'Add conditions to prevent simultaneous trigger execution or merge triggers',
      penalty: ISSUE_PENALTIES.trigger_conflict
    });
  });

  // Check for dead branches (unreachable nodes)
  const deadBranches = detectDeadBranches(structure);
  deadBranches.forEach(nodeId => {
    issues.push({
      type: 'medium',
      title: 'Dead branch detected',
      description: 'This node is unreachable and will never execute',
      actionId: nodeId,
      fix: 'Connect this node to the workflow or remove it',
      penalty: ISSUE_PENALTIES.dead_branch
    });
  });

  // Check if graph is valid DAG
  const sortedNodes = topologicalSort(structure.edges);
  if (sortedNodes === null && loops.length === 0) {
    // Cycle exists but wasn't caught by loop detection
    issues.push({
      type: 'critical',
      title: 'Workflow contains unreachable cycle',
      description: 'Graph structure is invalid - contains cycle that prevents proper execution order',
      fix: 'Restructure workflow to remove circular dependencies',
      penalty: ISSUE_PENALTIES.infinite_loop
    });
  }

  return issues;
}

function checkHighPriorityIssues(workflow: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];

  // Check for rate limit risks
  const bulkActions = workflow.actions?.filter((a: any) => 
    a.type === 'bulk_sms' || a.type === 'bulk_email'
  );
  
  bulkActions?.forEach((action: any) => {
    if (!action.config?.throttling) {
      issues.push({
        type: 'high',
        title: 'Bulk operation without throttling',
        description: 'Could hit rate limits and fail',
        actionId: action.id,
        fix: 'Add throttling or batch processing',
        penalty: ISSUE_PENALTIES.rate_limit_risk
      });
    }
  });

  return issues;
}

// NEW: Check for API calls without error handling
function checkApiErrorHandling(workflow: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    const normalizedType = normalizeActionType(action.type);
    const isExternalCall = ['webhook', 'api', 'http_request', 'integration'].includes(normalizedType);
    
    if (isExternalCall) {
      // Check if this action has error handling configured
      const hasErrorHandling = action.config?.errorHandling || 
                               action.config?.onError || 
                               action.fallbackActionId;
      
      if (!hasErrorHandling) {
        issues.push({
          type: 'high',
          title: 'API call without error handling',
          description: `${action.type} action lacks error handling - failures will break the workflow`,
          actionId: action.id,
          fix: 'Add error handling branch or fallback action',
          penalty: ISSUE_PENALTIES.api_no_error_handling
        });
      }
    }
  });
  
  return issues;
}

// NEW: Check for email/SMS without contact field validation
function checkContactValidation(workflow: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    const normalizedType = normalizeActionType(action.type);
    
    if (normalizedType === 'email') {
      const usesContactField = action.config?.recipient?.includes('{{contact.');
      const hasValidation = action.config?.validateEmail || action.conditions?.some((c: any) => 
        c.field?.includes('email') && c.operator === 'is_not_empty'
      );
      
      if (usesContactField && !hasValidation) {
        issues.push({
          type: 'medium',
          title: 'Email sent without contact field validation',
          description: 'Could send to invalid/empty email addresses',
          actionId: action.id,
          fix: 'Add condition to check email field is not empty and valid',
          penalty: ISSUE_PENALTIES.contact_field_validation
        });
      }
    }
    
    if (normalizedType === 'sms') {
      const usesContactField = action.config?.phoneNumber?.includes('{{contact.') || 
                               action.config?.recipient?.includes('{{contact.') ||
                               action.config?.phoneField;
      const hasValidation = action.config?.validatePhone || action.conditions?.some((c: any) => 
        c.field?.includes('phone') && c.operator === 'is_not_empty'
      );
      
      if (usesContactField && !hasValidation) {
        issues.push({
          type: 'medium',
          title: 'SMS sent without phone validation',
          description: 'Could send to invalid/empty phone numbers',
          actionId: action.id,
          fix: 'Add condition to check phone field is not empty and valid',
          penalty: ISSUE_PENALTIES.contact_field_validation
        });
      }
    }
  });
  
  return issues;
}

// NEW: Check for webhook calls without timeout handling
function checkWebhookTimeouts(workflow: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    if (action.type === 'webhook' || action.type === 'http_request') {
      const hasTimeout = action.config?.timeout !== undefined;
      
      if (!hasTimeout) {
        issues.push({
          type: 'high',
          title: 'Webhook without timeout configured',
          description: 'Webhook could hang indefinitely if external service is slow',
          actionId: action.id,
          fix: 'Set a reasonable timeout (e.g., 30 seconds)',
          penalty: ISSUE_PENALTIES.webhook_no_timeout
        });
      }
    }
  });
  
  return issues;
}

// NEW: Check for excessive wait times (>7 days)
function checkExcessiveWaitTimes(workflow: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    if (action.type === 'delay' || action.type === 'wait') {
      const delaySeconds = parseDelayTime(action.config?.delay || action.config?.duration);
      const sevenDays = 7 * 24 * 60 * 60;
      
      if (delaySeconds > sevenDays) {
        issues.push({
          type: 'medium',
          title: 'Excessive wait time detected',
          description: `Wait time of ${formatTime(delaySeconds)} may cause workflow to expire`,
          actionId: action.id,
          fix: 'Consider splitting into multiple workflows or reducing wait time',
          penalty: ISSUE_PENALTIES.excessive_wait_time
        });
      }
    }
  });
  
  return issues;
}

// NEW: Check for complexity (too many branches)
function checkComplexity(structure: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  const nodeCount = structure.nodes.length;
  const edgeCount = structure.edges.length;
  const branches = edgeCount - nodeCount + 2; // Cyclomatic complexity approximation
  
  if (branches > 20) {
    issues.push({
      type: 'medium',
      title: 'High complexity - too many branches',
      description: `Workflow has ${branches} branches, making it difficult to maintain and debug`,
      fix: 'Consider breaking into smaller sub-workflows',
      penalty: ISSUE_PENALTIES.high_complexity
    });
  }
  
  return issues;
}

function checkMediumPriorityIssues(workflow: any, structure: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];

  // Check for no wait/delay after API calls
  workflow.actions?.forEach((action: any, index: number) => {
    const isApiCall = ['webhook', 'api', 'http_request'].includes(action.type);
    
    if (isApiCall && index < workflow.actions.length - 1) {
      const nextAction = workflow.actions[index + 1];
      const hasDelay = nextAction.type === 'delay' || nextAction.type === 'wait';
      
      if (!hasDelay && nextAction.type !== 'condition') {
        issues.push({
          type: 'medium',
          title: 'No wait after API call',
          description: 'API calls should have a small delay before next action to prevent race conditions',
          actionId: action.id,
          fix: 'Add a 1-2 second delay after API call',
          penalty: ISSUE_PENALTIES.no_wait_after_api
        });
      }
    }
  });

  // Check for inefficient action ordering
  const emailBeforeMerge = checkEmailBeforeMergeFields(workflow);
  if (emailBeforeMerge) {
    issues.push({
      type: 'medium',
      title: 'Inefficient action ordering',
      description: 'Email sent before all merge fields are populated',
      fix: 'Move data population actions before email send',
      penalty: 8
    });
  }

  // Check for duplicate actions
  const duplicates = findDuplicateActions(workflow);
  duplicates.forEach(dup => {
    issues.push({
      type: 'medium',
      title: 'Duplicate action detected',
      description: `Action "${dup.name}" appears to be duplicated`,
      actionId: dup.id,
      fix: 'Consolidate duplicate actions',
      penalty: ISSUE_PENALTIES.duplicate_action
    });
  });

  // Check for unused variables
  const unusedVars = findUnusedVariables(workflow);
  unusedVars.forEach(varName => {
    issues.push({
      type: 'medium',
      title: 'Unused variable',
      description: `Variable "${varName}" is defined but never used`,
      fix: 'Remove unused variable or use it in workflow',
      penalty: ISSUE_PENALTIES.unused_variable
    });
  });

  return issues;
}

function checkLowPriorityIssues(workflow: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];

  // Check for missing descriptions
  workflow.actions?.forEach((action: any) => {
    if (!action.description || action.description.trim() === '') {
      issues.push({
        type: 'low',
        title: 'Action missing description',
        description: 'Action lacks documentation',
        actionId: action.id,
        fix: 'Add a descriptive comment for clarity',
        penalty: ISSUE_PENALTIES.missing_description
      });
    }
  });

  // Check for deprecated actions
  workflow.actions?.forEach((action: any) => {
    if (action.deprecated) {
      issues.push({
        type: 'low',
        title: 'Using deprecated action',
        description: `Action type "${action.type}" is deprecated`,
        actionId: action.id,
        fix: 'Update to the recommended replacement',
        penalty: ISSUE_PENALTIES.deprecated_action
      });
    }
  });

  return issues;
}

// NEW: Calculate severity multiplier based on workflow context
function calculateSeverityMultiplier(metadata: any): number {
  let multiplier = 1.0;
  
  // High-contact workflows: issues are 1.5x more impactful
  if (metadata.contactCount >= 1000) {
    multiplier *= 1.5;
  }
  
  // Active workflows: stricter scoring (1.3x)
  if (metadata.isActive) {
    multiplier *= 1.3;
  }
  
  return multiplier;
}

// NEW: Calculate confidence based on analysis coverage
function calculateConfidence(metadata: any, structure: any): 'High' | 'Medium' | 'Low' {
  const coverageRatio = metadata.analyzedNodes / metadata.totalNodes;
  
  // High confidence: we analyzed 80%+ of the workflow
  if (coverageRatio >= 0.8 && metadata.totalNodes >= 5) {
    return 'High';
  }
  
  // Medium confidence: we analyzed 50-80% or workflow is very small
  if (coverageRatio >= 0.5 || metadata.totalNodes < 5) {
    return 'Medium';
  }
  
  // Low confidence: we analyzed <50%
  return 'Low';
}

// NEW: Count how many nodes we could successfully analyze
function countAnalyzableNodes(nodes: any[]): number {
  let count = 0;
  
  nodes.forEach(node => {
    // We can analyze nodes with recognizable types and data
    if (node.data && node.data.nodeType && node.id) {
      count++;
    }
  });
  
  return count;
}

function calculateHealthScore(issues: WorkflowIssue[], workflow: any, metadata: any): number {
  let penalties = 0;

  // Apply NEW penalty system with multipliers
  issues.forEach(issue => {
    const basePenalty = issue.penalty || SEVERITY_SCORES[issue.type] || 0;
    const adjustedPenalty = basePenalty * metadata.severityMultiplier;
    penalties += adjustedPenalty;
  });

  // Additional complexity penalties
  if (workflow.actions?.length > 50) penalties += 10 * metadata.severityMultiplier;
  if (workflow.branches > 10) penalties += 5 * metadata.severityMultiplier;
  if (workflow.externalDependencies > 5) penalties += 10 * metadata.severityMultiplier;

  // Health Score: Start at 100, subtract penalties
  const healthScore = Math.max(0, 100 - penalties);
  
  return Math.round(healthScore);
}

function getGrade(healthScore: number): 'Excellent' | 'Good' | 'Needs Attention' | 'High Risk' | 'Critical' {
  // Higher score = better health
  if (healthScore >= 90) return 'Excellent';    // 90-100: green
  if (healthScore >= 70) return 'Good';         // 70-89: blue
  if (healthScore >= 50) return 'Needs Attention'; // 50-69: yellow
  if (healthScore >= 30) return 'High Risk';    // 30-49: orange
  return 'Critical';                            // 0-29: red
}

function generateRecommendations(issues: WorkflowIssue[], metadata: any): string[] {
  const recommendations: string[] = [];
  
  const criticalCount = issues.filter(i => i.type === 'critical').length;
  if (criticalCount > 0) {
    recommendations.push(`Fix ${criticalCount} critical issues immediately to prevent workflow failures`);
  }

  const highCount = issues.filter(i => i.type === 'high').length;
  if (highCount > 0) {
    recommendations.push(`Address ${highCount} high-priority issues to improve reliability`);
  }

  if (issues.some(i => i.title.includes('error handling'))) {
    recommendations.push('Implement comprehensive error handling for all external calls');
  }

  if (issues.some(i => i.title.includes('rate limit'))) {
    recommendations.push('Add throttling to prevent rate limit issues');
  }
  
  if (issues.some(i => i.title.includes('contact field validation'))) {
    recommendations.push('Validate contact fields before sending emails/SMS to avoid failures');
  }
  
  if (issues.some(i => i.title.includes('timeout'))) {
    recommendations.push('Configure timeouts for all webhook calls to prevent hanging');
  }
  
  // Context-specific recommendations
  if (metadata.isActive && issues.length > 3) {
    recommendations.push('⚠️ This workflow is ACTIVE - prioritize fixes to avoid production issues');
  }
  
  if (metadata.contactCount >= 1000 && issues.length > 0) {
    recommendations.push(`📊 High-volume workflow (${metadata.contactCount.toLocaleString()} contacts) - issues have amplified impact`);
  }

  return recommendations;
}

function calculatePerformance(structure: any, workflow: any): {
  estimatedSteps: number;
  estimatedTime: string;
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  bottlenecks: string[];
} {
  const nodeCount = structure.nodes.length;
  const edgeCount = structure.edges.length;
  
  // Estimate steps (nodes)
  const estimatedSteps = nodeCount;
  
  // Estimate time based on node types
  let totalTimeSeconds = 0;
  const bottlenecks: string[] = [];
  
  structure.nodes.forEach((node: any) => {
    const nodeType = node.data.nodeType;
    const config = node.data.config;
    
    // Time estimates by action type
    switch (nodeType) {
      case 'delay':
      case 'wait':
        const delayTime = parseDelayTime(config.delay || config.duration);
        totalTimeSeconds += delayTime;
        if (delayTime > 60) {
          bottlenecks.push(`${node.data.label} (${formatTime(delayTime)})`);
        }
        break;
      
      case 'api':
      case 'webhook':
      case 'webhook_call':
      case 'http_request':
        totalTimeSeconds += 2; // Average API call time
        bottlenecks.push(`${node.data.label} (API call)`);
        break;
      
      case 'bulk_email':
      case 'bulk_sms':
        totalTimeSeconds += 5; // Bulk operations take longer
        bottlenecks.push(`${node.data.label} (bulk operation)`);
        break;
      
      case 'email':
      case 'sms':
        totalTimeSeconds += 0.5;
        break;
      
      default:
        totalTimeSeconds += 0.1;
    }
  });
  
  // Determine complexity
  let complexity: 'low' | 'medium' | 'high' | 'very_high';
  const branches = edgeCount - nodeCount + 2; // Cyclomatic complexity approximation
  
  if (nodeCount < 10 && branches < 3) {
    complexity = 'low';
  } else if (nodeCount < 25 && branches < 8) {
    complexity = 'medium';
  } else if (nodeCount < 50 && branches < 15) {
    complexity = 'high';
  } else {
    complexity = 'very_high';
  }
  
  return {
    estimatedSteps,
    estimatedTime: formatTime(totalTimeSeconds),
    complexity,
    bottlenecks: bottlenecks.slice(0, 5) // Top 5 bottlenecks
  };
}

function detectDeadBranches(structure: any): string[] {
  const deadNodes: string[] = [];
  const reachableNodes = new Set<string>();
  
  // Find all trigger nodes (starting points)
  const triggerNodes = structure.nodes.filter((n: any) => n.type === 'trigger');
  
  if (triggerNodes.length === 0) {
    return deadNodes; // No triggers = can't determine reachability
  }
  
  // BFS from each trigger to find reachable nodes
  triggerNodes.forEach((trigger: any) => {
    const queue = [trigger.id];
    const visited = new Set<string>();
    
    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      
      visited.add(nodeId);
      reachableNodes.add(nodeId);
      
      // Find outgoing edges
      const outgoingEdges = structure.edges.filter((e: any) => e.source === nodeId);
      outgoingEdges.forEach((edge: any) => {
        queue.push(edge.target);
      });
    }
  });
  
  // Find nodes that are not reachable
  structure.nodes.forEach((node: any) => {
    if (!reachableNodes.has(node.id) && node.type !== 'trigger') {
      deadNodes.push(node.id);
    }
  });
  
  return deadNodes;
}

function parseDelayTime(delay: string | number): number {
  if (typeof delay === 'number') return delay;
  if (!delay) return 0;
  
  // Parse strings like "2h", "30m", "1d"
  const match = delay.match(/(\d+)(s|m|h|d)/);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return 0;
  }
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

// Helper functions

function checkEmailBeforeMergeFields(workflow: any): boolean {
  // Simplified check
  return false;
}

function findDuplicateActions(workflow: any): any[] {
  // Simplified duplicate detection
  return [];
}

function findUnusedVariables(workflow: any): string[] {
  // Simplified variable check
  return [];
}
