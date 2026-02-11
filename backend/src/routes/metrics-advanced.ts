/**
 * Advanced Metrics API Routes
 * Hourly heatmap, comparisons, exports
 */

import { Router } from 'express';
import { requireAuth, requireGHLConnection } from '../middleware/auth';
import { ApiResponse } from '../lib/response';
import { asyncHandler } from '../middleware/error-handler';
import { logger } from '../lib/logger';
import { pool } from '../lib/database';

const advancedMetricsRouter = Router();

/**
 * GET /api/metrics/hourly
 * Get response times broken down by hour of day and day of week
 */
advancedMetricsRouter.get(
  '/hourly',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 30;
    
    logger.info('Fetching hourly metrics', { locationId, days, requestId: req.id });
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get response times by hour of day and day of week
    const result = await pool.query(`
      SELECT 
        EXTRACT(DOW FROM first_inbound_at) as day_of_week,
        EXTRACT(HOUR FROM first_inbound_at) as hour_of_day,
        COUNT(*) as total_conversations,
        AVG(response_time_seconds)::INTEGER as avg_response_time,
        COUNT(*) FILTER (WHERE response_time_seconds < 300) as fast_responses,
        COUNT(*) FILTER (WHERE is_missed = true) as missed_count
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at IS NOT NULL
      GROUP BY EXTRACT(DOW FROM first_inbound_at), EXTRACT(HOUR FROM first_inbound_at)
      ORDER BY day_of_week, hour_of_day
    `, [locationId, startDate]);
    
    // Transform into heatmap format
    // days: 0 = Sunday, 1 = Monday, etc.
    // hours: 0-23
    const heatmap: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    const conversationCounts: number[][] = Array(7).fill(null).map(() => Array(24).fill(0));
    
    result.rows.forEach(row => {
      const day = parseInt(row.day_of_week);
      const hour = parseInt(row.hour_of_day);
      heatmap[day][hour] = row.avg_response_time || 0;
      conversationCounts[day][hour] = parseInt(row.total_conversations);
    });
    
    // Find slowest and fastest times
    let slowestTime = { day: 0, hour: 0, avgTime: 0 };
    let fastestTime = { day: 0, hour: 0, avgTime: Infinity };
    let busiestTime = { day: 0, hour: 0, count: 0 };
    
    result.rows.forEach(row => {
      const day = parseInt(row.day_of_week);
      const hour = parseInt(row.hour_of_day);
      const avgTime = row.avg_response_time || 0;
      const count = parseInt(row.total_conversations);
      
      if (avgTime > slowestTime.avgTime && count >= 3) {
        slowestTime = { day, hour, avgTime };
      }
      if (avgTime < fastestTime.avgTime && avgTime > 0 && count >= 3) {
        fastestTime = { day, hour, avgTime };
      }
      if (count > busiestTime.count) {
        busiestTime = { day, hour, count };
      }
    });
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const formatHour = (h: number) => {
      if (h === 0) return '12 AM';
      if (h === 12) return '12 PM';
      return h < 12 ? `${h} AM` : `${h - 12} PM`;
    };
    
    return ApiResponse.success(res, {
      heatmap,
      conversationCounts,
      insights: {
        slowest: slowestTime.avgTime > 0 ? {
          day: dayNames[slowestTime.day],
          hour: formatHour(slowestTime.hour),
          avgResponseTime: slowestTime.avgTime
        } : null,
        fastest: fastestTime.avgTime < Infinity ? {
          day: dayNames[fastestTime.day],
          hour: formatHour(fastestTime.hour),
          avgResponseTime: fastestTime.avgTime
        } : null,
        busiest: busiestTime.count > 0 ? {
          day: dayNames[busiestTime.day],
          hour: formatHour(busiestTime.hour),
          conversationCount: busiestTime.count
        } : null
      },
      period: { days }
    });
  })
);

/**
 * GET /api/metrics/comparison
 * Compare current period vs previous period
 */
advancedMetricsRouter.get(
  '/comparison',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 7;
    
    logger.info('Fetching comparison metrics', { locationId, days, requestId: req.id });
    
    const now = new Date();
    const currentStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStart = new Date(currentStart.getTime() - days * 24 * 60 * 60 * 1000);
    
    // Get current period metrics
    const currentResult = await pool.query(`
      SELECT 
        COUNT(*) as total_conversations,
        AVG(response_time_seconds)::INTEGER as avg_response_time,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) as responded,
        COUNT(*) FILTER (WHERE is_missed = true) as missed_count,
        COUNT(*) FILTER (WHERE response_time_seconds < 300) as fast_responses
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at < $3
    `, [locationId, currentStart, now]);
    
    // Get previous period metrics
    const previousResult = await pool.query(`
      SELECT 
        COUNT(*) as total_conversations,
        AVG(response_time_seconds)::INTEGER as avg_response_time,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) as responded,
        COUNT(*) FILTER (WHERE is_missed = true) as missed_count,
        COUNT(*) FILTER (WHERE response_time_seconds < 300) as fast_responses
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at < $3
    `, [locationId, previousStart, currentStart]);
    
    const current = currentResult.rows[0];
    const previous = previousResult.rows[0];
    
    // Calculate percentage changes
    const calcChange = (curr: number, prev: number): number | null => {
      if (!prev || prev === 0) return null;
      return Math.round(((curr - prev) / prev) * 100);
    };
    
    const currentTotal = parseInt(current.total_conversations) || 0;
    const previousTotal = parseInt(previous.total_conversations) || 0;
    const currentAvg = current.avg_response_time || 0;
    const previousAvg = previous.avg_response_time || 0;
    const currentResponded = parseInt(current.responded) || 0;
    const previousResponded = parseInt(previous.responded) || 0;
    const currentMissed = parseInt(current.missed_count) || 0;
    const previousMissed = parseInt(previous.missed_count) || 0;
    const currentFast = parseInt(current.fast_responses) || 0;
    const previousFast = parseInt(previous.fast_responses) || 0;
    
    const currentResponseRate = currentTotal > 0 ? Math.round((currentResponded / currentTotal) * 100) : 0;
    const previousResponseRate = previousTotal > 0 ? Math.round((previousResponded / previousTotal) * 100) : 0;
    
    return ApiResponse.success(res, {
      current: {
        period: { start: currentStart, end: now, days },
        totalConversations: currentTotal,
        avgResponseTime: currentAvg,
        responseRate: currentResponseRate,
        missedCount: currentMissed,
        fastResponses: currentFast
      },
      previous: {
        period: { start: previousStart, end: currentStart, days },
        totalConversations: previousTotal,
        avgResponseTime: previousAvg,
        responseRate: previousResponseRate,
        missedCount: previousMissed,
        fastResponses: previousFast
      },
      changes: {
        conversations: calcChange(currentTotal, previousTotal),
        avgResponseTime: calcChange(currentAvg, previousAvg),
        responseRate: currentResponseRate - previousResponseRate,
        missed: calcChange(currentMissed, previousMissed),
        fastResponses: calcChange(currentFast, previousFast)
      },
      improved: {
        responseTime: currentAvg < previousAvg,
        responseRate: currentResponseRate > previousResponseRate,
        missed: currentMissed < previousMissed
      }
    });
  })
);

/**
 * GET /api/metrics/export
 * Export conversation data as CSV
 */
advancedMetricsRouter.get(
  '/export',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 30;
    const format = req.query.format || 'csv';
    
    logger.info('Exporting metrics', { locationId, days, format, requestId: req.id });
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await pool.query(`
      SELECT 
        ghl_conversation_id,
        contact_name,
        contact_email,
        contact_phone,
        channel,
        first_inbound_at,
        first_response_at,
        response_time_seconds,
        assigned_user_name,
        is_missed,
        status
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
      ORDER BY first_inbound_at DESC
    `, [locationId, startDate]);
    
    if (format === 'json') {
      return ApiResponse.success(res, {
        conversations: result.rows,
        count: result.rows.length,
        exportedAt: new Date().toISOString()
      });
    }
    
    // Generate CSV
    const headers = [
      'Conversation ID',
      'Contact Name',
      'Contact Email',
      'Contact Phone',
      'Channel',
      'First Message At',
      'First Response At',
      'Response Time (seconds)',
      'Response Time (formatted)',
      'Assigned To',
      'Missed',
      'Status'
    ];
    
    const formatTime = (seconds: number | null): string => {
      if (!seconds) return '';
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    };
    
    const rows = result.rows.map(row => [
      row.ghl_conversation_id,
      row.contact_name || '',
      row.contact_email || '',
      row.contact_phone || '',
      row.channel || '',
      row.first_inbound_at ? new Date(row.first_inbound_at).toISOString() : '',
      row.first_response_at ? new Date(row.first_response_at).toISOString() : '',
      row.response_time_seconds || '',
      formatTime(row.response_time_seconds),
      row.assigned_user_name || '',
      row.is_missed ? 'Yes' : 'No',
      row.status || ''
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="response-times-${days}days-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  })
);

/**
 * GET /api/metrics/sla
 * Get SLA compliance metrics
 */
advancedMetricsRouter.get(
  '/sla',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 7;
    const targetSeconds = parseInt(req.query.target as string) || 300; // Default 5 min SLA
    
    logger.info('Fetching SLA metrics', { locationId, days, targetSeconds, requestId: req.id });
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL AND response_time_seconds <= $3) as met_sla,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL AND response_time_seconds > $3) as missed_sla,
        COUNT(*) FILTER (WHERE response_time_seconds IS NULL AND is_missed = true) as no_response
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at IS NOT NULL
    `, [locationId, startDate, targetSeconds]);
    
    const row = result.rows[0];
    const total = parseInt(row.total) || 0;
    const metSla = parseInt(row.met_sla) || 0;
    const missedSla = parseInt(row.missed_sla) || 0;
    const noResponse = parseInt(row.no_response) || 0;
    
    const complianceRate = total > 0 ? Math.round((metSla / total) * 100) : 0;
    
    return ApiResponse.success(res, {
      target: {
        seconds: targetSeconds,
        formatted: targetSeconds < 60 ? `${targetSeconds}s` : `${Math.floor(targetSeconds / 60)}m`
      },
      metrics: {
        total,
        metSla,
        missedSla,
        noResponse,
        complianceRate
      },
      period: { days, startDate }
    });
  })
);

export default advancedMetricsRouter;
