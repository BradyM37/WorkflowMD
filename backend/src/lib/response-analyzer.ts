/**
 * Response Time Analyzer
 * Calculate response metrics from conversation data
 */

import { pool } from './database';
import { logger } from './logger';
import { 
  searchConversations, 
  getConversationMessages,
  getContact,
  GHLConversation,
  GHLMessage 
} from './ghl-conversations';

// Industry benchmarks (in seconds)
export const BENCHMARKS = {
  EXCELLENT: 60,      // Under 1 minute
  GOOD: 300,          // Under 5 minutes
  AVERAGE: 900,       // Under 15 minutes
  POOR: 3600,         // Under 1 hour
  CRITICAL: 3600      // Over 1 hour = missed lead
};

export interface ResponseMetrics {
  avgResponseTime: number;
  medianResponseTime: number;
  fastestResponse: number;
  slowestResponse: number;
  totalConversations: number;
  respondedConversations: number;
  missedConversations: number;
  responseRate: number;
  speedGrade: 'Excellent' | 'Good' | 'Average' | 'Poor' | 'Critical';
  
  // Bucket counts
  under1Min: number;
  under5Min: number;
  under15Min: number;
  under1Hr: number;
  over1Hr: number;
  
  // Trends
  comparedToYesterday?: number; // percentage change
  comparedToLastWeek?: number;
}

export interface ConversationWithMetrics {
  id: string;
  ghlConversationId: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  channel: string;
  firstInboundAt: Date;
  firstResponseAt?: Date;
  responseTimeSeconds?: number;
  isMissed: boolean;
  assignedUserName?: string;
  status: string;
}

/**
 * Sync conversations from GHL and calculate response times
 */
export async function syncConversations(locationId: string): Promise<{
  synced: number;
  newConversations: number;
  errors: number;
}> {
  logger.info('Starting conversation sync', { locationId });
  
  let synced = 0;
  let newConversations = 0;
  let errors = 0;
  let cursor: string | undefined;
  
  try {
    // Update sync state
    await pool.query(
      `INSERT INTO sync_state (location_id, sync_status, last_sync_at)
       VALUES ($1, 'syncing', NOW())
       ON CONFLICT (location_id) DO UPDATE SET sync_status = 'syncing', last_sync_at = NOW()`,
      [locationId]
    );

    do {
      const { conversations, nextCursor } = await searchConversations(locationId, {
        limit: 100,
        startAfter: cursor
      });
      
      cursor = nextCursor;
      
      for (const conv of conversations) {
        try {
          const result = await processConversation(conv, locationId);
          synced++;
          if (result.isNew) newConversations++;
        } catch (err) {
          logger.error('Error processing conversation', { conversationId: conv.id }, err as Error);
          errors++;
        }
      }
      
      // Don't hammer the API
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } while (cursor);

    // Update sync state - success
    await pool.query(
      `UPDATE sync_state SET sync_status = 'completed', error_message = NULL WHERE location_id = $1`,
      [locationId]
    );

    logger.info('Conversation sync completed', { locationId, synced, newConversations, errors });
    
    // Recalculate daily metrics
    await recalculateDailyMetrics(locationId);
    
    return { synced, newConversations, errors };
  } catch (error) {
    // Update sync state - error
    await pool.query(
      `UPDATE sync_state SET sync_status = 'error', error_message = $2 WHERE location_id = $1`,
      [locationId, (error as Error).message]
    );
    throw error;
  }
}

/**
 * Process a single conversation - calculate response time
 */
async function processConversation(
  conv: GHLConversation, 
  locationId: string
): Promise<{ isNew: boolean }> {
  // Check if we already have this conversation
  const existing = await pool.query(
    'SELECT id, first_inbound_at, first_response_at FROM conversations WHERE ghl_conversation_id = $1',
    [conv.id]
  );
  
  const isNew = existing.rows.length === 0;
  
  // Get messages to find first inbound and first response
  const messages = await getConversationMessages(conv.id, locationId, { limit: 50 });
  
  // Sort by date ascending
  messages.sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime());
  
  // Find first inbound message
  const firstInbound = messages.find(m => m.direction === 'inbound');
  const firstInboundTime = firstInbound ? new Date(firstInbound.dateAdded) : null;
  
  // Find first outbound message AFTER first inbound
  let firstResponseTime: Date | null = null;
  let responseUserId: string | undefined;
  
  if (firstInboundTime) {
    const firstResponse = messages.find(m => 
      m.direction === 'outbound' && 
      new Date(m.dateAdded) > firstInboundTime
    );
    if (firstResponse) {
      firstResponseTime = new Date(firstResponse.dateAdded);
      responseUserId = firstResponse.userId;
    }
  }
  
  // Calculate response time
  let responseTimeSeconds: number | null = null;
  if (firstInboundTime && firstResponseTime) {
    responseTimeSeconds = Math.floor((firstResponseTime.getTime() - firstInboundTime.getTime()) / 1000);
  }
  
  // Is it missed? (no response after 1 hour)
  const isMissed = firstInboundTime && !firstResponseTime && 
    (Date.now() - firstInboundTime.getTime() > BENCHMARKS.CRITICAL * 1000);
  
  // Get contact info
  let contactName = 'Unknown';
  let contactEmail: string | undefined;
  let contactPhone: string | undefined;
  
  if (conv.contactId) {
    const contact = await getContact(conv.contactId, locationId);
    if (contact) {
      contactName = contact.name || contact.firstName || 'Unknown';
      contactEmail = contact.email;
      contactPhone = contact.phone;
    }
  }
  
  // Determine channel from conversation type
  const channel = mapConversationType(conv.type);
  
  // Upsert conversation
  await pool.query(
    `INSERT INTO conversations (
      ghl_conversation_id, location_id, contact_id, contact_name, contact_email, contact_phone,
      channel, first_inbound_at, first_response_at, response_time_seconds,
      assigned_user_id, status, is_missed, last_message_at, message_count
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    ON CONFLICT (ghl_conversation_id) DO UPDATE SET
      contact_name = $4, contact_email = $5, contact_phone = $6,
      first_inbound_at = COALESCE(conversations.first_inbound_at, $8),
      first_response_at = COALESCE(conversations.first_response_at, $9),
      response_time_seconds = COALESCE(conversations.response_time_seconds, $10),
      assigned_user_id = $11, status = $12, is_missed = $13,
      last_message_at = $14, message_count = $15, updated_at = NOW()`,
    [
      conv.id,
      locationId,
      conv.contactId,
      contactName,
      contactEmail,
      contactPhone,
      channel,
      firstInboundTime,
      firstResponseTime,
      responseTimeSeconds,
      conv.assignedTo || responseUserId,
      conv.status || 'open',
      isMissed,
      conv.lastMessageDate ? new Date(conv.lastMessageDate) : null,
      messages.length
    ]
  );
  
  return { isNew };
}

/**
 * Map GHL conversation type to channel name
 */
function mapConversationType(type: string): string {
  const typeMap: Record<string, string> = {
    'TYPE_SMS': 'sms',
    'TYPE_EMAIL': 'email',
    'TYPE_PHONE': 'phone',
    'TYPE_FACEBOOK': 'facebook',
    'TYPE_INSTAGRAM': 'instagram',
    'TYPE_WHATSAPP': 'whatsapp',
    'TYPE_GMB': 'google',
    'TYPE_LIVE_CHAT': 'webchat',
    'SMS': 'sms',
    'Email': 'email',
    'FB': 'facebook',
    'IG': 'instagram'
  };
  return typeMap[type] || type?.toLowerCase() || 'other';
}

/**
 * Recalculate daily metrics for a location
 */
async function recalculateDailyMetrics(locationId: string): Promise<void> {
  // Calculate for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  await pool.query(`
    INSERT INTO daily_metrics (
      location_id, date,
      total_conversations, new_conversations,
      avg_response_time, median_response_time, min_response_time, max_response_time,
      responses_under_1min, responses_under_5min, responses_under_15min,
      responses_under_1hr, responses_over_1hr, missed_conversations
    )
    SELECT 
      location_id,
      DATE(first_inbound_at) as date,
      COUNT(*) as total_conversations,
      COUNT(*) as new_conversations,
      AVG(response_time_seconds)::INTEGER as avg_response_time,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_seconds)::INTEGER as median_response_time,
      MIN(response_time_seconds) as min_response_time,
      MAX(response_time_seconds) as max_response_time,
      COUNT(*) FILTER (WHERE response_time_seconds < 60) as responses_under_1min,
      COUNT(*) FILTER (WHERE response_time_seconds < 300) as responses_under_5min,
      COUNT(*) FILTER (WHERE response_time_seconds < 900) as responses_under_15min,
      COUNT(*) FILTER (WHERE response_time_seconds < 3600) as responses_under_1hr,
      COUNT(*) FILTER (WHERE response_time_seconds >= 3600) as responses_over_1hr,
      COUNT(*) FILTER (WHERE is_missed = true) as missed_conversations
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at IS NOT NULL
    GROUP BY location_id, DATE(first_inbound_at)
    ON CONFLICT (location_id, date) DO UPDATE SET
      total_conversations = EXCLUDED.total_conversations,
      avg_response_time = EXCLUDED.avg_response_time,
      median_response_time = EXCLUDED.median_response_time,
      min_response_time = EXCLUDED.min_response_time,
      max_response_time = EXCLUDED.max_response_time,
      responses_under_1min = EXCLUDED.responses_under_1min,
      responses_under_5min = EXCLUDED.responses_under_5min,
      responses_under_15min = EXCLUDED.responses_under_15min,
      responses_under_1hr = EXCLUDED.responses_under_1hr,
      responses_over_1hr = EXCLUDED.responses_over_1hr,
      missed_conversations = EXCLUDED.missed_conversations,
      updated_at = NOW()
  `, [locationId, thirtyDaysAgo]);
}

/**
 * Get overview metrics for dashboard
 */
export async function getOverviewMetrics(locationId: string, days: number = 7): Promise<ResponseMetrics> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Get aggregated metrics
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_conversations,
      COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) as responded_conversations,
      COUNT(*) FILTER (WHERE is_missed = true) as missed_conversations,
      AVG(response_time_seconds)::INTEGER as avg_response_time,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_seconds)::INTEGER as median_response_time,
      MIN(response_time_seconds) as fastest_response,
      MAX(response_time_seconds) as slowest_response,
      COUNT(*) FILTER (WHERE response_time_seconds < 60) as under_1min,
      COUNT(*) FILTER (WHERE response_time_seconds >= 60 AND response_time_seconds < 300) as under_5min,
      COUNT(*) FILTER (WHERE response_time_seconds >= 300 AND response_time_seconds < 900) as under_15min,
      COUNT(*) FILTER (WHERE response_time_seconds >= 900 AND response_time_seconds < 3600) as under_1hr,
      COUNT(*) FILTER (WHERE response_time_seconds >= 3600) as over_1hr
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at IS NOT NULL
  `, [locationId, startDate]);
  
  const row = result.rows[0];
  const avgTime = row.avg_response_time || 0;
  
  // Determine speed grade
  let speedGrade: ResponseMetrics['speedGrade'] = 'Critical';
  if (avgTime < BENCHMARKS.EXCELLENT) speedGrade = 'Excellent';
  else if (avgTime < BENCHMARKS.GOOD) speedGrade = 'Good';
  else if (avgTime < BENCHMARKS.AVERAGE) speedGrade = 'Average';
  else if (avgTime < BENCHMARKS.POOR) speedGrade = 'Poor';
  
  const total = parseInt(row.total_conversations) || 0;
  const responded = parseInt(row.responded_conversations) || 0;
  
  return {
    avgResponseTime: avgTime,
    medianResponseTime: row.median_response_time || 0,
    fastestResponse: row.fastest_response || 0,
    slowestResponse: row.slowest_response || 0,
    totalConversations: total,
    respondedConversations: responded,
    missedConversations: parseInt(row.missed_conversations) || 0,
    responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
    speedGrade,
    under1Min: parseInt(row.under_1min) || 0,
    under5Min: parseInt(row.under_5min) || 0,
    under15Min: parseInt(row.under_15min) || 0,
    under1Hr: parseInt(row.under_1hr) || 0,
    over1Hr: parseInt(row.over_1hr) || 0
  };
}

/**
 * Get missed conversations list
 */
export async function getMissedConversations(
  locationId: string, 
  limit: number = 20
): Promise<ConversationWithMetrics[]> {
  const result = await pool.query(`
    SELECT 
      id, ghl_conversation_id, contact_name, contact_email, contact_phone,
      channel, first_inbound_at, first_response_at, response_time_seconds,
      is_missed, assigned_user_name, status
    FROM conversations
    WHERE location_id = $1 AND is_missed = true
    ORDER BY first_inbound_at DESC
    LIMIT $2
  `, [locationId, limit]);
  
  return result.rows.map(row => ({
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
    assignedUserName: row.assigned_user_name,
    status: row.status
  }));
}

/**
 * Get daily trend data
 */
export async function getDailyTrend(
  locationId: string, 
  days: number = 30
): Promise<{ date: string; avgResponseTime: number; totalConversations: number; missedCount: number }[]> {
  const result = await pool.query(`
    SELECT 
      date,
      avg_response_time,
      total_conversations,
      missed_conversations
    FROM daily_metrics
    WHERE location_id = $1 AND date >= CURRENT_DATE - $2::INTEGER
    ORDER BY date ASC
  `, [locationId, days]);
  
  return result.rows.map(row => ({
    date: row.date.toISOString().split('T')[0],
    avgResponseTime: row.avg_response_time || 0,
    totalConversations: row.total_conversations || 0,
    missedCount: row.missed_conversations || 0
  }));
}
