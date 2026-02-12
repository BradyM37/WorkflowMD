/**
 * Response Settings API Routes
 * Configure alert thresholds and notification preferences
 */

import { Router } from 'express';
import { requireAuth, requireGHLConnection } from '../middleware/auth';
import { ApiResponse } from '../lib/response';
import { asyncHandler } from '../middleware/error-handler';
import { logger } from '../lib/logger';
import { pool } from '../lib/database';
import { logActivity, ActivityAction, EntityType } from '../lib/activity-log';

const responseSettingsRouter = Router();

interface AlertSettings {
  warningThreshold: number;   // seconds - warn when response time exceeds this
  criticalThreshold: number;  // seconds - critical alert
  missedThreshold: number;    // seconds - mark as missed
  emailAlerts: boolean;
  dailyReportEnabled: boolean;
  weeklyReportEnabled: boolean;
  slackWebhookUrl?: string;
  alertWaitThreshold: number; // seconds - when to send Slack alert for waiting leads
  targetResponseTime: number; // seconds - goal for response time tracking
}

const DEFAULT_SETTINGS: AlertSettings = {
  warningThreshold: 300,      // 5 minutes
  criticalThreshold: 900,     // 15 minutes
  missedThreshold: 3600,      // 1 hour
  emailAlerts: true,
  dailyReportEnabled: true,
  weeklyReportEnabled: false,
  slackWebhookUrl: undefined,
  alertWaitThreshold: 300,    // 5 minutes - send Slack alert after this
  targetResponseTime: 120     // 2 minutes - default goal
};

/**
 * GET /api/settings/response
 * Get current alert settings
 */
responseSettingsRouter.get(
  '/',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    
    const result = await pool.query(
      'SELECT * FROM alert_settings WHERE location_id = $1',
      [locationId]
    );
    
    if (result.rows.length === 0) {
      return ApiResponse.success(res, { settings: DEFAULT_SETTINGS });
    }
    
    const row = result.rows[0];
    
    return ApiResponse.success(res, {
      settings: {
        warningThreshold: row.warning_threshold || DEFAULT_SETTINGS.warningThreshold,
        criticalThreshold: row.critical_threshold || DEFAULT_SETTINGS.criticalThreshold,
        missedThreshold: row.missed_threshold || DEFAULT_SETTINGS.missedThreshold,
        emailAlerts: row.email_alerts ?? DEFAULT_SETTINGS.emailAlerts,
        dailyReportEnabled: row.daily_report_enabled ?? DEFAULT_SETTINGS.dailyReportEnabled,
        weeklyReportEnabled: row.weekly_report_enabled ?? DEFAULT_SETTINGS.weeklyReportEnabled,
        slackWebhookUrl: row.slack_webhook_url,
        alertWaitThreshold: row.alert_wait_threshold || DEFAULT_SETTINGS.alertWaitThreshold,
        targetResponseTime: row.target_response_time || DEFAULT_SETTINGS.targetResponseTime
      }
    });
  })
);

/**
 * PUT /api/settings/response
 * Update alert settings
 */
responseSettingsRouter.put(
  '/',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const {
      warningThreshold,
      criticalThreshold,
      missedThreshold,
      emailAlerts,
      dailyReportEnabled,
      weeklyReportEnabled,
      slackWebhookUrl,
      alertWaitThreshold,
      targetResponseTime
    } = req.body;
    
    // Validate thresholds
    if (warningThreshold && (warningThreshold < 60 || warningThreshold > 86400)) {
      return ApiResponse.badRequest(res, 'Warning threshold must be between 1 minute and 24 hours');
    }
    if (criticalThreshold && (criticalThreshold < 60 || criticalThreshold > 86400)) {
      return ApiResponse.badRequest(res, 'Critical threshold must be between 1 minute and 24 hours');
    }
    if (missedThreshold && (missedThreshold < 300 || missedThreshold > 86400)) {
      return ApiResponse.badRequest(res, 'Missed threshold must be between 5 minutes and 24 hours');
    }
    
    // Validate Slack webhook URL format if provided
    if (slackWebhookUrl && !slackWebhookUrl.startsWith('https://hooks.slack.com/')) {
      return ApiResponse.badRequest(res, 'Invalid Slack webhook URL');
    }
    
    // Validate alertWaitThreshold (1 min to 1 hour)
    if (alertWaitThreshold && (alertWaitThreshold < 60 || alertWaitThreshold > 3600)) {
      return ApiResponse.badRequest(res, 'Alert wait threshold must be between 1 minute and 1 hour');
    }
    
    // Validate targetResponseTime (30 seconds to 1 hour)
    if (targetResponseTime && (targetResponseTime < 30 || targetResponseTime > 3600)) {
      return ApiResponse.badRequest(res, 'Target response time must be between 30 seconds and 1 hour');
    }
    
    await pool.query(
      `INSERT INTO alert_settings (
        location_id, warning_threshold, critical_threshold, missed_threshold,
        email_alerts, daily_report_enabled, weekly_report_enabled, 
        slack_webhook_url, alert_wait_threshold, target_response_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (location_id) DO UPDATE SET
        warning_threshold = COALESCE($2, alert_settings.warning_threshold),
        critical_threshold = COALESCE($3, alert_settings.critical_threshold),
        missed_threshold = COALESCE($4, alert_settings.missed_threshold),
        email_alerts = COALESCE($5, alert_settings.email_alerts),
        daily_report_enabled = COALESCE($6, alert_settings.daily_report_enabled),
        weekly_report_enabled = COALESCE($7, alert_settings.weekly_report_enabled),
        slack_webhook_url = $8,
        alert_wait_threshold = COALESCE($9, alert_settings.alert_wait_threshold),
        target_response_time = COALESCE($10, alert_settings.target_response_time),
        updated_at = NOW()`,
      [
        locationId,
        warningThreshold || DEFAULT_SETTINGS.warningThreshold,
        criticalThreshold || DEFAULT_SETTINGS.criticalThreshold,
        missedThreshold || DEFAULT_SETTINGS.missedThreshold,
        emailAlerts ?? DEFAULT_SETTINGS.emailAlerts,
        dailyReportEnabled ?? DEFAULT_SETTINGS.dailyReportEnabled,
        weeklyReportEnabled ?? DEFAULT_SETTINGS.weeklyReportEnabled,
        slackWebhookUrl || null,
        alertWaitThreshold || DEFAULT_SETTINGS.alertWaitThreshold,
        targetResponseTime || DEFAULT_SETTINGS.targetResponseTime
      ]
    );
    
    logger.info('Alert settings updated', { locationId, userId: req.userId });
    
    // Log activity
    await logActivity({
      locationId,
      userId: req.userId,
      action: ActivityAction.RESPONSE_GOALS_UPDATED,
      entityType: EntityType.SETTINGS,
      metadata: { 
        targetResponseTime,
        warningThreshold,
        criticalThreshold,
        missedThreshold 
      }
    });
    
    return ApiResponse.success(res, { 
      message: 'Settings updated successfully',
      settings: {
        warningThreshold: warningThreshold || DEFAULT_SETTINGS.warningThreshold,
        criticalThreshold: criticalThreshold || DEFAULT_SETTINGS.criticalThreshold,
        missedThreshold: missedThreshold || DEFAULT_SETTINGS.missedThreshold,
        emailAlerts: emailAlerts ?? DEFAULT_SETTINGS.emailAlerts,
        dailyReportEnabled: dailyReportEnabled ?? DEFAULT_SETTINGS.dailyReportEnabled,
        weeklyReportEnabled: weeklyReportEnabled ?? DEFAULT_SETTINGS.weeklyReportEnabled,
        slackWebhookUrl,
        alertWaitThreshold: alertWaitThreshold || DEFAULT_SETTINGS.alertWaitThreshold,
        targetResponseTime: targetResponseTime || DEFAULT_SETTINGS.targetResponseTime
      }
    });
  })
);

/**
 * POST /api/settings/response/test-slack
 * Test Slack webhook integration
 */
responseSettingsRouter.post(
  '/test-slack',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const { webhookUrl } = req.body;
    
    if (!webhookUrl || !webhookUrl.startsWith('https://hooks.slack.com/')) {
      return ApiResponse.badRequest(res, 'Invalid Slack webhook URL');
    }
    
    try {
      const axios = (await import('axios')).default;
      
      await axios.post(webhookUrl, {
        text: '✅ *Response Tracker Connected!*\nYou will receive alerts for slow responses and missed leads.',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '✅ *Response Tracker Connected!*\nYou will receive alerts for slow responses and missed leads.'
            }
          }
        ]
      });
      
      return ApiResponse.success(res, { message: 'Test message sent successfully' });
    } catch (error: any) {
      logger.error('Slack test failed', { webhookUrl }, error);
      return ApiResponse.badRequest(res, 'Failed to send test message. Please check your webhook URL.');
    }
  })
);

export default responseSettingsRouter;
