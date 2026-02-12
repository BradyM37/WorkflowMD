/**
 * RESPONSE TIME PDF REPORT GENERATOR
 * 
 * Professional PDF reports for response tracking metrics
 * Includes: Executive Summary, Team Leaderboard, Channel Breakdown, Heatmap, Missed Leads
 */

import PDFDocument from 'pdfkit';
import { pool } from './database';

// ============================================================================
// TYPES
// ============================================================================

interface ReportData {
  locationName: string;
  dateRange: { start: Date; end: Date; days: number };
  metrics: {
    avgResponseTime: number;
    medianResponseTime: number;
    responseRate: number;
    totalConversations: number;
    respondedConversations: number;
    missedCount: number;
    under1Min: number;
    under5Min: number;
    under15Min: number;
    under1Hr: number;
    over1Hr: number;
    speedGrade: string;
  };
  comparison: {
    currentPeriod: { avgResponseTime: number; responseRate: number; missedCount: number };
    previousPeriod: { avgResponseTime: number; responseRate: number; missedCount: number };
    changes: { responseTime: number; responseRate: number; missedCount: number };
  };
  team: Array<{
    userName: string;
    avgResponseTime: number;
    totalResponses: number;
    fastestResponse: number;
    missedCount: number;
  }>;
  channels: Array<{
    channel: string;
    totalConversations: number;
    avgResponseTime: number;
    missedCount: number;
    fastResponses: number;
  }>;
  hourlyHeatmap: Array<{
    dayOfWeek: number;
    hour: number;
    avgResponseTime: number;
    count: number;
  }>;
  missedLeads: Array<{
    contactName: string;
    contactEmail?: string;
    contactPhone?: string;
    channel: string;
    waitingSince: Date;
    waitingMinutes: number;
  }>;
}

// ============================================================================
// BRAND COLORS
// ============================================================================

const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  excellent: '#52c41a',
  good: '#73d13d',
  average: '#faad14',
  poor: '#ff7a45',
  critical: '#ff4d4f',
  text: '#1f2937',
  textLight: '#6b7280',
  background: '#f9fafb',
  white: '#ffffff',
  border: '#e5e7eb'
};

// ============================================================================
// HELPERS
// ============================================================================

function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    'Excellent': COLORS.excellent,
    'Good': COLORS.good,
    'Average': COLORS.average,
    'Poor': COLORS.poor,
    'Critical': COLORS.critical
  };
  return colors[grade] || COLORS.textLight;
}

function getResponseTimeColor(seconds: number): string {
  if (seconds < 60) return COLORS.excellent;
  if (seconds < 300) return COLORS.good;
  if (seconds < 900) return COLORS.average;
  if (seconds < 3600) return COLORS.poor;
  return COLORS.critical;
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ];
}

function getDayName(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] || '';
}

function getChangeArrow(change: number, inverse: boolean = false): string {
  if (change === 0) return '→';
  const isPositive = inverse ? change < 0 : change > 0;
  return isPositive ? '↑' : '↓';
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

export async function fetchReportData(locationId: string, days: number): Promise<ReportData> {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);

  // Get location name
  const locationResult = await pool.query(
    'SELECT name FROM ghl_locations WHERE location_id = $1',
    [locationId]
  );
  const locationName = locationResult.rows[0]?.name || 'Your Location';

  // Current period metrics
  const metricsResult = await pool.query(`
    SELECT 
      COUNT(*) as total_conversations,
      COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) as responded,
      COUNT(*) FILTER (WHERE is_missed = true) as missed_count,
      AVG(response_time_seconds)::INTEGER as avg_response_time,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_seconds)::INTEGER as median_response_time,
      COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL AND response_time_seconds < 60) as under_1_min,
      COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL AND response_time_seconds >= 60 AND response_time_seconds < 300) as under_5_min,
      COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL AND response_time_seconds >= 300 AND response_time_seconds < 900) as under_15_min,
      COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL AND response_time_seconds >= 900 AND response_time_seconds < 3600) as under_1_hr,
      COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL AND response_time_seconds >= 3600) as over_1_hr
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at < $3
  `, [locationId, startDate, endDate]);

  const m = metricsResult.rows[0];
  const totalConversations = parseInt(m.total_conversations) || 0;
  const respondedConversations = parseInt(m.responded) || 0;
  const avgResponseTime = m.avg_response_time || 0;
  const responseRate = totalConversations > 0 
    ? Math.round((respondedConversations / totalConversations) * 100) 
    : 0;

  // Calculate grade
  let speedGrade = 'Critical';
  if (avgResponseTime < 60) speedGrade = 'Excellent';
  else if (avgResponseTime < 300) speedGrade = 'Good';
  else if (avgResponseTime < 900) speedGrade = 'Average';
  else if (avgResponseTime < 3600) speedGrade = 'Poor';

  // Previous period for comparison
  const prevResult = await pool.query(`
    SELECT 
      COUNT(*) as total_conversations,
      COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) as responded,
      COUNT(*) FILTER (WHERE is_missed = true) as missed_count,
      AVG(response_time_seconds)::INTEGER as avg_response_time
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at < $3
  `, [locationId, prevStartDate, startDate]);

  const prev = prevResult.rows[0];
  const prevTotal = parseInt(prev.total_conversations) || 1;
  const prevResponded = parseInt(prev.responded) || 0;
  const prevResponseRate = prevTotal > 0 ? Math.round((prevResponded / prevTotal) * 100) : 0;
  const prevAvgResponseTime = prev.avg_response_time || 0;
  const prevMissedCount = parseInt(prev.missed_count) || 0;

  // Team data
  const teamResult = await pool.query(`
    SELECT 
      assigned_user_name as user_name,
      AVG(response_time_seconds)::INTEGER as avg_response_time,
      COUNT(*) as total_responses,
      MIN(response_time_seconds) as fastest_response,
      COUNT(*) FILTER (WHERE is_missed = true) as missed_count
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at < $3
      AND assigned_user_id IS NOT NULL
      AND response_time_seconds IS NOT NULL
    GROUP BY assigned_user_name
    ORDER BY avg_response_time ASC
  `, [locationId, startDate, endDate]);

  // Channel data
  const channelResult = await pool.query(`
    SELECT 
      channel,
      COUNT(*) as total_conversations,
      AVG(response_time_seconds)::INTEGER as avg_response_time,
      COUNT(*) FILTER (WHERE is_missed = true) as missed_count,
      COUNT(*) FILTER (WHERE response_time_seconds < 300) as fast_responses
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at < $3
      AND channel IS NOT NULL
    GROUP BY channel
    ORDER BY total_conversations DESC
  `, [locationId, startDate, endDate]);

  // Hourly heatmap data
  const heatmapResult = await pool.query(`
    SELECT 
      EXTRACT(DOW FROM first_inbound_at) as day_of_week,
      EXTRACT(HOUR FROM first_inbound_at) as hour,
      AVG(response_time_seconds)::INTEGER as avg_response_time,
      COUNT(*) as count
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at < $3
      AND response_time_seconds IS NOT NULL
    GROUP BY day_of_week, hour
    ORDER BY day_of_week, hour
  `, [locationId, startDate, endDate]);

  // Missed leads
  const missedResult = await pool.query(`
    SELECT 
      contact_name,
      contact_email,
      contact_phone,
      channel,
      first_inbound_at
    FROM conversations
    WHERE location_id = $1 
      AND is_missed = true
      AND first_inbound_at >= $2
    ORDER BY first_inbound_at DESC
    LIMIT 25
  `, [locationId, startDate]);

  const currentMissedCount = parseInt(m.missed_count) || 0;
  
  return {
    locationName,
    dateRange: { start: startDate, end: endDate, days },
    metrics: {
      avgResponseTime,
      medianResponseTime: m.median_response_time || 0,
      responseRate,
      totalConversations,
      respondedConversations,
      missedCount: currentMissedCount,
      under1Min: parseInt(m.under_1_min) || 0,
      under5Min: parseInt(m.under_5_min) || 0,
      under15Min: parseInt(m.under_15_min) || 0,
      under1Hr: parseInt(m.under_1_hr) || 0,
      over1Hr: parseInt(m.over_1_hr) || 0,
      speedGrade
    },
    comparison: {
      currentPeriod: { avgResponseTime, responseRate, missedCount: currentMissedCount },
      previousPeriod: { 
        avgResponseTime: prevAvgResponseTime, 
        responseRate: prevResponseRate, 
        missedCount: prevMissedCount 
      },
      changes: {
        responseTime: prevAvgResponseTime > 0 
          ? ((avgResponseTime - prevAvgResponseTime) / prevAvgResponseTime) * 100 
          : 0,
        responseRate: responseRate - prevResponseRate,
        missedCount: currentMissedCount - prevMissedCount
      }
    },
    team: teamResult.rows.map(row => ({
      userName: row.user_name || 'Unknown',
      avgResponseTime: row.avg_response_time || 0,
      totalResponses: parseInt(row.total_responses) || 0,
      fastestResponse: row.fastest_response || 0,
      missedCount: parseInt(row.missed_count) || 0
    })),
    channels: channelResult.rows.map(row => ({
      channel: row.channel || 'unknown',
      totalConversations: parseInt(row.total_conversations) || 0,
      avgResponseTime: row.avg_response_time || 0,
      missedCount: parseInt(row.missed_count) || 0,
      fastResponses: parseInt(row.fast_responses) || 0
    })),
    hourlyHeatmap: heatmapResult.rows.map(row => ({
      dayOfWeek: parseInt(row.day_of_week),
      hour: parseInt(row.hour),
      avgResponseTime: row.avg_response_time || 0,
      count: parseInt(row.count) || 0
    })),
    missedLeads: missedResult.rows.map(row => {
      const waitingSince = new Date(row.first_inbound_at);
      return {
        contactName: row.contact_name || 'Unknown',
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        channel: row.channel || 'unknown',
        waitingSince,
        waitingMinutes: Math.floor((Date.now() - waitingSince.getTime()) / 60000)
      };
    })
  };
}

// ============================================================================
// PDF GENERATION
// ============================================================================

export async function generateResponseReportPDF(locationId: string, days: number): Promise<Buffer> {
  const data = await fetchReportData(locationId, days);
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        info: {
          Title: `Response Time Report - ${data.locationName}`,
          Author: 'FirstResponse',
          Subject: 'Response Time Analytics',
          CreationDate: new Date()
        },
        autoFirstPage: false
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page?.width || 612;
      const contentWidth = pageWidth - 100;
      
      // ========================================
      // PAGE 1: EXECUTIVE SUMMARY
      // ========================================
      doc.addPage();
      let y = 0;

      // Header with gradient background
      doc.rect(0, 0, pageWidth, 130).fillColor(COLORS.primary).fill();
      
      // Title
      doc.fontSize(28)
         .fillColor(COLORS.white)
         .font('Helvetica-Bold')
         .text('⚡ Response Time Report', 50, 35);
      
      // Subtitle
      doc.fontSize(12)
         .fillColor(COLORS.white)
         .font('Helvetica')
         .text(`${data.locationName}`, 50, 70);
      
      // Date range
      const startStr = data.dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = data.dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      doc.text(`${startStr} - ${endStr} (${data.dateRange.days} days)`, 50, 88);
      
      // Generated date (right aligned)
      doc.text(
        `Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`,
        50, 106,
        { width: contentWidth, align: 'right' }
      );

      y = 150;

      // ========================================
      // EXECUTIVE SUMMARY SECTION
      // ========================================
      
      doc.fontSize(16)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('Executive Summary', 50, y);
      y += 30;

      // Main KPI boxes
      const kpiWidth = (contentWidth - 30) / 3;
      
      // Avg Response Time box
      doc.roundedRect(50, y, kpiWidth, 80, 8)
         .fillColor(getGradeColor(data.metrics.speedGrade))
         .fill();
      
      doc.fontSize(28)
         .fillColor(COLORS.white)
         .font('Helvetica-Bold')
         .text(formatTime(data.metrics.avgResponseTime), 50, y + 15, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(10)
         .text('Avg Response Time', 50, y + 50, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(9)
         .text(`${data.metrics.speedGrade}`, 50, y + 62, { width: kpiWidth, align: 'center' });

      // Response Rate box
      const rateColor = data.metrics.responseRate >= 90 ? COLORS.excellent : 
                        data.metrics.responseRate >= 70 ? COLORS.average : COLORS.critical;
      doc.roundedRect(50 + kpiWidth + 15, y, kpiWidth, 80, 8)
         .fillColor(rateColor)
         .fill();
      
      doc.fontSize(28)
         .fillColor(COLORS.white)
         .font('Helvetica-Bold')
         .text(`${data.metrics.responseRate}%`, 50 + kpiWidth + 15, y + 15, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(10)
         .text('Response Rate', 50 + kpiWidth + 15, y + 50, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(9)
         .text(`${data.metrics.respondedConversations}/${data.metrics.totalConversations} leads`, 50 + kpiWidth + 15, y + 62, { width: kpiWidth, align: 'center' });

      // Missed Leads box
      const missedColor = data.metrics.missedCount === 0 ? COLORS.excellent : COLORS.critical;
      doc.roundedRect(50 + (kpiWidth + 15) * 2, y, kpiWidth, 80, 8)
         .fillColor(missedColor)
         .fill();
      
      doc.fontSize(28)
         .fillColor(COLORS.white)
         .font('Helvetica-Bold')
         .text(data.metrics.missedCount.toString(), 50 + (kpiWidth + 15) * 2, y + 15, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(10)
         .text('Missed Leads', 50 + (kpiWidth + 15) * 2, y + 50, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(9)
         .text(data.metrics.missedCount === 0 ? 'All contacted!' : 'Need follow-up', 50 + (kpiWidth + 15) * 2, y + 62, { width: kpiWidth, align: 'center' });

      y += 100;

      // ========================================
      // PERIOD COMPARISON
      // ========================================
      
      doc.fontSize(14)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('📊 Period Comparison', 50, y);
      y += 25;

      doc.fontSize(10)
         .fillColor(COLORS.textLight)
         .font('Helvetica')
         .text(`This period vs previous ${data.dateRange.days} days`, 50, y);
      y += 20;

      // Comparison table
      const compHeaders = ['Metric', 'This Period', 'Last Period', 'Change'];
      const compData = [
        [
          'Avg Response Time',
          formatTime(data.comparison.currentPeriod.avgResponseTime),
          formatTime(data.comparison.previousPeriod.avgResponseTime),
          `${getChangeArrow(data.comparison.changes.responseTime, true)} ${formatPercent(data.comparison.changes.responseTime)}`
        ],
        [
          'Response Rate',
          `${data.comparison.currentPeriod.responseRate}%`,
          `${data.comparison.previousPeriod.responseRate}%`,
          `${getChangeArrow(data.comparison.changes.responseRate)} ${formatPercent(data.comparison.changes.responseRate)}`
        ],
        [
          'Missed Leads',
          data.comparison.currentPeriod.missedCount.toString(),
          data.comparison.previousPeriod.missedCount.toString(),
          `${getChangeArrow(data.comparison.changes.missedCount, true)} ${data.comparison.changes.missedCount >= 0 ? '+' : ''}${data.comparison.changes.missedCount}`
        ]
      ];

      const colWidths = [140, 100, 100, 100];
      
      // Header row
      doc.fillColor(COLORS.primary);
      doc.rect(50, y, contentWidth, 25).fill();
      doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
      let xPos = 55;
      compHeaders.forEach((header, i) => {
        doc.text(header, xPos, y + 8, { width: colWidths[i] - 10 });
        xPos += colWidths[i];
      });
      y += 25;

      // Data rows
      compData.forEach((row, rowIdx) => {
        if (rowIdx % 2 === 0) {
          doc.fillColor(COLORS.background).rect(50, y, contentWidth, 22).fill();
        }
        doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
        xPos = 55;
        row.forEach((cell, i) => {
          // Color the change column
          if (i === 3) {
            const isImproved = (rowIdx === 0 && data.comparison.changes.responseTime < 0) ||
                             (rowIdx === 1 && data.comparison.changes.responseRate > 0) ||
                             (rowIdx === 2 && data.comparison.changes.missedCount < 0);
            doc.fillColor(isImproved ? COLORS.excellent : COLORS.critical);
          }
          doc.text(cell, xPos, y + 6, { width: colWidths[i] - 10 });
          doc.fillColor(COLORS.text);
          xPos += colWidths[i];
        });
        y += 22;
      });

      y += 20;

      // ========================================
      // SPEED DISTRIBUTION
      // ========================================
      
      doc.fontSize(14)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('⏱️ Response Speed Distribution', 50, y);
      y += 25;

      const speedData = [
        { label: '< 1 min', count: data.metrics.under1Min, color: COLORS.excellent },
        { label: '1-5 min', count: data.metrics.under5Min, color: COLORS.good },
        { label: '5-15 min', count: data.metrics.under15Min, color: COLORS.average },
        { label: '15-60 min', count: data.metrics.under1Hr, color: COLORS.poor },
        { label: '> 1 hour', count: data.metrics.over1Hr, color: COLORS.critical }
      ];

      const barMaxWidth = 250;
      const maxCount = Math.max(...speedData.map(d => d.count), 1);

      speedData.forEach((item) => {
        const barWidth = (item.count / maxCount) * barMaxWidth;
        const pct = data.metrics.respondedConversations > 0 
          ? Math.round((item.count / data.metrics.respondedConversations) * 100) 
          : 0;
        
        doc.fontSize(9).fillColor(COLORS.text).font('Helvetica')
           .text(item.label, 50, y + 3, { width: 70 });
        
        doc.roundedRect(125, y, Math.max(barWidth, 4), 18, 3)
           .fillColor(item.color).fill();
        
        doc.fillColor(COLORS.text)
           .text(`${item.count} (${pct}%)`, 385, y + 3, { width: 80 });
        
        y += 24;
      });

      // Footer
      addFooter(doc);

      // ========================================
      // PAGE 2: TEAM & CHANNELS
      // ========================================
      doc.addPage();
      y = 50;

      // Team Leaderboard
      doc.fontSize(16)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('🏆 Team Leaderboard', 50, y);
      y += 30;

      if (data.team.length === 0) {
        doc.fontSize(10)
           .fillColor(COLORS.textLight)
           .font('Helvetica-Oblique')
           .text('No team data available for this period.', 50, y);
        y += 30;
      } else {
        // Team table
        const teamHeaders = ['Rank', 'Team Member', 'Avg Response', 'Fastest', 'Responses', 'Missed'];
        const teamColWidths = [40, 140, 90, 80, 70, 60];
        
        doc.fillColor(COLORS.primary).rect(50, y, contentWidth, 22).fill();
        doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
        xPos = 55;
        teamHeaders.forEach((header, i) => {
          doc.text(header, xPos, y + 6, { width: teamColWidths[i] - 5 });
          xPos += teamColWidths[i];
        });
        y += 22;

        const medals = ['🥇', '🥈', '🥉'];
        data.team.slice(0, 10).forEach((member, idx) => {
          if (idx % 2 === 0) {
            doc.fillColor(COLORS.background).rect(50, y, contentWidth, 20).fill();
          }
          doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
          
          const rowData = [
            idx < 3 ? medals[idx] : `${idx + 1}`,
            member.userName,
            formatTime(member.avgResponseTime),
            formatTime(member.fastestResponse),
            member.totalResponses.toString(),
            member.missedCount.toString()
          ];
          
          xPos = 55;
          rowData.forEach((cell, i) => {
            if (i === 2) doc.fillColor(getResponseTimeColor(member.avgResponseTime));
            else if (i === 5) doc.fillColor(member.missedCount > 0 ? COLORS.critical : COLORS.excellent);
            else doc.fillColor(COLORS.text);
            doc.text(cell, xPos, y + 5, { width: teamColWidths[i] - 5 });
            xPos += teamColWidths[i];
          });
          y += 20;
        });
        y += 10;
      }

      y += 20;

      // Channel Breakdown
      doc.fontSize(16)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('📱 Channel Breakdown', 50, y);
      y += 30;

      if (data.channels.length === 0) {
        doc.fontSize(10)
           .fillColor(COLORS.textLight)
           .font('Helvetica-Oblique')
           .text('No channel data available for this period.', 50, y);
        y += 30;
      } else {
        const channelHeaders = ['Channel', 'Conversations', 'Avg Response', 'Fast (<5m)', 'Missed'];
        const channelColWidths = [100, 100, 100, 90, 80];
        
        doc.fillColor(COLORS.primary).rect(50, y, contentWidth, 22).fill();
        doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
        xPos = 55;
        channelHeaders.forEach((header, i) => {
          doc.text(header, xPos, y + 6, { width: channelColWidths[i] - 5 });
          xPos += channelColWidths[i];
        });
        y += 22;

        data.channels.forEach((channel, idx) => {
          if (idx % 2 === 0) {
            doc.fillColor(COLORS.background).rect(50, y, contentWidth, 20).fill();
          }
          doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
          
          const rowData = [
            channel.channel.toUpperCase(),
            channel.totalConversations.toString(),
            formatTime(channel.avgResponseTime),
            channel.fastResponses.toString(),
            channel.missedCount.toString()
          ];
          
          xPos = 55;
          rowData.forEach((cell, i) => {
            if (i === 2) doc.fillColor(getResponseTimeColor(channel.avgResponseTime));
            else if (i === 4) doc.fillColor(channel.missedCount > 0 ? COLORS.critical : COLORS.excellent);
            else doc.fillColor(COLORS.text);
            doc.text(cell, xPos, y + 5, { width: channelColWidths[i] - 5 });
            xPos += channelColWidths[i];
          });
          y += 20;
        });
      }

      y += 30;

      // ========================================
      // HOURLY HEATMAP TABLE
      // ========================================
      
      doc.fontSize(16)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('🗓️ Response Time by Day & Hour', 50, y);
      y += 25;

      doc.fontSize(9)
         .fillColor(COLORS.textLight)
         .font('Helvetica')
         .text('Average response time by day of week and hour (business hours shown)', 50, y);
      y += 20;

      // Create a simple heatmap table (business hours 8am-6pm)
      const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const cellW = 42;
      const cellH = 18;
      const labelW = 40;

      // Build lookup map
      const heatmapMap = new Map<string, number>();
      data.hourlyHeatmap.forEach(h => {
        heatmapMap.set(`${h.dayOfWeek}-${h.hour}`, h.avgResponseTime);
      });

      // Header row (hours)
      doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica-Bold');
      hours.forEach((hour, i) => {
        const label = hour > 12 ? `${hour - 12}p` : hour === 12 ? '12p' : `${hour}a`;
        doc.text(label, 50 + labelW + i * cellW, y, { width: cellW, align: 'center' });
      });
      y += 15;

      // Data rows (days)
      days.forEach((day, dayIdx) => {
        doc.fontSize(8).fillColor(COLORS.text).font('Helvetica');
        doc.text(day, 50, y + 4, { width: labelW - 5 });
        
        hours.forEach((hour, hourIdx) => {
          const avgTime = heatmapMap.get(`${dayIdx}-${hour}`) || 0;
          const cellColor = avgTime === 0 ? COLORS.border : getResponseTimeColor(avgTime);
          
          doc.rect(50 + labelW + hourIdx * cellW, y, cellW - 2, cellH)
             .fillColor(cellColor)
             .fillOpacity(avgTime === 0 ? 0.3 : 0.8)
             .fill()
             .fillOpacity(1);
          
          if (avgTime > 0) {
            doc.fontSize(7)
               .fillColor(COLORS.white)
               .text(formatTime(avgTime), 50 + labelW + hourIdx * cellW, y + 5, { width: cellW - 2, align: 'center' });
          }
        });
        y += cellH + 2;
      });

      // Legend
      y += 10;
      const legendItems = [
        { label: '< 1m', color: COLORS.excellent },
        { label: '< 5m', color: COLORS.good },
        { label: '< 15m', color: COLORS.average },
        { label: '< 1h', color: COLORS.poor },
        { label: '> 1h', color: COLORS.critical }
      ];
      doc.fontSize(8).fillColor(COLORS.textLight).text('Legend: ', 50, y);
      legendItems.forEach((item, i) => {
        doc.rect(90 + i * 60, y - 2, 12, 12).fillColor(item.color).fill();
        doc.fillColor(COLORS.text).text(item.label, 105 + i * 60, y);
      });

      addFooter(doc);

      // ========================================
      // PAGE 3: MISSED LEADS & RECOMMENDATIONS
      // ========================================
      doc.addPage();
      y = 50;

      doc.fontSize(16)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('⚠️ Missed Leads Requiring Follow-Up', 50, y);
      y += 30;

      if (data.missedLeads.length === 0) {
        doc.roundedRect(50, y, contentWidth, 60, 8)
           .fillColor(COLORS.excellent)
           .fillOpacity(0.1)
           .fill()
           .fillOpacity(1);
        
        doc.fontSize(14)
           .fillColor(COLORS.excellent)
           .font('Helvetica-Bold')
           .text('✅ Great Job!', 50, y + 15, { width: contentWidth, align: 'center' });
        
        doc.fontSize(10)
           .fillColor(COLORS.text)
           .font('Helvetica')
           .text('All leads have been contacted. Keep up the excellent work!', 50, y + 35, { width: contentWidth, align: 'center' });
        y += 80;
      } else {
        // Missed leads table
        const missedHeaders = ['Contact', 'Phone/Email', 'Channel', 'Waiting'];
        const missedColWidths = [140, 180, 80, 80];
        
        doc.fillColor(COLORS.critical).rect(50, y, contentWidth, 22).fill();
        doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
        xPos = 55;
        missedHeaders.forEach((header, i) => {
          doc.text(header, xPos, y + 6, { width: missedColWidths[i] - 5 });
          xPos += missedColWidths[i];
        });
        y += 22;

        data.missedLeads.slice(0, 15).forEach((lead, idx) => {
          if (idx % 2 === 0) {
            doc.fillColor('#fef2f2').rect(50, y, contentWidth, 22).fill();
          }
          doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
          
          const contact = lead.contactPhone || lead.contactEmail || 'N/A';
          const waitingStr = lead.waitingMinutes > 60 
            ? `${Math.floor(lead.waitingMinutes / 60)}h ${lead.waitingMinutes % 60}m`
            : `${lead.waitingMinutes}m`;
          
          const rowData = [
            lead.contactName,
            contact,
            lead.channel.toUpperCase(),
            waitingStr
          ];
          
          xPos = 55;
          rowData.forEach((cell, i) => {
            if (i === 3) doc.fillColor(COLORS.critical);
            else doc.fillColor(COLORS.text);
            doc.text(cell, xPos, y + 6, { width: missedColWidths[i] - 5 });
            xPos += missedColWidths[i];
          });
          y += 22;
        });

        if (data.missedLeads.length > 15) {
          y += 5;
          doc.fontSize(9)
             .fillColor(COLORS.textLight)
             .font('Helvetica-Oblique')
             .text(`+ ${data.missedLeads.length - 15} more missed leads not shown`, 50, y);
        }
        y += 20;
      }

      y += 20;

      // ========================================
      // RECOMMENDATIONS
      // ========================================
      
      doc.fontSize(16)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('💡 Recommendations', 50, y);
      y += 25;

      const recommendations = generateRecommendations(data);
      
      recommendations.forEach((rec, idx) => {
        doc.roundedRect(50, y, contentWidth, 50, 5)
           .fillColor(COLORS.background)
           .fill();
        
        doc.fontSize(10)
           .fillColor(COLORS.primary)
           .font('Helvetica-Bold')
           .text(`${idx + 1}. ${rec.title}`, 60, y + 10, { width: contentWidth - 20 });
        
        doc.fontSize(9)
           .fillColor(COLORS.textLight)
           .font('Helvetica')
           .text(rec.description, 60, y + 28, { width: contentWidth - 20 });
        
        y += 58;
      });

      // ========================================
      // INDUSTRY BENCHMARK BOX
      // ========================================
      
      y += 10;
      doc.roundedRect(50, y, contentWidth, 60, 8)
         .fillColor('#fffbeb')
         .fill();
      
      doc.roundedRect(50, y, 4, 60, 2)
         .fillColor(COLORS.average)
         .fill();
      
      doc.fontSize(11)
         .fillColor('#92400e')
         .font('Helvetica-Bold')
         .text('📈 Industry Benchmark', 65, y + 12);
      
      doc.fontSize(9)
         .fillColor('#78350f')
         .font('Helvetica')
         .text('78% of customers buy from the first business to respond. Responding within 5 minutes makes you 100x more likely to connect with a lead. Harvard Business Review, Lead Response Management Study.', 65, y + 28, { width: contentWidth - 30 });

      addFooter(doc);

      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

// ============================================================================
// HELPER: ADD FOOTER
// ============================================================================

function addFooter(doc: PDFKit.PDFDocument) {
  const pageNum = doc.bufferedPageRange().count;
  doc.fontSize(8)
     .fillColor(COLORS.textLight)
     .font('Helvetica')
     .text(
       `FirstResponse  •  Page ${pageNum}  •  Generated ${new Date().toLocaleString()}`,
       50,
       doc.page.height - 40,
       { width: doc.page.width - 100, align: 'center' }
     );
}

// ============================================================================
// HELPER: GENERATE RECOMMENDATIONS
// ============================================================================

function generateRecommendations(data: ReportData): Array<{ title: string; description: string }> {
  const recs: Array<{ title: string; description: string }> = [];

  // Response time recommendations
  if (data.metrics.avgResponseTime > 900) {
    recs.push({
      title: 'Urgent: Improve Response Time',
      description: `Your average response time of ${formatTime(data.metrics.avgResponseTime)} is above the 15-minute threshold. Aim to respond within 5 minutes to dramatically increase conversion rates.`
    });
  } else if (data.metrics.avgResponseTime > 300) {
    recs.push({
      title: 'Good Progress - Push for Excellence',
      description: `Your ${formatTime(data.metrics.avgResponseTime)} average is solid, but responses under 1 minute see 391% higher conversion. Consider dedicated first-response staff during peak hours.`
    });
  }

  // Missed leads
  if (data.metrics.missedCount > 0) {
    recs.push({
      title: `Follow Up on ${data.metrics.missedCount} Missed Leads`,
      description: 'These leads haven\'t received a response after 1 hour. Reach out immediately - even a late response is better than none.'
    });
  }

  // Channel-specific recommendations
  const slowestChannel = data.channels.reduce((max, ch) => 
    ch.avgResponseTime > (max?.avgResponseTime || 0) ? ch : max, data.channels[0]);
  
  if (slowestChannel && slowestChannel.avgResponseTime > 600) {
    recs.push({
      title: `Optimize ${slowestChannel.channel.toUpperCase()} Response`,
      description: `Your ${slowestChannel.channel.toUpperCase()} channel has the slowest average response time (${formatTime(slowestChannel.avgResponseTime)}). Consider adding dedicated monitoring or automated first-response for this channel.`
    });
  }

  // Team recommendations
  if (data.team.length > 3) {
    const slowest = data.team[data.team.length - 1];
    const fastest = data.team[0];
    if (slowest.avgResponseTime > fastest.avgResponseTime * 3) {
      recs.push({
        title: 'Reduce Team Response Time Variance',
        description: `There's a large gap between your fastest responder (${formatTime(fastest.avgResponseTime)}) and slowest (${formatTime(slowest.avgResponseTime)}). Consider training or process improvements for consistency.`
      });
    }
  }

  // Positive reinforcement
  if (data.metrics.responseRate >= 95 && data.metrics.avgResponseTime < 300) {
    recs.push({
      title: '🌟 Excellent Performance!',
      description: 'Your team is crushing it with a 95%+ response rate and sub-5-minute average. Consider setting stretch goals or gamifying further improvement.'
    });
  }

  // Add general recommendation if we don't have enough
  if (recs.length < 3) {
    recs.push({
      title: 'Enable Real-Time Alerts',
      description: 'Set up browser notifications and email alerts for leads waiting more than 5 minutes. Visit Response Settings to configure alerts.'
    });
  }

  return recs.slice(0, 4);
}

// ============================================================================
// WHITE-LABEL BRANDED PDF GENERATION
// ============================================================================

interface BrandingOptions {
  companyName?: string | null;
  logoUrl?: string | null;
  primaryColor?: string;
  secondaryColor?: string;
  customFooterText?: string | null;
  hidePoweredBy?: boolean;
}

/**
 * Generate a white-labeled PDF report with agency branding
 */
export async function generateBrandedResponseReportPDF(
  locationId: string, 
  days: number,
  branding: BrandingOptions
): Promise<Buffer> {
  const data = await fetchReportData(locationId, days);
  
  // Override colors with branding if provided
  const brandedColors = {
    ...COLORS,
    primary: branding.primaryColor || COLORS.primary,
    secondary: branding.secondaryColor || COLORS.secondary
  };
  
  return new Promise((resolve, reject) => {
    try {
      const companyName = branding.companyName || data.locationName;
      
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        info: {
          Title: `Response Time Report - ${companyName}`,
          Author: branding.hidePoweredBy ? companyName : 'FirstResponse',
          Subject: 'Response Time Analytics',
          CreationDate: new Date()
        },
        autoFirstPage: false
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page?.width || 612;
      const contentWidth = pageWidth - 100;
      
      // Helper for branded footer
      const addBrandedFooter = () => {
        const pageNum = doc.bufferedPageRange().count;
        let footerText = branding.customFooterText || 
          (branding.hidePoweredBy ? companyName : 'FirstResponse');
        footerText += `  •  Page ${pageNum}  •  Generated ${new Date().toLocaleString()}`;
        
        doc.fontSize(8)
           .fillColor(COLORS.textLight)
           .font('Helvetica')
           .text(footerText, 50, doc.page.height - 40, { width: pageWidth - 100, align: 'center' });
      };
      
      // ========================================
      // PAGE 1: EXECUTIVE SUMMARY (BRANDED)
      // ========================================
      doc.addPage();
      let y = 0;

      // Header with branded gradient background
      doc.rect(0, 0, pageWidth, 130).fillColor(brandedColors.primary).fill();
      
      // Title
      doc.fontSize(28)
         .fillColor(COLORS.white)
         .font('Helvetica-Bold')
         .text('⚡ Response Time Report', 50, 35);
      
      // Company name
      doc.fontSize(12)
         .fillColor(COLORS.white)
         .font('Helvetica')
         .text(companyName, 50, 70);
      
      // Date range
      const startStr = data.dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = data.dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      doc.text(`${startStr} - ${endStr} (${data.dateRange.days} days)`, 50, 88);
      
      // Generated date
      doc.text(
        `Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}`,
        50, 106,
        { width: contentWidth, align: 'right' }
      );

      y = 150;

      // ========================================
      // EXECUTIVE SUMMARY SECTION
      // ========================================
      
      doc.fontSize(16)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('Executive Summary', 50, y);
      y += 30;

      // Main KPI boxes
      const kpiWidth = (contentWidth - 30) / 3;
      
      // Avg Response Time box
      doc.roundedRect(50, y, kpiWidth, 80, 8)
         .fillColor(getGradeColor(data.metrics.speedGrade))
         .fill();
      
      doc.fontSize(28)
         .fillColor(COLORS.white)
         .font('Helvetica-Bold')
         .text(formatTime(data.metrics.avgResponseTime), 50, y + 15, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(10)
         .text('Avg Response Time', 50, y + 50, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(9)
         .text(`${data.metrics.speedGrade}`, 50, y + 62, { width: kpiWidth, align: 'center' });

      // Response Rate box
      const rateColor = data.metrics.responseRate >= 90 ? COLORS.excellent : 
                        data.metrics.responseRate >= 70 ? COLORS.average : COLORS.critical;
      doc.roundedRect(50 + kpiWidth + 15, y, kpiWidth, 80, 8)
         .fillColor(rateColor)
         .fill();
      
      doc.fontSize(28)
         .fillColor(COLORS.white)
         .font('Helvetica-Bold')
         .text(`${data.metrics.responseRate}%`, 50 + kpiWidth + 15, y + 15, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(10)
         .text('Response Rate', 50 + kpiWidth + 15, y + 50, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(9)
         .text(`${data.metrics.respondedConversations}/${data.metrics.totalConversations} leads`, 50 + kpiWidth + 15, y + 62, { width: kpiWidth, align: 'center' });

      // Missed Leads box
      const missedColor = data.metrics.missedCount === 0 ? COLORS.excellent : COLORS.critical;
      doc.roundedRect(50 + (kpiWidth + 15) * 2, y, kpiWidth, 80, 8)
         .fillColor(missedColor)
         .fill();
      
      doc.fontSize(28)
         .fillColor(COLORS.white)
         .font('Helvetica-Bold')
         .text(data.metrics.missedCount.toString(), 50 + (kpiWidth + 15) * 2, y + 15, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(10)
         .text('Missed Leads', 50 + (kpiWidth + 15) * 2, y + 50, { width: kpiWidth, align: 'center' });
      
      doc.fontSize(9)
         .text(data.metrics.missedCount === 0 ? 'All contacted!' : 'Need follow-up', 50 + (kpiWidth + 15) * 2, y + 62, { width: kpiWidth, align: 'center' });

      y += 100;

      // ========================================
      // PERIOD COMPARISON
      // ========================================
      
      doc.fontSize(14)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('📊 Period Comparison', 50, y);
      y += 25;

      doc.fontSize(10)
         .fillColor(COLORS.textLight)
         .font('Helvetica')
         .text(`This period vs previous ${data.dateRange.days} days`, 50, y);
      y += 20;

      // Comparison table with branded header
      const compHeaders = ['Metric', 'This Period', 'Last Period', 'Change'];
      const compData = [
        [
          'Avg Response Time',
          formatTime(data.comparison.currentPeriod.avgResponseTime),
          formatTime(data.comparison.previousPeriod.avgResponseTime),
          `${getChangeArrow(data.comparison.changes.responseTime, true)} ${formatPercent(data.comparison.changes.responseTime)}`
        ],
        [
          'Response Rate',
          `${data.comparison.currentPeriod.responseRate}%`,
          `${data.comparison.previousPeriod.responseRate}%`,
          `${getChangeArrow(data.comparison.changes.responseRate)} ${formatPercent(data.comparison.changes.responseRate)}`
        ],
        [
          'Missed Leads',
          data.comparison.currentPeriod.missedCount.toString(),
          data.comparison.previousPeriod.missedCount.toString(),
          `${getChangeArrow(data.comparison.changes.missedCount, true)} ${data.comparison.changes.missedCount >= 0 ? '+' : ''}${data.comparison.changes.missedCount}`
        ]
      ];

      const colWidths = [140, 100, 100, 100];
      
      // Header row with branded color
      doc.fillColor(brandedColors.primary);
      doc.rect(50, y, contentWidth, 25).fill();
      doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
      let xPos = 55;
      compHeaders.forEach((header, i) => {
        doc.text(header, xPos, y + 8, { width: colWidths[i] - 10 });
        xPos += colWidths[i];
      });
      y += 25;

      // Data rows
      compData.forEach((row, rowIdx) => {
        if (rowIdx % 2 === 0) {
          doc.fillColor(COLORS.background).rect(50, y, contentWidth, 22).fill();
        }
        doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
        xPos = 55;
        row.forEach((cell, i) => {
          if (i === 3) {
            const isImproved = (rowIdx === 0 && data.comparison.changes.responseTime < 0) ||
                             (rowIdx === 1 && data.comparison.changes.responseRate > 0) ||
                             (rowIdx === 2 && data.comparison.changes.missedCount < 0);
            doc.fillColor(isImproved ? COLORS.excellent : COLORS.critical);
          }
          doc.text(cell, xPos, y + 6, { width: colWidths[i] - 10 });
          doc.fillColor(COLORS.text);
          xPos += colWidths[i];
        });
        y += 22;
      });

      y += 20;

      // ========================================
      // SPEED DISTRIBUTION
      // ========================================
      
      doc.fontSize(14)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('⏱️ Response Speed Distribution', 50, y);
      y += 25;

      const speedData = [
        { label: '< 1 min', count: data.metrics.under1Min, color: COLORS.excellent },
        { label: '1-5 min', count: data.metrics.under5Min, color: COLORS.good },
        { label: '5-15 min', count: data.metrics.under15Min, color: COLORS.average },
        { label: '15-60 min', count: data.metrics.under1Hr, color: COLORS.poor },
        { label: '> 1 hour', count: data.metrics.over1Hr, color: COLORS.critical }
      ];

      const barMaxWidth = 250;
      const maxCount = Math.max(...speedData.map(d => d.count), 1);

      speedData.forEach((item) => {
        const barWidth = (item.count / maxCount) * barMaxWidth;
        const pct = data.metrics.respondedConversations > 0 
          ? Math.round((item.count / data.metrics.respondedConversations) * 100) 
          : 0;
        
        doc.fontSize(9).fillColor(COLORS.text).font('Helvetica')
           .text(item.label, 50, y + 3, { width: 70 });
        
        doc.roundedRect(125, y, Math.max(barWidth, 4), 18, 3)
           .fillColor(item.color).fill();
        
        doc.fillColor(COLORS.text)
           .text(`${item.count} (${pct}%)`, 385, y + 3, { width: 80 });
        
        y += 24;
      });

      addBrandedFooter();

      // ========================================
      // PAGE 2: TEAM & CHANNELS (BRANDED)
      // ========================================
      doc.addPage();
      y = 50;

      // Team Leaderboard
      doc.fontSize(16)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('🏆 Team Leaderboard', 50, y);
      y += 30;

      if (data.team.length === 0) {
        doc.fontSize(10)
           .fillColor(COLORS.textLight)
           .font('Helvetica-Oblique')
           .text('No team data available for this period.', 50, y);
        y += 30;
      } else {
        const teamHeaders = ['Rank', 'Team Member', 'Avg Response', 'Fastest', 'Responses', 'Missed'];
        const teamColWidths = [40, 140, 90, 80, 70, 60];
        
        doc.fillColor(brandedColors.primary).rect(50, y, contentWidth, 22).fill();
        doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
        xPos = 55;
        teamHeaders.forEach((header, i) => {
          doc.text(header, xPos, y + 6, { width: teamColWidths[i] - 5 });
          xPos += teamColWidths[i];
        });
        y += 22;

        const medals = ['🥇', '🥈', '🥉'];
        data.team.slice(0, 10).forEach((member, idx) => {
          if (idx % 2 === 0) {
            doc.fillColor(COLORS.background).rect(50, y, contentWidth, 20).fill();
          }
          doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
          
          const rowData = [
            idx < 3 ? medals[idx] : `${idx + 1}`,
            member.userName,
            formatTime(member.avgResponseTime),
            formatTime(member.fastestResponse),
            member.totalResponses.toString(),
            member.missedCount.toString()
          ];
          
          xPos = 55;
          rowData.forEach((cell, i) => {
            if (i === 2) doc.fillColor(getResponseTimeColor(member.avgResponseTime));
            else if (i === 5) doc.fillColor(member.missedCount > 0 ? COLORS.critical : COLORS.excellent);
            else doc.fillColor(COLORS.text);
            doc.text(cell, xPos, y + 5, { width: teamColWidths[i] - 5 });
            xPos += teamColWidths[i];
          });
          y += 20;
        });
        y += 10;
      }

      y += 20;

      // Channel Breakdown
      doc.fontSize(16)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('📱 Channel Breakdown', 50, y);
      y += 30;

      if (data.channels.length === 0) {
        doc.fontSize(10)
           .fillColor(COLORS.textLight)
           .font('Helvetica-Oblique')
           .text('No channel data available for this period.', 50, y);
      } else {
        const channelHeaders = ['Channel', 'Conversations', 'Avg Response', 'Fast (<5m)', 'Missed'];
        const channelColWidths = [100, 100, 100, 90, 80];
        
        doc.fillColor(brandedColors.primary).rect(50, y, contentWidth, 22).fill();
        doc.fillColor(COLORS.white).font('Helvetica-Bold').fontSize(9);
        xPos = 55;
        channelHeaders.forEach((header, i) => {
          doc.text(header, xPos, y + 6, { width: channelColWidths[i] - 5 });
          xPos += channelColWidths[i];
        });
        y += 22;

        data.channels.forEach((channel, idx) => {
          if (idx % 2 === 0) {
            doc.fillColor(COLORS.background).rect(50, y, contentWidth, 20).fill();
          }
          doc.fillColor(COLORS.text).font('Helvetica').fontSize(9);
          
          const rowData = [
            channel.channel.toUpperCase(),
            channel.totalConversations.toString(),
            formatTime(channel.avgResponseTime),
            channel.fastResponses.toString(),
            channel.missedCount.toString()
          ];
          
          xPos = 55;
          rowData.forEach((cell, i) => {
            if (i === 2) doc.fillColor(getResponseTimeColor(channel.avgResponseTime));
            else if (i === 4) doc.fillColor(channel.missedCount > 0 ? COLORS.critical : COLORS.excellent);
            else doc.fillColor(COLORS.text);
            doc.text(cell, xPos, y + 5, { width: channelColWidths[i] - 5 });
            xPos += channelColWidths[i];
          });
          y += 20;
        });
      }

      addBrandedFooter();

      // ========================================
      // PAGE 3: RECOMMENDATIONS (BRANDED)
      // ========================================
      doc.addPage();
      y = 50;

      doc.fontSize(16)
         .fillColor(COLORS.text)
         .font('Helvetica-Bold')
         .text('💡 Recommendations', 50, y);
      y += 25;

      const recommendations = generateRecommendations(data);
      
      recommendations.forEach((rec, idx) => {
        doc.roundedRect(50, y, contentWidth, 50, 5)
           .fillColor(COLORS.background)
           .fill();
        
        doc.fontSize(10)
           .fillColor(brandedColors.primary)
           .font('Helvetica-Bold')
           .text(`${idx + 1}. ${rec.title}`, 60, y + 10, { width: contentWidth - 20 });
        
        doc.fontSize(9)
           .fillColor(COLORS.textLight)
           .font('Helvetica')
           .text(rec.description, 60, y + 28, { width: contentWidth - 20 });
        
        y += 58;
      });

      // Industry benchmark (can be hidden with custom footer)
      if (!branding.hidePoweredBy) {
        y += 10;
        doc.roundedRect(50, y, contentWidth, 60, 8)
           .fillColor('#fffbeb')
           .fill();
        
        doc.roundedRect(50, y, 4, 60, 2)
           .fillColor(COLORS.average)
           .fill();
        
        doc.fontSize(11)
           .fillColor('#92400e')
           .font('Helvetica-Bold')
           .text('📈 Industry Benchmark', 65, y + 12);
        
        doc.fontSize(9)
           .fillColor('#78350f')
           .font('Helvetica')
           .text('78% of customers buy from the first business to respond. Responding within 5 minutes makes you 100x more likely to connect with a lead.', 65, y + 28, { width: contentWidth - 30 });
      }

      addBrandedFooter();

      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}
