/**
 * Slack Alerts for Real-time Lead Notifications
 * Sends alerts when leads have been waiting too long without a response
 */

import axios from 'axios';
import { pool } from './database';
import { logger } from './logger';

export interface SlackAlertPayload {
  contactName: string;
  contactPhone?: string;
  contactEmail?: string;
  channel: string;
  waitTimeMinutes: number;
  ghlConversationId: string;
  locationId: string;
}

interface AlertSettings {
  slack_webhook_url: string | null;
  warning_threshold: number;
  alert_wait_threshold?: number; // New: configurable wait time for alerts (in seconds)
}

const DEFAULT_ALERT_WAIT_THRESHOLD = 300; // 5 minutes default

/**
 * Get alert settings for a location
 */
async function getAlertSettings(locationId: string): Promise<AlertSettings | null> {
  try {
    const result = await pool.query(
      `SELECT slack_webhook_url, warning_threshold, alert_wait_threshold 
       FROM alert_settings 
       WHERE location_id = $1`,
      [locationId]
    );
    return result.rows[0] || null;
  } catch (error) {
    logger.error('Failed to get alert settings for Slack', { locationId }, error as Error);
    return null;
  }
}

/**
 * Format wait time in human-readable format
 */
function formatWaitTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  if (remainingMins === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours}h ${remainingMins}m`;
}

/**
 * Get emoji based on wait time urgency
 */
function getUrgencyEmoji(minutes: number): string {
  if (minutes < 5) return '⚡';
  if (minutes < 10) return '⏰';
  if (minutes < 30) return '🚨';
  if (minutes < 60) return '🔥';
  return '💀';
}

/**
 * Get channel emoji
 */
function getChannelEmoji(channel: string): string {
  const emojis: Record<string, string> = {
    'sms': '💬',
    'email': '📧',
    'phone': '📞',
    'facebook': '📘',
    'instagram': '📷',
    'whatsapp': '💚',
    'google': '🔍',
    'webchat': '🌐',
  };
  return emojis[channel?.toLowerCase()] || '💬';
}

/**
 * Build GHL conversation URL
 */
function buildGHLUrl(locationId: string, conversationId: string): string {
  return `https://app.gohighlevel.com/v2/location/${locationId}/conversations/conversation/${conversationId}`;
}

/**
 * Send Slack alert for a waiting lead
 */
export async function sendSlackLeadAlert(
  webhookUrl: string,
  payload: SlackAlertPayload
): Promise<boolean> {
  try {
    const urgencyEmoji = getUrgencyEmoji(payload.waitTimeMinutes);
    const channelEmoji = getChannelEmoji(payload.channel);
    const ghlUrl = buildGHLUrl(payload.locationId, payload.ghlConversationId);
    
    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${urgencyEmoji} Lead Waiting - ${formatWaitTime(payload.waitTimeMinutes)}!`,
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Contact:*\n${payload.contactName || 'Unknown'}`
            },
            {
              type: 'mrkdwn',
              text: `*Channel:*\n${channelEmoji} ${payload.channel?.toUpperCase() || 'Unknown'}`
            }
          ]
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Phone:*\n${payload.contactPhone || 'Not provided'}`
            },
            {
              type: 'mrkdwn',
              text: `*Wait Time:*\n⏱️ ${formatWaitTime(payload.waitTimeMinutes)}`
            }
          ]
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: payload.contactEmail ? `📧 ${payload.contactEmail}` : '📧 No email'
            }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🚀 Respond Now',
                emoji: true
              },
              style: 'primary',
              url: ghlUrl
            }
          ]
        }
      ],
      // Fallback text for notifications
      text: `${urgencyEmoji} ${payload.contactName || 'A lead'} has been waiting ${formatWaitTime(payload.waitTimeMinutes)} on ${payload.channel?.toUpperCase()}!`
    };

    await axios.post(webhookUrl, slackMessage, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GHL-Response-Tracker/2.0'
      },
      timeout: 10000
    });

    logger.info('Slack lead alert sent', {
      contactName: payload.contactName,
      waitMinutes: payload.waitTimeMinutes,
      channel: payload.channel
    });

    return true;
  } catch (error) {
    logger.error('Failed to send Slack lead alert', {
      contactName: payload.contactName,
      webhookUrl: webhookUrl.substring(0, 50) + '...'
    }, error as Error);
    return false;
  }
}

/**
 * Check for waiting leads and send alerts
 * Called periodically by missed-leads-checker
 */
export async function checkAndAlertWaitingLeads(locationId: string): Promise<number> {
  const settings = await getAlertSettings(locationId);
  
  if (!settings?.slack_webhook_url) {
    return 0; // No Slack webhook configured
  }

  const alertThreshold = settings.alert_wait_threshold || DEFAULT_ALERT_WAIT_THRESHOLD;
  
  try {
    // Find conversations waiting longer than threshold that haven't been alerted yet
    const result = await pool.query(`
      SELECT 
        id,
        ghl_conversation_id,
        contact_name,
        contact_phone,
        contact_email,
        channel,
        first_inbound_at,
        location_id
      FROM conversations
      WHERE location_id = $1
        AND first_inbound_at IS NOT NULL
        AND first_response_at IS NULL
        AND is_missed = false
        AND slack_alerted = false
        AND first_inbound_at < NOW() - INTERVAL '${alertThreshold} seconds'
      ORDER BY first_inbound_at ASC
      LIMIT 10
    `, [locationId]);

    if (result.rows.length === 0) {
      return 0;
    }

    let alertsSent = 0;

    for (const row of result.rows) {
      const waitTimeMinutes = Math.floor(
        (Date.now() - new Date(row.first_inbound_at).getTime()) / 60000
      );

      const success = await sendSlackLeadAlert(settings.slack_webhook_url, {
        contactName: row.contact_name,
        contactPhone: row.contact_phone,
        contactEmail: row.contact_email,
        channel: row.channel,
        waitTimeMinutes,
        ghlConversationId: row.ghl_conversation_id,
        locationId: row.location_id
      });

      if (success) {
        // Mark as alerted to avoid duplicate alerts
        await pool.query(
          'UPDATE conversations SET slack_alerted = true WHERE id = $1',
          [row.id]
        );
        alertsSent++;
      }

      // Small delay between alerts to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (alertsSent > 0) {
      logger.info('Slack alerts sent for waiting leads', {
        locationId,
        alertsSent,
        totalChecked: result.rows.length
      });
    }

    return alertsSent;
  } catch (error) {
    logger.error('Failed to check and alert waiting leads', { locationId }, error as Error);
    return 0;
  }
}

/**
 * Send a batch summary alert (optional, for daily digests)
 */
export async function sendSlackDailySummary(
  webhookUrl: string,
  locationId: string,
  metrics: {
    avgResponseTime: number;
    totalConversations: number;
    respondedCount: number;
    missedCount: number;
    responseRate: number;
  }
): Promise<boolean> {
  try {
    const formatTime = (seconds: number): string => {
      if (seconds < 60) return `${Math.round(seconds)}s`;
      if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
      return `${(seconds / 3600).toFixed(1)}h`;
    };

    const gradeEmoji = metrics.avgResponseTime < 60 ? '🚀' :
                       metrics.avgResponseTime < 300 ? '✅' :
                       metrics.avgResponseTime < 900 ? '⚡' :
                       metrics.avgResponseTime < 3600 ? '⚠️' : '🔥';

    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📊 Daily Response Time Report',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Average Response:*\n${gradeEmoji} ${formatTime(metrics.avgResponseTime)}`
            },
            {
              type: 'mrkdwn',
              text: `*Response Rate:*\n${metrics.responseRate >= 90 ? '✅' : '⚠️'} ${metrics.responseRate}%`
            }
          ]
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Conversations:*\n💬 ${metrics.totalConversations}`
            },
            {
              type: 'mrkdwn',
              text: `*Responded:*\n✅ ${metrics.respondedCount}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: metrics.missedCount > 0 
              ? `*⚠️ ${metrics.missedCount} missed lead${metrics.missedCount > 1 ? 's' : ''} - follow up needed!*`
              : '*✨ No missed leads today! Great job!*'
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_Sent from Response Tracker • ${new Date().toLocaleDateString()}_`
            }
          ]
        }
      ],
      text: `Daily Report: ${formatTime(metrics.avgResponseTime)} avg response time, ${metrics.responseRate}% rate`
    };

    await axios.post(webhookUrl, slackMessage, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    logger.info('Slack daily summary sent', { locationId });
    return true;
  } catch (error) {
    logger.error('Failed to send Slack daily summary', { locationId }, error as Error);
    return false;
  }
}
