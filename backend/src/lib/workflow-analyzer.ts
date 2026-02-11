/**
 * WORKFLOW ANALYZER - PRODUCTION ANALYSIS ENGINE
 * 
 * Comprehensive workflow analysis with graph-based detection algorithms
 * Implements all critical, high, medium, and low severity checks
 */

import { parseWorkflowForReactFlow, ReactFlowNode, ReactFlowEdge, buildAdjacencyList } from './workflow-parser';
import { detectLoops, detectTriggerConflicts, topologicalSort } from './loop-detector';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface WorkflowIssue {
  type: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionId?: string;
  nodes?: string[];
  fix: string;
  category: string;
}

export interface AnalysisResult {
  workflowId: string;
  workflowName: string;
  healthScore: number; // 0-100
  grade: 'Excellent' | 'Good' | 'Needs Attention' | 'High Risk' | 'Critical';
  confidence: 'High' | 'Medium' | 'Low';
  issues: WorkflowIssue[];
  issuesSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  recommendations: string[];
  performance: {
    estimatedSteps: number;
    estimatedTime: string;
    complexity: 'low' | 'medium' | 'high' | 'very_high';
    bottlenecks: string[];
  };
  metadata: {
    isActive: boolean;
    analyzedNodes: number;
    totalNodes: number;
    hasLoops: boolean;
    hasTriggerConflicts: boolean;
  };
  timestamp: Date;
}

interface GHLWorkflow {
  id: string;
  name: string;
  status: string;
  nodes?: any[];
  actions?: any[];
  triggers?: any[];
  webhooks?: any[];
  connections?: any[];
}

// ============================================================================
// SCORING CONSTANTS - EXACT SPEC FROM REQUIREMENTS
// ============================================================================

const SEVERITY_PENALTIES = {
  critical: 25,
  high: 15,
  medium: 5,
  low: 2
};

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export function analyzeWorkflow(workflow: GHLWorkflow): AnalysisResult {
  const issues: WorkflowIssue[] = [];
  
  // Parse workflow into graph structure
  const structure = parseWorkflowForReactFlow(workflow);
  
  // Metadata tracking
  const metadata = {
    isActive: workflow.status === 'active' || workflow.status === 'published',
    analyzedNodes: structure.nodes.length,
    totalNodes: structure.nodes.length,
    hasLoops: false,
    hasTriggerConflicts: false
  };
  
  // RUN ALL DETECTION RULES
  // ========================
  
  // CRITICAL ISSUES (25 pts each)
  issues.push(...detectInfiniteLoops(structure, metadata));
  issues.push(...detectInvalidWebhookUrls(workflow));
  issues.push(...detectMissingPaymentRetry(workflow));
  issues.push(...detectBrokenApiConfigs(workflow));
  
  // HIGH ISSUES (15 pts each)
  issues.push(...detectMissingErrorHandling(workflow));
  issues.push(...detectTriggerConflictsIssues(structure, metadata));
  issues.push(...detectMissingDelaysBetweenActions(workflow));
  issues.push(...detectHardcodedValues(workflow));
  
  // MEDIUM ISSUES (5 pts each)
  issues.push(...detectLongChainsWithoutCheckpoints(structure));
  issues.push(...detectMissingFallbackActions(workflow));
  issues.push(...detectDeprecatedApiVersions(workflow));
  issues.push(...detectMissingTimeouts(workflow));
  
  // LOW ISSUES (2 pts each)
  issues.push(...detectMissingDescriptions(workflow));
  issues.push(...detectSuboptimalOrdering(workflow));
  issues.push(...detectUnusedBranches(structure));
  
  // Calculate health score using exact formula
  const healthScore = calculateHealthScore(issues);
  const grade = getHealthGrade(healthScore);
  const confidence = calculateConfidence(metadata);
  
  // Generate recommendations
  const recommendations = generateRecommendations(issues, metadata);
  
  // Calculate performance metrics
  const performance = calculatePerformanceMetrics(structure, workflow);
  
  // Issue summary
  const issuesSummary = {
    critical: issues.filter(i => i.type === 'critical').length,
    high: issues.filter(i => i.type === 'high').length,
    medium: issues.filter(i => i.type === 'medium').length,
    low: issues.filter(i => i.type === 'low').length,
    total: issues.length
  };
  
  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    healthScore,
    grade,
    confidence,
    issues,
    issuesSummary,
    recommendations,
    performance,
    metadata,
    timestamp: new Date()
  };
}

// ============================================================================
// CRITICAL ISSUE DETECTORS (25 points each)
// ============================================================================

/**
 * CRITICAL: Detect infinite loops (circular paths with no exit condition)
 */
function detectInfiniteLoops(structure: any, metadata: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  const loops = detectLoops(structure.edges);
  
  loops.forEach(loop => {
    if (!loop.hasExitCondition) {
      metadata.hasLoops = true;
      issues.push({
        type: 'critical',
        title: 'Infinite Loop Detected',
        description: `Circular path found with no exit condition: ${loop.nodes.join(' → ')}. This will cause the workflow to run indefinitely.`,
        nodes: loop.nodes,
        fix: 'Add a condition node with an exit path, or implement a counter/limit to break the loop',
        category: 'Graph Structure'
      });
    }
  });
  
  return issues;
}

/**
 * CRITICAL: Webhooks pointing to localhost/invalid URLs
 */
function detectInvalidWebhookUrls(workflow: GHLWorkflow): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  // Check webhooks array
  workflow.webhooks?.forEach((webhook: any) => {
    const url = webhook.url || webhook.config?.url;
    if (url) {
      if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0')) {
        issues.push({
          type: 'critical',
          title: 'Webhook Points to Localhost',
          description: `Webhook "${webhook.name || webhook.id}" points to ${url}, which is not accessible from external services`,
          actionId: webhook.id,
          fix: 'Replace localhost URL with a publicly accessible endpoint (e.g., using ngrok or a cloud service)',
          category: 'Configuration'
        });
      }
      
      // Check for invalid URL format
      try {
        new URL(url);
      } catch {
        issues.push({
          type: 'critical',
          title: 'Invalid Webhook URL',
          description: `Webhook "${webhook.name || webhook.id}" has malformed URL: ${url}`,
          actionId: webhook.id,
          fix: 'Provide a valid HTTP/HTTPS URL',
          category: 'Configuration'
        });
      }
    } else {
      issues.push({
        type: 'critical',
        title: 'Webhook Missing URL',
        description: `Webhook "${webhook.name || webhook.id}" has no destination URL configured`,
        actionId: webhook.id,
        fix: 'Configure a valid webhook URL',
        category: 'Configuration'
      });
    }
  });
  
  // Check webhook actions
  workflow.actions?.forEach((action: any) => {
    if (action.type === 'webhook' || action.type === 'webhook_call') {
      const url = action.config?.url;
      if (url && (url.includes('localhost') || url.includes('127.0.0.1'))) {
        issues.push({
          type: 'critical',
          title: 'Webhook Action Points to Localhost',
          description: `Action "${action.name || action.id}" webhook points to ${url}`,
          actionId: action.id,
          fix: 'Use a publicly accessible URL',
          category: 'Configuration'
        });
      }
    }
  });
  
  return issues;
}

/**
 * CRITICAL: Missing retry logic on payment actions
 */
function detectMissingPaymentRetry(workflow: GHLWorkflow): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    if (action.type === 'payment' || action.type === 'charge' || action.type === 'stripe_payment') {
      const hasRetry = action.config?.retry || 
                      action.config?.retryLogic || 
                      action.config?.maxRetries;
      
      if (!hasRetry) {
        issues.push({
          type: 'critical',
          title: 'Payment Action Without Retry Logic',
          description: `Payment action "${action.name || action.id}" lacks retry logic. Failed payments will result in lost revenue.`,
          actionId: action.id,
          fix: 'Add retry configuration (e.g., 3 retries with exponential backoff) to handle temporary payment failures',
          category: 'Payment'
        });
      }
    }
  });
  
  return issues;
}

/**
 * CRITICAL: Broken/missing API configurations
 */
function detectBrokenApiConfigs(workflow: GHLWorkflow): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    // Check API actions
    if (action.type === 'api' || action.type === 'http_request' || action.type === 'custom_api') {
      const config = action.config || {};
      
      // Missing URL
      if (!config.url && !config.endpoint) {
        issues.push({
          type: 'critical',
          title: 'API Action Missing Endpoint',
          description: `API action "${action.name || action.id}" has no URL/endpoint configured`,
          actionId: action.id,
          fix: 'Configure the API endpoint URL',
          category: 'Configuration'
        });
      }
      
      // Missing required authentication
      if (config.requiresAuth && !config.apiKey && !config.authToken && !config.headers?.Authorization) {
        issues.push({
          type: 'critical',
          title: 'API Action Missing Authentication',
          description: `API action "${action.name || action.id}" requires authentication but credentials are not configured`,
          actionId: action.id,
          fix: 'Add API key, auth token, or authorization headers',
          category: 'Security'
        });
      }
    }
    
    // Check integration actions
    if (action.type?.includes('integration') || action.type?.includes('connect')) {
      if (!action.config?.integrationId && !action.config?.connectionId) {
        issues.push({
          type: 'critical',
          title: 'Integration Not Connected',
          description: `Integration action "${action.name || action.id}" has no active connection`,
          actionId: action.id,
          fix: 'Connect the integration in GHL settings',
          category: 'Integration'
        });
      }
    }
  });
  
  return issues;
}

// ============================================================================
// HIGH SEVERITY DETECTORS (15 points each)
// ============================================================================

/**
 * HIGH: No error handling on external API calls
 */
function detectMissingErrorHandling(workflow: GHLWorkflow): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    const isExternalCall = [
      'api', 'webhook', 'http_request', 'webhook_call', 
      'integration', 'custom_api', 'zapier', 'make'
    ].includes(action.type);
    
    if (isExternalCall) {
      const hasErrorHandling = 
        action.config?.onError || 
        action.config?.errorHandling || 
        action.config?.fallback || 
        action.fallbackActionId ||
        action.branches?.some((b: any) => b.condition === 'on_error' || b.condition === 'on_failure');
      
      if (!hasErrorHandling) {
        issues.push({
          type: 'high',
          title: 'External API Call Without Error Handling',
          description: `Action "${action.name || action.id}" calls external service but has no error handling. Failures will break the entire workflow.`,
          actionId: action.id,
          fix: 'Add error handling branch or fallback action to gracefully handle API failures',
          category: 'Error Handling'
        });
      }
    }
  });
  
  return issues;
}

/**
 * HIGH: Trigger conflicts (overlapping triggers)
 */
function detectTriggerConflictsIssues(structure: any, metadata: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  const conflicts = detectTriggerConflicts(structure.nodes);
  
  conflicts.forEach(conflict => {
    metadata.hasTriggerConflicts = true;
    issues.push({
      type: 'high',
      title: 'Trigger Conflict Detected',
      description: conflict.description,
      nodes: conflict.triggers,
      fix: 'Add conditions to prevent simultaneous trigger execution, or merge triggers into a single entry point with branching logic',
      category: 'Triggers'
    });
  });
  
  return issues;
}

/**
 * HIGH: Missing delays between rapid actions (rate limit risk)
 */
function detectMissingDelaysBetweenActions(workflow: GHLWorkflow): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any, index: number) => {
    const isRateLimitedAction = [
      'email', 'sms', 'api', 'webhook', 'bulk_email', 'bulk_sms'
    ].includes(action.type);
    
    if (isRateLimitedAction && index < (workflow.actions?.length || 0) - 1) {
      const nextAction = workflow.actions![index + 1];
      const isNextAlsoRateLimited = [
        'email', 'sms', 'api', 'webhook', 'bulk_email', 'bulk_sms'
      ].includes(nextAction.type);
      
      const hasDelay = nextAction.type === 'delay' || nextAction.type === 'wait';
      
      if (isNextAlsoRateLimited && !hasDelay) {
        issues.push({
          type: 'high',
          title: 'Rapid Actions Without Delay',
          description: `Actions "${action.name || action.id}" and "${nextAction.name || nextAction.id}" execute back-to-back without delay. Risk of hitting rate limits.`,
          actionId: action.id,
          fix: 'Add a 1-2 second delay between actions to prevent rate limiting',
          category: 'Performance'
        });
      }
    }
  });
  
  return issues;
}

/**
 * HIGH: Hardcoded values that should be variables
 */
function detectHardcodedValues(workflow: GHLWorkflow): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    const config = action.config || {};
    
    // Check email actions for hardcoded recipients
    if (action.type === 'email' || action.type === 'send_email') {
      const recipient = config.to || config.recipient;
      if (recipient && !recipient.includes('{{') && recipient.includes('@')) {
        issues.push({
          type: 'high',
          title: 'Hardcoded Email Recipient',
          description: `Email action "${action.name || action.id}" sends to hardcoded address "${recipient}". Should use contact field.`,
          actionId: action.id,
          fix: 'Replace hardcoded email with {{contact.email}} or custom field',
          category: 'Best Practices'
        });
      }
    }
    
    // Check SMS actions for hardcoded phone numbers
    if (action.type === 'sms' || action.type === 'send_sms') {
      const phone = config.to || config.phoneNumber;
      if (phone && !phone.includes('{{') && /^\+?\d{10,}$/.test(phone)) {
        issues.push({
          type: 'high',
          title: 'Hardcoded Phone Number',
          description: `SMS action "${action.name || action.id}" sends to hardcoded number "${phone}". Should use contact field.`,
          actionId: action.id,
          fix: 'Replace hardcoded number with {{contact.phone}} or custom field',
          category: 'Best Practices'
        });
      }
    }
    
    // Check for hardcoded API keys in visible config
    if (config.apiKey && !config.apiKey.includes('{{env.') && config.apiKey.length > 10) {
      issues.push({
        type: 'high',
        title: 'Hardcoded API Key',
        description: `Action "${action.name || action.id}" contains hardcoded API key. Security risk.`,
        actionId: action.id,
        fix: 'Move API key to environment variable or GHL secrets',
        category: 'Security'
      });
    }
  });
  
  return issues;
}

// ============================================================================
// MEDIUM SEVERITY DETECTORS (5 points each)
// ============================================================================

/**
 * MEDIUM: Long chains without checkpoints (>10 steps)
 */
function detectLongChainsWithoutCheckpoints(structure: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  const graph = buildAdjacencyList(structure.edges);
  
  // Find longest path from each trigger
  const triggers = structure.nodes.filter((n: any) => n.type === 'trigger');
  
  triggers.forEach((trigger: any) => {
    const longestPath = findLongestPath(trigger.id, graph);
    
    if (longestPath.length > 10) {
      // Check if there are condition checkpoints in this chain
      const checkpoints = longestPath.filter((nodeId: string) => {
        const node = structure.nodes.find((n: any) => n.id === nodeId);
        return node && (node.type === 'condition' || node.data.nodeType === 'condition');
      });
      
      if (checkpoints.length === 0) {
        issues.push({
          type: 'medium',
          title: 'Long Chain Without Checkpoints',
          description: `Flow has ${longestPath.length} sequential steps from "${trigger.data.label}" with no condition checkpoints. Difficult to debug and maintain.`,
          nodes: longestPath,
          fix: 'Add condition nodes to validate data at key points, or break into smaller sub-workflows',
          category: 'Complexity'
        });
      }
    }
  });
  
  return issues;
}

/**
 * MEDIUM: No fallback actions
 */
function detectMissingFallbackActions(workflow: GHLWorkflow): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    const isCriticalAction = [
      'payment', 'charge', 'api', 'webhook', 'integration'
    ].includes(action.type);
    
    if (isCriticalAction) {
      const hasFallback = 
        action.fallbackActionId || 
        action.config?.fallback || 
        action.branches?.some((b: any) => b.condition === 'on_error' || b.condition === 'else');
      
      if (!hasFallback) {
        issues.push({
          type: 'medium',
          title: 'Critical Action Without Fallback',
          description: `Action "${action.name || action.id}" has no fallback plan if it fails`,
          actionId: action.id,
          fix: 'Add a fallback action or alternative path for failure scenarios',
          category: 'Resilience'
        });
      }
    }
  });
  
  return issues;
}

/**
 * MEDIUM: Deprecated API versions
 */
function detectDeprecatedApiVersions(workflow: GHLWorkflow): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  const deprecatedVersions = ['v1', 'v2', 'beta', 'alpha'];
  
  workflow.actions?.forEach((action: any) => {
    const config = action.config || {};
    const url = config.url || config.endpoint || '';
    
    // Check for deprecated version in URL
    const hasDeprecatedVersion = deprecatedVersions.some(v => 
      url.includes(`/${v}/`) || url.endsWith(`/${v}`)
    );
    
    if (hasDeprecatedVersion) {
      issues.push({
        type: 'medium',
        title: 'Using Deprecated API Version',
        description: `Action "${action.name || action.id}" uses deprecated API version in URL: ${url}`,
        actionId: action.id,
        fix: 'Update to the latest stable API version',
        category: 'Maintenance'
      });
    }
    
    // Check explicit version field
    if (config.apiVersion && deprecatedVersions.includes(config.apiVersion)) {
      issues.push({
        type: 'medium',
        title: 'Deprecated API Version Configured',
        description: `Action "${action.name || action.id}" explicitly uses deprecated version: ${config.apiVersion}`,
        actionId: action.id,
        fix: 'Update apiVersion to latest stable release',
        category: 'Maintenance'
      });
    }
  });
  
  return issues;
}

/**
 * MEDIUM: Missing timeouts
 */
function detectMissingTimeouts(workflow: GHLWorkflow): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    const needsTimeout = [
      'webhook', 'api', 'http_request', 'webhook_call', 'integration'
    ].includes(action.type);
    
    if (needsTimeout) {
      const hasTimeout = 
        action.config?.timeout !== undefined || 
        action.config?.timeoutSeconds !== undefined ||
        action.config?.timeoutMs !== undefined;
      
      if (!hasTimeout) {
        issues.push({
          type: 'medium',
          title: 'External Call Without Timeout',
          description: `Action "${action.name || action.id}" could hang indefinitely if external service is slow or unresponsive`,
          actionId: action.id,
          fix: 'Set a reasonable timeout (e.g., 30 seconds for webhooks, 10 seconds for APIs)',
          category: 'Resilience'
        });
      }
    }
  });
  
  return issues;
}

// ============================================================================
// LOW SEVERITY DETECTORS (2 points each)
// ============================================================================

/**
 * LOW: Missing descriptions/comments
 */
function detectMissingDescriptions(workflow: GHLWorkflow): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any) => {
    if (!action.description || action.description.trim() === '') {
      issues.push({
        type: 'low',
        title: 'Action Missing Description',
        description: `Action "${action.name || action.id}" has no description, making it harder for team members to understand`,
        actionId: action.id,
        fix: 'Add a brief description explaining what this action does and why',
        category: 'Documentation'
      });
    }
  });
  
  return issues;
}

/**
 * LOW: Suboptimal step ordering
 */
function detectSuboptimalOrdering(workflow: GHLWorkflow): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  
  workflow.actions?.forEach((action: any, index: number) => {
    // Check for email/SMS before data enrichment
    if ((action.type === 'email' || action.type === 'sms') && index > 0) {
      const prevActions = workflow.actions?.slice(0, index) || [];
      const hasDataEnrichment = prevActions.some((a: any) => 
        a.type === 'update_contact' || 
        a.type === 'enrich' || 
        a.type === 'api' ||
        a.type === 'lookup'
      );
      
      const hasDataEnrichmentAfter = workflow.actions?.slice(index + 1).some((a: any) => 
        a.type === 'update_contact' || a.type === 'enrich'
      );
      
      if (!hasDataEnrichment && hasDataEnrichmentAfter) {
        issues.push({
          type: 'low',
          title: 'Suboptimal Action Ordering',
          description: `Action "${action.name || action.id}" sends ${action.type} before contact data is enriched`,
          actionId: action.id,
          fix: 'Move data enrichment actions before sending communications',
          category: 'Optimization'
        });
      }
    }
  });
  
  return issues;
}

/**
 * LOW: Unused branches/dead code
 */
function detectUnusedBranches(structure: any): WorkflowIssue[] {
  const issues: WorkflowIssue[] = [];
  const graph = buildAdjacencyList(structure.edges);
  
  // Find nodes with no outgoing edges (terminal nodes)
  structure.nodes.forEach((node: any) => {
    const outgoingEdges = structure.edges.filter((e: any) => e.source === node.id);
    const isCondition = node.type === 'condition' || node.data.nodeType === 'condition';
    
    // Condition nodes should have at least 2 branches
    if (isCondition && outgoingEdges.length < 2) {
      issues.push({
        type: 'low',
        title: 'Condition With Single Branch',
        description: `Condition "${node.data.label}" only has one branch. The condition is unnecessary.`,
        actionId: node.id,
        fix: 'Either add an else branch or remove the condition',
        category: 'Code Quality'
      });
    }
    
    // Find completely disconnected nodes (except triggers)
    const incomingEdges = structure.edges.filter((e: any) => e.target === node.id);
    if (incomingEdges.length === 0 && outgoingEdges.length === 0 && node.type !== 'trigger') {
      issues.push({
        type: 'low',
        title: 'Disconnected Node',
        description: `Node "${node.data.label}" is not connected to the workflow`,
        actionId: node.id,
        fix: 'Connect this node to the workflow or remove it',
        category: 'Code Quality'
      });
    }
  });
  
  return issues;
}

// ============================================================================
// SCORING & GRADING
// ============================================================================

/**
 * Calculate health score using EXACT formula from requirements:
 * Health Score = 100 - (Critical×25 + High×15 + Medium×5 + Low×2)
 * Minimum score = 0
 */
function calculateHealthScore(issues: WorkflowIssue[]): number {
  const criticalCount = issues.filter(i => i.type === 'critical').length;
  const highCount = issues.filter(i => i.type === 'high').length;
  const mediumCount = issues.filter(i => i.type === 'medium').length;
  const lowCount = issues.filter(i => i.type === 'low').length;
  
  const penalty = 
    (criticalCount * SEVERITY_PENALTIES.critical) +
    (highCount * SEVERITY_PENALTIES.high) +
    (mediumCount * SEVERITY_PENALTIES.medium) +
    (lowCount * SEVERITY_PENALTIES.low);
  
  const healthScore = Math.max(0, 100 - penalty);
  
  return Math.round(healthScore);
}

/**
 * Get health grade based on score
 */
function getHealthGrade(score: number): 'Excellent' | 'Good' | 'Needs Attention' | 'High Risk' | 'Critical' {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Attention';
  if (score >= 30) return 'High Risk';
  return 'Critical';
}

/**
 * Calculate confidence based on analysis coverage
 */
function calculateConfidence(metadata: any): 'High' | 'Medium' | 'Low' {
  const coverageRatio = metadata.analyzedNodes / metadata.totalNodes;
  
  if (coverageRatio >= 0.8 && metadata.totalNodes >= 5) return 'High';
  if (coverageRatio >= 0.5 || metadata.totalNodes < 5) return 'Medium';
  return 'Low';
}

// ============================================================================
// RECOMMENDATIONS ENGINE
// ============================================================================

function generateRecommendations(issues: WorkflowIssue[], metadata: any): string[] {
  const recommendations: string[] = [];
  const summary = {
    critical: issues.filter(i => i.type === 'critical').length,
    high: issues.filter(i => i.type === 'high').length,
    medium: issues.filter(i => i.type === 'medium').length,
    low: issues.filter(i => i.type === 'low').length
  };
  
  // Critical recommendations
  if (summary.critical > 0) {
    recommendations.push(`🚨 URGENT: Fix ${summary.critical} critical issue${summary.critical > 1 ? 's' : ''} immediately to prevent workflow failures`);
  }
  
  // Category-specific recommendations
  const categories = new Set(issues.map(i => i.category));
  
  if (categories.has('Graph Structure') || metadata.hasLoops) {
    recommendations.push('Review workflow structure for infinite loops and ensure all loops have clear exit conditions');
  }
  
  if (categories.has('Error Handling')) {
    recommendations.push('Implement comprehensive error handling for all external API calls and integrations');
  }
  
  if (categories.has('Configuration')) {
    recommendations.push('Verify all webhook URLs and API configurations are correct and publicly accessible');
  }
  
  if (categories.has('Security')) {
    recommendations.push('Move sensitive credentials to environment variables and avoid hardcoded values');
  }
  
  if (categories.has('Performance')) {
    recommendations.push('Add delays between rapid actions to prevent rate limiting');
  }
  
  if (summary.medium > 5) {
    recommendations.push(`Address ${summary.medium} medium-priority issues to improve workflow reliability`);
  }
  
  // Active workflow warning
  if (metadata.isActive && issues.length > 0) {
    recommendations.push('⚠️ This workflow is ACTIVE - test all fixes in a duplicate workflow first');
  }
  
  // Complexity recommendations
  if (metadata.totalNodes > 30) {
    recommendations.push('Consider breaking this complex workflow into smaller, manageable sub-workflows');
  }
  
  return recommendations;
}

// ============================================================================
// PERFORMANCE METRICS
// ============================================================================

function calculatePerformanceMetrics(structure: any, workflow: GHLWorkflow): {
  estimatedSteps: number;
  estimatedTime: string;
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  bottlenecks: string[];
} {
  const nodeCount = structure.nodes.length;
  const edgeCount = structure.edges.length;
  
  let totalTimeSeconds = 0;
  const bottlenecks: string[] = [];
  
  // Estimate time based on node types
  structure.nodes.forEach((node: any) => {
    const nodeType = node.data.nodeType;
    const config = node.data.config;
    
    switch (nodeType) {
      case 'delay':
      case 'wait':
        const delayTime = parseDelayTime(config?.delay || config?.duration);
        totalTimeSeconds += delayTime;
        if (delayTime > 60) {
          bottlenecks.push(`${node.data.label} (${formatTime(delayTime)} wait)`);
        }
        break;
      
      case 'api':
      case 'webhook':
      case 'webhook_call':
      case 'http_request':
        totalTimeSeconds += 2;
        bottlenecks.push(`${node.data.label} (API call)`);
        break;
      
      case 'bulk_email':
      case 'bulk_sms':
        totalTimeSeconds += 5;
        bottlenecks.push(`${node.data.label} (bulk operation)`);
        break;
      
      default:
        totalTimeSeconds += 0.1;
    }
  });
  
  // Calculate complexity
  const branches = Math.max(0, edgeCount - nodeCount + 2);
  let complexity: 'low' | 'medium' | 'high' | 'very_high';
  
  if (nodeCount < 10 && branches < 3) complexity = 'low';
  else if (nodeCount < 25 && branches < 8) complexity = 'medium';
  else if (nodeCount < 50 && branches < 15) complexity = 'high';
  else complexity = 'very_high';
  
  return {
    estimatedSteps: nodeCount,
    estimatedTime: formatTime(totalTimeSeconds),
    complexity,
    bottlenecks: bottlenecks.slice(0, 5)
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findLongestPath(startNode: string, graph: Map<string, string[]>): string[] {
  let longestPath: string[] = [];
  
  function dfs(node: string, currentPath: string[], visited: Set<string>) {
    if (currentPath.length > longestPath.length) {
      longestPath = [...currentPath];
    }
    
    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        dfs(neighbor, [...currentPath, neighbor], visited);
        visited.delete(neighbor);
      }
    }
  }
  
  dfs(startNode, [startNode], new Set([startNode]));
  return longestPath;
}

function parseDelayTime(delay: string | number | undefined): number {
  if (typeof delay === 'number') return delay;
  if (!delay) return 0;
  
  const match = String(delay).match(/(\d+)(s|m|h|d)/);
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
