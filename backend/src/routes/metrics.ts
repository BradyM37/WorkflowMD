/**
 * Metrics API Routes
 * Response time tracking and analytics endpoints
 */

import { Router } from 'express';
import { requireAuth, requireGHLConnection } from '../middleware/auth';
import { ApiResponse } from '../lib/response';
import { asyncHandler } from '../middleware/error-handler';
import { logger } from '../lib/logger';
import { 
  syncConversations,
  getOverviewMetrics, 
  getMissedConversations,
  getDailyTrend,
  BENCHMARKS
} from '../lib/response-analyzer';
import { getBadgeCounts, getUserBadges, BADGE_INFO } from '../lib/badges';
import { 
  generateInsights, 
  dismissInsight, 
  markInsightAddressed,
  getDismissedInsights
} from '../lib/insights-engine';
import { getLocationUsers, getConversationMessages } from '../lib/ghl-conversations';
import { pool } from '../lib/database';

const metricsRouter = Router();

/**
 * GET /api/metrics/overview
 * Get overview metrics for dashboard
 */
metricsRouter.get(
  '/overview',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 7;
    
    logger.info('Fetching overview metrics', { locationId, days, requestId: req.id });
    
    const metrics = await getOverviewMetrics(locationId, days);
    
    return ApiResponse.success(res, {
      metrics,
      benchmarks: BENCHMARKS,
      period: { days, startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000) }
    });
  })
);

/**
 * GET /api/metrics/trend
 * Get daily trend data for charts
 */
metricsRouter.get(
  '/trend',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 30;
    
    logger.info('Fetching trend data', { locationId, days, requestId: req.id });
    
    const trend = await getDailyTrend(locationId, days);
    
    return ApiResponse.success(res, { trend, days });
  })
);

/**
 * GET /api/metrics/missed
 * Get list of missed conversations (leads needing follow-up)
 */
metricsRouter.get(
  '/missed',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const limit = parseInt(req.query.limit as string) || 20;
    
    logger.info('Fetching missed conversations', { locationId, limit, requestId: req.id });
    
    const missed = await getMissedConversations(locationId, limit);
    
    return ApiResponse.success(res, { 
      conversations: missed,
      count: missed.length
    });
  })
);

/**
 * GET /api/metrics/team
 * Get per-user/team metrics
 */
metricsRouter.get(
  '/team',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 7;
    
    logger.info('Fetching team metrics', { locationId, days, requestId: req.id });
    
    // Get user metrics from daily aggregates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await pool.query(`
      SELECT 
        assigned_user_id as user_id,
        assigned_user_name as user_name,
        COUNT(*) as total_responses,
        AVG(response_time_seconds)::INTEGER as avg_response_time,
        MIN(response_time_seconds) as fastest_response,
        COUNT(*) FILTER (WHERE is_missed = true) as missed_count
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND assigned_user_id IS NOT NULL
      GROUP BY assigned_user_id, assigned_user_name
      ORDER BY avg_response_time ASC
    `, [locationId, startDate]);
    
    // Also get user list from GHL for names
    const ghlUsers = await getLocationUsers(locationId);
    const userMap = new Map(ghlUsers.map(u => [u.id, u]));
    
    const team = result.rows.map(row => ({
      userId: row.user_id,
      userName: row.user_name || userMap.get(row.user_id)?.name || 'Unknown',
      email: userMap.get(row.user_id)?.email,
      totalResponses: parseInt(row.total_responses),
      avgResponseTime: row.avg_response_time || 0,
      fastestResponse: row.fastest_response || 0,
      missedCount: parseInt(row.missed_count) || 0
    }));
    
    return ApiResponse.success(res, { team, period: { days } });
  })
);

/**
 * GET /api/metrics/channels
 * Get metrics broken down by channel
 */
metricsRouter.get(
  '/channels',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 7;
    
    logger.info('Fetching channel metrics', { locationId, days, requestId: req.id });
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await pool.query(`
      SELECT 
        channel,
        COUNT(*) as total_conversations,
        AVG(response_time_seconds)::INTEGER as avg_response_time,
        COUNT(*) FILTER (WHERE is_missed = true) as missed_count,
        COUNT(*) FILTER (WHERE response_time_seconds < 300) as fast_responses
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at IS NOT NULL
      GROUP BY channel
      ORDER BY total_conversations DESC
    `, [locationId, startDate]);
    
    const channels = result.rows.map(row => ({
      channel: row.channel,
      totalConversations: parseInt(row.total_conversations),
      avgResponseTime: row.avg_response_time || 0,
      missedCount: parseInt(row.missed_count) || 0,
      fastResponses: parseInt(row.fast_responses) || 0
    }));
    
    return ApiResponse.success(res, { channels, period: { days } });
  })
);

/**
 * GET /api/metrics/conversation/:id
 * Get full conversation details with messages
 */
metricsRouter.get(
  '/conversation/:id',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const conversationId = req.params.id;
    
    logger.info('Fetching conversation detail', { locationId, conversationId, requestId: req.id });
    
    // Get conversation details from our DB
    const convResult = await pool.query(`
      SELECT 
        id, ghl_conversation_id, contact_id, contact_name, 
        contact_email, contact_phone, channel, 
        first_inbound_at, first_response_at, response_time_seconds,
        is_missed, assigned_user_id, assigned_user_name
      FROM conversations
      WHERE id = $1 AND location_id = $2
    `, [conversationId, locationId]);
    
    if (convResult.rows.length === 0) {
      return ApiResponse.error(res, 'Conversation not found', 404);
    }
    
    const conversation = convResult.rows[0];
    
    // Fetch messages directly from GHL
    let messages: any[] = [];
    try {
      const ghlMessages = await getConversationMessages(
        conversation.ghl_conversation_id, 
        locationId, 
        { limit: 50 }
      );
      
      // Sort messages by date (oldest first for timeline)
      messages = ghlMessages
        .sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime())
        .map(msg => ({
          id: msg.id,
          direction: msg.direction,
          body: msg.body || '',
          dateAdded: msg.dateAdded,
          messageType: msg.type
        }));
    } catch (err) {
      logger.warn('Failed to fetch messages from GHL', { conversationId }, err as Error);
      // Return conversation without messages if GHL fails
    }
    
    return ApiResponse.success(res, {
      id: conversation.id,
      ghlConversationId: conversation.ghl_conversation_id,
      contactName: conversation.contact_name,
      contactEmail: conversation.contact_email,
      contactPhone: conversation.contact_phone,
      channel: conversation.channel,
      firstInboundAt: conversation.first_inbound_at,
      firstResponseAt: conversation.first_response_at,
      responseTimeSeconds: conversation.response_time_seconds,
      isMissed: conversation.is_missed,
      assignedUserId: conversation.assigned_user_id,
      assignedUserName: conversation.assigned_user_name,
      messages
    });
  })
);

/**
 * POST /api/metrics/sync
 * Trigger a manual sync of conversations from GHL
 */
metricsRouter.post(
  '/sync',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    
    logger.info('Manual sync triggered', { locationId, userId: req.userId, requestId: req.id });
    
    // Check if sync is already in progress
    const syncState = await pool.query(
      'SELECT sync_status FROM sync_state WHERE location_id = $1',
      [locationId]
    );
    
    if (syncState.rows[0]?.sync_status === 'syncing') {
      return ApiResponse.error(res, 'Sync already in progress', 409);
    }
    
    // Start sync in background
    syncConversations(locationId).catch(err => {
      logger.error('Background sync failed', { locationId }, err);
    });
    
    return ApiResponse.success(res, { 
      message: 'Sync started',
      status: 'syncing'
    });
  })
);

/**
 * GET /api/metrics/sync/status
 * Get current sync status
 */
metricsRouter.get(
  '/sync/status',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    
    const result = await pool.query(
      'SELECT sync_status, last_sync_at, error_message FROM sync_state WHERE location_id = $1',
      [locationId]
    );
    
    const state = result.rows[0] || { sync_status: 'pending', last_sync_at: null };
    
    return ApiResponse.success(res, {
      status: state.sync_status,
      lastSyncAt: state.last_sync_at,
      error: state.error_message
    });
  })
);

/**
 * GET /api/metrics/team/badges
 * Get badges for all team members
 */
metricsRouter.get(
  '/team/badges',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    
    // Get all users who have conversations
    const userResult = await pool.query(`
      SELECT DISTINCT assigned_user_id as user_id
      FROM conversations
      WHERE location_id = $1 AND assigned_user_id IS NOT NULL
    `, [locationId]);
    
    const userIds = userResult.rows.map(r => r.user_id);
    const badgeCounts = await getBadgeCounts(locationId, userIds);
    
    // Convert Map to object for JSON response
    const badges: Record<string, { type: string; count: number; icon: string; label: string }[]> = {};
    for (const [userId, counts] of badgeCounts) {
      badges[userId] = counts.map(c => ({
        type: c.type,
        count: c.count,
        icon: BADGE_INFO[c.type]?.icon || '🏅',
        label: BADGE_INFO[c.type]?.label || c.type
      }));
    }
    
    return ApiResponse.success(res, { badges, badgeInfo: BADGE_INFO });
  })
);

/**
 * GET /api/metrics/user/:userId
 * Get detailed stats for a specific user (for drilldown modal)
 */
metricsRouter.get(
  '/user/:userId',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const userId = req.params.userId;
    const days = parseInt(req.query.days as string) || 30;
    
    logger.info('Fetching user detail', { locationId, userId, days, requestId: req.id });
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get user aggregate stats
    const statsResult = await pool.query(`
      SELECT 
        assigned_user_name as user_name,
        COUNT(*) as total_responses,
        AVG(response_time_seconds)::INTEGER as avg_response_time,
        MIN(response_time_seconds) as fastest_response,
        MAX(response_time_seconds) as slowest_response,
        COUNT(*) FILTER (WHERE is_missed = true) as missed_count,
        COUNT(*) FILTER (WHERE response_time_seconds < 60) as under_1min,
        COUNT(*) FILTER (WHERE response_time_seconds < 300) as under_5min
      FROM conversations
      WHERE location_id = $1 
        AND assigned_user_id = $2
        AND first_inbound_at >= $3
    `, [locationId, userId, startDate]);
    
    const stats = statsResult.rows[0] || {};
    
    // Get daily breakdown for chart
    const dailyResult = await pool.query(`
      SELECT 
        DATE(first_inbound_at) as date,
        AVG(response_time_seconds)::INTEGER as avg_response_time,
        COUNT(*) as total_conversations,
        COUNT(*) FILTER (WHERE is_missed = true) as missed_count
      FROM conversations
      WHERE location_id = $1 
        AND assigned_user_id = $2
        AND first_inbound_at >= $3
        AND first_inbound_at IS NOT NULL
      GROUP BY DATE(first_inbound_at)
      ORDER BY date ASC
    `, [locationId, userId, startDate]);
    
    // Get recent conversations
    const recentResult = await pool.query(`
      SELECT 
        id, contact_name, channel, first_inbound_at, 
        first_response_at, response_time_seconds, is_missed
      FROM conversations
      WHERE location_id = $1 
        AND assigned_user_id = $2
        AND first_inbound_at IS NOT NULL
      ORDER BY first_inbound_at DESC
      LIMIT 10
    `, [locationId, userId]);
    
    // Get user badges
    const badges = await getUserBadges(locationId, userId);
    
    return ApiResponse.success(res, {
      userId,
      userName: stats.user_name || 'Unknown',
      stats: {
        totalResponses: parseInt(stats.total_responses) || 0,
        avgResponseTime: stats.avg_response_time || 0,
        fastestResponse: stats.fastest_response || 0,
        slowestResponse: stats.slowest_response || 0,
        missedCount: parseInt(stats.missed_count) || 0,
        under1Min: parseInt(stats.under_1min) || 0,
        under5Min: parseInt(stats.under_5min) || 0
      },
      dailyTrend: dailyResult.rows.map(row => ({
        date: row.date.toISOString().split('T')[0],
        avgResponseTime: row.avg_response_time || 0,
        totalConversations: parseInt(row.total_conversations),
        missedCount: parseInt(row.missed_count)
      })),
      recentConversations: recentResult.rows.map(row => ({
        id: row.id,
        contactName: row.contact_name,
        channel: row.channel,
        firstInboundAt: row.first_inbound_at,
        firstResponseAt: row.first_response_at,
        responseTimeSeconds: row.response_time_seconds,
        isMissed: row.is_missed
      })),
      badges: badges.map(b => ({
        type: b.badgeType,
        earnedAt: b.earnedAt,
        icon: BADGE_INFO[b.badgeType]?.icon || '🏅',
        label: BADGE_INFO[b.badgeType]?.label || b.badgeType
      }))
    });
  })
);

/**
 * GET /api/metrics/goals
 * Get goal progress for the current period
 */
metricsRouter.get(
  '/goals',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 7;
    
    logger.info('Fetching goal progress', { locationId, days, requestId: req.id });
    
    // Get user's target response time setting
    const settingsResult = await pool.query(
      `SELECT target_response_time, goal_celebration_shown_date 
       FROM alert_settings WHERE location_id = $1`,
      [locationId]
    );
    
    const targetResponseTime = settingsResult.rows[0]?.target_response_time || 120; // Default 2 minutes
    const lastCelebrationDate = settingsResult.rows[0]?.goal_celebration_shown_date;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Calculate goal progress
    const progressResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) as total_responses,
        COUNT(*) FILTER (WHERE response_time_seconds <= $3) as responses_meeting_goal,
        AVG(response_time_seconds)::INTEGER as avg_response_time,
        MIN(response_time_seconds) as best_response_time,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL AND response_time_seconds <= 60) as under_1min,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL AND response_time_seconds <= 300) as under_5min
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at IS NOT NULL
    `, [locationId, startDate, targetResponseTime]);
    
    const stats = progressResult.rows[0] || {};
    const totalResponses = parseInt(stats.total_responses) || 0;
    const responsesMeetingGoal = parseInt(stats.responses_meeting_goal) || 0;
    const goalPercentage = totalResponses > 0 
      ? Math.round((responsesMeetingGoal / totalResponses) * 100) 
      : 0;
    
    // Check if goal was achieved today (>= 90% compliance for the day)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) as total_responses,
        COUNT(*) FILTER (WHERE response_time_seconds <= $3) as responses_meeting_goal
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at IS NOT NULL
    `, [locationId, todayStart, targetResponseTime]);
    
    const todayStats = todayResult.rows[0] || {};
    const todayTotal = parseInt(todayStats.total_responses) || 0;
    const todayMeetingGoal = parseInt(todayStats.responses_meeting_goal) || 0;
    const todayPercentage = todayTotal > 0 
      ? Math.round((todayMeetingGoal / todayTotal) * 100) 
      : 0;
    
    // Determine if we should show celebration (goal achieved today and not shown yet)
    const today = new Date().toISOString().split('T')[0];
    const goalAchievedToday = todayTotal >= 3 && todayPercentage >= 90; // Need at least 3 responses and 90% compliance
    const shouldCelebrate = goalAchievedToday && lastCelebrationDate !== today;
    
    // Format target for display
    const formatTime = (seconds: number): string => {
      if (seconds < 60) return `${seconds} seconds`;
      if (seconds === 60) return '1 minute';
      if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
      return `${(seconds / 3600).toFixed(1)} hours`;
    };
    
    // Historical daily progress for trend
    const dailyProgressResult = await pool.query(`
      SELECT 
        DATE(first_inbound_at) as date,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) as total_responses,
        COUNT(*) FILTER (WHERE response_time_seconds <= $3) as responses_meeting_goal
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at IS NOT NULL
      GROUP BY DATE(first_inbound_at)
      ORDER BY date ASC
    `, [locationId, startDate, targetResponseTime]);
    
    const dailyProgress = dailyProgressResult.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      totalResponses: parseInt(row.total_responses) || 0,
      responsesMeetingGoal: parseInt(row.responses_meeting_goal) || 0,
      percentage: parseInt(row.total_responses) > 0 
        ? Math.round((parseInt(row.responses_meeting_goal) / parseInt(row.total_responses)) * 100)
        : 0
    }));
    
    return ApiResponse.success(res, {
      goal: {
        targetSeconds: targetResponseTime,
        targetFormatted: formatTime(targetResponseTime)
      },
      progress: {
        totalResponses,
        responsesMeetingGoal,
        percentage: goalPercentage,
        avgResponseTime: stats.avg_response_time || 0,
        bestResponseTime: stats.best_response_time || 0
      },
      today: {
        totalResponses: todayTotal,
        responsesMeetingGoal: todayMeetingGoal,
        percentage: todayPercentage,
        goalAchieved: goalAchievedToday
      },
      shouldCelebrate,
      dailyProgress,
      period: { days }
    });
  })
);

/**
 * POST /api/metrics/goals/celebrate
 * Mark celebration as shown for today (prevents repeat animations)
 */
metricsRouter.post(
  '/goals/celebrate',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const today = new Date().toISOString().split('T')[0];
    
    await pool.query(`
      UPDATE alert_settings 
      SET goal_celebration_shown_date = $2
      WHERE location_id = $1
    `, [locationId, today]);
    
    logger.info('Goal celebration marked as shown', { locationId, date: today });
    
    return ApiResponse.success(res, { 
      message: 'Celebration acknowledged',
      date: today
    });
  })
);

/**
 * GET /api/metrics/activity
 * Get recent activity feed (responses in real-time)
 */
metricsRouter.get(
  '/activity',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    
    logger.info('Fetching activity feed', { locationId, limit, requestId: req.id });
    
    // Get recent conversations with responses from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const result = await pool.query(`
      SELECT 
        id,
        contact_name,
        channel,
        first_inbound_at,
        first_response_at,
        response_time_seconds,
        is_missed,
        assigned_user_id,
        assigned_user_name
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at IS NOT NULL
      ORDER BY 
        COALESCE(first_response_at, first_inbound_at) DESC
      LIMIT $3
    `, [locationId, oneDayAgo, limit]);
    
    const activities = result.rows.map(row => ({
      id: row.id,
      type: row.is_missed ? 'missed' : 'response',
      responderName: row.assigned_user_name || 'Team',
      contactName: row.contact_name || 'Unknown Contact',
      channel: row.channel || 'unknown',
      responseTimeSeconds: row.response_time_seconds,
      timestamp: row.first_response_at || row.first_inbound_at,
      isMissed: row.is_missed
    }));
    
    return ApiResponse.success(res, { 
      activities,
      count: activities.length,
      period: '24h'
    });
  })
);

export default metricsRouter;
