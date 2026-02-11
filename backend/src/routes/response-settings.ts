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

const responseSettingsRouter = Router();

interface AlertSettings {
  warningThreshold: number;   // seconds - warn when response time exceeds this
  criticalThreshold: number;  // seconds - critical alert
  missedThreshold: number;    // seconds - mark as missed
  emailAlerts: boolean;
  slackWebhookUrl?: string;
}

const DEFAULT_SETTINGS: AlertSettings = {
  warningThreshold: 300,      // 5 minutes
  criticalThreshold: 900,     // 15 minutes
  missedThreshold: 3600,      // 1 hour
  emailAlerts: true,
  slackWebhookUrl: undefined
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
        warningThreshold: row.warning_threshold,
        criticalThreshold: row.critical_threshold,
        missedThreshold: row.missed_threshold,
        emailAlerts: row.email_alerts,
        slackWebhookUrl: row.slack_webhook_url
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
      slackWebhookUrl
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
    
    await pool.query(
      `INSERT INTO alert_settings (
        location_id, warning_threshold, critical_threshold, missed_threshold,
        email_alerts, slack_webhook_url
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (location_id) DO UPDATE SET
        warning_threshold = COALESCE($2, alert_settings.warning_threshold),
        critical_threshold = COALESCE($3, alert_settings.critical_threshold),
        missed_threshold = COALESCE($4, alert_settings.missed_threshold),
        email_alerts = COALESCE($5, alert_settings.email_alerts),
        slack_webhook_url = $6,
        updated_at = NOW()`,
      [
        locationId,
        warningThreshold || DEFAULT_SETTINGS.warningThreshold,
        criticalThreshold || DEFAULT_SETTINGS.criticalThreshold,
        missedThreshold || DEFAULT_SETTINGS.missedThreshold,
        emailAlerts ?? DEFAULT_SETTINGS.emailAlerts,
        slackWebhookUrl || null
      ]
    );
    
    logger.info('Alert settings updated', { locationId, userId: req.userId });
    
    return ApiResponse.success(res, { 
      message: 'Settings updated successfully',
      settings: {
        warningThreshold: warningThreshold || DEFAULT_SETTINGS.warningThreshold,
        criticalThreshold: criticalThreshold || DEFAULT_SETTINGS.criticalThreshold,
        missedThreshold: missedThreshold || DEFAULT_SETTINGS.missedThreshold,
        emailAlerts: emailAlerts ?? DEFAULT_SETTINGS.emailAlerts,
        slackWebhookUrl
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
