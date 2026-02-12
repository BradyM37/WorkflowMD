/**
 * In-App Notifications System
 * Creates and manages notifications for the notification center
 */

import { pool } from './database';
import { logger } from './logger';

export type NotificationType = 'missed_lead' | 'goal_achieved' | 'badge_earned' | 'report_ready';

export interface Notification {
  id: string;
  locationId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
}

/**
 * Create a new notification
 */
export async function createNotification(
  locationId: string,
  type: NotificationType,
  title: string,
  message: string,
  options: {
    userId?: string;
    link?: string;
    metadata?: Record<string, any>;
  } = {}
): Promise<Notification | null> {
  try {
    const result = await pool.query(`
      INSERT INTO notifications (location_id, user_id, type, title, message, link, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, location_id, user_id, type, title, message, link, metadata, is_read, created_at, read_at
    `, [
      locationId,
      options.userId || null,
      type,
      title,
      message,
      options.link || null,
      JSON.stringify(options.metadata || {})
    ]);

    const row = result.rows[0];
    logger.info('Notification created', { locationId, type, title });
    
    return mapRow(row);
  } catch (error) {
    logger.error('Failed to create notification', { locationId, type }, error as Error);
    return null;
  }
}

/**
 * Get notifications for a location
 */
export async function getNotifications(
  locationId: string,
  options: { limit?: number; unreadOnly?: boolean } = {}
): Promise<Notification[]> {
  const { limit = 50, unreadOnly = false } = options;
  
  let query = `
    SELECT id, location_id, user_id, type, title, message, link, metadata, is_read, created_at, read_at
    FROM notifications
    WHERE location_id = $1
  `;
  
  if (unreadOnly) {
    query += ` AND is_read = false`;
  }
  
  query += ` ORDER BY created_at DESC LIMIT $2`;

  const result = await pool.query(query, [locationId, limit]);
  return result.rows.map(mapRow);
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(locationId: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM notifications WHERE location_id = $1 AND is_read = false',
    [locationId]
  );
  return parseInt(result.rows[0].count) || 0;
}

/**
 * Mark notification as read
 */
export async function markAsRead(locationId: string, notificationId: string): Promise<boolean> {
  const result = await pool.query(`
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE id = $1 AND location_id = $2
    RETURNING id
  `, [notificationId, locationId]);
  
  return result.rowCount !== null && result.rowCount > 0;
}

/**
 * Mark all notifications as read for a location
 */
export async function markAllAsRead(locationId: string): Promise<number> {
  const result = await pool.query(`
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE location_id = $1 AND is_read = false
    RETURNING id
  `, [locationId]);
  
  return result.rowCount || 0;
}

// --- Notification Creators for specific events ---

/**
 * Create missed lead notification
 */
export async function notifyMissedLead(
  locationId: string,
  contactName: string,
  conversationId: string
): Promise<void> {
  await createNotification(
    locationId,
    'missed_lead',
    'Missed Lead Alert',
    `Lead "${contactName}" was not responded to within the threshold time.`,
    {
      link: '/dashboard',
      metadata: { conversationId, contactName }
    }
  );
}

/**
 * Create badge earned notification
 */
export async function notifyBadgeEarned(
  locationId: string,
  userId: string,
  userName: string,
  badgeType: string,
  badgeLabel: string,
  badgeIcon: string
): Promise<void> {
  await createNotification(
    locationId,
    'badge_earned',
    `${badgeIcon} Badge Earned!`,
    `${userName} earned the "${badgeLabel}" badge!`,
    {
      userId,
      link: '/leaderboard',
      metadata: { badgeType, userName }
    }
  );
}

/**
 * Create goal achieved notification
 */
export async function notifyGoalAchieved(
  locationId: string,
  goalType: string,
  goalName: string,
  value: number
): Promise<void> {
  await createNotification(
    locationId,
    'goal_achieved',
    '🎯 Goal Achieved!',
    `Congratulations! You hit your ${goalName} goal of ${value}!`,
    {
      link: '/dashboard',
      metadata: { goalType, value }
    }
  );
}

/**
 * Create report ready notification
 */
export async function notifyReportReady(
  locationId: string,
  reportType: string,
  reportPeriod: string
): Promise<void> {
  await createNotification(
    locationId,
    'report_ready',
    '📊 Weekly Summary Ready',
    `Your ${reportPeriod} ${reportType} report is now available.`,
    {
      link: '/reports',
      metadata: { reportType, reportPeriod }
    }
  );
}

function mapRow(row: any): Notification {
  return {
    id: row.id,
    locationId: row.location_id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link,
    metadata: row.metadata,
    isRead: row.is_read,
    createdAt: row.created_at,
    readAt: row.read_at
  };
}
