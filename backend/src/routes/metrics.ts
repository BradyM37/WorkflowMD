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

export default metricsRouter;
