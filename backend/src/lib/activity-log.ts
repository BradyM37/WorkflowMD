/**
 * Activity Log Service
 * Tracks user actions for accountability and audit trails
 */

import { pool } from './database';
import { logger } from './logger';

// Define action types
export enum ActivityAction {
  // Settings
  SETTINGS_CHANGED = 'settings_changed',
  BRANDING_UPDATED = 'branding_updated',
  NOTIFICATION_SETTINGS_CHANGED = 'notification_settings_changed',
  
  // Reports
  REPORT_GENERATED = 'report_generated',
  REPORT_SCHEDULED = 'report_scheduled',
  REPORT_SENT = 'report_sent',
  
  // Goals
  GOAL_SET = 'goal_set',
  GOAL_UPDATED = 'goal_updated',
  GOAL_DELETED = 'goal_deleted',
  
  // Exports
  EXPORT_DOWNLOADED = 'export_downloaded',
  PDF_GENERATED = 'pdf_generated',
  
  // Integrations
  SLACK_CONNECTED = 'slack_connected',
  SLACK_DISCONNECTED = 'slack_disconnected',
  WEBHOOK_CONFIGURED = 'webhook_configured',
  
  // Subscription
  SUBSCRIPTION_UPGRADED = 'subscription_upgraded',
  SUBSCRIPTION_DOWNGRADED = 'subscription_downgraded',
  SUBSCRIPTION_CANCELLED = 'subscription_cancelled',
  
  // Team
  TEAM_MEMBER_ADDED = 'team_member_added',
  TEAM_MEMBER_REMOVED = 'team_member_removed',
  
  // Auth
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  
  // Response Settings
  RESPONSE_GOALS_UPDATED = 'response_goals_updated',
  BUSINESS_HOURS_UPDATED = 'business_hours_updated',
}

export enum EntityType {
  SETTINGS = 'settings',
  REPORT = 'report',
  GOAL = 'goal',
  EXPORT = 'export',
  INTEGRATION = 'integration',
  SUBSCRIPTION = 'subscription',
  USER = 'user',
  TEAM = 'team',
  BRANDING = 'branding',
}

interface ActivityLogParams {
  locationId: string;
  userId?: string;
  action: ActivityAction | string;
  entityType?: EntityType | string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

/**
 * Log an activity event
 */
export async function logActivity(params: ActivityLogParams): Promise<void> {
  const { locationId, userId, action, entityType, entityId, metadata, ipAddress } = params;

  try {
    await pool.query(
      `INSERT INTO activity_logs (location_id, user_id, action, entity_type, entity_id, metadata, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        locationId,
        userId || null,
        action,
        entityType || null,
        entityId || null,
        JSON.stringify(metadata || {}),
        ipAddress || null
      ]
    );
    
    logger.debug('Activity logged', { locationId, action, entityType });
  } catch (error) {
    // Don't throw - activity logging should never break the main flow
    logger.error('Failed to log activity', { error, params });
  }
}

/**
 * Get activity logs for a location
 */
export async function getActivityLogs(
  locationId: string,
  options: {
    limit?: number;
    offset?: number;
    action?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    entityType?: string;
  } = {}
): Promise<{ logs: any[]; total: number }> {
  const { limit = 50, offset = 0, action, userId, startDate, endDate, entityType } = options;
  
  let whereClause = 'WHERE location_id = $1';
  const params: any[] = [locationId];
  let paramIndex = 2;

  if (action) {
    whereClause += ` AND action = $${paramIndex}`;
    params.push(action);
    paramIndex++;
  }

  if (userId) {
    whereClause += ` AND user_id = $${paramIndex}`;
    params.push(userId);
    paramIndex++;
  }

  if (startDate) {
    whereClause += ` AND created_at >= $${paramIndex}`;
    params.push(startDate);
    paramIndex++;
  }

  if (endDate) {
    whereClause += ` AND created_at <= $${paramIndex}`;
    params.push(endDate);
    paramIndex++;
  }

  if (entityType) {
    whereClause += ` AND entity_type = $${paramIndex}`;
    params.push(entityType);
    paramIndex++;
  }

  // Get total count
  const countResult = await pool.query(
    `SELECT COUNT(*) FROM activity_logs ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Get paginated logs
  const logsResult = await pool.query(
    `SELECT * FROM activity_logs ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
    [...params, limit, offset]
  );

  return {
    logs: logsResult.rows,
    total
  };
}

/**
 * Get action display name
 */
export function getActionDisplayName(action: string): string {
  const displayNames: Record<string, string> = {
    settings_changed: 'Settings Changed',
    branding_updated: 'Branding Updated',
    notification_settings_changed: 'Notification Settings Changed',
    report_generated: 'Report Generated',
    report_scheduled: 'Report Scheduled',
    report_sent: 'Report Sent',
    goal_set: 'Goal Set',
    goal_updated: 'Goal Updated',
    goal_deleted: 'Goal Deleted',
    export_downloaded: 'Export Downloaded',
    pdf_generated: 'PDF Generated',
    slack_connected: 'Slack Connected',
    slack_disconnected: 'Slack Disconnected',
    webhook_configured: 'Webhook Configured',
    subscription_upgraded: 'Subscription Upgraded',
    subscription_downgraded: 'Subscription Downgraded',
    subscription_cancelled: 'Subscription Cancelled',
    team_member_added: 'Team Member Added',
    team_member_removed: 'Team Member Removed',
    user_login: 'User Login',
    user_logout: 'User Logout',
    response_goals_updated: 'Response Goals Updated',
    business_hours_updated: 'Business Hours Updated',
  };

  return displayNames[action] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}
