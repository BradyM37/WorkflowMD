/**
 * Reports API Routes
 * Generate and send email reports
 */

import { Router } from 'express';
import { requireAuth, requireGHLConnection } from '../middleware/auth';
import { attachPlanInfo, requirePro, requireAgency } from '../middleware/plan-gate';
import { ApiResponse } from '../lib/response';
import { asyncHandler } from '../middleware/error-handler';
import { logger } from '../lib/logger';
import { pool } from '../lib/database';
import { sendEmail } from '../lib/email-service';
import { generateResponseReportPDF } from '../lib/response-report-pdf';

const reportsRouter = Router();

interface DailyReportData {
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
}

/**
 * Generate HTML email for daily report
 */
function generateDailyReportHTML(data: DailyReportData, locationName: string, reportDate: string): string {
  const formatTime = (seconds: number): string => {
    if (!seconds || seconds === 0) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  const getGradeColor = (seconds: number): string => {
    if (seconds < 60) return '#52c41a';  // Excellent
    if (seconds < 300) return '#73d13d'; // Good
    if (seconds < 900) return '#faad14'; // Average
    return '#ff4d4f';                    // Poor
  };

  const getGrade = (seconds: number): string => {
    if (seconds < 60) return '🚀 Excellent';
    if (seconds < 300) return '✅ Good';
    if (seconds < 900) return '⚡ Average';
    return '🔥 Needs Improvement';
  };

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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Response Report</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f9fafb;">
  
  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">⚡ Daily Response Report</h1>
    <p style="margin: 8px 0 0; opacity: 0.9;">${locationName} • ${reportDate}</p>
  </div>

  <!-- Main Stats -->
  <div style="padding: 24px; background: white;">
    
    <!-- Hero Stat -->
    <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%); border-radius: 12px; margin-bottom: 20px;">
      <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Average Response Time</div>
      <div style="font-size: 48px; font-weight: 700; color: ${getGradeColor(data.avgResponseTime)};">
        ${formatTime(data.avgResponseTime)}
      </div>
      <div style="font-size: 16px; margin-top: 8px;">${getGrade(data.avgResponseTime)}</div>
    </div>

    <!-- Stats Grid -->
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
      <tr>
        <td style="width: 50%; padding: 16px; text-align: center; background: #f9fafb; border-radius: 8px 0 0 0;">
          <div style="font-size: 32px; font-weight: 700; color: #667eea;">${data.totalConversations}</div>
          <div style="font-size: 12px; color: #6b7280;">Total Leads</div>
        </td>
        <td style="width: 50%; padding: 16px; text-align: center; background: #f9fafb; border-radius: 0 8px 0 0;">
          <div style="font-size: 32px; font-weight: 700; color: ${data.responseRate >= 90 ? '#52c41a' : data.responseRate >= 70 ? '#faad14' : '#ff4d4f'};">${data.responseRate}%</div>
          <div style="font-size: 12px; color: #6b7280;">Response Rate</div>
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
      <strong style="color: #dc2626;">⚠️ ${data.missedLeadsCount} leads need follow-up!</strong>
      <p style="margin: 8px 0 0; color: #7f1d1d; font-size: 14px;">These leads haven't received a response after 1 hour.</p>
    </div>
    ` : `
    <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin-bottom: 24px; border-radius: 0 8px 8px 0;">
      <strong style="color: #16a34a;">✅ All leads contacted!</strong>
      <p style="margin: 8px 0 0; color: #166534; font-size: 14px;">Great job - no missed leads today.</p>
    </div>
    `}

    <!-- Top Performers -->
    <h2 style="font-size: 18px; margin: 0 0 16px; color: #1f2937;">🏆 Top Performers</h2>
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

    <!-- Industry Benchmark -->
    <div style="background: #fffbeb; border: 1px solid #fcd34d; padding: 16px; border-radius: 8px; text-align: center;">
      <strong style="color: #92400e;">💡 Did you know?</strong>
      <p style="margin: 8px 0 0; color: #78350f; font-size: 14px;">78% of customers buy from the first business to respond. Responding in under 5 minutes makes you 100x more likely to connect!</p>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding: 24px; text-align: center; color: #6b7280; font-size: 12px;">
    <p style="margin: 0;">Sent by <a href="https://workflowmd.com" style="color: #667eea; text-decoration: none;">WorkflowMD</a> Response Tracker</p>
    <p style="margin: 8px 0 0;">You're receiving this because you enabled daily reports.</p>
  </div>

</body>
</html>
  `.trim();
}

/**
 * POST /api/reports/daily
 * Generate and optionally send a daily email report
 */
// Pro feature: Email reports
reportsRouter.post(
  '/daily',
  requireAuth,
  requireGHLConnection,
  attachPlanInfo,
  requirePro,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const { sendTo, preview } = req.body;
    
    logger.info('Generating daily report', { locationId, sendTo, preview, requestId: req.id });
    
    // Calculate date range (last 24 hours)
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    
    // Fetch overview metrics
    const overviewResult = await pool.query(`
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
    
    const overview = overviewResult.rows[0];
    const totalConversations = parseInt(overview.total_conversations) || 0;
    const respondedConversations = parseInt(overview.responded) || 0;
    const missedLeadsCount = parseInt(overview.missed_count) || 0;
    const avgResponseTime = overview.avg_response_time || 0;
    const responseRate = totalConversations > 0 
      ? Math.round((respondedConversations / totalConversations) * 100) 
      : 0;
    
    // Fetch top performers
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
    
    const topPerformers = teamResult.rows.map(row => ({
      userName: row.user_name || 'Unknown',
      avgResponseTime: row.avg_response_time || 0,
      totalResponses: parseInt(row.total_responses) || 0
    }));
    
    // Fetch channel breakdown
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
    
    const channelBreakdown = channelResult.rows.map(row => ({
      channel: row.channel || 'unknown',
      count: parseInt(row.count) || 0,
      avgResponseTime: row.avg_response_time || 0
    }));
    
    // Get location name
    const locationResult = await pool.query(
      'SELECT name FROM ghl_locations WHERE location_id = $1',
      [locationId]
    );
    const locationName = locationResult.rows[0]?.name || 'Your Location';
    
    const reportData: DailyReportData = {
      avgResponseTime,
      totalConversations,
      respondedConversations,
      missedLeadsCount,
      responseRate,
      topPerformers,
      channelBreakdown
    };
    
    const reportDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const html = generateDailyReportHTML(reportData, locationName, reportDate);
    
    // If preview mode, return HTML without sending
    if (preview) {
      return ApiResponse.success(res, {
        preview: true,
        html,
        data: reportData
      });
    }
    
    // Send email if recipient provided
    if (sendTo) {
      const recipients = Array.isArray(sendTo) ? sendTo : [sendTo];
      
      await sendEmail({
        to: recipients,
        subject: `⚡ Daily Response Report - ${reportDate}`,
        html
      });
      
      logger.info('Daily report sent', { locationId, recipients, requestId: req.id });
      
      return ApiResponse.success(res, {
        sent: true,
        recipients,
        data: reportData
      });
    }
    
    // Return data and HTML if no send requested
    return ApiResponse.success(res, {
      html,
      data: reportData
    });
  })
);

/**
 * GET /api/reports/pdf
 * Generate and download a comprehensive PDF report
 */
reportsRouter.get(
  '/pdf',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req: any, res: any) => {
    const locationId = req.locationId;
    const days = parseInt(req.query.days as string) || 7;
    
    logger.info('Generating PDF report', { locationId, days, requestId: req.id });
    
    try {
      // Generate the PDF
      const pdfBuffer = await generateResponseReportPDF(locationId, days);
      
      // Get location name for filename
      const locationResult = await pool.query(
        'SELECT name FROM ghl_locations WHERE location_id = $1',
        [locationId]
      );
      const locationName = locationResult.rows[0]?.name || 'Report';
      const safeLocationName = locationName.replace(/[^a-zA-Z0-9]/g, '_');
      
      // Generate filename with date
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `Response_Report_${safeLocationName}_${days}days_${dateStr}.pdf`;
      
      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send the PDF
      res.send(pdfBuffer);
      
      logger.info('PDF report generated successfully', { 
        locationId, 
        days, 
        size: pdfBuffer.length,
        requestId: req.id 
      });
      
    } catch (error: any) {
      logger.error('PDF generation failed', { locationId, days, requestId: req.id }, error);
      return ApiResponse.error(res, 'Failed to generate PDF report', 500);
    }
  })
);

export default reportsRouter;
