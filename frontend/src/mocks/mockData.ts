/**
 * Centralized Mock Data for FirstResponse
 * 
 * This is the SINGLE SOURCE OF TRUTH for all demo/mock data.
 * DO NOT create inline mock data in components - import from here instead.
 */

// ============================================================================
// WORKFLOWS
// ============================================================================

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  lastModified?: string;
  category?: string;
}

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'wf_demo_001',
    name: '🔥 Hot Lead - 5 Day Nurture Sequence',
    description: 'Aggressive follow-up for high-intent Facebook leads with SMS + email + voicemail drops',
    status: 'active',
    lastModified: '2026-02-10',
    category: 'Lead Management'
  },
  {
    id: 'wf_appt_reminder_24hr',
    name: '📅 Appointment Reminder - 24hr + 1hr SMS',
    description: 'Two-touch SMS reminder sequence to reduce no-shows by 40%',
    status: 'active',
    lastModified: '2026-02-09',
    category: 'Appointments'
  },
  {
    id: 'wf_payment_recovery_v3',
    name: '💳 Failed Payment Recovery - 3 Attempt Retry',
    description: 'Automatic payment retry with escalating email/SMS notifications',
    status: 'active',
    lastModified: '2026-02-08',
    category: 'Payments'
  },
  {
    id: 'wf_new_client_onboard',
    name: '👋 New Client Welcome Series',
    description: '7-day onboarding with intake forms, welcome video, and first appointment booking',
    status: 'active',
    lastModified: '2026-02-07',
    category: 'Onboarding'
  },
  {
    id: 'wf_review_request_post',
    name: '⭐ Post-Service Review Request',
    description: 'Automated Google/Facebook review requests 48hrs after service completion',
    status: 'active',
    lastModified: '2026-02-06',
    category: 'Reviews'
  },
  {
    id: 'wf_reactivation_90day',
    name: '🔄 90-Day Inactive Reactivation',
    description: 'Win-back campaign for clients who haven\'t booked in 90+ days',
    status: 'active',
    lastModified: '2026-02-05',
    category: 'Retention'
  },
  {
    id: 'wf_quote_followup_3x',
    name: '📝 Quote Follow-Up - 3 Touch Sequence',
    description: 'Follow up on sent quotes at 1hr, 24hr, and 72hr intervals',
    status: 'active',
    lastModified: '2026-02-04',
    category: 'Sales'
  },
  {
    id: 'wf_birthday_offer',
    name: '🎂 Birthday Special Offer',
    description: 'Automated birthday email with exclusive 20% discount code',
    status: 'draft',
    lastModified: '2026-02-03',
    category: 'Promotions'
  }
];

// ============================================================================
// ANALYSIS RESULTS
// ============================================================================

export interface Issue {
  type: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  fix: string;
}

export interface AnalysisResult {
  id?: string;
  workflowId: string;
  workflowName: string;
  workflow_name?: string; // Alias for backwards compatibility
  workflow_id?: string; // Alias for backwards compatibility
  healthScore: number;
  health_score?: number; // Alias for backwards compatibility
  grade: string;
  confidence: string;
  issuesFound: number;
  issues_found?: number; // Alias for backwards compatibility
  created_at?: string;
  issues: Issue[];
  upgradePrompt?: {
    hidden: number;
    message: string;
    upgradeUrl?: string;
  } | null;
}

/**
 * CANONICAL MOCK ANALYSIS RESULT
 * 
 * Health Score: 72/100 = "Good"
 * Issues Found: 4 (exactly 4 issues in array)
 * Breakdown: 2 Critical + 1 High + 1 Medium = 4 total
 */
export const MOCK_ANALYSIS_RESULT: AnalysisResult = {
  workflowId: 'wf_demo_001',
  workflowName: '🔥 Hot Lead - 5 Day Nurture Sequence',
  healthScore: 72,
  grade: 'Good',
  confidence: 'High',
  issuesFound: 4,
  issues: [
    {
      type: 'critical',
      title: 'Infinite loop detected in email follow-up sequence',
      description: 'The workflow contains a loop between steps 4, 5, and 12 that could cause infinite email sending. This happens when the "Link Clicked" trigger leads back to the same email sequence without an exit condition.',
      fix: 'Add a counter condition or exit criteria after 3 iterations. Use a custom contact field to track loop count and add an "If/Else" condition to break the loop when count >= 3.'
    },
    {
      type: 'critical',
      title: 'No error handling for email send action',
      description: 'The primary email action (Step 7) has no fallback or error handling. If the email service fails, the entire workflow stops silently without notification or retry logic.',
      fix: 'Add an "If/Else" condition after the email action to check for success/failure. Add a fallback action (SMS notification) if email fails, and log the error to a custom field for monitoring.'
    },
    {
      type: 'high',
      title: 'Trigger conflict: "Contact Created" and "Link Clicked" can fire simultaneously',
      description: 'These two triggers can activate at the same time when a new contact clicks a link immediately after creation, causing duplicate actions and confusion in the workflow execution path.',
      fix: 'Add a delay or mutex condition between triggers. Use GHL\'s "Trigger Filter" settings to add conditions that prevent simultaneous execution, or consolidate both triggers into a single entry point with conditional branching.'
    },
    {
      type: 'medium',
      title: 'Create Task action has high execution time (avg 2.3s)',
      description: 'The "Create Task" action (Step 9) is slowing down the workflow with an average execution time of 2.3 seconds. This adds up when processing bulk contacts and can cause timeout issues.',
      fix: 'Consider batching task creation or using async processing. Move task creation to a separate background workflow triggered by webhook, or use GHL API to batch-create tasks outside the main workflow.'
    }
  ],
  upgradePrompt: null // Set to null for Pro users, or populate for Free users
};

/**
 * FREE TIER VERSION - Shows only first 3 issues with upgrade prompt
 */
export const MOCK_ANALYSIS_RESULT_FREE: AnalysisResult = {
  ...MOCK_ANALYSIS_RESULT,
  issues: MOCK_ANALYSIS_RESULT.issues.slice(0, 3),
  upgradePrompt: {
    hidden: 1,
    message: '1 more issue found',
    upgradeUrl: '/pricing'
  }
};

/**
 * PRO TIER VERSION - Shows all issues (can add more for Pro demo)
 */
export const MOCK_ANALYSIS_RESULT_PRO: AnalysisResult = {
  ...MOCK_ANALYSIS_RESULT,
  upgradePrompt: null
};

// ============================================================================
// SCAN HISTORY
// ============================================================================

export interface ScanHistoryRecord {
  id: string;
  workflow_name: string;
  workflow_id: string;
  health_score: number;
  grade: string;
  issues_found: number;
  created_at: string;
  issues?: Issue[];
}

export const MOCK_SCAN_HISTORY: ScanHistoryRecord[] = [
  {
    id: 'scan_' + Date.now(),
    workflow_id: 'wf_demo_001',
    workflow_name: '🔥 Hot Lead - 5 Day Nurture Sequence',
    health_score: 72,
    grade: 'Good',
    issues_found: 4,
    created_at: new Date().toISOString(),
    issues: MOCK_ANALYSIS_RESULT.issues
  },
  {
    id: 'scan_' + (Date.now() - 86400000), // 1 day ago
    workflow_id: 'wf_appt_reminder_24hr',
    workflow_name: '📅 Appointment Reminder - 24hr + 1hr SMS',
    health_score: 89,
    grade: 'Excellent',
    issues_found: 1,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    issues: [
      {
        type: 'low',
        title: 'Missing action descriptions',
        description: 'Some actions lack documentation for team members',
        fix: 'Add descriptive comments to all workflow actions'
      }
    ]
  },
  {
    id: 'scan_' + (Date.now() - 172800000), // 2 days ago
    workflow_id: 'wf_payment_recovery_v3',
    workflow_name: '💳 Failed Payment Recovery - 3 Attempt Retry',
    health_score: 65,
    grade: 'Needs Attention',
    issues_found: 5,
    created_at: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: 'scan_' + (Date.now() - 259200000), // 3 days ago
    workflow_id: 'wf_new_client_onboard',
    workflow_name: '👋 New Client Welcome Series',
    health_score: 78,
    grade: 'Good',
    issues_found: 3,
    created_at: new Date(Date.now() - 259200000).toISOString()
  },
  {
    id: 'scan_' + (Date.now() - 432000000), // 5 days ago
    workflow_id: 'wf_demo_001',
    workflow_name: '🔥 Hot Lead - 5 Day Nurture Sequence',
    health_score: 68,
    grade: 'Needs Attention',
    issues_found: 6,
    created_at: new Date(Date.now() - 432000000).toISOString()
  }
];

// ============================================================================
// WORKFLOW GRAPH DATA (for WorkflowAnalysis.tsx)
// ============================================================================

export const MOCK_WORKFLOW_GRAPH_ANALYSIS = {
  loops: [
    {
      id: 'loop-1',
      nodes: ['4', '5', '12'],
      severity: 'high' as const,
      description: 'Infinite loop detected in email follow-up sequence',
      suggestion: 'Add a counter condition or exit criteria after 3 iterations',
      pointsDeducted: 15
    }
  ],
  conflicts: [
    {
      id: 'conflict-1',
      triggers: ['Contact Created', 'Link Clicked'],
      severity: 'medium' as const,
      description: 'These triggers can fire simultaneously causing duplicate actions',
      suggestion: 'Add a delay or mutex condition between triggers',
      pointsDeducted: 8
    }
  ],
  performance: {
    score: 72, // MUST MATCH MOCK_ANALYSIS_RESULT.healthScore
    confidence: 'high' as const,
    issues: [
      {
        id: 'perf-1',
        nodeId: '9',
        type: 'slow_action',
        severity: 'medium' as const,
        description: 'Create Task action has high execution time (avg 2.3s)',
        suggestion: 'Consider batching task creation or using async processing',
        pointsDeducted: 5
      },
      {
        id: 'perf-2',
        nodeId: '7',
        type: 'missing_error_handling',
        severity: 'high' as const,
        description: 'No error handling for email send action',
        suggestion: 'Add try-catch or fallback action',
        pointsDeducted: 0 // Already counted in main issues
      }
    ]
  },
  suggestions: [
    {
      id: 'sugg-1',
      title: 'Consolidate email actions',
      description: 'You have 3 email send actions. Consider using a single template with conditional content.',
      impact: 'high' as const,
      effort: 'medium' as const,
      quickTip: 'Use GHL custom fields in one email template instead of multiple separate emails'
    },
    {
      id: 'sugg-2',
      title: 'Add error handling',
      description: 'No error handling detected. Add fallback actions for failed steps.',
      impact: 'medium' as const,
      effort: 'low' as const,
      quickTip: 'Add "If/Else" condition after critical actions to check success/failure'
    },
    {
      id: 'sugg-3',
      title: 'Optimize delay sequence',
      description: 'Multiple short delays can be combined for better performance.',
      impact: 'low' as const,
      effort: 'low' as const,
      quickTip: 'Combine consecutive delays into a single delay action'
    }
  ],
  history: [
    { date: '2024-02-06', score: 65, issues: 6 },
    { date: '2024-02-08', score: 68, issues: 5 },
    { date: '2024-02-10', score: 72, issues: 4 }
  ]
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate grade from health score (consistent across the app)
 */
export function calculateGrade(healthScore: number): string {
  if (healthScore >= 90) return 'Excellent';
  if (healthScore >= 70) return 'Good';
  if (healthScore >= 50) return 'Needs Attention';
  if (healthScore >= 30) return 'High Risk';
  return 'Critical';
}

/**
 * Get health color based on score (consistent across the app)
 */
export function getHealthColor(score: number): string {
  if (score >= 90) return '#52c41a';  // Excellent - green
  if (score >= 70) return '#1890ff';  // Good - blue
  if (score >= 50) return '#faad14';  // Needs Attention - yellow
  if (score >= 30) return '#fa8c16';  // High Risk - orange
  return '#ff4d4f';                   // Critical - red
}

/**
 * Create a new analysis result for a workflow
 */
export function createMockAnalysisForWorkflow(
  workflow: Workflow,
  subscription: 'free' | 'pro' = 'free'
): AnalysisResult {
  const baseResult: AnalysisResult = {
    id: 'analysis_' + Date.now(),
    workflowId: workflow.id,
    workflowName: workflow.name,
    healthScore: MOCK_ANALYSIS_RESULT.healthScore,
    grade: MOCK_ANALYSIS_RESULT.grade,
    confidence: MOCK_ANALYSIS_RESULT.confidence,
    issuesFound: MOCK_ANALYSIS_RESULT.issuesFound,
    issues: subscription === 'pro' 
      ? MOCK_ANALYSIS_RESULT.issues 
      : MOCK_ANALYSIS_RESULT.issues.slice(0, 3),
    created_at: new Date().toISOString(),
    upgradePrompt: subscription === 'free' ? {
      hidden: MOCK_ANALYSIS_RESULT.issuesFound - 3,
      message: `${MOCK_ANALYSIS_RESULT.issuesFound - 3} more ${MOCK_ANALYSIS_RESULT.issuesFound - 3 === 1 ? 'issue' : 'issues'} found`,
      upgradeUrl: '/pricing'
    } : null
  };

  return baseResult;
}
