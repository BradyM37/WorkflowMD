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
 * Supports advanced filtering via query params
 */
metricsRouter.get(
  '/missed',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    
    // Advanced filter params
    const search = req.query.search as string || '';
    const channels = req.query.channel ? (Array.isArray(req.query.channel) ? req.query.channel : [req.query.channel]) : [];
    const userId = req.query.userId as string || null;
    const status = req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : [];
    const minTime = req.query.minTime ? parseInt(req.query.minTime as string) : null;
    const maxTime = req.query.maxTime ? parseInt(req.query.maxTime as string) : null;
    const startDate = req.query.startDate as string || null;
    const endDate = req.query.endDate as string || null;
    
    logger.info('Fetching missed conversations with filters', { 
      locationId, limit, offset, search, channels, userId, status, 
      minTime, maxTime, startDate, endDate, requestId: req.id 
    });
    
    // Build dynamic query with filters
    let whereConditions = ['location_id = $1'];
    let params: any[] = [locationId];
    let paramIndex = 2;
    
    // Search filter (name, phone, email)
    if (search) {
      whereConditions.push(`(
        contact_name ILIKE $${paramIndex} OR 
        contact_phone ILIKE $${paramIndex} OR 
        contact_email ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // Channel filter
    if (channels.length > 0) {
      whereConditions.push(`channel = ANY($${paramIndex})`);
      params.push(channels);
      paramIndex++;
    }
    
    // User filter
    if (userId) {
      if (userId === 'unassigned') {
        whereConditions.push('assigned_user_id IS NULL');
      } else {
        whereConditions.push(`assigned_user_id = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }
    }
    
    // Status filter
    if (status.length > 0) {
      const statusConditions: string[] = [];
      if (status.includes('missed')) statusConditions.push('is_missed = true');
      if (status.includes('responded')) statusConditions.push('(is_missed = false AND first_response_at IS NOT NULL)');
      if (status.includes('pending')) statusConditions.push('(first_response_at IS NULL AND is_missed = false)');
      if (statusConditions.length > 0) {
        whereConditions.push(`(${statusConditions.join(' OR ')})`);
      }
    } else {
      // Default: only missed
      whereConditions.push('is_missed = true');
    }
    
    // Response time range filter
    if (minTime !== null) {
      whereConditions.push(`response_time_seconds >= $${paramIndex}`);
      params.push(minTime);
      paramIndex++;
    }
    if (maxTime !== null) {
      whereConditions.push(`response_time_seconds <= $${paramIndex}`);
      params.push(maxTime);
      paramIndex++;
    }
    
    // Date range filter
    if (startDate) {
      whereConditions.push(`first_inbound_at >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }
    if (endDate) {
      whereConditions.push(`first_inbound_at <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get total count for pagination
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM conversations WHERE ${whereClause}`,
      params
    );
    const totalCount = parseInt(countResult.rows[0].count);
    
    // Get filtered conversations
    const result = await pool.query(`
      SELECT 
        id, ghl_conversation_id, contact_name, contact_email, contact_phone,
        channel, first_inbound_at, first_response_at, response_time_seconds,
        is_missed, assigned_user_id, assigned_user_name, status
      FROM conversations
      WHERE ${whereClause}
      ORDER BY first_inbound_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);
    
    const conversations = result.rows.map(row => ({
      id: row.id,
      ghlConversationId: row.ghl_conversation_id,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      channel: row.channel,
      firstInboundAt: row.first_inbound_at,
      firstResponseAt: row.first_response_at,
      responseTimeSeconds: row.response_time_seconds,
      isMissed: row.is_missed,
      assignedUserId: row.assigned_user_id,
      assignedUserName: row.assigned_user_name,
      status: row.status
    }));
    
    return ApiResponse.success(res, { 
      conversations,
      count: conversations.length,
      total: totalCount,
      offset,
      limit,
      filters: { search, channels, userId, status, minTime, maxTime, startDate, endDate }
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
      logger.error('Failed to fetch messages from GHL', { conversationId }, err as Error);
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

/**
 * GET /api/metrics/insights
 * Get AI-powered insights and recommendations
 */
metricsRouter.get(
  '/insights',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 30;
    
    logger.info('Generating insights', { locationId, days, requestId: req.id });
    
    // Get all insights
    const allInsights = await generateInsights(locationId, days);
    
    // Filter out dismissed insights
    const dismissedIds = await getDismissedInsights(locationId);
    const insights = allInsights.filter(i => !dismissedIds.includes(i.id));
    
    // Group by severity for easy frontend rendering
    const grouped = {
      critical: insights.filter(i => i.severity === 'critical'),
      warning: insights.filter(i => i.severity === 'warning'),
      opportunity: insights.filter(i => i.severity === 'opportunity'),
      info: insights.filter(i => i.severity === 'info')
    };
    
    return ApiResponse.success(res, {
      insights,
      grouped,
      total: insights.length,
      period: { days }
    });
  })
);

/**
 * POST /api/metrics/insights/:id/dismiss
 * Dismiss an insight (hide for 7 days)
 */
metricsRouter.post(
  '/insights/:id/dismiss',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const insightId = req.params.id;
    
    logger.info('Dismissing insight', { locationId, insightId, requestId: req.id });
    
    await dismissInsight(locationId, insightId);
    
    return ApiResponse.success(res, { 
      message: 'Insight dismissed',
      insightId 
    });
  })
);

/**
 * POST /api/metrics/insights/:id/addressed
 * Mark an insight as addressed
 */
metricsRouter.post(
  '/insights/:id/addressed',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const insightId = req.params.id;
    
    logger.info('Marking insight as addressed', { locationId, insightId, requestId: req.id });
    
    await markInsightAddressed(locationId, insightId);
    
    return ApiResponse.success(res, { 
      message: 'Insight marked as addressed',
      insightId 
    });
  })
);

/**
 * GET /api/metrics/sla
 * Get SLA compliance metrics
 */
metricsRouter.get(
  '/sla',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 7;
    const targetSeconds = parseInt(req.query.target as string) || 300; // Default 5 minutes
    
    logger.info('Fetching SLA metrics', { locationId, days, targetSeconds, requestId: req.id });
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL AND response_time_seconds <= $3) as met_sla,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL AND response_time_seconds > $3) as missed_sla,
        COUNT(*) FILTER (WHERE response_time_seconds IS NULL OR is_missed = true) as no_response
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at IS NOT NULL
    `, [locationId, startDate, targetSeconds]);
    
    const stats = result.rows[0] || {};
    const total = parseInt(stats.total) || 0;
    const metSla = parseInt(stats.met_sla) || 0;
    const missedSla = parseInt(stats.missed_sla) || 0;
    const noResponse = parseInt(stats.no_response) || 0;
    
    const complianceRate = total > 0 
      ? Math.round((metSla / (total - noResponse)) * 100) || 0
      : 0;
    
    // Format target for display
    const formatTime = (seconds: number): string => {
      if (seconds < 60) return `${seconds} seconds`;
      if (seconds === 60) return '1 minute';
      if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
      return `${(seconds / 3600).toFixed(1)} hours`;
    };
    
    return ApiResponse.success(res, {
      target: {
        seconds: targetSeconds,
        formatted: formatTime(targetSeconds)
      },
      metrics: {
        total,
        metSla,
        missedSla,
        noResponse,
        complianceRate
      },
      period: { days }
    });
  })
);

/**
 * GET /api/metrics/heatmap
 * Get hourly response time heatmap data
 */
metricsRouter.get(
  '/heatmap',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 30;
    
    logger.info('Fetching heatmap data', { locationId, days, requestId: req.id });
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await pool.query(`
      SELECT 
        EXTRACT(DOW FROM first_inbound_at) as day_of_week,
        EXTRACT(HOUR FROM first_inbound_at) as hour,
        AVG(response_time_seconds)::INTEGER as avg_response_time,
        COUNT(*) as volume
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at IS NOT NULL
        AND response_time_seconds IS NOT NULL
      GROUP BY 
        EXTRACT(DOW FROM first_inbound_at),
        EXTRACT(HOUR FROM first_inbound_at)
      ORDER BY day_of_week, hour
    `, [locationId, startDate]);
    
    const heatmap = result.rows.map(row => ({
      dayOfWeek: parseInt(row.day_of_week),
      hour: parseInt(row.hour),
      avgResponseTime: row.avg_response_time || 0,
      volume: parseInt(row.volume) || 0
    }));
    
    return ApiResponse.success(res, { heatmap, period: { days } });
  })
);

/**
 * GET /api/metrics/export
 * Export metrics as CSV
 */
metricsRouter.get(
  '/export',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 30;
    
    logger.info('Exporting metrics CSV', { locationId, days, requestId: req.id });
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await pool.query(`
      SELECT 
        contact_name,
        contact_email,
        contact_phone,
        channel,
        first_inbound_at,
        first_response_at,
        response_time_seconds,
        is_missed,
        assigned_user_name
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at IS NOT NULL
      ORDER BY first_inbound_at DESC
    `, [locationId, startDate]);
    
    // Build CSV
    const headers = [
      'Contact Name',
      'Email',
      'Phone',
      'Channel',
      'First Inbound',
      'First Response',
      'Response Time (seconds)',
      'Missed',
      'Assigned To'
    ];
    
    const rows = result.rows.map(row => [
      row.contact_name || '',
      row.contact_email || '',
      row.contact_phone || '',
      row.channel || '',
      row.first_inbound_at ? new Date(row.first_inbound_at).toISOString() : '',
      row.first_response_at ? new Date(row.first_response_at).toISOString() : '',
      row.response_time_seconds || '',
      row.is_missed ? 'Yes' : 'No',
      row.assigned_user_name || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="response-metrics-${days}days.csv"`);
    res.send(csv);
  })
);

/**
 * ============================================================
 * REVENUE ATTRIBUTION & ROI TRACKING - THE KILLER FEATURE
 * Connect response time to actual business outcomes
 * Show users the MONEY, not just metrics
 * ============================================================
 */

import {
  getRevenueMetrics,
  calculateROI,
  getBenchmarks,
  updateBenchmarks,
  linkConversationToOpportunity
} from '../lib/revenue-analyzer';

/**
 * GET /api/metrics/revenue
 * Get comprehensive revenue attribution metrics
 * THE HEADLINE ENDPOINT - Shows the money impact
 */
metricsRouter.get(
  '/revenue',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 30;
    
    logger.info('Fetching revenue metrics', { locationId, days, requestId: req.id });
    
    const metrics = await getRevenueMetrics(locationId, days);
    
    return ApiResponse.success(res, {
      ...metrics,
      period: { days, startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      headline: {
        // The money headlines for the dashboard
        moneyFromSpeed: `$${metrics.revenueFromFastResponses.toLocaleString()}`,
        moneyLostSlow: `$${metrics.estimatedLostFromSlow.toLocaleString()}`,
        moneyLostMissed: `$${metrics.estimatedLostFromMissed.toLocaleString()}`,
        totalOpportunityCost: `$${metrics.totalPotentialLost.toLocaleString()}`,
        potentialGain: `$${metrics.roiProjection.potentialGain.toLocaleString()}`
      }
    });
  })
);

/**
 * GET /api/metrics/revenue/roi-calculator
 * Calculate ROI for a specific improvement scenario
 * "If you improve to 3-min avg, you'd gain $X"
 */
metricsRouter.get(
  '/revenue/roi-calculator',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const currentAvgMinutes = parseFloat(req.query.currentAvg as string) || 10;
    const targetAvgMinutes = parseFloat(req.query.targetAvg as string) || 3;
    const monthlyLeads = parseInt(req.query.monthlyLeads as string) || 100;
    
    logger.info('Calculating ROI', { 
      locationId, 
      currentAvgMinutes, 
      targetAvgMinutes, 
      monthlyLeads,
      requestId: req.id 
    });
    
    const roi = await calculateROI(
      locationId,
      currentAvgMinutes,
      targetAvgMinutes,
      monthlyLeads
    );
    
    return ApiResponse.success(res, {
      scenario: {
        currentAvgMinutes,
        targetAvgMinutes,
        monthlyLeads,
        improvementMinutes: currentAvgMinutes - targetAvgMinutes
      },
      roi,
      recommendation: roi.additionalRevenue > 100 
        ? `Improving from ${currentAvgMinutes}min to ${targetAvgMinutes}min average would generate an additional $${roi.additionalRevenue.toLocaleString()}/month - a ${roi.roi}% ROI on your subscription!`
        : `Consider increasing lead volume or improving response speed further for better ROI.`
    });
  })
);

/**
 * GET /api/metrics/revenue/benchmarks
 * Get current revenue benchmarks/settings for the location
 */
metricsRouter.get(
  '/revenue/benchmarks',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    
    logger.info('Fetching revenue benchmarks', { locationId, requestId: req.id });
    
    const benchmarks = await getBenchmarks(locationId);
    
    return ApiResponse.success(res, {
      benchmarks,
      description: {
        conversionRates: 'Expected conversion rates by response time bucket (based on industry research)',
        avgDealValues: 'Average deal values by lead source',
        customAvgDealValue: 'Your custom average deal value (if set)',
        useCustomDealValue: 'Whether to use your custom deal value for calculations'
      }
    });
  })
);

/**
 * PUT /api/metrics/revenue/benchmarks
 * Update revenue benchmarks/settings
 * Allows users to customize their average deal value
 */
metricsRouter.put(
  '/revenue/benchmarks',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const updates = req.body;
    
    logger.info('Updating revenue benchmarks', { 
      locationId, 
      updates,
      requestId: req.id 
    });
    
    // Validate updates
    if (updates.customAvgDealValue !== undefined) {
      const value = parseFloat(updates.customAvgDealValue);
      if (isNaN(value) || value < 0 || value > 1000000) {
        return ApiResponse.error(res, 'Invalid deal value. Must be between 0 and 1,000,000', 400);
      }
      updates.customAvgDealValue = value;
    }
    
    await updateBenchmarks(locationId, updates);
    
    // Return updated benchmarks
    const benchmarks = await getBenchmarks(locationId);
    
    return ApiResponse.success(res, {
      message: 'Benchmarks updated successfully',
      benchmarks
    });
  })
);

/**
 * POST /api/metrics/revenue/link-opportunity
 * Link a conversation to an opportunity/deal for accurate tracking
 */
metricsRouter.post(
  '/revenue/link-opportunity',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const { 
      conversationId, 
      opportunityId, 
      pipelineId,
      pipelineStage,
      dealValue, 
      dealStatus,
      leadSource 
    } = req.body;
    
    if (!conversationId || !opportunityId) {
      return ApiResponse.error(res, 'conversationId and opportunityId are required', 400);
    }
    
    if (!dealValue || isNaN(parseFloat(dealValue))) {
      return ApiResponse.error(res, 'Valid dealValue is required', 400);
    }
    
    const validStatuses = ['open', 'won', 'lost', 'abandoned'];
    if (!dealStatus || !validStatuses.includes(dealStatus)) {
      return ApiResponse.error(res, `dealStatus must be one of: ${validStatuses.join(', ')}`, 400);
    }
    
    logger.info('Linking conversation to opportunity', { 
      locationId, 
      conversationId,
      opportunityId,
      dealValue,
      dealStatus,
      requestId: req.id 
    });
    
    await linkConversationToOpportunity(conversationId, locationId, {
      opportunityId,
      pipelineId,
      pipelineStage,
      dealValue: parseFloat(dealValue),
      dealStatus,
      leadSource
    });
    
    return ApiResponse.success(res, {
      message: 'Conversation linked to opportunity successfully',
      conversationId,
      opportunityId,
      dealValue,
      dealStatus
    });
  })
);

/**
 * GET /api/metrics/revenue/summary
 * Quick summary for dashboard cards
 */
metricsRouter.get(
  '/revenue/summary',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 30;
    
    logger.info('Fetching revenue summary', { locationId, days, requestId: req.id });
    
    const metrics = await getRevenueMetrics(locationId, days);
    
    // Build compelling summary for the dashboard
    const summary = {
      // Hero stat
      fastResponsesGenerated: {
        value: metrics.revenueFromFastResponses,
        formatted: `$${metrics.revenueFromFastResponses.toLocaleString()}`,
        label: 'Revenue from fast responses',
        subtext: 'Responses under 5 minutes that converted'
      },
      
      // Pain point
      potentialLost: {
        value: metrics.totalPotentialLost,
        formatted: `$${metrics.totalPotentialLost.toLocaleString()}`,
        label: 'Estimated lost revenue',
        subtext: `${metrics.conversionByBucket.find(b => b.bucket === 'missed')?.leads || 0} missed + slow responses`
      },
      
      // The opportunity
      improvementGain: {
        value: metrics.roiProjection.potentialGain,
        formatted: `$${metrics.roiProjection.potentialGain.toLocaleString()}`,
        label: 'Potential monthly gain',
        subtext: 'If you improved to 3-min average'
      },
      
      // Speed impact
      speedMultiplier: {
        value: metrics.insights.speedImpactMultiplier,
        formatted: `${metrics.insights.speedImpactMultiplier}x`,
        label: 'Speed advantage',
        subtext: 'Fast responders convert more'
      },
      
      // Per-missed-lead cost
      missedLeadCost: {
        value: metrics.insights.missedLeadCost,
        formatted: `$${Math.round(metrics.insights.missedLeadCost).toLocaleString()}`,
        label: 'Cost per missed lead',
        subtext: 'Average opportunity cost'
      },
      
      // ROI justification
      valuePerMinute: {
        value: metrics.insights.valuePerMinuteImprovement,
        formatted: `$${Math.round(metrics.insights.valuePerMinuteImprovement).toLocaleString()}`,
        label: 'Value per minute faster',
        subtext: 'Monthly gain per minute improved'
      }
    };
    
    return ApiResponse.success(res, {
      summary,
      conversionFunnel: metrics.conversionByBucket.map(b => ({
        bucket: b.label,
        leads: b.leads,
        conversions: b.conversions,
        conversionRate: `${b.conversionRate}%`,
        benchmarkRate: `${b.benchmarkRate}%`,
        revenue: `$${b.revenue.toLocaleString()}`,
        lost: `$${b.estimatedLost.toLocaleString()}`
      })),
      period: { days }
    });
  })
);

/**
 * GET /api/metrics/revenue/trend
 * Revenue trend over time
 */
metricsRouter.get(
  '/revenue/trend',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 30;
    
    logger.info('Fetching revenue trend', { locationId, days, requestId: req.id });
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await pool.query(`
      SELECT 
        date,
        actual_revenue_won,
        revenue_from_fast_responses,
        estimated_lost_from_slow,
        estimated_lost_from_missed,
        revenue_gap,
        actual_deals_won,
        leads_under_1min + leads_1_5min as fast_leads,
        leads_5_15min + leads_15_60min + leads_over_1hr as slow_leads,
        leads_missed as missed_leads
      FROM daily_revenue_metrics
      WHERE location_id = $1 AND date >= $2
      ORDER BY date ASC
    `, [locationId, startDate]);
    
    const trend = result.rows.map(row => ({
      date: row.date.toISOString().split('T')[0],
      actualRevenue: parseFloat(row.actual_revenue_won) || 0,
      fastResponseRevenue: parseFloat(row.revenue_from_fast_responses) || 0,
      estimatedLost: (parseFloat(row.estimated_lost_from_slow) || 0) + (parseFloat(row.estimated_lost_from_missed) || 0),
      revenueGap: parseFloat(row.revenue_gap) || 0,
      dealsWon: parseInt(row.actual_deals_won) || 0,
      fastLeads: parseInt(row.fast_leads) || 0,
      slowLeads: parseInt(row.slow_leads) || 0,
      missedLeads: parseInt(row.missed_leads) || 0
    }));
    
    return ApiResponse.success(res, { trend, period: { days } });
  })
);

/**
 * GET /api/metrics/export
 * Export filtered conversations to CSV
 */
metricsRouter.get(
  '/export',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const format = (req.query.format as string) || 'csv';
    
    // Same filter params as /missed endpoint
    const search = req.query.search as string || '';
    const channels = req.query.channel ? (Array.isArray(req.query.channel) ? req.query.channel : [req.query.channel]) : [];
    const userId = req.query.userId as string || null;
    const status = req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) : [];
    const minTime = req.query.minTime ? parseInt(req.query.minTime as string) : null;
    const maxTime = req.query.maxTime ? parseInt(req.query.maxTime as string) : null;
    const startDate = req.query.startDate as string || null;
    const endDate = req.query.endDate as string || null;
    
    logger.info('Exporting conversations', { 
      locationId, format, search, channels, userId, status, requestId: req.id 
    });
    
    // Build dynamic query with filters (same as /missed)
    let whereConditions = ['location_id = $1'];
    let params: any[] = [locationId];
    let paramIndex = 2;
    
    if (search) {
      whereConditions.push(`(
        contact_name ILIKE $${paramIndex} OR 
        contact_phone ILIKE $${paramIndex} OR 
        contact_email ILIKE $${paramIndex}
      )`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    if (channels.length > 0) {
      whereConditions.push(`channel = ANY($${paramIndex})`);
      params.push(channels);
      paramIndex++;
    }
    
    if (userId) {
      if (userId === 'unassigned') {
        whereConditions.push('assigned_user_id IS NULL');
      } else {
        whereConditions.push(`assigned_user_id = $${paramIndex}`);
        params.push(userId);
        paramIndex++;
      }
    }
    
    if (status.length > 0) {
      const statusConditions: string[] = [];
      if (status.includes('missed')) statusConditions.push('is_missed = true');
      if (status.includes('responded')) statusConditions.push('(is_missed = false AND first_response_at IS NOT NULL)');
      if (status.includes('pending')) statusConditions.push('(first_response_at IS NULL AND is_missed = false)');
      if (statusConditions.length > 0) {
        whereConditions.push(`(${statusConditions.join(' OR ')})`);
      }
    }
    
    if (minTime !== null) {
      whereConditions.push(`response_time_seconds >= $${paramIndex}`);
      params.push(minTime);
      paramIndex++;
    }
    if (maxTime !== null) {
      whereConditions.push(`response_time_seconds <= $${paramIndex}`);
      params.push(maxTime);
      paramIndex++;
    }
    
    if (startDate) {
      whereConditions.push(`first_inbound_at >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }
    if (endDate) {
      whereConditions.push(`first_inbound_at <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    // Get all matching conversations (limit to 10000 for safety)
    const result = await pool.query(`
      SELECT 
        contact_name, contact_email, contact_phone,
        channel, first_inbound_at, first_response_at, response_time_seconds,
        is_missed, assigned_user_name, status
      FROM conversations
      WHERE ${whereClause}
      ORDER BY first_inbound_at DESC
      LIMIT 10000
    `, params);
    
    if (format === 'json') {
      return ApiResponse.success(res, { 
        conversations: result.rows,
        count: result.rows.length,
        exportedAt: new Date().toISOString()
      });
    }
    
    // Generate CSV
    const csvHeader = [
      'Contact Name',
      'Email',
      'Phone',
      'Channel',
      'First Message',
      'First Response',
      'Response Time (seconds)',
      'Response Time (formatted)',
      'Missed',
      'Assigned To',
      'Status'
    ].join(',');
    
    const formatResponseTime = (seconds: number | null): string => {
      if (seconds === null || seconds === undefined) return 'N/A';
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    };
    
    const escapeCSV = (val: any): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csvRows = result.rows.map(row => [
      escapeCSV(row.contact_name),
      escapeCSV(row.contact_email),
      escapeCSV(row.contact_phone),
      escapeCSV(row.channel),
      row.first_inbound_at ? new Date(row.first_inbound_at).toISOString() : '',
      row.first_response_at ? new Date(row.first_response_at).toISOString() : '',
      row.response_time_seconds ?? '',
      formatResponseTime(row.response_time_seconds),
      row.is_missed ? 'Yes' : 'No',
      escapeCSV(row.assigned_user_name),
      escapeCSV(row.status)
    ].join(','));
    
    const csv = [csvHeader, ...csvRows].join('\n');
    
    const filename = `conversations-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  })
);

export default metricsRouter;
