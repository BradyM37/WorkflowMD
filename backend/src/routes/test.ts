/**
 * Test Routes - Hardened Production Version
 * Mock workflows for testing analysis engine (development only)
 */

import { Router } from 'express';
import { pool } from '../lib/database';
import { analyzeWorkflow } from '../lib/workflow-analyzer';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation';
import { testAnalysisSchema } from '../lib/validation';
import { retryQuery } from '../middleware/database-health';
import {
  testEmailConfiguration,
  sendPasswordResetEmail,
  sendEmailVerification,
  sendWelcomeEmail,
  sendWorkflowFailureAlert,
  sendScheduledScanReport
} from '../lib/email-service';
import { generateWorkflowReportPDF } from '../lib/pdf-generator';

export const testRouter = Router();

// Mock workflow templates for testing (using correct structure for analysis engine)
const MOCK_WORKFLOWS = {
  // A workflow with critical issues (should score low)
  critical: {
    id: 'wf_payment_recovery_broken',
    name: '💳 Failed Payment Recovery - BROKEN',
    status: 'active',
    triggers: [
      { id: 'trigger_1', type: 'payment_received', config: {} }
    ],
    actions: [
      { id: 'action_1', type: 'webhook', config: { url: 'http://localhost/webhook' } }, // localhost = bad
      { id: 'action_2', type: 'email', config: {} }, // missing recipient = bad
      { id: 'action_3', type: 'api_call', config: { url: 'https://api.example.com' } }, // no error handling
      { id: 'action_4', type: 'payment', config: {} }, // no retry logic = bad
      { id: 'action_5', type: 'sms', config: {} } // missing phone = bad
    ],
    webhooks: [
      { id: 'wh_1', url: 'http://localhost:3000/hook' } // localhost webhook
    ],
    connections: [
      { from: 'trigger_1', to: 'action_1' },
      { from: 'action_1', to: 'action_2' },
      { from: 'action_2', to: 'action_3' },
      { from: 'action_3', to: 'action_4' },
      { from: 'action_4', to: 'action_5' },
      { from: 'action_5', to: 'action_1' } // Creates infinite loop!
    ],
    estimatedContacts: 5000
  },

  // A workflow with some issues (should score medium)
  medium: {
    id: 'wf_lead_nurture_v2',
    name: '🔥 Hot Lead Nurture - Needs Review',
    status: 'active',
    triggers: [
      { id: 'trigger_1', type: 'form_submitted', config: {} },
      { id: 'trigger_2', type: 'tag_added', config: { tag: 'lead' } } // Multiple triggers = potential conflict
    ],
    actions: [
      { id: 'action_1', type: 'wait', config: { duration: '2h' } },
      { id: 'action_2', type: 'email', config: { recipient: '{{contact.email}}', templateId: 'welcome' } },
      { id: 'action_3', type: 'api_call', config: { url: 'https://api.example.com' } }, // no error handling
      { id: 'action_4', type: 'sms', config: { phoneNumber: '{{contact.phone}}' } }, // no validation
      { id: 'action_5', type: 'wait', config: { duration: '10d' } }, // excessive wait time
      { id: 'action_6', type: 'webhook', config: { url: 'https://webhook.site/test' } } // no timeout
    ],
    connections: [
      { from: 'trigger_1', to: 'action_1' },
      { from: 'trigger_2', to: 'action_1' },
      { from: 'action_1', to: 'action_2' },
      { from: 'action_2', to: 'action_3' },
      { from: 'action_3', to: 'action_4' },
      { from: 'action_4', to: 'action_5' },
      { from: 'action_5', to: 'action_6' }
    ],
    estimatedContacts: 500
  },

  // A clean workflow (should score high)
  healthy: {
    id: 'wf_new_client_welcome',
    name: '👋 New Client Welcome Series',
    status: 'draft', // Not active = less risky
    triggers: [
      { id: 'trigger_1', type: 'contact_created', config: {} }
    ],
    actions: [
      { id: 'action_1', type: 'condition', config: { field: 'email', operator: 'is_not_empty' } },
      { id: 'action_2', type: 'email', config: { 
        recipient: '{{contact.email}}', 
        templateId: 'welcome',
        errorHandling: true,
        validateEmail: true
      }},
      { id: 'action_3', type: 'add_tag', config: { tag: 'welcomed' }, description: 'Mark contact as welcomed' }
    ],
    connections: [
      { from: 'trigger_1', to: 'action_1' },
      { from: 'action_1', to: 'action_2' },
      { from: 'action_2', to: 'action_3' }
    ],
    estimatedContacts: 100
  }
};

/**
 * POST /test/analyze
 * Analyze a mock workflow using the real analysis engine
 */
testRouter.post(
  '/analyze',
  validate(testAnalysisSchema, 'body'),
  asyncHandler(async (req, res) => {
    const { workflowType, customWorkflow, locationId } = req.body;
    
    logger.info('Test analysis requested', {
      workflowType,
      hasCustomWorkflow: !!customWorkflow,
      locationId,
      requestId: req.id
    });

    // Select workflow
    let workflow;
    if (customWorkflow) {
      workflow = customWorkflow;
    } else if (workflowType && MOCK_WORKFLOWS[workflowType as keyof typeof MOCK_WORKFLOWS]) {
      workflow = MOCK_WORKFLOWS[workflowType as keyof typeof MOCK_WORKFLOWS];
    } else {
      return ApiResponse.badRequest(res, 'Invalid workflow type or missing custom workflow');
    }

    try {
      // Run the REAL analysis engine
      const startTime = Date.now();
      const analysis = analyzeWorkflow(workflow);
      const analysisTime = Date.now() - startTime;

      logger.info('Test analysis completed', {
        workflowId: workflow.id,
        workflowName: workflow.name,
        healthScore: analysis.healthScore,
        issuesFound: analysis.issues.length,
        analysisTimeMs: analysisTime,
        requestId: req.id
      });

      // Optionally save to database for testing
      const testLocationId = locationId || 'loc_test_123';
      
      const insertResult = await retryQuery(
        () => pool.query(
          `INSERT INTO analysis_results 
           (location_id, workflow_id, workflow_name, health_score, issues_found, results) 
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, created_at`,
          [
            testLocationId,
            workflow.id,
            workflow.name,
            analysis.healthScore,
            analysis.issues.length,
            JSON.stringify(analysis)
          ]
        ),
        2,
        500
      );

      const savedResult = insertResult.rows[0];

      return ApiResponse.success(res, {
        workflow: {
          id: workflow.id,
          name: workflow.name,
          status: workflow.status,
          actionCount: workflow.actions?.length || 0,
          connectionCount: workflow.connections?.length || 0
        },
        analysis,
        meta: {
          analysisTimeMs: analysisTime,
          savedToDatabase: true,
          analysisId: savedResult.id,
          timestamp: savedResult.created_at,
          testLocationId
        }
      });

    } catch (error) {
      logger.error('Test analysis failed', {
        workflowId: workflow?.id,
        requestId: req.id
      }, error as Error);
      
      return ApiResponse.serverError(res, 'Analysis failed');
    }
  })
);

/**
 * GET /test/workflows
 * Get available mock workflow types
 */
testRouter.get('/workflows', (_req, res) => {
  const workflows = Object.entries(MOCK_WORKFLOWS).map(([type, workflow]: [string, any]) => ({
    type,
    id: workflow.id,
    name: workflow.name,
    status: workflow.status,
    description: getWorkflowDescription(type),
    stats: {
      triggers: workflow.triggers?.length || 0,
      actions: workflow.actions?.length || 0,
      connections: workflow.connections?.length || 0,
      estimatedContacts: workflow.estimatedContacts || 0
    },
    expectedIssues: getExpectedIssues(type)
  }));

  return ApiResponse.success(res, {
    workflows,
    count: workflows.length,
    usage: 'POST /test/analyze with { "workflowType": "critical|medium|healthy" }'
  });
});

/**
 * GET /test/history
 * Get test analysis history
 */
testRouter.get('/history', asyncHandler(async (req, res) => {
  const locationId = (req.query.locationId as string) || 'loc_test_123';
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  
  logger.debug('Fetching test history', {
    locationId,
    limit,
    requestId: req.id
  });

  try {
    const result = await retryQuery(
      () => pool.query(
        `SELECT id, workflow_id, workflow_name, health_score, issues_found, created_at
         FROM analysis_results 
         WHERE location_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [locationId, limit]
      ),
      2,
      500
    );

    return ApiResponse.success(res, {
      history: result.rows,
      count: result.rows.length,
      locationId
    });
  } catch (error) {
    logger.error('Failed to fetch test history', {
      locationId,
      requestId: req.id
    }, error as Error);
    
    return ApiResponse.serverError(res, 'Failed to fetch test history');
  }
}));

/**
 * DELETE /test/history
 * Clear test data
 */
testRouter.delete('/history', asyncHandler(async (req, res) => {
  const locationId = (req.query.locationId as string) || 'loc_test_123';
  
  logger.info('Clearing test history', {
    locationId,
    requestId: req.id
  });

  try {
    const result = await retryQuery(
      () => pool.query(
        'DELETE FROM analysis_results WHERE location_id = $1 RETURNING id',
        [locationId]
      ),
      2,
      500
    );

    const deletedCount = result.rowCount || 0;

    logger.info('Test history cleared', {
      locationId,
      deletedCount,
      requestId: req.id
    });

    return ApiResponse.success(res, {
      deleted: true,
      count: deletedCount,
      locationId,
      message: `Cleared ${deletedCount} test analysis result${deletedCount === 1 ? '' : 's'}`
    });
  } catch (error) {
    logger.error('Failed to clear test history', {
      locationId,
      requestId: req.id
    }, error as Error);
    
    return ApiResponse.serverError(res, 'Failed to clear test history');
  }
}));

/**
 * GET /test/health
 * Test endpoint health check
 */
testRouter.get('/health', (_req, res) => {
  return ApiResponse.success(res, {
    status: 'healthy',
    endpoints: {
      analyze: 'POST /test/analyze',
      workflows: 'GET /test/workflows',
      history: 'GET /test/history',
      clearHistory: 'DELETE /test/history'
    },
    mockWorkflows: Object.keys(MOCK_WORKFLOWS)
  });
});

// Helper functions

function getWorkflowDescription(type: string): string {
  switch (type) {
    case 'critical':
      return 'A workflow with multiple critical issues including infinite loop, missing fields, and localhost webhooks';
    case 'medium':
      return 'A workflow with medium-severity issues like missing error handling and excessive wait times';
    case 'healthy':
      return 'A well-structured workflow with proper validation and error handling';
    default:
      return 'Unknown workflow type';
  }
}

function getExpectedIssues(type: string): string[] {
  switch (type) {
    case 'critical':
      return [
        'Infinite loop detected',
        'Email missing recipient',
        'Webhook points to localhost',
        'Payment without retry logic',
        'SMS missing phone number'
      ];
    case 'medium':
      return [
        'Trigger conflict',
        'API call without error handling',
        'SMS without phone validation',
        'Excessive wait time (10 days)',
        'Webhook without timeout'
      ];
    case 'healthy':
      return ['No major issues expected'];
    default:
      return [];
  }
}

// ============================================================================
// EMAIL TESTING ENDPOINTS (AWS SES)
// ============================================================================

/**
 * POST /test/email
 * Test AWS SES email configuration
 */
testRouter.post('/email', asyncHandler(async (req: any, res: any) => {
  const { email } = req.body;
  
  if (!email) {
    return ApiResponse.error(res, 'Email address required', 400, 'MISSING_EMAIL');
  }

  logger.info('Testing AWS SES email configuration', { email, requestId: req.id });

  try {
    const success = await testEmailConfiguration(email);
    
    if (success) {
      return ApiResponse.success(res, {
        success: true,
        message: `Test email sent successfully to ${email}. Check your inbox!`,
        provider: 'AWS SES',
        cost: '$0.0001 per email'
      });
    } else {
      return ApiResponse.error(res, 'Email configuration test failed', 500, 'EMAIL_TEST_FAILED');
    }
  } catch (error: any) {
    logger.error('Email test failed', { error: error.message, email });
    return ApiResponse.error(res, `Email test failed: ${error.message}`, 500, 'EMAIL_ERROR');
  }
}));

/**
 * POST /test/email/password-reset
 * Test password reset email
 */
testRouter.post('/email/password-reset', asyncHandler(async (req: any, res: any) => {
  const { email } = req.body;
  
  if (!email) {
    return ApiResponse.error(res, 'Email address required', 400);
  }

  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password/test-token-123`;
    await sendPasswordResetEmail(email, resetUrl);
    
    logger.info('Test password reset email sent', { email });
    
    return ApiResponse.success(res, {
      success: true,
      message: 'Password reset email sent!',
      template: 'password-reset'
    });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
}));

/**
 * POST /test/email/verification
 * Test email verification email
 */
testRouter.post('/email/verification', asyncHandler(async (req: any, res: any) => {
  const { email } = req.body;
  
  if (!email) {
    return ApiResponse.error(res, 'Email address required', 400);
  }

  try {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email/test-token-456`;
    await sendEmailVerification(email, verifyUrl);
    
    logger.info('Test verification email sent', { email });
    
    return ApiResponse.success(res, {
      success: true,
      message: 'Verification email sent!',
      template: 'email-verification'
    });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
}));

/**
 * POST /test/email/welcome
 * Test welcome email
 */
testRouter.post('/email/welcome', asyncHandler(async (req: any, res: any) => {
  const { email, name } = req.body;
  
  if (!email) {
    return ApiResponse.error(res, 'Email address required', 400);
  }

  try {
    await sendWelcomeEmail(email, name || 'Test User');
    
    logger.info('Test welcome email sent', { email });
    
    return ApiResponse.success(res, {
      success: true,
      message: 'Welcome email sent!',
      template: 'welcome'
    });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
}));

/**
 * POST /test/email/alert
 * Test workflow failure alert email
 */
testRouter.post('/email/alert', asyncHandler(async (req: any, res: any) => {
  const { email, severity } = req.body;
  
  if (!email) {
    return ApiResponse.error(res, 'Email address required', 400);
  }

  try {
    await sendWorkflowFailureAlert(email, {
      workflowId: 'wf_test_123',
      workflowName: 'Test Payment Workflow',
      severity: severity || 'warning',
      message: 'This is a test alert. Your workflow has a potential issue that needs attention.',
      details: {
        issue: 'Missing error handling in API call',
        location: 'Step 3: Send Payment',
        recommendation: 'Add try-catch block and retry logic'
      },
      timestamp: new Date()
    });
    
    logger.info('Test alert email sent', { email, severity });
    
    return ApiResponse.success(res, {
      success: true,
      message: 'Alert email sent!',
      template: 'workflow-alert',
      severity: severity || 'warning'
    });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
}));

/**
 * POST /test/email/report
 * Test scheduled scan report email
 */
testRouter.post('/email/report', asyncHandler(async (req: any, res: any) => {
  const { email } = req.body;
  
  if (!email) {
    return ApiResponse.error(res, 'Email address required', 400);
  }

  try {
    await sendScheduledScanReport(email, {
      totalWorkflows: 12,
      issuesFound: 8,
      criticalIssues: 2,
      healthScores: [
        { name: 'Payment Recovery Flow', score: 45 },
        { name: 'Lead Nurture Sequence', score: 78 },
        { name: 'Appointment Reminder', score: 92 },
        { name: 'Abandoned Cart Recovery', score: 65 },
        { name: 'Welcome Email Series', score: 88 }
      ],
      scanTime: new Date()
    });
    
    logger.info('Test report email sent', { email });
    
    return ApiResponse.success(res, {
      success: true,
      message: 'Scan report email sent!',
      template: 'scan-report'
    });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
}));

/**
 * GET /test/email/templates
 * List all available email templates
 */
testRouter.get('/email/templates', (_req, res) => {
  return ApiResponse.success(res, {
    templates: [
      {
        name: 'password-reset',
        description: 'Password reset email with secure token link',
        endpoint: 'POST /test/email/password-reset',
        requiredFields: ['email']
      },
      {
        name: 'email-verification',
        description: 'Email verification after registration',
        endpoint: 'POST /test/email/verification',
        requiredFields: ['email']
      },
      {
        name: 'welcome',
        description: 'Welcome email for new users',
        endpoint: 'POST /test/email/welcome',
        requiredFields: ['email'],
        optionalFields: ['name']
      },
      {
        name: 'workflow-alert',
        description: 'Workflow failure/issue alert',
        endpoint: 'POST /test/email/alert',
        requiredFields: ['email'],
        optionalFields: ['severity (critical|warning|info)']
      },
      {
        name: 'scan-report',
        description: 'Scheduled workflow scan report',
        endpoint: 'POST /test/email/report',
        requiredFields: ['email']
      },
      {
        name: 'configuration-test',
        description: 'Test AWS SES configuration',
        endpoint: 'POST /test/email',
        requiredFields: ['email']
      }
    ],
    provider: 'AWS SES',
    cost: '$0.10 per 1,000 emails',
    rateLimit: '10 emails per hour per address',
    styling: {
      brandColors: ['#667eea', '#764ba2'],
      responsive: true,
      darkModeCompatible: false
    }
  });
});

/**
 * GET /test/pdf
 * Generate a sample PDF report for testing
 */
testRouter.get('/pdf', asyncHandler(async (req, res) => {
  logger.info('Generating sample PDF report');

  try {
    // Use the "critical" mock workflow for testing
    const mockWorkflow = MOCK_WORKFLOWS.critical;
    
    // Run analysis on the mock workflow
    const analysis = analyzeWorkflow(mockWorkflow);
    
    // Generate PDF
    const startTime = Date.now();
    const pdfBuffer = await generateWorkflowReportPDF(analysis);
    const generationTime = Date.now() - startTime;

    logger.info('Sample PDF report generated successfully', {
      pdfSize: pdfBuffer.length,
      generationTimeMs: generationTime,
      healthScore: analysis.healthScore,
      issuesFound: analysis.issues.length
    });

    // Set response headers for PDF download
    const filename = `sample-workflow-report.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Failed to generate sample PDF report', error as Error);
    return ApiResponse.serverError(res, 'Failed to generate sample PDF report');
  }
}));

/**
 * GET /test/pdf/:type
 * Generate a sample PDF report for a specific workflow type (critical, medium, healthy)
 */
testRouter.get('/pdf/:type', asyncHandler(async (req, res) => {
  const { type } = req.params;
  
  if (!['critical', 'medium', 'healthy'].includes(type)) {
    return ApiResponse.error(res, 'Invalid workflow type. Choose: critical, medium, or healthy', 400);
  }

  logger.info('Generating sample PDF report', { workflowType: type });

  try {
    // Get the requested mock workflow
    const mockWorkflow = MOCK_WORKFLOWS[type as keyof typeof MOCK_WORKFLOWS];
    
    // Run analysis on the mock workflow
    const analysis = analyzeWorkflow(mockWorkflow);
    
    // Generate PDF
    const startTime = Date.now();
    const pdfBuffer = await generateWorkflowReportPDF(analysis);
    const generationTime = Date.now() - startTime;

    logger.info('Sample PDF report generated successfully', {
      workflowType: type,
      pdfSize: pdfBuffer.length,
      generationTimeMs: generationTime,
      healthScore: analysis.healthScore,
      issuesFound: analysis.issues.length
    });

    // Set response headers for PDF download
    const filename = `sample-workflow-report-${type}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    logger.error('Failed to generate sample PDF report', { workflowType: type }, error as Error);
    return ApiResponse.serverError(res, 'Failed to generate sample PDF report');
  }
}));
