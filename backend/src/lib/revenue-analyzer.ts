/**
 * Revenue Analyzer - THE KILLER FEATURE
 * 
 * This module connects response time to actual business outcomes.
 * Shows users the MONEY they're making (and losing) based on speed.
 * 
 * "Leads responded to in <5 min convert at 21% vs 5% for >30 min"
 * 
 * This is what justifies the $100/month price tag.
 */

import { pool } from './database';
import { logger } from './logger';

// Response time buckets (in seconds)
export const RESPONSE_BUCKETS = {
  UNDER_1_MIN: { max: 60, label: '<1min', key: 'under_1min' },
  UNDER_5_MIN: { max: 300, label: '1-5min', key: '1_5min' },
  UNDER_15_MIN: { max: 900, label: '5-15min', key: '5_15min' },
  UNDER_1_HR: { max: 3600, label: '15-60min', key: '15_60min' },
  OVER_1_HR: { max: Infinity, label: '>1hr', key: 'over_1hr' },
  MISSED: { max: null, label: 'missed', key: 'missed' }
} as const;

// Default industry benchmarks (can be customized per location)
export const DEFAULT_BENCHMARKS = {
  // Conversion rates by response time bucket
  // Source: Lead Response Management Study, Harvard Business Review
  conversionRates: {
    under_1min: 0.21,    // 21% - The gold standard
    '1_5min': 0.17,      // 17%
    '5_15min': 0.10,     // 10%
    '15_60min': 0.05,    // 5%
    over_1hr: 0.02,      // 2%
    missed: 0.005        // 0.5%
  },
  // Average deal values by source
  avgDealValues: {
    default: 500,
    website: 750,
    facebook: 400,
    instagram: 350,
    google: 850,
    referral: 1200,
    organic: 600,
    sms: 550,
    email: 500,
    whatsapp: 450
  }
};

export interface RevenueBenchmarks {
  conversionRates: Record<string, number>;
  avgDealValues: Record<string, number>;
  customAvgDealValue?: number;
  useCustomDealValue: boolean;
}

export interface RevenueMetrics {
  // The headline numbers
  revenueFromFastResponses: number;      // Actual revenue from <5 min responses
  estimatedLostFromSlow: number;         // What slow responses cost
  estimatedLostFromMissed: number;       // What missed leads cost
  totalPotentialLost: number;            // Total opportunity cost
  
  // Conversion funnel by bucket
  conversionByBucket: {
    bucket: string;
    label: string;
    leads: number;
    conversions: number;
    conversionRate: number;
    benchmarkRate: number;
    revenue: number;
    estimatedLost: number;
  }[];
  
  // ROI projections
  roiProjection: {
    currentAvgResponseTime: number;
    currentMonthlyRevenue: number;
    projectedRevenueAt3Min: number;
    projectedRevenueAt1Min: number;
    potentialGain: number;
    improvementNeeded: number;  // Seconds to shave off
  };
  
  // Key insights
  insights: {
    fastResponseWinRate: number;       // % of <5min that convert
    slowResponseWinRate: number;       // % of >15min that convert
    speedImpactMultiplier: number;     // "Fast responders convert Xx more"
    missedLeadCost: number;            // $ lost per missed lead
    valuePerMinuteImprovement: number; // $ gained per minute faster
  };
}

export interface ConversionData {
  totalLeads: number;
  totalConversions: number;
  conversionRate: number;
  avgResponseTimeWinners: number;
  avgResponseTimeLosers: number;
  revenueBySource: Record<string, number>;
}

/**
 * Get response time bucket for a given response time
 */
export function getResponseBucket(responseTimeSeconds: number | null): string {
  if (responseTimeSeconds === null) return 'missed';
  if (responseTimeSeconds < 60) return 'under_1min';
  if (responseTimeSeconds < 300) return '1_5min';
  if (responseTimeSeconds < 900) return '5_15min';
  if (responseTimeSeconds < 3600) return '15_60min';
  return 'over_1hr';
}

/**
 * Get or create revenue benchmarks for a location
 */
export async function getBenchmarks(locationId: string): Promise<RevenueBenchmarks> {
  const result = await pool.query(
    'SELECT * FROM revenue_benchmarks WHERE location_id = $1',
    [locationId]
  );
  
  if (result.rows.length === 0) {
    // Create default benchmarks
    await pool.query(
      `INSERT INTO revenue_benchmarks (location_id) VALUES ($1)
       ON CONFLICT (location_id) DO NOTHING`,
      [locationId]
    );
    return {
      conversionRates: DEFAULT_BENCHMARKS.conversionRates,
      avgDealValues: DEFAULT_BENCHMARKS.avgDealValues,
      useCustomDealValue: false
    };
  }
  
  const row = result.rows[0];
  return {
    conversionRates: {
      under_1min: parseFloat(row.conversion_rate_under_1min) / 100,
      '1_5min': parseFloat(row.conversion_rate_1_5min) / 100,
      '5_15min': parseFloat(row.conversion_rate_5_15min) / 100,
      '15_60min': parseFloat(row.conversion_rate_15_60min) / 100,
      over_1hr: parseFloat(row.conversion_rate_over_1hr) / 100,
      missed: parseFloat(row.conversion_rate_missed) / 100
    },
    avgDealValues: {
      default: parseFloat(row.avg_deal_value_default) || DEFAULT_BENCHMARKS.avgDealValues.default,
      website: parseFloat(row.avg_deal_value_website) || DEFAULT_BENCHMARKS.avgDealValues.website,
      facebook: parseFloat(row.avg_deal_value_facebook) || DEFAULT_BENCHMARKS.avgDealValues.facebook,
      google: parseFloat(row.avg_deal_value_google) || DEFAULT_BENCHMARKS.avgDealValues.google,
      referral: parseFloat(row.avg_deal_value_referral) || DEFAULT_BENCHMARKS.avgDealValues.referral,
      organic: parseFloat(row.avg_deal_value_organic) || DEFAULT_BENCHMARKS.avgDealValues.organic
    },
    customAvgDealValue: row.custom_avg_deal_value ? parseFloat(row.custom_avg_deal_value) : undefined,
    useCustomDealValue: row.use_custom_deal_value
  };
}

/**
 * Calculate estimated lead value based on source
 */
export function estimateLeadValue(
  source: string | null,
  benchmarks: RevenueBenchmarks
): number {
  if (benchmarks.useCustomDealValue && benchmarks.customAvgDealValue) {
    return benchmarks.customAvgDealValue;
  }
  
  const normalizedSource = source?.toLowerCase() || 'default';
  return benchmarks.avgDealValues[normalizedSource] || benchmarks.avgDealValues.default;
}

/**
 * Calculate conversion probability based on response time
 */
export function calculateConversionProbability(
  responseTimeSeconds: number | null,
  benchmarks: RevenueBenchmarks
): number {
  const bucket = getResponseBucket(responseTimeSeconds);
  return benchmarks.conversionRates[bucket] || 0.005;
}

/**
 * Get comprehensive revenue metrics for a location
 */
export async function getRevenueMetrics(
  locationId: string,
  days: number = 30
): Promise<RevenueMetrics> {
  logger.info('Calculating revenue metrics', { locationId, days });
  
  const benchmarks = await getBenchmarks(locationId);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Get conversation data grouped by response time bucket
  const bucketQuery = await pool.query(`
    SELECT 
      CASE 
        WHEN is_missed = true OR response_time_seconds IS NULL THEN 'missed'
        WHEN response_time_seconds < 60 THEN 'under_1min'
        WHEN response_time_seconds < 300 THEN '1_5min'
        WHEN response_time_seconds < 900 THEN '5_15min'
        WHEN response_time_seconds < 3600 THEN '15_60min'
        ELSE 'over_1hr'
      END as bucket,
      COUNT(*) as total_leads,
      COUNT(*) FILTER (WHERE status = 'won') as conversions,
      COALESCE(SUM(cr.deal_value) FILTER (WHERE status = 'won'), 0) as actual_revenue,
      AVG(response_time_seconds) as avg_response_time,
      channel
    FROM conversations c
    LEFT JOIN conversation_revenue cr ON c.id = cr.conversation_id
    WHERE c.location_id = $1 
      AND c.first_inbound_at >= $2
    GROUP BY bucket, channel
  `, [locationId, startDate]);
  
  // Aggregate by bucket
  const bucketData: Record<string, {
    leads: number;
    conversions: number;
    revenue: number;
    avgResponseTime: number;
    sources: Set<string>;
  }> = {};
  
  for (const row of bucketQuery.rows) {
    const bucket = row.bucket;
    if (!bucketData[bucket]) {
      bucketData[bucket] = {
        leads: 0,
        conversions: 0,
        revenue: 0,
        avgResponseTime: 0,
        sources: new Set()
      };
    }
    bucketData[bucket].leads += parseInt(row.total_leads) || 0;
    bucketData[bucket].conversions += parseInt(row.conversions) || 0;
    bucketData[bucket].revenue += parseFloat(row.actual_revenue) || 0;
    if (row.channel) bucketData[bucket].sources.add(row.channel);
  }
  
  // Calculate metrics for each bucket
  const conversionByBucket = Object.entries(bucketData).map(([bucket, data]) => {
    const benchmarkRate = benchmarks.conversionRates[bucket] || 0.005;
    const actualRate = data.leads > 0 ? data.conversions / data.leads : 0;
    
    // Estimate lead value (use average if no actual data)
    const avgLeadValue = data.revenue > 0 && data.conversions > 0 
      ? data.revenue / data.conversions 
      : estimateLeadValue(null, benchmarks);
    
    // Calculate what they COULD have made with optimal conversion
    const optimalConversions = Math.round(data.leads * benchmarks.conversionRates.under_1min);
    const optimalRevenue = optimalConversions * avgLeadValue;
    const estimatedLost = Math.max(0, optimalRevenue - data.revenue);
    
    return {
      bucket,
      label: getBucketLabel(bucket),
      leads: data.leads,
      conversions: data.conversions,
      conversionRate: Math.round(actualRate * 100),
      benchmarkRate: Math.round(benchmarkRate * 100),
      revenue: Math.round(data.revenue * 100) / 100,
      estimatedLost: Math.round(estimatedLost * 100) / 100
    };
  }).sort((a, b) => getBucketOrder(a.bucket) - getBucketOrder(b.bucket));
  
  // Calculate headline numbers
  const fastBuckets = ['under_1min', '1_5min'];
  const slowBuckets = ['5_15min', '15_60min', 'over_1hr'];
  
  const revenueFromFastResponses = conversionByBucket
    .filter(b => fastBuckets.includes(b.bucket))
    .reduce((sum, b) => sum + b.revenue, 0);
  
  const estimatedLostFromSlow = conversionByBucket
    .filter(b => slowBuckets.includes(b.bucket))
    .reduce((sum, b) => sum + b.estimatedLost, 0);
  
  const estimatedLostFromMissed = conversionByBucket
    .filter(b => b.bucket === 'missed')
    .reduce((sum, b) => sum + b.estimatedLost, 0);
  
  // ROI Projection
  const currentAvgQuery = await pool.query(`
    SELECT 
      AVG(response_time_seconds) as avg_response,
      COUNT(*) as total_conversations
    FROM conversations
    WHERE location_id = $1 
      AND first_inbound_at >= $2
      AND response_time_seconds IS NOT NULL
  `, [locationId, startDate]);
  
  const currentAvgResponseTime = parseInt(currentAvgQuery.rows[0]?.avg_response) || 600;
  const totalConversations = parseInt(currentAvgQuery.rows[0]?.total_conversations) || 0;
  
  const currentTotalRevenue = conversionByBucket.reduce((sum, b) => sum + b.revenue, 0);
  const avgDealValue = estimateLeadValue(null, benchmarks);
  
  // Project revenue at different response times
  const projectedRevenueAt3Min = totalConversations * benchmarks.conversionRates['1_5min'] * avgDealValue;
  const projectedRevenueAt1Min = totalConversations * benchmarks.conversionRates.under_1min * avgDealValue;
  
  // Calculate insights
  const fastLeads = conversionByBucket
    .filter(b => fastBuckets.includes(b.bucket))
    .reduce((sum, b) => sum + b.leads, 0);
  const fastConversions = conversionByBucket
    .filter(b => fastBuckets.includes(b.bucket))
    .reduce((sum, b) => sum + b.conversions, 0);
  
  const slowLeads = conversionByBucket
    .filter(b => slowBuckets.includes(b.bucket) || b.bucket === 'missed')
    .reduce((sum, b) => sum + b.leads, 0);
  const slowConversions = conversionByBucket
    .filter(b => slowBuckets.includes(b.bucket) || b.bucket === 'missed')
    .reduce((sum, b) => sum + b.conversions, 0);
  
  const fastWinRate = fastLeads > 0 ? (fastConversions / fastLeads) * 100 : 0;
  const slowWinRate = slowLeads > 0 ? (slowConversions / slowLeads) * 100 : 0;
  const speedImpactMultiplier = slowWinRate > 0 ? Math.round(fastWinRate / slowWinRate * 10) / 10 : 4;
  
  const missedLeadsBucket = conversionByBucket.find(b => b.bucket === 'missed');
  const missedLeadCost = missedLeadsBucket && missedLeadsBucket.leads > 0
    ? missedLeadsBucket.estimatedLost / missedLeadsBucket.leads
    : avgDealValue * benchmarks.conversionRates.under_1min;
  
  // Value per minute improvement (rough estimate)
  // Going from 10min to 5min avg increases conversion by ~7%
  const valuePerMinuteImprovement = (avgDealValue * 0.014 * totalConversations) / days * 30; // Monthly value
  
  const metrics: RevenueMetrics = {
    revenueFromFastResponses: Math.round(revenueFromFastResponses * 100) / 100,
    estimatedLostFromSlow: Math.round(estimatedLostFromSlow * 100) / 100,
    estimatedLostFromMissed: Math.round(estimatedLostFromMissed * 100) / 100,
    totalPotentialLost: Math.round((estimatedLostFromSlow + estimatedLostFromMissed) * 100) / 100,
    
    conversionByBucket,
    
    roiProjection: {
      currentAvgResponseTime,
      currentMonthlyRevenue: Math.round(currentTotalRevenue / days * 30 * 100) / 100,
      projectedRevenueAt3Min: Math.round(projectedRevenueAt3Min / days * 30 * 100) / 100,
      projectedRevenueAt1Min: Math.round(projectedRevenueAt1Min / days * 30 * 100) / 100,
      potentialGain: Math.round((projectedRevenueAt3Min - currentTotalRevenue) / days * 30 * 100) / 100,
      improvementNeeded: Math.max(0, currentAvgResponseTime - 180) // Target 3 minutes
    },
    
    insights: {
      fastResponseWinRate: Math.round(fastWinRate * 10) / 10,
      slowResponseWinRate: Math.round(slowWinRate * 10) / 10,
      speedImpactMultiplier,
      missedLeadCost: Math.round(missedLeadCost * 100) / 100,
      valuePerMinuteImprovement: Math.round(valuePerMinuteImprovement * 100) / 100
    }
  };
  
  logger.info('Revenue metrics calculated', {
    locationId,
    revenueFromFast: metrics.revenueFromFastResponses,
    estimatedLost: metrics.totalPotentialLost
  });
  
  return metrics;
}

/**
 * Calculate ROI for a specific improvement scenario
 */
export async function calculateROI(
  locationId: string,
  currentAvgMinutes: number,
  targetAvgMinutes: number,
  monthlyLeadVolume: number
): Promise<{
  currentMonthlyRevenue: number;
  projectedMonthlyRevenue: number;
  additionalRevenue: number;
  roi: number; // Percentage return
  breakeven: string; // When ROI > subscription cost
}> {
  const benchmarks = await getBenchmarks(locationId);
  const avgDealValue = benchmarks.customAvgDealValue || estimateLeadValue(null, benchmarks);
  
  const currentConversionRate = calculateConversionProbability(currentAvgMinutes * 60, benchmarks);
  const targetConversionRate = calculateConversionProbability(targetAvgMinutes * 60, benchmarks);
  
  const currentMonthlyRevenue = monthlyLeadVolume * currentConversionRate * avgDealValue;
  const projectedMonthlyRevenue = monthlyLeadVolume * targetConversionRate * avgDealValue;
  const additionalRevenue = projectedMonthlyRevenue - currentMonthlyRevenue;
  
  const subscriptionCost = 100; // $100/month
  const roi = additionalRevenue > 0 ? ((additionalRevenue - subscriptionCost) / subscriptionCost) * 100 : 0;
  
  let breakeven = 'Already profitable';
  if (additionalRevenue < subscriptionCost) {
    breakeven = 'Increase response speed for positive ROI';
  } else if (additionalRevenue >= subscriptionCost * 2) {
    breakeven = 'Immediate - 2x+ return';
  } else {
    breakeven = 'Within first month';
  }
  
  return {
    currentMonthlyRevenue: Math.round(currentMonthlyRevenue * 100) / 100,
    projectedMonthlyRevenue: Math.round(projectedMonthlyRevenue * 100) / 100,
    additionalRevenue: Math.round(additionalRevenue * 100) / 100,
    roi: Math.round(roi),
    breakeven
  };
}

/**
 * Link a conversation to an opportunity/deal
 */
export async function linkConversationToOpportunity(
  conversationId: string,
  locationId: string,
  opportunityData: {
    opportunityId: string;
    pipelineId?: string;
    pipelineStage?: string;
    dealValue: number;
    dealStatus: 'open' | 'won' | 'lost' | 'abandoned';
    leadSource?: string;
  }
): Promise<void> {
  const benchmarks = await getBenchmarks(locationId);
  
  // Get conversation details
  const convResult = await pool.query(
    'SELECT response_time_seconds, is_missed, channel FROM conversations WHERE id = $1',
    [conversationId]
  );
  
  if (convResult.rows.length === 0) {
    throw new Error('Conversation not found');
  }
  
  const conv = convResult.rows[0];
  const responseTimeBucket = getResponseBucket(conv.response_time_seconds);
  const estimatedValue = estimateLeadValue(opportunityData.leadSource || conv.channel, benchmarks);
  
  // Determine if this was attributed to fast response
  const attributedToFast = responseTimeBucket === 'under_1min' || responseTimeBucket === '1_5min';
  
  await pool.query(`
    INSERT INTO conversation_revenue (
      conversation_id, location_id, opportunity_id, pipeline_id, pipeline_stage,
      deal_value, deal_status, lead_source, estimated_lead_value,
      response_time_seconds, response_time_bucket, attributed_to_fast_response,
      converted_at, lost_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    ON CONFLICT (conversation_id) DO UPDATE SET
      opportunity_id = $3, pipeline_id = $4, pipeline_stage = $5,
      deal_value = $6, deal_status = $7, lead_source = $8,
      converted_at = $13, lost_at = $14, updated_at = NOW()
  `, [
    conversationId,
    locationId,
    opportunityData.opportunityId,
    opportunityData.pipelineId,
    opportunityData.pipelineStage,
    opportunityData.dealValue,
    opportunityData.dealStatus,
    opportunityData.leadSource,
    estimatedValue,
    conv.response_time_seconds,
    responseTimeBucket,
    attributedToFast,
    opportunityData.dealStatus === 'won' ? new Date() : null,
    opportunityData.dealStatus === 'lost' ? new Date() : null
  ]);
  
  // Also update the conversation status
  if (opportunityData.dealStatus === 'won' || opportunityData.dealStatus === 'lost') {
    await pool.query(
      'UPDATE conversations SET status = $1, updated_at = NOW() WHERE id = $2',
      [opportunityData.dealStatus, conversationId]
    );
  }
  
  logger.info('Linked conversation to opportunity', {
    conversationId,
    opportunityId: opportunityData.opportunityId,
    dealValue: opportunityData.dealValue,
    dealStatus: opportunityData.dealStatus
  });
}

/**
 * Update benchmarks for a location
 */
export async function updateBenchmarks(
  locationId: string,
  updates: Partial<{
    customAvgDealValue: number;
    useCustomDealValue: boolean;
    conversionRateUnder1Min: number;
    conversionRate1_5Min: number;
    conversionRate5_15Min: number;
    conversionRate15_60Min: number;
    conversionRateOver1Hr: number;
    conversionRateMissed: number;
  }>
): Promise<void> {
  const fields: string[] = [];
  const values: any[] = [locationId];
  let paramIndex = 2;
  
  if (updates.customAvgDealValue !== undefined) {
    fields.push(`custom_avg_deal_value = $${paramIndex++}`);
    values.push(updates.customAvgDealValue);
  }
  if (updates.useCustomDealValue !== undefined) {
    fields.push(`use_custom_deal_value = $${paramIndex++}`);
    values.push(updates.useCustomDealValue);
  }
  if (updates.conversionRateUnder1Min !== undefined) {
    fields.push(`conversion_rate_under_1min = $${paramIndex++}`);
    values.push(updates.conversionRateUnder1Min);
  }
  if (updates.conversionRate1_5Min !== undefined) {
    fields.push(`conversion_rate_1_5min = $${paramIndex++}`);
    values.push(updates.conversionRate1_5Min);
  }
  if (updates.conversionRate5_15Min !== undefined) {
    fields.push(`conversion_rate_5_15min = $${paramIndex++}`);
    values.push(updates.conversionRate5_15Min);
  }
  if (updates.conversionRate15_60Min !== undefined) {
    fields.push(`conversion_rate_15_60min = $${paramIndex++}`);
    values.push(updates.conversionRate15_60Min);
  }
  if (updates.conversionRateOver1Hr !== undefined) {
    fields.push(`conversion_rate_over_1hr = $${paramIndex++}`);
    values.push(updates.conversionRateOver1Hr);
  }
  if (updates.conversionRateMissed !== undefined) {
    fields.push(`conversion_rate_missed = $${paramIndex++}`);
    values.push(updates.conversionRateMissed);
  }
  
  if (fields.length === 0) return;
  
  await pool.query(
    `UPDATE revenue_benchmarks SET ${fields.join(', ')}, updated_at = NOW() WHERE location_id = $1`,
    values
  );
}

/**
 * Recalculate daily revenue metrics
 */
export async function recalculateDailyRevenueMetrics(
  locationId: string,
  date: Date
): Promise<void> {
  const dateStr = date.toISOString().split('T')[0];
  const benchmarks = await getBenchmarks(locationId);
  const avgDealValue = benchmarks.customAvgDealValue || estimateLeadValue(null, benchmarks);
  
  // Get metrics for the day
  const result = await pool.query(`
    WITH day_data AS (
      SELECT 
        c.id,
        c.response_time_seconds,
        c.is_missed,
        c.status,
        c.channel,
        cr.deal_value,
        CASE 
          WHEN c.is_missed = true OR c.response_time_seconds IS NULL THEN 'missed'
          WHEN c.response_time_seconds < 60 THEN 'under_1min'
          WHEN c.response_time_seconds < 300 THEN '1_5min'
          WHEN c.response_time_seconds < 900 THEN '5_15min'
          WHEN c.response_time_seconds < 3600 THEN '15_60min'
          ELSE 'over_1hr'
        END as bucket
      FROM conversations c
      LEFT JOIN conversation_revenue cr ON c.id = cr.conversation_id
      WHERE c.location_id = $1 
        AND DATE(c.first_inbound_at) = $2
    )
    SELECT 
      bucket,
      COUNT(*) as leads,
      COUNT(*) FILTER (WHERE status = 'won') as conversions,
      COALESCE(SUM(deal_value) FILTER (WHERE status = 'won'), 0) as revenue,
      COALESCE(SUM(deal_value) FILTER (WHERE status = 'lost'), 0) as lost_revenue
    FROM day_data
    GROUP BY bucket
  `, [locationId, dateStr]);
  
  // Calculate totals
  let totalRevenue = 0;
  let totalLostRevenue = 0;
  let revenueFromFast = 0;
  let estimatedLostSlow = 0;
  let estimatedLostMissed = 0;
  
  const bucketMetrics: Record<string, { leads: number; conversions: number }> = {};
  
  for (const row of result.rows) {
    const bucket = row.bucket;
    const leads = parseInt(row.leads) || 0;
    const conversions = parseInt(row.conversions) || 0;
    const revenue = parseFloat(row.revenue) || 0;
    const lostRevenue = parseFloat(row.lost_revenue) || 0;
    
    bucketMetrics[bucket] = { leads, conversions };
    totalRevenue += revenue;
    totalLostRevenue += lostRevenue;
    
    // Fast responses
    if (bucket === 'under_1min' || bucket === '1_5min') {
      revenueFromFast += revenue;
    }
    
    // Estimate lost opportunity for slow/missed
    const optimalConversions = leads * benchmarks.conversionRates.under_1min;
    const potentialRevenue = optimalConversions * avgDealValue;
    const actualEquivalent = conversions * avgDealValue;
    
    if (bucket === 'missed') {
      estimatedLostMissed += Math.max(0, potentialRevenue - actualEquivalent);
    } else if (['5_15min', '15_60min', 'over_1hr'].includes(bucket)) {
      estimatedLostSlow += Math.max(0, potentialRevenue - actualEquivalent);
    }
  }
  
  // Calculate potential at optimal
  const totalLeads = Object.values(bucketMetrics).reduce((sum, b) => sum + b.leads, 0);
  const potentialAtOptimal = totalLeads * benchmarks.conversionRates.under_1min * avgDealValue;
  const revenueGap = potentialAtOptimal - totalRevenue;
  
  // Upsert daily metrics
  await pool.query(`
    INSERT INTO daily_revenue_metrics (
      location_id, date,
      actual_revenue_won, actual_revenue_lost, actual_deals_won, actual_deals_lost,
      revenue_from_fast_responses, estimated_lost_from_slow, estimated_lost_from_missed,
      leads_under_1min, converted_under_1min,
      leads_1_5min, converted_1_5min,
      leads_5_15min, converted_5_15min,
      leads_15_60min, converted_15_60min,
      leads_over_1hr, converted_over_1hr,
      leads_missed, converted_missed,
      potential_revenue_at_optimal, revenue_gap
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
    ON CONFLICT (location_id, date) DO UPDATE SET
      actual_revenue_won = $3, actual_revenue_lost = $4,
      actual_deals_won = $5, actual_deals_lost = $6,
      revenue_from_fast_responses = $7,
      estimated_lost_from_slow = $8, estimated_lost_from_missed = $9,
      leads_under_1min = $10, converted_under_1min = $11,
      leads_1_5min = $12, converted_1_5min = $13,
      leads_5_15min = $14, converted_5_15min = $15,
      leads_15_60min = $16, converted_15_60min = $17,
      leads_over_1hr = $18, converted_over_1hr = $19,
      leads_missed = $20, converted_missed = $21,
      potential_revenue_at_optimal = $22, revenue_gap = $23,
      updated_at = NOW()
  `, [
    locationId,
    dateStr,
    totalRevenue,
    totalLostRevenue,
    Object.values(bucketMetrics).reduce((sum, b) => sum + b.conversions, 0),
    0, // We don't track lost deals separately yet
    revenueFromFast,
    estimatedLostSlow,
    estimatedLostMissed,
    bucketMetrics['under_1min']?.leads || 0,
    bucketMetrics['under_1min']?.conversions || 0,
    bucketMetrics['1_5min']?.leads || 0,
    bucketMetrics['1_5min']?.conversions || 0,
    bucketMetrics['5_15min']?.leads || 0,
    bucketMetrics['5_15min']?.conversions || 0,
    bucketMetrics['15_60min']?.leads || 0,
    bucketMetrics['15_60min']?.conversions || 0,
    bucketMetrics['over_1hr']?.leads || 0,
    bucketMetrics['over_1hr']?.conversions || 0,
    bucketMetrics['missed']?.leads || 0,
    bucketMetrics['missed']?.conversions || 0,
    potentialAtOptimal,
    revenueGap
  ]);
}

// Helper functions
function getBucketLabel(bucket: string): string {
  const labels: Record<string, string> = {
    'under_1min': '< 1 minute',
    '1_5min': '1-5 minutes',
    '5_15min': '5-15 minutes',
    '15_60min': '15-60 minutes',
    'over_1hr': '> 1 hour',
    'missed': 'No response'
  };
  return labels[bucket] || bucket;
}

function getBucketOrder(bucket: string): number {
  const order: Record<string, number> = {
    'under_1min': 1,
    '1_5min': 2,
    '5_15min': 3,
    '15_60min': 4,
    'over_1hr': 5,
    'missed': 6
  };
  return order[bucket] || 99;
}
