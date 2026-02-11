import { pool } from './database';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export interface ExecutionLog {
  id: string;
  workflow_id: string;
  location_id: string;
  status: 'success' | 'failed' | 'partial';
  failed_action_id?: string;
  failed_action_name?: string;
  error_message?: string;
  execution_time_ms?: number;
  executed_at: Date;
}

export interface FailureMetrics {
  failure_rate: number;
  avg_execution_time: number;
  last_failure: {
    timestamp: string;
    action: string;
    error: string;
  } | null;
  failure_trend: 'increasing' | 'decreasing' | 'stable';
  total_executions: number;
  failed_executions: number;
}

/**
 * Store execution result in database
 */
export async function ingestExecutionLog(
  workflowId: string,
  executionData: {
    locationId: string;
    status: 'success' | 'failed' | 'partial';
    failedActionId?: string;
    failedActionName?: string;
    errorMessage?: string;
    executionTimeMs?: number;
  }
): Promise<ExecutionLog> {
  const id = uuidv4();
  
  const query = `
    INSERT INTO execution_logs (
      id, workflow_id, location_id, status, 
      failed_action_id, failed_action_name, error_message, execution_time_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `;
  
  const values = [
    id,
    workflowId,
    executionData.locationId,
    executionData.status,
    executionData.failedActionId || null,
    executionData.failedActionName || null,
    executionData.errorMessage || null,
    executionData.executionTimeMs || null
  ];

  try {
    const result = await pool.query(query, values);
    logger.info(`Execution log ingested for workflow ${workflowId}: ${executionData.status}`);
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to ingest execution log:', error);
    throw error;
  }
}

/**
 * Get failure rate, trends, and metrics for a workflow
 */
export async function getFailureMetrics(workflowId: string): Promise<FailureMetrics> {
  try {
    // Get total counts
    const countQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
      FROM execution_logs
      WHERE workflow_id = $1
    `;
    const countResult = await pool.query(countQuery, [workflowId]);
    const { total, failed } = countResult.rows[0];

    // Get average execution time
    const avgQuery = `
      SELECT AVG(execution_time_ms) as avg_time
      FROM execution_logs
      WHERE workflow_id = $1 AND execution_time_ms IS NOT NULL
    `;
    const avgResult = await pool.query(avgQuery, [workflowId]);
    const avgTime = parseFloat(avgResult.rows[0].avg_time) || 0;

    // Get last failure
    const lastFailureQuery = `
      SELECT executed_at, failed_action_name, error_message
      FROM execution_logs
      WHERE workflow_id = $1 AND status = 'failed'
      ORDER BY executed_at DESC
      LIMIT 1
    `;
    const lastFailureResult = await pool.query(lastFailureQuery, [workflowId]);
    const lastFailure = lastFailureResult.rows[0] || null;

    // Calculate failure trend (compare last 10 vs previous 10)
    const trendQuery = `
      WITH recent AS (
        SELECT status, ROW_NUMBER() OVER (ORDER BY executed_at DESC) as rn
        FROM execution_logs
        WHERE workflow_id = $1
        LIMIT 20
      )
      SELECT 
        COUNT(CASE WHEN rn <= 10 AND status = 'failed' THEN 1 END) as recent_failures,
        COUNT(CASE WHEN rn > 10 AND status = 'failed' THEN 1 END) as previous_failures
      FROM recent
    `;
    const trendResult = await pool.query(trendQuery, [workflowId]);
    const { recent_failures, previous_failures } = trendResult.rows[0];

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recent_failures > previous_failures) {
      trend = 'increasing';
    } else if (recent_failures < previous_failures) {
      trend = 'decreasing';
    }

    const failureRate = total > 0 ? (failed / total) * 100 : 0;

    return {
      failure_rate: failureRate,
      avg_execution_time: avgTime,
      last_failure: lastFailure ? {
        timestamp: lastFailure.executed_at,
        action: lastFailure.failed_action_name || 'Unknown',
        error: lastFailure.error_message || 'No error message'
      } : null,
      failure_trend: trend,
      total_executions: parseInt(total),
      failed_executions: parseInt(failed)
    };
  } catch (error) {
    logger.error('Failed to get failure metrics:', error);
    throw error;
  }
}

/**
 * Check if failure threshold is exceeded and alert should fire
 */
export async function checkAlertThreshold(locationId: string, workflowId: string): Promise<boolean> {
  try {
    // Get alert settings
    const settingsQuery = `
      SELECT enabled, failure_threshold, time_window_hours
      FROM alert_settings
      WHERE location_id = $1
    `;
    const settingsResult = await pool.query(settingsQuery, [locationId]);
    
    if (settingsResult.rows.length === 0 || !settingsResult.rows[0].enabled) {
      return false;
    }

    const { failure_threshold, time_window_hours } = settingsResult.rows[0];

    // Count failures in time window
    const failureQuery = `
      SELECT COUNT(*) as failure_count
      FROM execution_logs
      WHERE location_id = $1 
        AND workflow_id = $2
        AND status = 'failed'
        AND executed_at > NOW() - INTERVAL '${time_window_hours} hours'
    `;
    const failureResult = await pool.query(failureQuery, [locationId, workflowId]);
    const failureCount = parseInt(failureResult.rows[0].failure_count);

    return failureCount >= failure_threshold;
  } catch (error) {
    logger.error('Failed to check alert threshold:', error);
    return false;
  }
}

/**
 * Get recent failures in a time window
 */
export async function getRecentFailures(workflowId: string, hours: number = 24): Promise<ExecutionLog[]> {
  try {
    const query = `
      SELECT *
      FROM execution_logs
      WHERE workflow_id = $1 
        AND status = 'failed'
        AND executed_at > NOW() - INTERVAL '${hours} hours'
      ORDER BY executed_at DESC
    `;
    const result = await pool.query(query, [workflowId]);
    return result.rows;
  } catch (error) {
    logger.error('Failed to get recent failures:', error);
    throw error;
  }
}

/**
 * Get execution history for a workflow
 */
export async function getExecutionHistory(workflowId: string, limit: number = 50): Promise<ExecutionLog[]> {
  try {
    const query = `
      SELECT *
      FROM execution_logs
      WHERE workflow_id = $1
      ORDER BY executed_at DESC
      LIMIT $2
    `;
    const result = await pool.query(query, [workflowId, limit]);
    return result.rows;
  } catch (error) {
    logger.error('Failed to get execution history:', error);
    throw error;
  }
}
