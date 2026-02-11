/**
 * AI-Powered Insights Engine
 * Analyzes response patterns and generates actionable recommendations
 * Think like a consultant: find hidden patterns, quantify impact, suggest actions
 */

import { pool } from './database';
import { logger } from './logger';

// Insight severity levels
export type InsightSeverity = 'info' | 'warning' | 'opportunity' | 'critical';
export type InsightCategory = 'timing' | 'channel' | 'team' | 'trend' | 'volume' | 'behavior';

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  metric: string;
  impact: string;
  recommendation: string;
  data?: Record<string, any>;
  priority: number; // 1-100, higher = more important
  createdAt: Date;
}

interface DayOfWeekPattern {
  dayName: string;
  dayNumber: number;
  avgResponseTime: number;
  totalConversations: number;
  missedCount: number;
}

interface HourPattern {
  hour: number;
  avgResponseTime: number;
  volume: number;
  missedCount: number;
}

interface ChannelPattern {
  channel: string;
  avgResponseTime: number;
  totalConversations: number;
  missedRate: number;
}

interface TeamMemberPattern {
  userId: string;
  userName: string;
  avgResponseTime: number;
  totalResponses: number;
  missedCount: number;
}

interface TrendData {
  thisWeekAvg: number;
  lastWeekAvg: number;
  twoWeeksAgoAvg: number;
  thisWeekVolume: number;
  lastWeekVolume: number;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Generate all insights for a location
 */
export async function generateInsights(locationId: string, days: number = 30): Promise<Insight[]> {
  logger.info('Generating insights', { locationId, days });
  
  const insights: Insight[] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Gather all pattern data in parallel
    const [
      dayOfWeekPatterns,
      hourPatterns,
      channelPatterns,
      teamPatterns,
      trendData,
      overallStats
    ] = await Promise.all([
      getDayOfWeekPatterns(locationId, startDate),
      getHourPatterns(locationId, startDate),
      getChannelPatterns(locationId, startDate),
      getTeamPatterns(locationId, startDate),
      getTrendData(locationId),
      getOverallStats(locationId, startDate)
    ]);

    // Generate insights from each pattern type
    insights.push(...analyzeDayOfWeekPatterns(dayOfWeekPatterns, overallStats));
    insights.push(...analyzeHourPatterns(hourPatterns, overallStats));
    insights.push(...analyzeChannelPatterns(channelPatterns, overallStats));
    insights.push(...analyzeTeamPatterns(teamPatterns, overallStats));
    insights.push(...analyzeTrends(trendData, overallStats));
    insights.push(...analyzeVolumePatterns(hourPatterns, dayOfWeekPatterns, overallStats));

    // Sort by priority (highest first) and take top insights
    insights.sort((a, b) => b.priority - a.priority);

    logger.info('Insights generated', { locationId, count: insights.length });
    return insights.slice(0, 10); // Return top 10 insights

  } catch (error) {
    logger.error('Error generating insights', { locationId }, error as Error);
    throw error;
  }
}

/**
 * Get day-of-week response patterns
 */
async function getDayOfWeekPatterns(locationId: string, startDate: Date): Promise<DayOfWeekPattern[]> {
  const result = await pool.query(`
    SELECT 
      EXTRACT(DOW FROM first_inbound_at) as day_number,
      AVG(response_time_seconds)::INTEGER as avg_response_time,
      COUNT(*) as total_conversations,
      COUNT(*) FILTER (WHERE is_missed = true) as missed_count
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at IS NOT NULL
    GROUP BY EXTRACT(DOW FROM first_inbound_at)
    ORDER BY day_number
  `, [locationId, startDate]);

  return result.rows.map(row => ({
    dayName: DAY_NAMES[row.day_number],
    dayNumber: parseInt(row.day_number),
    avgResponseTime: row.avg_response_time || 0,
    totalConversations: parseInt(row.total_conversations) || 0,
    missedCount: parseInt(row.missed_count) || 0
  }));
}

/**
 * Get hourly response patterns
 */
async function getHourPatterns(locationId: string, startDate: Date): Promise<HourPattern[]> {
  const result = await pool.query(`
    SELECT 
      EXTRACT(HOUR FROM first_inbound_at) as hour,
      AVG(response_time_seconds)::INTEGER as avg_response_time,
      COUNT(*) as volume,
      COUNT(*) FILTER (WHERE is_missed = true) as missed_count
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at IS NOT NULL
    GROUP BY EXTRACT(HOUR FROM first_inbound_at)
    ORDER BY hour
  `, [locationId, startDate]);

  return result.rows.map(row => ({
    hour: parseInt(row.hour),
    avgResponseTime: row.avg_response_time || 0,
    volume: parseInt(row.volume) || 0,
    missedCount: parseInt(row.missed_count) || 0
  }));
}

/**
 * Get channel-based patterns
 */
async function getChannelPatterns(locationId: string, startDate: Date): Promise<ChannelPattern[]> {
  const result = await pool.query(`
    SELECT 
      channel,
      AVG(response_time_seconds)::INTEGER as avg_response_time,
      COUNT(*) as total_conversations,
      ROUND(COUNT(*) FILTER (WHERE is_missed = true)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 1) as missed_rate
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at IS NOT NULL
      AND channel IS NOT NULL
    GROUP BY channel
    HAVING COUNT(*) >= 5
    ORDER BY total_conversations DESC
  `, [locationId, startDate]);

  return result.rows.map(row => ({
    channel: row.channel,
    avgResponseTime: row.avg_response_time || 0,
    totalConversations: parseInt(row.total_conversations) || 0,
    missedRate: parseFloat(row.missed_rate) || 0
  }));
}

/**
 * Get team member patterns
 */
async function getTeamPatterns(locationId: string, startDate: Date): Promise<TeamMemberPattern[]> {
  const result = await pool.query(`
    SELECT 
      assigned_user_id as user_id,
      COALESCE(assigned_user_name, 'Unknown') as user_name,
      AVG(response_time_seconds)::INTEGER as avg_response_time,
      COUNT(*) as total_responses,
      COUNT(*) FILTER (WHERE is_missed = true) as missed_count
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at IS NOT NULL
      AND assigned_user_id IS NOT NULL
    GROUP BY assigned_user_id, assigned_user_name
    HAVING COUNT(*) >= 3
    ORDER BY avg_response_time ASC
  `, [locationId, startDate]);

  return result.rows.map(row => ({
    userId: row.user_id,
    userName: row.user_name || 'Unknown',
    avgResponseTime: row.avg_response_time || 0,
    totalResponses: parseInt(row.total_responses) || 0,
    missedCount: parseInt(row.missed_count) || 0
  }));
}

/**
 * Get trend data (week over week comparison)
 */
async function getTrendData(locationId: string): Promise<TrendData> {
  const result = await pool.query(`
    SELECT 
      AVG(CASE WHEN first_inbound_at >= CURRENT_DATE - INTERVAL '7 days' THEN response_time_seconds END)::INTEGER as this_week_avg,
      AVG(CASE WHEN first_inbound_at >= CURRENT_DATE - INTERVAL '14 days' AND first_inbound_at < CURRENT_DATE - INTERVAL '7 days' THEN response_time_seconds END)::INTEGER as last_week_avg,
      AVG(CASE WHEN first_inbound_at >= CURRENT_DATE - INTERVAL '21 days' AND first_inbound_at < CURRENT_DATE - INTERVAL '14 days' THEN response_time_seconds END)::INTEGER as two_weeks_ago_avg,
      COUNT(*) FILTER (WHERE first_inbound_at >= CURRENT_DATE - INTERVAL '7 days') as this_week_volume,
      COUNT(*) FILTER (WHERE first_inbound_at >= CURRENT_DATE - INTERVAL '14 days' AND first_inbound_at < CURRENT_DATE - INTERVAL '7 days') as last_week_volume
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= CURRENT_DATE - INTERVAL '21 days'
      AND first_inbound_at IS NOT NULL
  `, [locationId]);

  const row = result.rows[0] || {};
  return {
    thisWeekAvg: row.this_week_avg || 0,
    lastWeekAvg: row.last_week_avg || 0,
    twoWeeksAgoAvg: row.two_weeks_ago_avg || 0,
    thisWeekVolume: parseInt(row.this_week_volume) || 0,
    lastWeekVolume: parseInt(row.last_week_volume) || 0
  };
}

/**
 * Get overall stats for comparison
 */
async function getOverallStats(locationId: string, startDate: Date): Promise<{ avgResponseTime: number; totalConversations: number; missedRate: number }> {
  const result = await pool.query(`
    SELECT 
      AVG(response_time_seconds)::INTEGER as avg_response_time,
      COUNT(*) as total_conversations,
      ROUND(COUNT(*) FILTER (WHERE is_missed = true)::DECIMAL / NULLIF(COUNT(*), 0) * 100, 1) as missed_rate
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND first_inbound_at IS NOT NULL
  `, [locationId, startDate]);

  const row = result.rows[0] || {};
  return {
    avgResponseTime: row.avg_response_time || 0,
    totalConversations: parseInt(row.total_conversations) || 0,
    missedRate: parseFloat(row.missed_rate) || 0
  };
}

// ============ INSIGHT ANALYZERS ============

/**
 * Analyze day-of-week patterns
 */
function analyzeDayOfWeekPatterns(patterns: DayOfWeekPattern[], overall: { avgResponseTime: number }): Insight[] {
  const insights: Insight[] = [];
  if (patterns.length < 3) return insights;

  const avgTime = overall.avgResponseTime;
  if (avgTime === 0) return insights;

  // Find slowest day
  const slowestDay = patterns.reduce((a, b) => a.avgResponseTime > b.avgResponseTime ? a : b);
  const slowestVsAvg = ((slowestDay.avgResponseTime - avgTime) / avgTime * 100);

  if (slowestVsAvg > 20 && slowestDay.totalConversations >= 5) {
    insights.push({
      id: `dow-slow-${slowestDay.dayName.toLowerCase()}`,
      category: 'timing',
      severity: slowestVsAvg > 50 ? 'warning' : 'info',
      title: `${slowestDay.dayName}s are your slowest day`,
      description: `Your average response time on ${slowestDay.dayName}s is ${formatTime(slowestDay.avgResponseTime)}, which is ${Math.round(slowestVsAvg)}% slower than your overall average.`,
      metric: formatTime(slowestDay.avgResponseTime),
      impact: `${slowestDay.totalConversations} leads affected per month`,
      recommendation: `Consider adding coverage on ${slowestDay.dayName}s or setting up automated responses for this day.`,
      data: { day: slowestDay.dayName, responseTime: slowestDay.avgResponseTime, percentSlower: slowestVsAvg },
      priority: Math.min(80, 40 + slowestVsAvg),
      createdAt: new Date()
    });
  }

  // Find fastest day (opportunity to replicate)
  const fastestDay = patterns.reduce((a, b) => a.avgResponseTime < b.avgResponseTime && a.avgResponseTime > 0 ? a : b);
  const fastestVsAvg = ((avgTime - fastestDay.avgResponseTime) / avgTime * 100);

  if (fastestVsAvg > 20 && fastestDay.totalConversations >= 5) {
    insights.push({
      id: `dow-fast-${fastestDay.dayName.toLowerCase()}`,
      category: 'timing',
      severity: 'opportunity',
      title: `${fastestDay.dayName}s are your best performing day`,
      description: `You're ${Math.round(fastestVsAvg)}% faster on ${fastestDay.dayName}s (${formatTime(fastestDay.avgResponseTime)} avg). Study what's different about this day.`,
      metric: formatTime(fastestDay.avgResponseTime),
      impact: 'Replicating this could improve all days',
      recommendation: `Analyze your ${fastestDay.dayName} process - staffing, workflows, or focus - and apply it to slower days.`,
      data: { day: fastestDay.dayName, responseTime: fastestDay.avgResponseTime, percentFaster: fastestVsAvg },
      priority: 55,
      createdAt: new Date()
    });
  }

  // Weekend vs weekday analysis
  const weekendDays = patterns.filter(p => p.dayNumber === 0 || p.dayNumber === 6);
  const weekdayDays = patterns.filter(p => p.dayNumber >= 1 && p.dayNumber <= 5);

  if (weekendDays.length > 0 && weekdayDays.length > 0) {
    const weekendAvg = weekendDays.reduce((sum, d) => sum + d.avgResponseTime * d.totalConversations, 0) / 
                       weekendDays.reduce((sum, d) => sum + d.totalConversations, 0);
    const weekdayAvg = weekdayDays.reduce((sum, d) => sum + d.avgResponseTime * d.totalConversations, 0) / 
                       weekdayDays.reduce((sum, d) => sum + d.totalConversations, 0);
    const weekendVolume = weekendDays.reduce((sum, d) => sum + d.totalConversations, 0);

    if (weekendAvg > weekdayAvg * 1.5 && weekendVolume >= 10) {
      insights.push({
        id: 'dow-weekend-slow',
        category: 'timing',
        severity: 'warning',
        title: 'Weekend response times need attention',
        description: `Your weekend responses (${formatTime(weekendAvg)}) are ${Math.round((weekendAvg / weekdayAvg - 1) * 100)}% slower than weekdays (${formatTime(weekdayAvg)}).`,
        metric: formatTime(weekendAvg),
        impact: `${weekendVolume} weekend leads per month at risk`,
        recommendation: 'Set up weekend auto-responders or consider weekend coverage rotation.',
        data: { weekendAvg, weekdayAvg, weekendVolume },
        priority: 75,
        createdAt: new Date()
      });
    }
  }

  return insights;
}

/**
 * Analyze hourly patterns
 */
function analyzeHourPatterns(patterns: HourPattern[], overall: { avgResponseTime: number }): Insight[] {
  const insights: Insight[] = [];
  if (patterns.length < 5) return insights;

  const avgTime = overall.avgResponseTime;
  if (avgTime === 0) return insights;

  // Find peak volume hour
  const peakHour = patterns.reduce((a, b) => a.volume > b.volume ? a : b);
  
  // Find if peak hour also has slow responses
  if (peakHour.avgResponseTime > avgTime * 1.3 && peakHour.volume >= 5) {
    insights.push({
      id: `hour-peak-slow-${peakHour.hour}`,
      category: 'timing',
      severity: 'warning',
      title: `Peak hour (${formatHour(peakHour.hour)}) is understaffed`,
      description: `Your busiest hour (${peakHour.volume} conversations) also has ${Math.round((peakHour.avgResponseTime / avgTime - 1) * 100)}% slower response times than average.`,
      metric: formatTime(peakHour.avgResponseTime),
      impact: `${peakHour.volume} leads affected monthly`,
      recommendation: `Add coverage or enable smart routing during ${formatHour(peakHour.hour)} to ${formatHour(peakHour.hour + 1)}.`,
      data: { hour: peakHour.hour, volume: peakHour.volume, responseTime: peakHour.avgResponseTime },
      priority: 70,
      createdAt: new Date()
    });
  }

  // Find after-hours issues
  const afterHours = patterns.filter(p => p.hour < 8 || p.hour >= 18);
  const businessHours = patterns.filter(p => p.hour >= 8 && p.hour < 18);
  
  if (afterHours.length > 0 && businessHours.length > 0) {
    const afterHoursVolume = afterHours.reduce((sum, h) => sum + h.volume, 0);
    const afterHoursAvg = afterHours.reduce((sum, h) => sum + h.avgResponseTime * h.volume, 0) / afterHoursVolume;
    const businessAvg = businessHours.reduce((sum, h) => sum + h.avgResponseTime * h.volume, 0) / 
                        businessHours.reduce((sum, h) => sum + h.volume, 0);

    if (afterHoursAvg > businessAvg * 2 && afterHoursVolume >= 10) {
      insights.push({
        id: 'hour-after-hours',
        category: 'timing',
        severity: 'opportunity',
        title: 'After-hours leads are being left waiting',
        description: `${afterHoursVolume} leads came in outside business hours with ${formatTime(afterHoursAvg)} avg response time (${Math.round(afterHoursAvg / businessAvg)}x slower than business hours).`,
        metric: formatTime(afterHoursAvg),
        impact: `${afterHoursVolume} potential customers waiting`,
        recommendation: 'Set up after-hours auto-responders or chatbot to acknowledge leads until morning.',
        data: { afterHoursVolume, afterHoursAvg, businessAvg },
        priority: 65,
        createdAt: new Date()
      });
    }
  }

  // Find the "dead zone" - low volume + slow response
  const deadZoneHour = patterns.find(p => 
    p.volume >= 3 && 
    p.avgResponseTime > avgTime * 1.5 &&
    p.missedCount > 0
  );

  if (deadZoneHour) {
    insights.push({
      id: `hour-dead-zone-${deadZoneHour.hour}`,
      category: 'timing',
      severity: 'info',
      title: `${formatHour(deadZoneHour.hour)} is your response "dead zone"`,
      description: `Between ${formatHour(deadZoneHour.hour)} and ${formatHour(deadZoneHour.hour + 1)}, response times spike to ${formatTime(deadZoneHour.avgResponseTime)} with ${deadZoneHour.missedCount} missed leads.`,
      metric: formatTime(deadZoneHour.avgResponseTime),
      impact: `${deadZoneHour.missedCount} missed leads`,
      recommendation: 'Check if this coincides with meetings, lunch, or shift changes.',
      data: { hour: deadZoneHour.hour, responseTime: deadZoneHour.avgResponseTime, missed: deadZoneHour.missedCount },
      priority: 50,
      createdAt: new Date()
    });
  }

  return insights;
}

/**
 * Analyze channel patterns
 */
function analyzeChannelPatterns(patterns: ChannelPattern[], overall: { avgResponseTime: number }): Insight[] {
  const insights: Insight[] = [];
  if (patterns.length < 2) return insights;

  const avgTime = overall.avgResponseTime;
  if (avgTime === 0) return insights;

  // Sort by response time
  const sorted = [...patterns].sort((a, b) => a.avgResponseTime - b.avgResponseTime);
  const fastest = sorted[0];
  const slowest = sorted[sorted.length - 1];

  // Significant channel gap
  if (fastest.avgResponseTime > 0 && slowest.avgResponseTime > fastest.avgResponseTime * 1.5) {
    const ratio = (slowest.avgResponseTime / fastest.avgResponseTime).toFixed(1);
    insights.push({
      id: `channel-gap-${fastest.channel}-${slowest.channel}`,
      category: 'channel',
      severity: 'warning',
      title: `${slowest.channel.toUpperCase()} responses are ${ratio}x slower than ${fastest.channel.toUpperCase()}`,
      description: `Your ${fastest.channel} responses average ${formatTime(fastest.avgResponseTime)}, but ${slowest.channel} takes ${formatTime(slowest.avgResponseTime)}.`,
      metric: `${ratio}x difference`,
      impact: `${slowest.totalConversations} leads on slow channel`,
      recommendation: `Set up ${slowest.channel} notifications on mobile or create quick-reply templates.`,
      data: { fastChannel: fastest, slowChannel: slowest },
      priority: 70,
      createdAt: new Date()
    });
  }

  // Channel with high missed rate
  const highMissedChannel = patterns.find(p => p.missedRate > 20 && p.totalConversations >= 10);
  if (highMissedChannel) {
    insights.push({
      id: `channel-missed-${highMissedChannel.channel}`,
      category: 'channel',
      severity: 'critical',
      title: `${Math.round(highMissedChannel.missedRate)}% of ${highMissedChannel.channel.toUpperCase()} leads are being missed`,
      description: `${highMissedChannel.totalConversations} conversations came through ${highMissedChannel.channel}, but ${Math.round(highMissedChannel.missedRate)}% got no response within an hour.`,
      metric: `${Math.round(highMissedChannel.missedRate)}% missed`,
      impact: `${Math.round(highMissedChannel.totalConversations * highMissedChannel.missedRate / 100)} lost leads`,
      recommendation: `Check your ${highMissedChannel.channel} notification settings and consider routing to additional team members.`,
      data: { channel: highMissedChannel.channel, missedRate: highMissedChannel.missedRate },
      priority: 85,
      createdAt: new Date()
    });
  }

  // SMS vs Email comparison (common pattern)
  const sms = patterns.find(p => p.channel === 'sms');
  const email = patterns.find(p => p.channel === 'email');

  if (sms && email && sms.avgResponseTime > 0 && email.avgResponseTime > 0) {
    if (sms.avgResponseTime < email.avgResponseTime * 0.5) {
      insights.push({
        id: 'channel-sms-faster',
        category: 'channel',
        severity: 'opportunity',
        title: 'SMS responses are significantly faster than email',
        description: `SMS (${formatTime(sms.avgResponseTime)}) vs Email (${formatTime(email.avgResponseTime)}) - consider encouraging more SMS opt-ins.`,
        metric: `${((email.avgResponseTime / sms.avgResponseTime) - 1).toFixed(1)}x faster`,
        impact: 'Better customer experience on SMS',
        recommendation: 'Promote SMS as primary contact method in your marketing.',
        data: { smsTime: sms.avgResponseTime, emailTime: email.avgResponseTime },
        priority: 45,
        createdAt: new Date()
      });
    }
  }

  return insights;
}

/**
 * Analyze team performance patterns
 */
function analyzeTeamPatterns(patterns: TeamMemberPattern[], overall: { avgResponseTime: number }): Insight[] {
  const insights: Insight[] = [];
  if (patterns.length < 2) return insights;

  const avgTime = overall.avgResponseTime;
  if (avgTime === 0) return insights;

  // Find top performer
  const topPerformer = patterns.reduce((a, b) => 
    a.avgResponseTime < b.avgResponseTime && a.totalResponses >= 5 ? a : b
  );

  // Find team average excluding outliers
  const teamAvg = patterns.reduce((sum, m) => sum + m.avgResponseTime * m.totalResponses, 0) / 
                  patterns.reduce((sum, m) => sum + m.totalResponses, 0);

  // Significant performer gap
  if (topPerformer.avgResponseTime < teamAvg * 0.5 && patterns.length >= 3) {
    const timesLower = (teamAvg / topPerformer.avgResponseTime).toFixed(1);
    insights.push({
      id: `team-top-performer-${topPerformer.userId}`,
      category: 'team',
      severity: 'opportunity',
      title: `${topPerformer.userName} is ${timesLower}x faster than team average`,
      description: `${topPerformer.userName} averages ${formatTime(topPerformer.avgResponseTime)} while the team averages ${formatTime(teamAvg)}. Their methods could help everyone.`,
      metric: `${timesLower}x faster`,
      impact: 'Potential team-wide improvement',
      recommendation: `Have ${topPerformer.userName} share their workflow, templates, or notification setup with the team.`,
      data: { topPerformer, teamAvg },
      priority: 60,
      createdAt: new Date()
    });
  }

  // Find struggling team member
  const slowestMember = patterns.reduce((a, b) => 
    a.avgResponseTime > b.avgResponseTime && a.totalResponses >= 5 ? a : b
  );

  if (slowestMember.avgResponseTime > teamAvg * 2 && slowestMember.totalResponses >= 5) {
    insights.push({
      id: `team-slow-${slowestMember.userId}`,
      category: 'team',
      severity: 'warning',
      title: `${slowestMember.userName} may need support`,
      description: `${slowestMember.userName}'s average response time (${formatTime(slowestMember.avgResponseTime)}) is ${Math.round((slowestMember.avgResponseTime / teamAvg - 1) * 100)}% slower than the team average.`,
      metric: formatTime(slowestMember.avgResponseTime),
      impact: `${slowestMember.totalResponses} conversations affected`,
      recommendation: 'Check if they need training, better tools, or workload redistribution.',
      data: { slowestMember, teamAvg },
      priority: 55,
      createdAt: new Date()
    });
  }

  // Team member with high missed count
  const highMissedMember = patterns.find(m => m.missedCount >= 5 && m.missedCount / m.totalResponses > 0.2);
  if (highMissedMember) {
    insights.push({
      id: `team-missed-${highMissedMember.userId}`,
      category: 'team',
      severity: 'warning',
      title: `${highMissedMember.userName} has ${highMissedMember.missedCount} unresponded leads`,
      description: `${Math.round(highMissedMember.missedCount / highMissedMember.totalResponses * 100)}% of leads assigned to ${highMissedMember.userName} went unresponded.`,
      metric: `${highMissedMember.missedCount} missed`,
      impact: 'Lost conversion opportunities',
      recommendation: 'Review their notification settings or redistribute high-priority leads.',
      data: { member: highMissedMember },
      priority: 70,
      createdAt: new Date()
    });
  }

  return insights;
}

/**
 * Analyze week-over-week trends
 */
function analyzeTrends(trend: TrendData, overall: { totalConversations: number }): Insight[] {
  const insights: Insight[] = [];

  // Response time trend
  if (trend.thisWeekAvg > 0 && trend.lastWeekAvg > 0) {
    const changePercent = ((trend.thisWeekAvg - trend.lastWeekAvg) / trend.lastWeekAvg * 100);

    if (changePercent <= -15) {
      // Improvement!
      insights.push({
        id: 'trend-improving',
        category: 'trend',
        severity: 'opportunity',
        title: `Response time improved ${Math.abs(Math.round(changePercent))}% this week! 🎉`,
        description: `You went from ${formatTime(trend.lastWeekAvg)} last week to ${formatTime(trend.thisWeekAvg)} this week. Great progress!`,
        metric: `${Math.abs(Math.round(changePercent))}% faster`,
        impact: 'Better lead conversion rates',
        recommendation: 'Keep doing what you\'re doing! Document what changed this week.',
        data: { thisWeek: trend.thisWeekAvg, lastWeek: trend.lastWeekAvg, change: changePercent },
        priority: 65,
        createdAt: new Date()
      });
    } else if (changePercent >= 25) {
      // Getting worse
      insights.push({
        id: 'trend-declining',
        category: 'trend',
        severity: 'warning',
        title: `Response time increased ${Math.round(changePercent)}% vs last week`,
        description: `Average response time went from ${formatTime(trend.lastWeekAvg)} to ${formatTime(trend.thisWeekAvg)}. Something may have changed.`,
        metric: `${Math.round(changePercent)}% slower`,
        impact: 'Risk of lost leads',
        recommendation: 'Check for staffing changes, new workload, or notification issues.',
        data: { thisWeek: trend.thisWeekAvg, lastWeek: trend.lastWeekAvg, change: changePercent },
        priority: 75,
        createdAt: new Date()
      });
    }

    // Sustained improvement over 3 weeks
    if (trend.twoWeeksAgoAvg > 0 && trend.thisWeekAvg < trend.lastWeekAvg && trend.lastWeekAvg < trend.twoWeeksAgoAvg) {
      const totalImprovement = ((trend.twoWeeksAgoAvg - trend.thisWeekAvg) / trend.twoWeeksAgoAvg * 100);
      insights.push({
        id: 'trend-sustained-improvement',
        category: 'trend',
        severity: 'opportunity',
        title: `3-week improvement streak! Down ${Math.round(totalImprovement)}%`,
        description: `Response times have improved for 3 consecutive weeks: ${formatTime(trend.twoWeeksAgoAvg)} → ${formatTime(trend.lastWeekAvg)} → ${formatTime(trend.thisWeekAvg)}`,
        metric: `${Math.round(totalImprovement)}% total improvement`,
        impact: 'Consistent progress',
        recommendation: 'Celebrate this win with your team and set a new target!',
        data: { weeks: [trend.twoWeeksAgoAvg, trend.lastWeekAvg, trend.thisWeekAvg] },
        priority: 50,
        createdAt: new Date()
      });
    }
  }

  // Volume trend
  if (trend.thisWeekVolume > 0 && trend.lastWeekVolume > 0) {
    const volumeChange = ((trend.thisWeekVolume - trend.lastWeekVolume) / trend.lastWeekVolume * 100);

    if (volumeChange >= 30) {
      insights.push({
        id: 'trend-volume-spike',
        category: 'volume',
        severity: 'info',
        title: `Lead volume up ${Math.round(volumeChange)}% this week`,
        description: `You received ${trend.thisWeekVolume} leads this week vs ${trend.lastWeekVolume} last week. Your marketing may be working!`,
        metric: `+${Math.round(volumeChange)}%`,
        impact: 'More opportunities',
        recommendation: 'Ensure team capacity can handle increased volume without slowing down.',
        data: { thisWeek: trend.thisWeekVolume, lastWeek: trend.lastWeekVolume },
        priority: 45,
        createdAt: new Date()
      });
    } else if (volumeChange <= -30) {
      insights.push({
        id: 'trend-volume-drop',
        category: 'volume',
        severity: 'info',
        title: `Lead volume down ${Math.abs(Math.round(volumeChange))}% this week`,
        description: `${trend.thisWeekVolume} leads this week vs ${trend.lastWeekVolume} last week. Check marketing campaigns.`,
        metric: `${Math.round(volumeChange)}%`,
        impact: 'Fewer opportunities',
        recommendation: 'Review marketing channels and campaign performance.',
        data: { thisWeek: trend.thisWeekVolume, lastWeek: trend.lastWeekVolume },
        priority: 40,
        createdAt: new Date()
      });
    }
  }

  return insights;
}

/**
 * Analyze volume patterns for staffing insights
 */
function analyzeVolumePatterns(hourPatterns: HourPattern[], dayPatterns: DayOfWeekPattern[], overall: { totalConversations: number }): Insight[] {
  const insights: Insight[] = [];

  // Find if volume is concentrated in specific hours
  const totalVolume = hourPatterns.reduce((sum, h) => sum + h.volume, 0);
  if (totalVolume < 20) return insights;

  // Find the 3-hour window with most volume
  let maxWindowVolume = 0;
  let maxWindowStart = 0;

  for (let i = 0; i < 24; i++) {
    const windowVolume = hourPatterns
      .filter(h => h.hour >= i && h.hour < i + 3)
      .reduce((sum, h) => sum + h.volume, 0);
    if (windowVolume > maxWindowVolume) {
      maxWindowVolume = windowVolume;
      maxWindowStart = i;
    }
  }

  const windowPercent = (maxWindowVolume / totalVolume * 100);
  if (windowPercent > 40) {
    insights.push({
      id: `volume-concentrated-${maxWindowStart}`,
      category: 'volume',
      severity: 'info',
      title: `${Math.round(windowPercent)}% of leads come in 3-hour window`,
      description: `${formatHour(maxWindowStart)} to ${formatHour(maxWindowStart + 3)} accounts for ${Math.round(windowPercent)}% of your lead volume.`,
      metric: `${maxWindowVolume} leads`,
      impact: 'High-value time window',
      recommendation: 'Ensure maximum team availability and fastest response during this critical window.',
      data: { startHour: maxWindowStart, volume: maxWindowVolume, percent: windowPercent },
      priority: 55,
      createdAt: new Date()
    });
  }

  return insights;
}

// ============ HELPER FUNCTIONS ============

function formatTime(seconds: number): string {
  if (!seconds || seconds === 0) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function formatHour(hour: number): string {
  const h = hour % 24;
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
}

/**
 * Save dismissed insight for a location
 */
export async function dismissInsight(locationId: string, insightId: string): Promise<void> {
  await pool.query(`
    INSERT INTO dismissed_insights (location_id, insight_id, dismissed_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (location_id, insight_id) DO UPDATE SET dismissed_at = NOW()
  `, [locationId, insightId]);
}

/**
 * Mark insight as addressed
 */
export async function markInsightAddressed(locationId: string, insightId: string): Promise<void> {
  await pool.query(`
    INSERT INTO addressed_insights (location_id, insight_id, addressed_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (location_id, insight_id) DO UPDATE SET addressed_at = NOW()
  `, [locationId, insightId]);
}

/**
 * Get dismissed insight IDs for filtering
 */
export async function getDismissedInsights(locationId: string): Promise<string[]> {
  const result = await pool.query(`
    SELECT insight_id FROM dismissed_insights 
    WHERE location_id = $1 AND dismissed_at > NOW() - INTERVAL '7 days'
  `, [locationId]);
  return result.rows.map(r => r.insight_id);
}
