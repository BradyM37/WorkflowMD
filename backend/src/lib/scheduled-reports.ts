/**
 * Scheduled Reports - Weekly Email Reports
 * Sends weekly summary reports to users with email alerts enabled
 */

import * as cron from 'node-cron';
import { pool } from './database';
import { logger } from './logger';
import { sendEmail } from './email-service';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

interface WeeklyReportData {
  avgResponseTime: number;
  totalConversations: number;
  respondedConversations: number;
  missedLeadsCount: number;
  responseRate: number;
  topPerformers: Array<{
    userName: string;
    avgResponseTime: number;
    totalResponses: number;
  }>;
  channelBreakdown: Array<{
    channel: string;
    count: number;
    avgResponseTime: number;
  }>;
  dailyTrend: Array<{
    date: string;
    conversations: number;
    avgResponseTime: number;
  }>;
  comparisonToPreviousWeek: {
    responseTimeChange: number;
    conversationsChange: number;
    responseRateChange: number;
  };
}

/**
 * Format seconds to human-readable time
 */
function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
}

/**
 * Get color based on response time
 */
function getGradeColor(seconds: number): string {
  if (seconds < 60) return '#52c41a';
  if (seconds < 300) return '#73d13d';
  if (seconds < 900) return '#faad14';
  return '#ff4d4f';
}

/**
 * Get grade label based on response time
 */
function getGrade(seconds: number): string {
  if (seconds < 60) return '🚀 Excellent';
  if (seconds < 300) return '✅ Good';
  if (seconds < 900) return '⚡ Average';
  return '🔥 Needs Improvement';
}

/**
 * Format percentage change with arrow
 */
function formatChange(change: number): string {
  if (change > 0) return `↑ ${Math.abs(change)}%`;
  if (change < 0) return `↓ ${Math.abs(change)}%`;
  return '→ 0%';
}

/**
 * Get color for change indicator
 */
function getChangeColor(change: number, isGoodWhenLower: boolean): string {
  if (isGoodWhenLower) {
    if (change < 0) return '#52c41a'; // Green when lower is good
    if (change > 0) return '#ff4d4f';
    return '#6b7280';
  }
  if (change > 0) return '#52c41a';
  if (change < 0) return '#ff4d4f';
  return '#6b7280';
}

/**
 * Generate HTML for weekly report email
 */
function generateWeeklyReportHTML(
  data: WeeklyReportData, 
  locationName: string, 
  startDate: string, 
  endDate: string
): string {
  const topPerformersHTML = data.topPerformers.length > 0 
    ? data.topPerformers.slice(0, 5).map((p, i) => {
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${medals[i]} ${p.userName}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
              <span style="background: ${getGradeColor(p.avgResponseTime)}; color: white; padding: 4px 12px; border-radius: 12px; font-weight: 600;">
                ${formatTime(p.avgResponseTime)}
              </span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${p.totalResponses}</td>
          </tr>
        `;
      }).join('')
    : `<tr><td colspan="3" style="padding: 20px; text-align: center; color: #6b7280;">No team data available</td></tr>`;

  const channelsHTML = data.channelBreakdown.length > 0
    ? data.channelBreakdown.map(c => `
        <div style="display: inline-block; background: #f3f4f6; padding: 8px 16px; border-radius: 8px; margin: 4px;">
          <strong>${c.channel.toUpperCase()}</strong>: ${c.count} leads (${formatTime(c.avgResponseTime)} avg)
        </div>
      `).join('')
    : '<span style="color: #6b7280;">No channel data</span>';

  const dailyTrendHTML = data.dailyTrend.length > 0
    ? data.dailyTrend.map(d => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb;">${d.date}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${d.conversations}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
            <span style="color: ${getGradeColor(d.avgResponseTime)}; font-weight: 600;">${formatTime(d.avgResponseTime)}</span>
          </td>
        </tr>
      `).join('')
    : '';

  const comparison = data.comparisonToPreviousWeek;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Response Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f9fafb;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">📊 Weekly Response Report</h1>
    <p style="margin: 8px 0 0; opacity: 0.9;">${locationName}</p>
    <p style="margin: 4px 0 0; opacity: 0.8; font-size: 14px;">${startDate} - ${endDate}</p>
  </div>

  <!-- Main Stats -->
  <div style="padding: 24px; background: white;">
    
    <!-- Hero Stat -->
    <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%); border-radius: 12px; margin-bottom: 20px;">
      <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Weekly Average Response Time</div>
      <div style="font-size: 48px; font-weight: 700; color: ${getGradeColor(data.avgResponseTime)};">
        ${formatTime(data.avgResponseTime)}
      </div>
      <div style="font-size: 16px; margin-top: 8px;">${getGrade(data.avgResponseTime)}</div>
      <div style="font-size: 14px; margin-top: 8px; color: ${getChangeColor(comparison.responseTimeChange, true)};">
        ${formatChange(-comparison.responseTimeChange)} vs last week
      </div>
    </div>

    <!-- Stats Grid -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="width: 50%; padding: 16px; text-align: center; background: #f9fafb; border-radius: 8px 0 0 0;">
          <div style="font-size: 32px; font-weight: 700; color: #667eea;">${data.totalConversations}</div>
          <div style="font-size: 12px; color: #6b7280;">Total Leads</div>
          <div style="font-size: 12px; color: ${getChangeColor(comparison.conversationsChange, false)};">
            ${formatChange(comparison.conversationsChange)}
          </div>
        </td>
        <td style="width: 50%; padding: 16px; text-align: center; background: #f9fafb; border-radius: 0 8px 0 0;">
          <div style="font-size: 32px; font-weight: 700; color: ${data.responseRate >= 90 ? '#52c41a' : data.responseRate >= 70 ? '#faad14' : '#ff4d4f'};">${data.responseRate}%</div>
          <div style="font-size: 12px; color: #6b7280;">Response Rate</div>
          <div style="font-size: 12px; color: ${getChangeColor(comparison.responseRateChange, false)};">
            ${formatChange(comparison.responseRateChange)}
          </div>
        </td>
      </tr>
      <tr>
        <td style="width: 50%; padding: 16px; text-align: center; background: #f9fafb; border-radius: 0 0 0 8px;">
          <div style="font-size: 32px; font-weight: 700; color: #52c41a;">${data.respondedConversations}</div>
          <div style="font-size: 12px; color: #6b7280;">Responded</div>
        </td>
        <td style="width: 50%; padding: 16px; text-align: center; background: #f9fafb; border-radius: 0 0 8px 0;">
          <div style="font-size: 32px; font-weight: 700; color: ${data.missedLeadsCount > 0 ? '#ff4d4f' : '#52c41a'};">${data.missedLeadsCount}</div>
          <div style="font-size: 12px; color: #6b7280;">Missed Leads</div>
        </td>
      </tr>
    </table>

    ${data.missedLeadsCount > 0 ? `
    <!-- Missed Leads Alert -->
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
      <strong style="color: #dc2626;">⚠️ ${data.missedLeadsCount} leads missed this week</strong>
      <p style="margin: 8px 0 0; color: #7f1d1d; font-size: 14px;">Consider adjusting your alert thresholds or team coverage.</p>
    </div>
    ` : `
    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
      <strong style="color: #16a34a;">✅ Perfect week!</strong>
      <p style="margin: 8px 0 0; color: #166534; font-size: 14px;">No missed leads - great job!</p>
    </div>
    `}

    <!-- Daily Breakdown -->
    <h2 style="font-size: 18px; margin: 0 0 16px; color: #1f2937;">📅 Daily Breakdown</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Day</th>
          <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Leads</th>
          <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Avg Time</th>
        </tr>
      </thead>
      <tbody>
        ${dailyTrendHTML}
      </tbody>
    </table>

    <!-- Top Performers -->
    <h2 style="font-size: 18px; margin: 0 0 16px; color: #1f2937;">🏆 Top Performers This Week</h2>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <thead>
        <tr style="background: #f3f4f6;">
          <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Team Member</th>
          <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Avg Time</th>
          <th style="padding: 12px; text-align: center; font-weight: 600; color: #374151;">Responses</th>
        </tr>
      </thead>
      <tbody>
        ${topPerformersHTML}
      </tbody>
    </table>

    <!-- Channel Breakdown -->
    <h2 style="font-size: 18px; margin: 0 0 16px; color: #1f2937;">📊 By Channel</h2>
    <div style="margin-bottom: 24px;">
      ${channelsHTML}
    </div>

    <!-- CTA -->
    <div style="text-align: center; padding: 24px; background: #f9fafb; border-radius: 12px;">
      <p style="margin: 0 0 16px; color: #374151;">View detailed analytics in your dashboard</p>
      <a href="${FRONTEND_URL}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Open Dashboard →
      </a>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding: 24px; text-align: center; color: #6b7280; font-size: 12px;">
    <p style="margin: 0;">Sent by <a href="https://workflowmd.com" style="color: #667eea; text-decoration: none;">WorkflowMD</a> Response Tracker</p>
    <p style="margin: 8px 0 0;">You're receiving this because you enabled weekly reports.</p>
    <p style="margin: 8px 0 0;">
      <a href="${FRONTEND_URL}/settings" style="color: #667eea; text-decoration: none;">Manage report settings</a>
    </p>
  </div>

</body>
</html>
  `.trim();
}

/**
 * Fetch weekly report data for a location
 */
async function fetchWeeklyReportData(locationId: string): Promise<WeeklyReportData | null> {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const prevEndDate = new Date(startDate.getTime());
    const prevStartDate = new Date(prevEndDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Current week metrics
    const currentResult = await pool.query(`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) as responded,
        COUNT(*) FILTER (WHERE is_missed = true) as missed_count,
        AVG(response_time_seconds)::INTEGER as avg_response_time
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at < $3
    `, [locationId, startDate, endDate]);

    // Previous week metrics (for comparison)
    const prevResult = await pool.query(`
      SELECT 
        COUNT(*) as total_conversations,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) as responded,
        AVG(response_time_seconds)::INTEGER as avg_response_time
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at < $3
    `, [locationId, prevStartDate, prevEndDate]);

    const current = currentResult.rows[0];
    const prev = prevResult.rows[0];

    const totalConversations = parseInt(current.total_conversations) || 0;
    const respondedConversations = parseInt(current.responded) || 0;
    const missedLeadsCount = parseInt(current.missed_count) || 0;
    const avgResponseTime = current.avg_response_time || 0;
    const responseRate = totalConversations > 0 
      ? Math.round((respondedConversations / totalConversations) * 100) 
      : 0;

    const prevTotal = parseInt(prev.total_conversations) || 0;
    const prevResponded = parseInt(prev.responded) || 0;
    const prevAvgTime = prev.avg_response_time || 0;
    const prevResponseRate = prevTotal > 0 
      ? Math.round((prevResponded / prevTotal) * 100) 
      : 0;

    // Top performers
    const teamResult = await pool.query(`
      SELECT 
        assigned_user_name as user_name,
        AVG(response_time_seconds)::INTEGER as avg_response_time,
        COUNT(*) as total_responses
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at < $3
        AND assigned_user_id IS NOT NULL
        AND response_time_seconds IS NOT NULL
      GROUP BY assigned_user_name
      HAVING COUNT(*) >= 1
      ORDER BY avg_response_time ASC
      LIMIT 5
    `, [locationId, startDate, endDate]);

    // Channel breakdown
    const channelResult = await pool.query(`
      SELECT 
        channel,
        COUNT(*) as count,
        AVG(response_time_seconds)::INTEGER as avg_response_time
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at < $3
        AND channel IS NOT NULL
      GROUP BY channel
      ORDER BY count DESC
    `, [locationId, startDate, endDate]);

    // Daily trend
    const dailyResult = await pool.query(`
      SELECT 
        TO_CHAR(first_inbound_at, 'Dy, Mon DD') as date,
        COUNT(*) as conversations,
        AVG(response_time_seconds)::INTEGER as avg_response_time
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at >= $2
        AND first_inbound_at < $3
      GROUP BY DATE(first_inbound_at), TO_CHAR(first_inbound_at, 'Dy, Mon DD')
      ORDER BY DATE(first_inbound_at)
    `, [locationId, startDate, endDate]);

    return {
      avgResponseTime,
      totalConversations,
      respondedConversations,
      missedLeadsCount,
      responseRate,
      topPerformers: teamResult.rows.map(row => ({
        userName: row.user_name || 'Unknown',
        avgResponseTime: row.avg_response_time || 0,
        totalResponses: parseInt(row.total_responses) || 0
      })),
      channelBreakdown: channelResult.rows.map(row => ({
        channel: row.channel || 'unknown',
        count: parseInt(row.count) || 0,
        avgResponseTime: row.avg_response_time || 0
      })),
      dailyTrend: dailyResult.rows.map(row => ({
        date: row.date,
        conversations: parseInt(row.conversations) || 0,
        avgResponseTime: row.avg_response_time || 0
      })),
      comparisonToPreviousWeek: {
        responseTimeChange: prevAvgTime > 0 
          ? Math.round(((avgResponseTime - prevAvgTime) / prevAvgTime) * 100) 
          : 0,
        conversationsChange: prevTotal > 0 
          ? Math.round(((totalConversations - prevTotal) / prevTotal) * 100) 
          : 0,
        responseRateChange: prevResponseRate > 0 
          ? responseRate - prevResponseRate 
          : 0
      }
    };
  } catch (error) {
    logger.error('Failed to fetch weekly report data', { locationId }, error as Error);
    return null;
  }
}

/**
 * Send weekly reports to all users with weekly_report_enabled
 */
async function sendWeeklyReports(): Promise<void> {
  logger.info('Starting weekly report generation...');

  try {
    // Find all locations with weekly reports enabled
    const result = await pool.query(`
      SELECT 
        a.location_id,
        a.alert_email,
        COALESCE(l.name, 'Your Location') as location_name
      FROM alert_settings a
      LEFT JOIN ghl_locations l ON l.location_id = a.location_id
      WHERE a.weekly_report_enabled = true
        AND a.alert_email IS NOT NULL
        AND a.alert_email != ''
    `);

    if (result.rows.length === 0) {
      logger.info('No locations with weekly reports enabled');
      return;
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const startDateStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDateStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let successCount = 0;
    let failCount = 0;

    for (const row of result.rows) {
      try {
        const reportData = await fetchWeeklyReportData(row.location_id);
        
        if (!reportData) {
          logger.warn('Failed to fetch report data', { locationId: row.location_id });
          failCount++;
          continue;
        }

        // Skip if no data
        if (reportData.totalConversations === 0) {
          logger.info('Skipping weekly report - no conversations', { locationId: row.location_id });
          continue;
        }

        const html = generateWeeklyReportHTML(
          reportData,
          row.location_name,
          startDateStr,
          endDateStr
        );

        await sendEmail({
          to: row.alert_email,
          subject: `📊 Weekly Response Report - ${startDateStr} to ${endDateStr}`,
          html
        });

        logger.info('Weekly report sent', { 
          locationId: row.location_id, 
          email: row.alert_email 
        });
        successCount++;
      } catch (error) {
        logger.error('Failed to send weekly report', { 
          locationId: row.location_id,
          email: row.alert_email 
        }, error as Error);
        failCount++;
      }
    }

    logger.info('Weekly report generation complete', { successCount, failCount });
  } catch (error) {
    logger.error('Weekly report generation failed', {}, error as Error);
  }
}

// Cron job reference
let weeklyReportJob: ReturnType<typeof cron.schedule> | null = null;

/**
 * Initialize the weekly report scheduler
 * Runs every Monday at 8:00 AM (Central Time)
 */
export function initWeeklyReportScheduler(): void {
  // Schedule: At 8:00 AM on Monday
  // Cron format: minute hour dayOfMonth month dayOfWeek
  weeklyReportJob = cron.schedule('0 8 * * 1', async () => {
    logger.info('Weekly report cron triggered');
    await sendWeeklyReports();
  }, {
    timezone: 'America/Chicago'
  });

  logger.info('✅ Weekly report scheduler initialized (Mondays at 8:00 AM CT)');
}

/**
 * Stop the weekly report scheduler
 */
export function stopWeeklyReportScheduler(): void {
  if (weeklyReportJob) {
    weeklyReportJob.stop();
    weeklyReportJob = null;
    logger.info('Weekly report scheduler stopped');
  }
}

/**
 * Manually trigger weekly reports (for testing)
 */
export async function triggerWeeklyReports(): Promise<void> {
  await sendWeeklyReports();
}
