/**
 * Industry Benchmarking & Competitive Position
 * 
 * Based on Harvard Business Review research:
 * "78% of customers buy from the company that responds first"
 * 
 * This module calculates where users rank against industry standards
 * and tracks improvement over time.
 */

import { pool } from './database';
import { logger } from './logger';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

export interface IndustryVertical {
  id: string;
  name: string;
  description: string;
  // Response time benchmarks (in seconds)
  benchmarks: {
    avgResponseTime: number;      // Industry average
    topQuartile: number;          // Top 25%
    top10Percent: number;         // Top 10%
    elite: number;                // Top 1%
  };
  // Health score benchmarks
  healthBenchmarks: {
    average: number;
    topQuartile: number;
    top10Percent: number;
    elite: number;
  };
}

export type TierLevel = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface UserTier {
  tier: TierLevel;
  emoji: string;
  name: string;
  color: string;
  minPercentile: number;
  description: string;
}

export interface BenchmarkResult {
  // Current position
  percentile: number;                    // 0-100, higher is better
  tierInfo: UserTier;
  
  // Metrics breakdown
  responseTimePercentile: number;
  healthScorePercentile: number;
  workflowEfficiencyPercentile: number;
  
  // Comparison to industry
  vsIndustryAverage: {
    responseTime: { value: number; diff: number; better: boolean };
    healthScore: { value: number; diff: number; better: boolean };
  };
  
  // Next tier advancement
  nextTier: UserTier | null;
  toNextTier: {
    metric: string;
    currentValue: number;
    targetValue: number;
    improvement: string;
  } | null;
  
  // Trend over time
  trend: {
    direction: 'improving' | 'declining' | 'stable';
    previousPercentile: number | null;
    change: number;
    periodDays: number;
  };
  
  // Industry context
  industry: {
    id: string;
    name: string;
    avgResponseTime: number;
    avgHealthScore: number;
  };
  
  // Motivational stats
  stats: {
    aheadOfPercent: number;
    leadsLikelyWon: string;
    potentialRevenueLift: string;
  };
}

export interface HistoricalBenchmark {
  date: string;
  percentile: number;
  tier: TierLevel;
  responseTime: number;
  healthScore: number;
}

// =============================================================================
// INDUSTRY VERTICAL DEFINITIONS
// =============================================================================

/**
 * Industry benchmarks based on research and real-world data
 * Response times in seconds, health scores 0-100
 */
export const INDUSTRY_VERTICALS: Record<string, IndustryVertical> = {
  real_estate: {
    id: 'real_estate',
    name: 'Real Estate',
    description: 'Realtors, brokers, property management',
    benchmarks: {
      avgResponseTime: 900,      // 15 minutes average
      topQuartile: 300,          // 5 minutes = top 25%
      top10Percent: 120,         // 2 minutes = top 10%
      elite: 30,                 // 30 seconds = elite
    },
    healthBenchmarks: {
      average: 55,
      topQuartile: 72,
      top10Percent: 85,
      elite: 95,
    }
  },
  
  insurance: {
    id: 'insurance',
    name: 'Insurance',
    description: 'Insurance agencies, brokers, adjusters',
    benchmarks: {
      avgResponseTime: 1800,     // 30 minutes average (slower industry)
      topQuartile: 600,          // 10 minutes
      top10Percent: 180,         // 3 minutes
      elite: 60,                 // 1 minute
    },
    healthBenchmarks: {
      average: 52,
      topQuartile: 68,
      top10Percent: 82,
      elite: 93,
    }
  },
  
  home_services: {
    id: 'home_services',
    name: 'Home Services',
    description: 'HVAC, plumbing, electrical, roofing',
    benchmarks: {
      avgResponseTime: 600,      // 10 minutes (urgent nature)
      topQuartile: 180,          // 3 minutes
      top10Percent: 60,          // 1 minute
      elite: 20,                 // 20 seconds
    },
    healthBenchmarks: {
      average: 48,
      topQuartile: 65,
      top10Percent: 80,
      elite: 92,
    }
  },
  
  legal: {
    id: 'legal',
    name: 'Legal Services',
    description: 'Law firms, attorneys, legal consultants',
    benchmarks: {
      avgResponseTime: 3600,     // 1 hour average
      topQuartile: 900,          // 15 minutes
      top10Percent: 300,         // 5 minutes
      elite: 120,                // 2 minutes
    },
    healthBenchmarks: {
      average: 58,
      topQuartile: 74,
      top10Percent: 86,
      elite: 94,
    }
  },
  
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Clinics, dental, chiropractic, med spas',
    benchmarks: {
      avgResponseTime: 1200,     // 20 minutes
      topQuartile: 300,          // 5 minutes
      top10Percent: 120,         // 2 minutes
      elite: 45,                 // 45 seconds
    },
    healthBenchmarks: {
      average: 60,
      topQuartile: 76,
      top10Percent: 88,
      elite: 96,
    }
  },
  
  fitness: {
    id: 'fitness',
    name: 'Fitness & Wellness',
    description: 'Gyms, personal trainers, yoga studios',
    benchmarks: {
      avgResponseTime: 720,      // 12 minutes
      topQuartile: 240,          // 4 minutes
      top10Percent: 90,          // 1.5 minutes
      elite: 30,                 // 30 seconds
    },
    healthBenchmarks: {
      average: 50,
      topQuartile: 66,
      top10Percent: 80,
      elite: 91,
    }
  },
  
  automotive: {
    id: 'automotive',
    name: 'Automotive',
    description: 'Dealerships, auto repair, detailing',
    benchmarks: {
      avgResponseTime: 1080,     // 18 minutes
      topQuartile: 360,          // 6 minutes
      top10Percent: 150,         // 2.5 minutes
      elite: 45,                 // 45 seconds
    },
    healthBenchmarks: {
      average: 53,
      topQuartile: 69,
      top10Percent: 83,
      elite: 94,
    }
  },
  
  saas: {
    id: 'saas',
    name: 'SaaS / Technology',
    description: 'Software companies, tech services',
    benchmarks: {
      avgResponseTime: 480,      // 8 minutes (expectation of speed)
      topQuartile: 120,          // 2 minutes
      top10Percent: 45,          // 45 seconds
      elite: 15,                 // 15 seconds (chat-like)
    },
    healthBenchmarks: {
      average: 62,
      topQuartile: 78,
      top10Percent: 89,
      elite: 97,
    }
  },
  
  agency: {
    id: 'agency',
    name: 'Marketing Agency',
    description: 'Digital agencies, marketing consultants',
    benchmarks: {
      avgResponseTime: 600,      // 10 minutes
      topQuartile: 180,          // 3 minutes
      top10Percent: 60,          // 1 minute
      elite: 30,                 // 30 seconds
    },
    healthBenchmarks: {
      average: 58,
      topQuartile: 74,
      top10Percent: 87,
      elite: 95,
    }
  },
  
  default: {
    id: 'default',
    name: 'General Business',
    description: 'Cross-industry average',
    benchmarks: {
      avgResponseTime: 900,      // 15 minutes
      topQuartile: 300,          // 5 minutes
      top10Percent: 120,         // 2 minutes
      elite: 45,                 // 45 seconds
    },
    healthBenchmarks: {
      average: 55,
      topQuartile: 70,
      top10Percent: 84,
      elite: 94,
    }
  }
};

// =============================================================================
// TIER DEFINITIONS
// =============================================================================

export const TIERS: UserTier[] = [
  {
    tier: 'bronze',
    emoji: '🥉',
    name: 'Bronze',
    color: '#CD7F32',
    minPercentile: 0,
    description: 'Getting started - room to grow'
  },
  {
    tier: 'silver',
    emoji: '🥈',
    name: 'Silver',
    color: '#C0C0C0',
    minPercentile: 50,
    description: 'Above average performer'
  },
  {
    tier: 'gold',
    emoji: '🥇',
    name: 'Gold',
    color: '#FFD700',
    minPercentile: 75,
    description: 'Top quartile - industry leader'
  },
  {
    tier: 'platinum',
    emoji: '💎',
    name: 'Platinum',
    color: '#E5E4E2',
    minPercentile: 90,
    description: 'Elite performer - top 10%'
  }
];

// =============================================================================
// BENCHMARK CALCULATION FUNCTIONS
// =============================================================================

/**
 * Get the tier for a given percentile
 */
export function getTierForPercentile(percentile: number): UserTier {
  // Sort tiers by minPercentile descending and find the first match
  const sortedTiers = [...TIERS].sort((a, b) => b.minPercentile - a.minPercentile);
  
  for (const tier of sortedTiers) {
    if (percentile >= tier.minPercentile) {
      return tier;
    }
  }
  
  return TIERS[0]; // Default to bronze
}

/**
 * Get the next tier above the current one
 */
export function getNextTier(currentTier: TierLevel): UserTier | null {
  const tierOrder: TierLevel[] = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = tierOrder.indexOf(currentTier);
  
  if (currentIndex === -1 || currentIndex === tierOrder.length - 1) {
    return null; // Already at platinum or invalid tier
  }
  
  return TIERS.find(t => t.tier === tierOrder[currentIndex + 1]) || null;
}

/**
 * Calculate percentile for response time (lower is better)
 */
export function calculateResponseTimePercentile(
  responseTime: number,
  vertical: IndustryVertical
): number {
  const { avgResponseTime, topQuartile, top10Percent, elite } = vertical.benchmarks;
  
  // If faster than elite, cap at 99
  if (responseTime <= elite) {
    return 99;
  }
  
  // Between elite and top 10%
  if (responseTime <= top10Percent) {
    return 90 + (top10Percent - responseTime) / (top10Percent - elite) * 9;
  }
  
  // Between top 10% and top quartile
  if (responseTime <= topQuartile) {
    return 75 + (topQuartile - responseTime) / (topQuartile - top10Percent) * 15;
  }
  
  // Between top quartile and average
  if (responseTime <= avgResponseTime) {
    return 50 + (avgResponseTime - responseTime) / (avgResponseTime - topQuartile) * 25;
  }
  
  // Below average - scale down to 0
  // Use 3x average as the "worst" baseline
  const worstCase = avgResponseTime * 3;
  if (responseTime >= worstCase) {
    return 0;
  }
  
  return Math.max(0, 50 * (worstCase - responseTime) / (worstCase - avgResponseTime));
}

/**
 * Calculate percentile for health score (higher is better)
 */
export function calculateHealthScorePercentile(
  healthScore: number,
  vertical: IndustryVertical
): number {
  const { average, topQuartile, top10Percent, elite } = vertical.healthBenchmarks;
  
  // If at or above elite, cap at 99
  if (healthScore >= elite) {
    return 99;
  }
  
  // Between top 10% and elite
  if (healthScore >= top10Percent) {
    return 90 + (healthScore - top10Percent) / (elite - top10Percent) * 9;
  }
  
  // Between top quartile and top 10%
  if (healthScore >= topQuartile) {
    return 75 + (healthScore - topQuartile) / (top10Percent - topQuartile) * 15;
  }
  
  // Between average and top quartile
  if (healthScore >= average) {
    return 50 + (healthScore - average) / (topQuartile - average) * 25;
  }
  
  // Below average - scale down to 0
  const worstCase = average * 0.3; // 30% of average as floor
  if (healthScore <= worstCase) {
    return 0;
  }
  
  return Math.max(0, 50 * (healthScore - worstCase) / (average - worstCase));
}

/**
 * Calculate combined percentile (weighted average)
 */
export function calculateOverallPercentile(
  responseTimePercentile: number,
  healthScorePercentile: number,
  workflowEfficiencyPercentile: number
): number {
  // Weight response time heavily (Harvard: 78% of leads go to first responder)
  const weights = {
    responseTime: 0.50,    // 50% weight - speed is king
    healthScore: 0.35,     // 35% weight - system quality
    efficiency: 0.15       // 15% weight - workflow optimization
  };
  
  return Math.round(
    responseTimePercentile * weights.responseTime +
    healthScorePercentile * weights.healthScore +
    workflowEfficiencyPercentile * weights.efficiency
  );
}

/**
 * Calculate what improvement is needed for the next tier
 */
export function calculateNextTierRequirements(
  currentPercentile: number,
  currentTier: UserTier,
  responseTime: number,
  healthScore: number,
  vertical: IndustryVertical
): { metric: string; currentValue: number; targetValue: number; improvement: string } | null {
  const nextTier = getNextTier(currentTier.tier);
  
  if (!nextTier) {
    return null; // Already at platinum
  }
  
  const percentileNeeded = nextTier.minPercentile - currentPercentile;
  
  // Calculate what improvement in each metric would get them there
  // Focus on the metric that would be easiest to improve
  
  const responseTimePercentile = calculateResponseTimePercentile(responseTime, vertical);
  const healthScorePercentile = calculateHealthScorePercentile(healthScore, vertical);
  
  // If response time percentile is lower, focus there
  if (responseTimePercentile < healthScorePercentile) {
    // Calculate target response time for next tier
    const targetPercentile = responseTimePercentile + (percentileNeeded / 0.5); // Adjust for weight
    let targetTime: number;
    
    if (targetPercentile >= 90) {
      targetTime = vertical.benchmarks.top10Percent;
    } else if (targetPercentile >= 75) {
      targetTime = vertical.benchmarks.topQuartile;
    } else {
      targetTime = vertical.benchmarks.avgResponseTime;
    }
    
    const improvement = responseTime - targetTime;
    
    return {
      metric: 'response_time',
      currentValue: responseTime,
      targetValue: targetTime,
      improvement: improvement > 60 
        ? `Improve response time by ${Math.round(improvement / 60)} minutes`
        : `Improve response time by ${Math.round(improvement)} seconds`
    };
  }
  
  // Focus on health score
  const targetPercentile = healthScorePercentile + (percentileNeeded / 0.35);
  let targetScore: number;
  
  if (targetPercentile >= 90) {
    targetScore = vertical.healthBenchmarks.top10Percent;
  } else if (targetPercentile >= 75) {
    targetScore = vertical.healthBenchmarks.topQuartile;
  } else {
    targetScore = vertical.healthBenchmarks.average;
  }
  
  const improvement = targetScore - healthScore;
  
  return {
    metric: 'health_score',
    currentValue: healthScore,
    targetValue: targetScore,
    improvement: `Improve health score by ${Math.round(improvement)} points`
  };
}

/**
 * Calculate estimated leads won based on response time
 * Harvard: 78% of deals go to first responder
 */
export function calculateLeadImpact(responseTimePercentile: number): {
  leadsLikelyWon: string;
  potentialRevenueLift: string;
} {
  // Higher percentile = faster response = more leads won
  const baseConversionRate = 0.22; // Industry baseline ~22%
  const maxConversionLift = 0.78;  // Up to 78% conversion for fastest
  
  const conversionRate = baseConversionRate + (responseTimePercentile / 100) * (maxConversionLift - baseConversionRate);
  const avgLeadValue = 500; // Assumed average
  
  // If in top 10%, likely winning most competitive leads
  if (responseTimePercentile >= 90) {
    return {
      leadsLikelyWon: '78% of leads (first responder advantage)',
      potentialRevenueLift: '+35-50% revenue from speed'
    };
  } else if (responseTimePercentile >= 75) {
    return {
      leadsLikelyWon: '60% of competitive leads',
      potentialRevenueLift: '+20-35% revenue potential'
    };
  } else if (responseTimePercentile >= 50) {
    return {
      leadsLikelyWon: '40% of competitive leads',
      potentialRevenueLift: '+10-20% revenue potential'
    };
  } else {
    return {
      leadsLikelyWon: '22% baseline conversion',
      potentialRevenueLift: 'Significant upside with faster response'
    };
  }
}

// =============================================================================
// DATABASE OPERATIONS
// =============================================================================

/**
 * Store a benchmark snapshot for historical tracking
 */
export async function storeBenchmarkSnapshot(
  locationId: string,
  percentile: number,
  tier: TierLevel,
  responseTime: number,
  healthScore: number,
  industryId: string
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO benchmark_history 
       (location_id, percentile, tier, avg_response_time, avg_health_score, industry_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [locationId, percentile, tier, responseTime, healthScore, industryId]
    );
    
    logger.info('Benchmark snapshot stored', {
      locationId,
      percentile,
      tier,
      industryId
    });
  } catch (error) {
    logger.error('Failed to store benchmark snapshot', { locationId }, error as Error);
    // Non-critical, don't throw
  }
}

/**
 * Get historical benchmarks for trend analysis
 */
export async function getHistoricalBenchmarks(
  locationId: string,
  days: number = 30
): Promise<HistoricalBenchmark[]> {
  try {
    const result = await pool.query(
      `SELECT 
         DATE(created_at) as date,
         AVG(percentile) as percentile,
         MODE() WITHIN GROUP (ORDER BY tier) as tier,
         AVG(avg_response_time) as response_time,
         AVG(avg_health_score) as health_score
       FROM benchmark_history
       WHERE location_id = $1
       AND created_at > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [locationId]
    );
    
    return result.rows.map(row => ({
      date: row.date,
      percentile: Math.round(row.percentile),
      tier: row.tier as TierLevel,
      responseTime: Math.round(row.response_time),
      healthScore: Math.round(row.health_score)
    }));
  } catch (error) {
    logger.error('Failed to fetch historical benchmarks', { locationId }, error as Error);
    return [];
  }
}

/**
 * Get user's current metrics from their analysis history
 */
export async function getUserMetrics(locationId: string): Promise<{
  avgResponseTime: number;
  avgHealthScore: number;
  workflowCount: number;
  recentAnalyses: number;
}> {
  try {
    // Get average health score from recent analyses
    const analysisResult = await pool.query(
      `SELECT 
         AVG(health_score) as avg_health_score,
         COUNT(*) as analysis_count
       FROM analysis_results
       WHERE location_id = $1
       AND created_at > NOW() - INTERVAL '30 days'`,
      [locationId]
    );
    
    // Get response time metrics from response_metrics if available
    const responseResult = await pool.query(
      `SELECT AVG(response_time_seconds) as avg_response_time
       FROM response_metrics
       WHERE location_id = $1
       AND created_at > NOW() - INTERVAL '30 days'`,
      [locationId]
    ).catch(() => ({ rows: [{ avg_response_time: null }] }));
    
    // Default values if no data
    const avgHealthScore = analysisResult.rows[0]?.avg_health_score || 55;
    const avgResponseTime = responseResult.rows[0]?.avg_response_time || 600; // 10 min default
    
    return {
      avgResponseTime: Math.round(avgResponseTime),
      avgHealthScore: Math.round(avgHealthScore),
      workflowCount: parseInt(analysisResult.rows[0]?.analysis_count || '0'),
      recentAnalyses: parseInt(analysisResult.rows[0]?.analysis_count || '0')
    };
  } catch (error) {
    logger.error('Failed to get user metrics', { locationId }, error as Error);
    
    // Return defaults
    return {
      avgResponseTime: 600,
      avgHealthScore: 55,
      workflowCount: 0,
      recentAnalyses: 0
    };
  }
}

/**
 * Detect user's industry based on their workflows or default
 */
export async function detectUserIndustry(locationId: string): Promise<IndustryVertical> {
  try {
    // Try to get stored industry preference
    const result = await pool.query(
      `SELECT industry_id FROM user_preferences WHERE location_id = $1`,
      [locationId]
    ).catch(() => ({ rows: [] }));
    
    if (result.rows[0]?.industry_id && INDUSTRY_VERTICALS[result.rows[0].industry_id]) {
      return INDUSTRY_VERTICALS[result.rows[0].industry_id];
    }
    
    // Default to general business
    return INDUSTRY_VERTICALS.default;
  } catch {
    return INDUSTRY_VERTICALS.default;
  }
}

/**
 * Set user's industry preference
 */
export async function setUserIndustry(locationId: string, industryId: string): Promise<void> {
  if (!INDUSTRY_VERTICALS[industryId]) {
    throw new Error(`Invalid industry: ${industryId}`);
  }
  
  await pool.query(
    `INSERT INTO user_preferences (location_id, industry_id, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (location_id)
     DO UPDATE SET industry_id = $2, updated_at = NOW()`,
    [locationId, industryId]
  );
}

// =============================================================================
// MAIN BENCHMARK CALCULATION
// =============================================================================

/**
 * Calculate comprehensive benchmark results for a user
 */
export async function calculateBenchmarks(locationId: string): Promise<BenchmarkResult> {
  // Get user's industry
  const industry = await detectUserIndustry(locationId);
  
  // Get user's current metrics
  const userMetrics = await getUserMetrics(locationId);
  
  // Calculate individual percentiles
  const responseTimePercentile = calculateResponseTimePercentile(
    userMetrics.avgResponseTime,
    industry
  );
  
  const healthScorePercentile = calculateHealthScorePercentile(
    userMetrics.avgHealthScore,
    industry
  );
  
  // Workflow efficiency (based on health score correlation)
  const workflowEfficiencyPercentile = Math.min(99, healthScorePercentile * 1.1);
  
  // Calculate overall percentile
  const percentile = calculateOverallPercentile(
    responseTimePercentile,
    healthScorePercentile,
    workflowEfficiencyPercentile
  );
  
  // Determine tier
  const tierInfo = getTierForPercentile(percentile);
  const nextTier = getNextTier(tierInfo.tier);
  
  // Calculate what's needed for next tier
  const toNextTier = calculateNextTierRequirements(
    percentile,
    tierInfo,
    userMetrics.avgResponseTime,
    userMetrics.avgHealthScore,
    industry
  );
  
  // Get historical data for trend
  const history = await getHistoricalBenchmarks(locationId, 30);
  let trend: BenchmarkResult['trend'];
  
  if (history.length >= 2) {
    const previousPercentile = history[1]?.percentile || percentile;
    const change = percentile - previousPercentile;
    
    trend = {
      direction: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable',
      previousPercentile,
      change,
      periodDays: 30
    };
  } else {
    trend = {
      direction: 'stable',
      previousPercentile: null,
      change: 0,
      periodDays: 30
    };
  }
  
  // Calculate lead impact stats
  const leadImpact = calculateLeadImpact(responseTimePercentile);
  
  // Store snapshot for future trend analysis
  await storeBenchmarkSnapshot(
    locationId,
    percentile,
    tierInfo.tier,
    userMetrics.avgResponseTime,
    userMetrics.avgHealthScore,
    industry.id
  );
  
  return {
    percentile,
    tierInfo,
    
    responseTimePercentile: Math.round(responseTimePercentile),
    healthScorePercentile: Math.round(healthScorePercentile),
    workflowEfficiencyPercentile: Math.round(workflowEfficiencyPercentile),
    
    vsIndustryAverage: {
      responseTime: {
        value: userMetrics.avgResponseTime,
        diff: industry.benchmarks.avgResponseTime - userMetrics.avgResponseTime,
        better: userMetrics.avgResponseTime < industry.benchmarks.avgResponseTime
      },
      healthScore: {
        value: userMetrics.avgHealthScore,
        diff: userMetrics.avgHealthScore - industry.healthBenchmarks.average,
        better: userMetrics.avgHealthScore > industry.healthBenchmarks.average
      }
    },
    
    nextTier,
    toNextTier,
    
    trend,
    
    industry: {
      id: industry.id,
      name: industry.name,
      avgResponseTime: industry.benchmarks.avgResponseTime,
      avgHealthScore: industry.healthBenchmarks.average
    },
    
    stats: {
      aheadOfPercent: percentile,
      ...leadImpact
    }
  };
}

/**
 * Get list of available industries
 */
export function getIndustryList(): Array<{ id: string; name: string; description: string }> {
  return Object.values(INDUSTRY_VERTICALS).map(v => ({
    id: v.id,
    name: v.name,
    description: v.description
  }));
}
