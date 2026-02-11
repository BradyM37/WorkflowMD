import * as cron from 'node-cron';
import { pool } from './database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';
import { analyzeWorkflow } from './workflow-analyzer';
import { fetchWorkflows } from './ghl-api';
import { sendAlert, getAlertSettings } from './alerting';
import { sendScheduledScanReport, ScanReport } from './email-service';

export interface ScanSchedule {
  id: string;
  location_id: string;
  enabled: boolean;
  frequency: 'daily' | '12h' | '6h' | 'weekly';
  preferred_time: string;
  timezone: string;
  scan_scope: 'all' | 'active' | 'selected';
  selected_workflow_ids?: string[];
  last_scan_at?: Date;
  next_scan_at?: Date;
  created_at: Date;
}

export interface ScanHistory {
  id: string;
  schedule_id?: string;
  location_id: string;
  status: 'running' | 'completed' | 'failed';
  workflows_scanned: number;
  issues_found: number;
  critical_issues: number;
  started_at: Date;
  completed_at?: Date;
  summary?: any;
}

// Map of active cron jobs
const activeCronJobs = new Map<string, ReturnType<typeof cron.schedule>>();

/**
 * Calculate next run time based on schedule config
 */
export function calculateNextRun(schedule: ScanSchedule): Date {
  const now = new Date();
  const [hours, minutes] = schedule.preferred_time.split(':').map(Number);
  
  const nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);

  // If the time has passed today, move to next occurrence
  if (nextRun <= now) {
    switch (schedule.frequency) {
      case '6h':
        nextRun.setHours(nextRun.getHours() + 6);
        break;
      case '12h':
        nextRun.setHours(nextRun.getHours() + 12);
        break;
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
    }
  }

  return nextRun;
}

/**
 * Convert schedule frequency to cron expression
 */
function frequencyToCron(frequency: string, preferredTime: string): string {
  const [hours, minutes] = preferredTime.split(':');
  
  switch (frequency) {
    case '6h':
      return `${minutes} */${6} * * *`; // Every 6 hours
    case '12h':
      return `${minutes} */${12} * * *`; // Every 12 hours
    case 'daily':
      return `${minutes} ${hours} * * *`; // Daily at preferred time
    case 'weekly':
      return `${minutes} ${hours} * * 0`; // Weekly on Sunday
    default:
      return `${minutes} ${hours} * * *`; // Default to daily
  }
}

/**
 * Create or update a scan schedule
 */
export async function createSchedule(
  locationId: string,
  config: {
    enabled?: boolean;
    frequency?: 'daily' | '12h' | '6h' | 'weekly';
    preferredTime?: string;
    timezone?: string;
    scanScope?: 'all' | 'active' | 'selected';
    selectedWorkflowIds?: string[];
  }
): Promise<ScanSchedule> {
  const id = uuidv4();
  
  const schedule: Partial<ScanSchedule> = {
    enabled: config.enabled ?? true,
    frequency: config.frequency || 'daily',
    preferred_time: config.preferredTime || '02:00',
    timezone: config.timezone || 'America/Chicago',
    scan_scope: config.scanScope || 'active',
    selected_workflow_ids: config.selectedWorkflowIds
  };

  const nextRun = calculateNextRun(schedule as ScanSchedule);

  const query = `
    INSERT INTO scan_schedules (
      id, location_id, enabled, frequency, preferred_time, timezone,
      scan_scope, selected_workflow_ids, next_scan_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (location_id)
    DO UPDATE SET
      enabled = COALESCE($3, scan_schedules.enabled),
      frequency = COALESCE($4, scan_schedules.frequency),
      preferred_time = COALESCE($5, scan_schedules.preferred_time),
      timezone = COALESCE($6, scan_schedules.timezone),
      scan_scope = COALESCE($7, scan_schedules.scan_scope),
      selected_workflow_ids = COALESCE($8, scan_schedules.selected_workflow_ids),
      next_scan_at = $9
    RETURNING *
  `;

  const values = [
    id,
    locationId,
    schedule.enabled,
    schedule.frequency,
    schedule.preferred_time,
    schedule.timezone,
    schedule.scan_scope,
    schedule.selected_workflow_ids ? JSON.stringify(schedule.selected_workflow_ids) : null,
    nextRun
  ];

  try {
    const result = await pool.query(query, values);
    const createdSchedule = result.rows[0];
    
    // Start the cron job
    await startCronJob(createdSchedule);
    
    logger.info(`Scan schedule created for location ${locationId}`);
    return createdSchedule;
  } catch (error) {
    logger.error('Failed to create schedule:', error);
    throw error;
  }
}

/**
 * Update an existing schedule
 */
export async function updateSchedule(
  scheduleId: string,
  config: Partial<ScanSchedule>
): Promise<ScanSchedule> {
  const query = `
    UPDATE scan_schedules
    SET 
      enabled = COALESCE($1, enabled),
      frequency = COALESCE($2, frequency),
      preferred_time = COALESCE($3, preferred_time),
      timezone = COALESCE($4, timezone),
      scan_scope = COALESCE($5, scan_scope),
      selected_workflow_ids = COALESCE($6, selected_workflow_ids)
    WHERE id = $7
    RETURNING *
  `;

  const values = [
    config.enabled,
    config.frequency,
    config.preferred_time,
    config.timezone,
    config.scan_scope,
    config.selected_workflow_ids ? JSON.stringify(config.selected_workflow_ids) : null,
    scheduleId
  ];

  try {
    const result = await pool.query(query, values);
    const updatedSchedule = result.rows[0];
    
    // Restart cron job with new config
    stopCronJob(scheduleId);
    await startCronJob(updatedSchedule);
    
    logger.info(`Schedule ${scheduleId} updated`);
    return updatedSchedule;
  } catch (error) {
    logger.error('Failed to update schedule:', error);
    throw error;
  }
}

/**
 * Delete a schedule
 */
export async function deleteSchedule(scheduleId: string): Promise<void> {
  try {
    // Stop cron job
    stopCronJob(scheduleId);
    
    // Delete from database
    await pool.query('DELETE FROM scan_schedules WHERE id = $1', [scheduleId]);
    
    logger.info(`Schedule ${scheduleId} deleted`);
  } catch (error) {
    logger.error('Failed to delete schedule:', error);
    throw error;
  }
}

/**
 * Get schedule for a location
 */
export async function getSchedule(locationId: string): Promise<ScanSchedule | null> {
  try {
    const result = await pool.query(
      'SELECT * FROM scan_schedules WHERE location_id = $1',
      [locationId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to get schedule:', error);
    throw error;
  }
}

/**
 * Execute a scheduled scan
 */
export async function runScheduledScan(scheduleId: string): Promise<ScanHistory> {
  const historyId = uuidv4();
  
  try {
    // Get schedule details
    const scheduleResult = await pool.query(
      'SELECT * FROM scan_schedules WHERE id = $1',
      [scheduleId]
    );
    const schedule = scheduleResult.rows[0];
    
    if (!schedule) {
      throw new Error(`Schedule ${scheduleId} not found`);
    }

    // Create scan history entry
    await pool.query(
      `INSERT INTO scan_history (id, schedule_id, location_id, status)
       VALUES ($1, $2, $3, 'running')`,
      [historyId, scheduleId, schedule.location_id]
    );

    logger.info(`Starting scheduled scan for location ${schedule.location_id}`);

    // Get workflows to scan
    const workflows = await fetchWorkflows(schedule.location_id);
    
    let workflowsToScan = workflows;
    if (schedule.scan_scope === 'active') {
      workflowsToScan = workflows.filter((w: any) => w.status === 'published' || w.status === 'active');
    } else if (schedule.scan_scope === 'selected' && schedule.selected_workflow_ids) {
      const selectedIds = JSON.parse(schedule.selected_workflow_ids);
      workflowsToScan = workflows.filter((w: any) => selectedIds.includes(w.id));
    }

    // Analyze each workflow
    const results: any[] = [];
    let issuesFound = 0;
    let criticalIssues = 0;

    for (const workflow of workflowsToScan) {
      try {
        const analysis = await analyzeWorkflow(workflow);
        results.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          healthScore: analysis.healthScore,
          issues: analysis.issues
        });

        issuesFound += analysis.issues.length;
        criticalIssues += analysis.issues.filter((i: any) => i.type === 'critical').length;

        // Send alert if critical issues found
        if (analysis.healthScore < 50) {
          await sendAlert(schedule.location_id, {
            type: 'critical_issue',
            severity: 'critical',
            workflowId: workflow.id,
            workflowName: workflow.name,
            message: `Workflow health score dropped to ${analysis.healthScore}`,
            details: analysis.issues
          });
        }
      } catch (error) {
        logger.error(`Failed to analyze workflow ${workflow.id}:`, error);
      }
    }

    // Update scan history
    await pool.query(
      `UPDATE scan_history 
       SET status = 'completed',
           workflows_scanned = $1,
           issues_found = $2,
           critical_issues = $3,
           completed_at = NOW(),
           summary = $4
       WHERE id = $5`,
      [workflowsToScan.length, issuesFound, criticalIssues, JSON.stringify(results), historyId]
    );

    // Update last_scan_at and next_scan_at
    const nextRun = calculateNextRun(schedule);
    await pool.query(
      `UPDATE scan_schedules 
       SET last_scan_at = NOW(), next_scan_at = $1 
       WHERE id = $2`,
      [nextRun, scheduleId]
    );

    // Send scan report via email if configured
    try {
      const alertSettings = await getAlertSettings(schedule.location_id);
      if (alertSettings && alertSettings.alert_email) {
        await sendScheduledScanReport(alertSettings.alert_email, {
          totalWorkflows: workflowsToScan.length,
          issuesFound: issuesFound,
          criticalIssues: criticalIssues,
          healthScores: results.map(r => ({
            name: r.workflowName,
            score: r.healthScore
          })),
          scanTime: new Date()
        });
        
        logger.info(`Scan report email sent to ${alertSettings.alert_email}`);
      }
    } catch (emailError: any) {
      logger.error('Failed to send scan report email', { error: emailError.message });
      // Don't fail the entire scan if email fails
    }

    // Send completion alert (legacy webhook)
    await sendAlert(schedule.location_id, {
      type: 'schedule_complete',
      severity: 'info',
      workflowId: 'scheduled-scan',
      workflowName: 'Scheduled Scan',
      message: `Scheduled scan completed: ${workflowsToScan.length} workflows scanned, ${issuesFound} issues found`,
      details: { results }
    });

    logger.info(`Scheduled scan completed for location ${schedule.location_id}`);

    const historyResult = await pool.query(
      'SELECT * FROM scan_history WHERE id = $1',
      [historyId]
    );
    return historyResult.rows[0];
  } catch (error) {
    logger.error('Scheduled scan failed:', error);
    
    // Mark scan as failed
    await pool.query(
      `UPDATE scan_history 
       SET status = 'failed', completed_at = NOW() 
       WHERE id = $1`,
      [historyId]
    );
    
    throw error;
  }
}

/**
 * Get scan history for a location
 */
export async function getScanHistory(locationId: string, limit: number = 20): Promise<ScanHistory[]> {
  try {
    const result = await pool.query(
      `SELECT * FROM scan_history 
       WHERE location_id = $1 
       ORDER BY started_at DESC 
       LIMIT $2`,
      [locationId, limit]
    );
    return result.rows;
  } catch (error) {
    logger.error('Failed to get scan history:', error);
    throw error;
  }
}

/**
 * Start a cron job for a schedule
 */
async function startCronJob(schedule: ScanSchedule): Promise<void> {
  if (!schedule.enabled) {
    return;
  }

  // Stop existing job if any
  stopCronJob(schedule.id);

  const cronExpression = frequencyToCron(schedule.frequency, schedule.preferred_time);
  
  const task = cron.schedule(cronExpression, async () => {
    logger.info(`Executing scheduled scan for location ${schedule.location_id}`);
    try {
      await runScheduledScan(schedule.id);
    } catch (error) {
      logger.error('Scheduled scan execution failed:', error);
    }
  });

  activeCronJobs.set(schedule.id, task);
  logger.info(`Cron job started for schedule ${schedule.id}: ${cronExpression}`);
}

/**
 * Stop a cron job
 */
function stopCronJob(scheduleId: string): void {
  const task = activeCronJobs.get(scheduleId);
  if (task) {
    task.stop();
    activeCronJobs.delete(scheduleId);
    logger.info(`Cron job stopped for schedule ${scheduleId}`);
  }
}

/**
 * Initialize all active schedules on startup
 */
export async function initializeSchedules(): Promise<void> {
  try {
    const result = await pool.query(
      'SELECT * FROM scan_schedules WHERE enabled = true'
    );
    
    for (const schedule of result.rows) {
      await startCronJob(schedule);
    }
    
    logger.info(`Initialized ${result.rows.length} active scan schedules`);
  } catch (error) {
    logger.error('Failed to initialize schedules:', error);
  }
}

/**
 * Trigger an immediate scan (manual trigger)
 */
export async function runImmediateScan(locationId: string): Promise<ScanHistory> {
  const schedule = await getSchedule(locationId);
  
  if (!schedule) {
    throw new Error('No schedule found for this location');
  }

  return await runScheduledScan(schedule.id);
}
