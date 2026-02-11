/**
 * Benchmarks API Routes
 * Industry comparison and competitive position endpoints
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error-handler';
import {
  calculateBenchmarks,
  getHistoricalBenchmarks,
  getIndustryList,
  setUserIndustry,
  INDUSTRY_VERTICALS,
  TIERS
} from '../lib/benchmarks';

export const benchmarksRouter = Router();

// All benchmark routes require authentication
benchmarksRouter.use(requireAuth);

/**
 * GET /api/benchmarks
 * Get comprehensive benchmark data for the authenticated location
 */
benchmarksRouter.get('/', asyncHandler(async (req, res) => {
  const locationId = req.locationId;
  
  if (!locationId) {
    return ApiResponse.error(res, 'GHL account not connected', 400, 'GHL_NOT_CONNECTED');
  }
  
  logger.info('Calculating benchmarks', {
    locationId,
    requestId: req.id
  });
  
  try {
    const benchmarks = await calculateBenchmarks(locationId);
    
    logger.info('Benchmarks calculated', {
      locationId,
      percentile: benchmarks.percentile,
      tier: benchmarks.tierInfo.tier,
      requestId: req.id
    });
    
    return ApiResponse.success(res, benchmarks);
  } catch (error) {
    logger.error('Failed to calculate benchmarks', { locationId }, error as Error);
    return ApiResponse.serverError(res, 'Failed to calculate benchmarks');
  }
}));

/**
 * GET /api/benchmarks/summary
 * Get quick summary for dashboard badge (lightweight)
 */
benchmarksRouter.get('/summary', asyncHandler(async (req, res) => {
  const locationId = req.locationId;
  
  if (!locationId) {
    return ApiResponse.error(res, 'GHL account not connected', 400, 'GHL_NOT_CONNECTED');
  }
  
  try {
    const benchmarks = await calculateBenchmarks(locationId);
    
    // Return just the essential info for the badge
    return ApiResponse.success(res, {
      percentile: benchmarks.percentile,
      tier: benchmarks.tierInfo.tier,
      tierEmoji: benchmarks.tierInfo.emoji,
      tierName: benchmarks.tierInfo.name,
      tierColor: benchmarks.tierInfo.color,
      aheadOfPercent: benchmarks.stats.aheadOfPercent,
      trend: benchmarks.trend.direction
    });
  } catch (error) {
    logger.error('Failed to get benchmark summary', { locationId }, error as Error);
    return ApiResponse.serverError(res, 'Failed to get benchmark summary');
  }
}));

/**
 * GET /api/benchmarks/history
 * Get historical benchmark data for trend charts
 */
benchmarksRouter.get('/history', asyncHandler(async (req, res) => {
  const locationId = req.locationId;
  const days = parseInt(req.query.days as string) || 30;
  
  if (!locationId) {
    return ApiResponse.error(res, 'GHL account not connected', 400, 'GHL_NOT_CONNECTED');
  }
  
  // Cap at 90 days
  const limitedDays = Math.min(days, 90);
  
  try {
    const history = await getHistoricalBenchmarks(locationId, limitedDays);
    
    return ApiResponse.success(res, {
      history,
      periodDays: limitedDays
    });
  } catch (error) {
    logger.error('Failed to get benchmark history', { locationId }, error as Error);
    return ApiResponse.serverError(res, 'Failed to get benchmark history');
  }
}));

/**
 * GET /api/benchmarks/industries
 * Get list of available industry verticals
 */
benchmarksRouter.get('/industries', asyncHandler(async (req, res) => {
  const industries = getIndustryList();
  
  return ApiResponse.success(res, {
    industries,
    count: industries.length
  });
}));

/**
 * GET /api/benchmarks/industry/:id
 * Get detailed benchmarks for a specific industry
 */
benchmarksRouter.get('/industry/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const industry = INDUSTRY_VERTICALS[id];
  
  if (!industry) {
    return ApiResponse.notFound(res, 'Industry');
  }
  
  return ApiResponse.success(res, {
    industry: {
      id: industry.id,
      name: industry.name,
      description: industry.description,
      benchmarks: industry.benchmarks,
      healthBenchmarks: industry.healthBenchmarks
    }
  });
}));

/**
 * PUT /api/benchmarks/industry
 * Set the user's industry for more accurate benchmarking
 */
benchmarksRouter.put('/industry', asyncHandler(async (req, res) => {
  const locationId = req.locationId;
  const { industryId } = req.body;
  
  if (!locationId) {
    return ApiResponse.error(res, 'GHL account not connected', 400, 'GHL_NOT_CONNECTED');
  }
  
  if (!industryId || !INDUSTRY_VERTICALS[industryId]) {
    return ApiResponse.error(
      res,
      'Invalid industry. Use GET /api/benchmarks/industries for valid options.',
      400,
      'INVALID_INDUSTRY'
    );
  }
  
  try {
    await setUserIndustry(locationId, industryId);
    
    logger.info('Industry preference updated', {
      locationId,
      industryId,
      requestId: req.id
    });
    
    // Return fresh benchmarks with new industry
    const benchmarks = await calculateBenchmarks(locationId);
    
    return ApiResponse.success(res, {
      message: 'Industry updated successfully',
      industryId,
      benchmarks
    });
  } catch (error) {
    logger.error('Failed to update industry', { locationId }, error as Error);
    return ApiResponse.serverError(res, 'Failed to update industry');
  }
}));

/**
 * GET /api/benchmarks/tiers
 * Get tier definitions
 */
benchmarksRouter.get('/tiers', asyncHandler(async (req, res) => {
  return ApiResponse.success(res, {
    tiers: TIERS.map(tier => ({
      tier: tier.tier,
      emoji: tier.emoji,
      name: tier.name,
      color: tier.color,
      minPercentile: tier.minPercentile,
      description: tier.description
    }))
  });
}));

/**
 * GET /api/benchmarks/compare
 * Compare user against a specific industry
 */
benchmarksRouter.get('/compare/:industryId', asyncHandler(async (req, res) => {
  const locationId = req.locationId;
  const { industryId } = req.params;
  
  if (!locationId) {
    return ApiResponse.error(res, 'GHL account not connected', 400, 'GHL_NOT_CONNECTED');
  }
  
  const industry = INDUSTRY_VERTICALS[industryId];
  if (!industry) {
    return ApiResponse.notFound(res, 'Industry');
  }
  
  try {
    const benchmarks = await calculateBenchmarks(locationId);
    
    return ApiResponse.success(res, {
      userPercentile: benchmarks.percentile,
      userTier: benchmarks.tierInfo,
      comparison: {
        industry: {
          id: industry.id,
          name: industry.name
        },
        responseTime: {
          user: benchmarks.vsIndustryAverage.responseTime.value,
          industryAvg: industry.benchmarks.avgResponseTime,
          topQuartile: industry.benchmarks.topQuartile,
          top10Percent: industry.benchmarks.top10Percent,
          elite: industry.benchmarks.elite
        },
        healthScore: {
          user: benchmarks.vsIndustryAverage.healthScore.value,
          industryAvg: industry.healthBenchmarks.average,
          topQuartile: industry.healthBenchmarks.topQuartile,
          top10Percent: industry.healthBenchmarks.top10Percent,
          elite: industry.healthBenchmarks.elite
        }
      }
    });
  } catch (error) {
    logger.error('Failed to compare benchmarks', { locationId, industryId }, error as Error);
    return ApiResponse.serverError(res, 'Failed to compare benchmarks');
  }
}));
