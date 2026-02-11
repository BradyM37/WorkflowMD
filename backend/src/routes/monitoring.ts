/**
 * Monitoring & Scheduling Routes
 * Execution logs, alerts, and scheduled scans
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error-handler';
import {
  ingestExecutionLog,
  getFailureMetrics,
  getRecentFailures,
  getExecutionHistory,
  checkAlertThreshold
} from '../lib/execution-monitor';
import {
  getAlertSettings,
  upsertAlertSettings,
  sendAlert,
  sendTestAlert
} from '../lib/alerting';
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getSchedule,
  getScanHistory,
  runImmediateScan
} from '../lib/scan-scheduler';

export const monitoringRouter = Router();

// All routes require authentication
monitoringRouter.use(requireAuth);

// ===== EXECUTION LOG ENDPOINTS =====

/**
 * POST /api/workflows/:id/executions
 * Log a workflow execution (webhook from GHL)
 */
monitoringRouter.post('/workflows/:id/executions', asyncHandler(async (req, res) => {
  const workflowId = req.params.id;
  const locationId = req.locationId!;
  const { status, failedActionId, failedActionName, errorMessage, executionTimeMs } = req.body;

  logger.info('Ingesting execution log', {
    workflowId,
    locationId,
    status,
    requestId: req.id
  });

  try {
    const executionLog = await ingestExecutionLog(workflowId, {
      locationId,
      status,
      failedActionId,
      failedActionName,
      errorMessage,
      executionTimeMs
    });

    // Check if alert should be triggered
    if (status === 'failed') {
      const shouldAlert = await checkAlertThreshold(locationId, workflowId);
      
      if (shouldAlert) {
        await sendAlert(locationId, {
          type: 'failure',
          severity: 'critical',
          workflowId,
          workflowName: req.body.workflowName || 'Unknown Workflow',
          message: `Workflow has failed ${req.body.failureCount || 'multiple'} times recently`,
          details: {
            failedAction: failedActionName,
            error: errorMessage
          }
        });
      }
    }

    return ApiResponse.success(res, executionLog, 201);
  } catch (error: any) {
    logger.error('Failed to ingest execution log', {
      workflowId,
      locationId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, 'Failed to log execution', 500);
  }
}));

/**
 * GET /api/workflows/:id/executions
 * Get execution history for a workflow
 */
monitoringRouter.get('/workflows/:id/executions', asyncHandler(async (req, res) => {
  const workflowId = req.params.id;
  const limit = parseInt(req.query.limit as string) || 50;

  logger.info('Fetching execution history', {
    workflowId,
    limit,
    requestId: req.id
  });

  try {
    const history = await getExecutionHistory(workflowId, limit);
    
    return ApiResponse.success(res, {
      executions: history,
      count: history.length
    });
  } catch (error: any) {
    logger.error('Failed to fetch execution history', {
      workflowId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, 'Failed to fetch execution history', 500);
  }
}));

/**
 * GET /api/workflows/:id/failures
 * Get recent failures for a workflow
 */
monitoringRouter.get('/workflows/:id/failures', asyncHandler(async (req, res) => {
  const workflowId = req.params.id;
  const hours = parseInt(req.query.hours as string) || 24;

  logger.info('Fetching recent failures', {
    workflowId,
    hours,
    requestId: req.id
  });

  try {
    const failures = await getRecentFailures(workflowId, hours);
    
    return ApiResponse.success(res, {
      failures,
      count: failures.length,
      timeWindow: `${hours} hours`
    });
  } catch (error: any) {
    logger.error('Failed to fetch recent failures', {
      workflowId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, 'Failed to fetch failures', 500);
  }
}));

/**
 * GET /api/workflows/:id/metrics
 * Get execution metrics for a workflow
 */
monitoringRouter.get('/workflows/:id/metrics', asyncHandler(async (req, res) => {
  const workflowId = req.params.id;

  logger.info('Fetching execution metrics', {
    workflowId,
    requestId: req.id
  });

  try {
    const metrics = await getFailureMetrics(workflowId);
    
    return ApiResponse.success(res, metrics);
  } catch (error: any) {
    logger.error('Failed to fetch execution metrics', {
      workflowId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, 'Failed to fetch metrics', 500);
  }
}));

// ===== ALERT ENDPOINTS =====

/**
 * GET /api/alerts/settings
 * Get alert settings for current location
 */
monitoringRouter.get('/alerts/settings', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;

  logger.info('Fetching alert settings', {
    locationId,
    requestId: req.id
  });

  try {
    const settings = await getAlertSettings(locationId);
    
    if (!settings) {
      // Return default settings
      return ApiResponse.success(res, {
        enabled: true,
        failure_threshold: 3,
        time_window_hours: 24,
        alert_on_critical: true,
        alert_email: null,
        webhook_url: null
      });
    }
    
    return ApiResponse.success(res, settings);
  } catch (error: any) {
    logger.error('Failed to fetch alert settings', {
      locationId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, 'Failed to fetch alert settings', 500);
  }
}));

/**
 * POST /api/alerts/settings
 * Configure alert settings
 */
monitoringRouter.post('/alerts/settings', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;
  const {
    enabled,
    failureThreshold,
    timeWindowHours,
    alertOnCritical,
    alertEmail,
    webhookUrl
  } = req.body;

  logger.info('Updating alert settings', {
    locationId,
    enabled,
    requestId: req.id
  });

  try {
    const settings = await upsertAlertSettings({
      locationId,
      enabled,
      failureThreshold,
      timeWindowHours,
      alertOnCritical,
      alertEmail,
      webhookUrl
    });
    
    return ApiResponse.success(res, settings);
  } catch (error: any) {
    logger.error('Failed to update alert settings', {
      locationId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, 'Failed to update alert settings', 500);
  }
}));

/**
 * POST /api/alerts/test
 * Send a test alert
 */
monitoringRouter.post('/alerts/test', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;

  logger.info('Sending test alert', {
    locationId,
    requestId: req.id
  });

  try {
    await sendTestAlert(locationId);
    
    return ApiResponse.success(res, {
      message: 'Test alert sent successfully'
    });
  } catch (error: any) {
    logger.error('Failed to send test alert', {
      locationId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, 'Failed to send test alert', 500);
  }
}));

// ===== SCHEDULE ENDPOINTS =====

/**
 * GET /api/schedules
 * Get scan schedule for current location
 */
monitoringRouter.get('/schedules', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;

  logger.info('Fetching scan schedule', {
    locationId,
    requestId: req.id
  });

  try {
    const schedule = await getSchedule(locationId);
    
    if (!schedule) {
      return ApiResponse.success(res, {
        message: 'No schedule configured',
        schedule: null
      });
    }
    
    return ApiResponse.success(res, schedule);
  } catch (error: any) {
    logger.error('Failed to fetch schedule', {
      locationId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, 'Failed to fetch schedule', 500);
  }
}));

/**
 * POST /api/schedules
 * Create or update scan schedule
 */
monitoringRouter.post('/schedules', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;
  const {
    enabled,
    frequency,
    preferredTime,
    timezone,
    scanScope,
    selectedWorkflowIds
  } = req.body;

  logger.info('Creating/updating scan schedule', {
    locationId,
    frequency,
    requestId: req.id
  });

  try {
    const schedule = await createSchedule(locationId, {
      enabled,
      frequency,
      preferredTime,
      timezone,
      scanScope,
      selectedWorkflowIds
    });
    
    return ApiResponse.success(res, schedule, 201);
  } catch (error: any) {
    logger.error('Failed to create/update schedule', {
      locationId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, 'Failed to create/update schedule', 500);
  }
}));

/**
 * DELETE /api/schedules
 * Remove scan schedule
 */
monitoringRouter.delete('/schedules', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;

  logger.info('Deleting scan schedule', {
    locationId,
    requestId: req.id
  });

  try {
    const schedule = await getSchedule(locationId);
    
    if (!schedule) {
      return ApiResponse.error(res, 'No schedule found', 404);
    }
    
    await deleteSchedule(schedule.id);
    
    return ApiResponse.success(res, {
      message: 'Schedule deleted successfully'
    });
  } catch (error: any) {
    logger.error('Failed to delete schedule', {
      locationId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, 'Failed to delete schedule', 500);
  }
}));

/**
 * POST /api/schedules/run-now
 * Trigger immediate scan
 */
monitoringRouter.post('/schedules/run-now', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;

  logger.info('Triggering immediate scan', {
    locationId,
    requestId: req.id
  });

  try {
    const scanHistory = await runImmediateScan(locationId);
    
    return ApiResponse.success(res, scanHistory);
  } catch (error: any) {
    logger.error('Failed to trigger immediate scan', {
      locationId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, error.message || 'Failed to trigger scan', 500);
  }
}));

/**
 * GET /api/schedules/history
 * Get scan history
 */
monitoringRouter.get('/schedules/history', asyncHandler(async (req, res) => {
  const locationId = req.locationId!;
  const limit = parseInt(req.query.limit as string) || 20;

  logger.info('Fetching scan history', {
    locationId,
    limit,
    requestId: req.id
  });

  try {
    const history = await getScanHistory(locationId, limit);
    
    return ApiResponse.success(res, {
      history,
      count: history.length
    });
  } catch (error: any) {
    logger.error('Failed to fetch scan history', {
      locationId,
      requestId: req.id
    }, error);
    
    return ApiResponse.error(res, 'Failed to fetch scan history', 500);
  }
}));
