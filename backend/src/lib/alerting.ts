import axios from 'axios';
import { pool } from './database';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';
import { sendWorkflowFailureAlert, WorkflowAlert } from './email-service';

export interface Alert {
  type: 'failure' | 'critical_issue' | 'schedule_complete';
  severity: 'critical' | 'warning' | 'info';
  workflowId: string;
  workflowName: string;
  message: string;
  details: any;
}

export interface AlertSettings {
  id: string;
  location_id: string;
  enabled: boolean;
  failure_threshold: number;
  time_window_hours: number;
  alert_on_critical: boolean;
  alert_email?: string;
  webhook_url?: string;
}

/**
 * Get alert settings for a location
 */
export async function getAlertSettings(locationId: string): Promise<AlertSettings | null> {
  try {
    const query = `SELECT * FROM alert_settings WHERE location_id = $1`;
    const result = await pool.query(query, [locationId]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to get alert settings:', error);
    throw error;
  }
}

/**
 * Create or update alert settings
 */
export async function upsertAlertSettings(settings: {
  locationId: string;
  enabled?: boolean;
  failureThreshold?: number;
  timeWindowHours?: number;
  alertOnCritical?: boolean;
  alertEmail?: string;
  webhookUrl?: string;
}): Promise<AlertSettings> {
  const id = uuidv4();
  
  const query = `
    INSERT INTO alert_settings (
      id, location_id, enabled, failure_threshold, time_window_hours,
      alert_on_critical, alert_email, webhook_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (location_id) 
    DO UPDATE SET 
      enabled = COALESCE($3, alert_settings.enabled),
      failure_threshold = COALESCE($4, alert_settings.failure_threshold),
      time_window_hours = COALESCE($5, alert_settings.time_window_hours),
      alert_on_critical = COALESCE($6, alert_settings.alert_on_critical),
      alert_email = COALESCE($7, alert_settings.alert_email),
      webhook_url = COALESCE($8, alert_settings.webhook_url)
    RETURNING *
  `;
  
  const values = [
    id,
    settings.locationId,
    settings.enabled ?? true,
    settings.failureThreshold ?? 3,
    settings.timeWindowHours ?? 24,
    settings.alertOnCritical ?? true,
    settings.alertEmail || null,
    settings.webhookUrl || null
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to upsert alert settings:', error);
    throw error;
  }
}

/**
 * Check if an alert should be sent based on user preferences
 */
export async function shouldAlert(locationId: string, alert: Alert): Promise<boolean> {
  const settings = await getAlertSettings(locationId);
  
  if (!settings || !settings.enabled) {
    return false;
  }

  // Check severity-based filtering
  if (alert.severity === 'critical' && !settings.alert_on_critical) {
    return false;
  }

  return true;
}

/**
 * Send alert via all configured channels
 */
export async function sendAlert(locationId: string, alert: Alert): Promise<void> {
  try {
    const shouldSend = await shouldAlert(locationId, alert);
    if (!shouldSend) {
      logger.info(`Alert skipped for location ${locationId} (disabled or filtered)`);
      return;
    }

    const settings = await getAlertSettings(locationId);
    if (!settings) {
      return;
    }

    const results: Promise<void>[] = [];

    // Send email if configured
    if (settings.alert_email) {
      results.push(sendEmailAlert(settings.alert_email, alert));
    }

    // Send webhook if configured
    if (settings.webhook_url) {
      results.push(sendWebhookAlert(settings.webhook_url, alert));
    }

    await Promise.allSettled(results);
    logger.info(`Alert sent for workflow ${alert.workflowId} via ${results.length} channels`);
  } catch (error) {
    logger.error('Failed to send alert:', error);
    throw error;
  }
}

/**
 * Send email notification using AWS SES
 */
export async function sendEmailAlert(email: string, alert: Alert): Promise<void> {
  try {
    // Transform Alert to WorkflowAlert format
    await sendWorkflowFailureAlert(email, {
      workflowId: alert.workflowId,
      workflowName: alert.workflowName,
      severity: alert.severity,
      message: alert.message,
      details: alert.details,
      timestamp: new Date()
    });

    logger.info(`Email alert sent to ${email} via AWS SES`);
  } catch (error) {
    logger.error('Failed to send email alert:', error);
    throw error;
  }
}

/**
 * Send webhook notification
 */
export async function sendWebhookAlert(webhookUrl: string, alert: Alert): Promise<void> {
  try {
    const payload = {
      timestamp: new Date().toISOString(),
      type: alert.type,
      severity: alert.severity,
      workflow: {
        id: alert.workflowId,
        name: alert.workflowName
      },
      message: alert.message,
      details: alert.details
    };

    await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GHL-Workflow-Debugger/2.0'
      },
      timeout: 10000
    });

    logger.info(`Webhook alert sent to ${webhookUrl}`);
  } catch (error) {
    logger.error('Failed to send webhook alert:', error);
    throw error;
  }
}

/**
 * Send a test alert
 */
export async function sendTestAlert(locationId: string): Promise<void> {
  const testAlert: Alert = {
    type: 'critical_issue',
    severity: 'info',
    workflowId: 'test-workflow',
    workflowName: 'Test Workflow',
    message: 'This is a test alert to verify your notification settings are working correctly.',
    details: {
      test: true,
      timestamp: new Date().toISOString()
    }
  };

  await sendAlert(locationId, testAlert);
}
