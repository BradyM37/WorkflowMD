/**
 * Tiered Rate Limiting Middleware
 * Different limits based on subscription tier
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';
import { rateLimitExceeded } from '../lib/metrics';

/**
 * Rate limit tiers configuration
 */
export const RateLimitTiers = {
  free: {
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: 'Free tier rate limit exceeded. Upgrade to Pro for higher limits.'
  },
  pro: {
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Rate limit exceeded. Please slow down.'
  },
  enterprise: {
    windowMs: 60 * 1000, // 1 minute
    max: 500, // 500 requests per minute
    message: 'Rate limit exceeded. Please slow down.'
  }
};

/**
 * Get subscription tier from request
 */
function getSubscriptionTier(req: Request): 'free' | 'pro' | 'enterprise' {
  // subscriptionStatus is set by auth middleware
  const status = req.subscriptionStatus;
  
  if (status === 'pro' || status === 'active') {
    return 'pro';
  } else if (status === 'enterprise') {
    return 'enterprise';
  }
  
  return 'free';
}

/**
 * Generate rate limit key based on location ID and endpoint
 */
function generateKey(req: Request): string {
  const locationId = req.locationId || req.ip || 'anonymous';
  const tier = getSubscriptionTier(req);
  const route = req.route?.path || req.path;
  
  return `ratelimit:${tier}:${locationId}:${route}`;
}

/**
 * Tiered rate limiter factory
 */
export function createTieredRateLimiter(): RateLimitRequestHandler {
  return rateLimit({
    windowMs: 60 * 1000, // Base window: 1 minute
    
    // Dynamic max based on subscription tier
    max: (req: Request) => {
      const tier = getSubscriptionTier(req);
      return RateLimitTiers[tier].max;
    },
    
    // Use location ID + tier for key
    keyGenerator: generateKey,
    
    // Custom handler for rate limit exceeded
    handler: (req: Request, res: Response) => {
      const tier = getSubscriptionTier(req);
      const config = RateLimitTiers[tier];
      const retryAfter = Math.ceil(config.windowMs / 1000);
      
      logger.warn('Rate limit exceeded', {
        tier,
        locationId: req.locationId,
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      // Record metric
      rateLimitExceeded.labels(req.path, tier).inc();
      
      // Send response with upgrade hint for free users
      if (tier === 'free') {
        return ApiResponse.error(
          res,
          config.message,
          429,
          'RATE_LIMIT_EXCEEDED',
          {
            retryAfter,
            currentTier: tier,
            upgradeUrl: '/api/subscription/checkout',
            limits: {
              current: config.max,
              pro: RateLimitTiers.pro.max
            }
          }
        );
      }
      
      return ApiResponse.tooManyRequests(res, retryAfter);
    },
    
    standardHeaders: true,
    legacyHeaders: false,
    
    // Skip successful requests for certain endpoints
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    
    // Store in-memory (could be extended to use Redis)
    store: undefined // Uses default MemoryStore
  });
}

/**
 * Analysis-specific rate limiter (more restrictive)
 * Free: 10/hour, Pro: 100/hour, Enterprise: 1000/hour
 */
export function createAnalysisRateLimiter(): RateLimitRequestHandler {
  const hourlyLimits = {
    free: 10,
    pro: 100,
    enterprise: 1000
  };
  
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    
    max: (req: Request) => {
      const tier = getSubscriptionTier(req);
      return hourlyLimits[tier];
    },
    
    keyGenerator: (req: Request) => {
      const locationId = req.locationId || req.ip || 'anonymous';
      const tier = getSubscriptionTier(req);
      return `analysis:${tier}:${locationId}`;
    },
    
    handler: (req: Request, res: Response) => {
      const tier = getSubscriptionTier(req);
      const limit = hourlyLimits[tier];
      
      logger.warn('Analysis rate limit exceeded', {
        tier,
        locationId: req.locationId,
        hourlyLimit: limit
      });
      
      rateLimitExceeded.labels('/api/analyze', tier).inc();
      
      if (tier === 'free') {
        return ApiResponse.error(
          res,
          `Analysis limit reached. Free tier allows ${limit} analyses per hour. Upgrade to Pro for ${hourlyLimits.pro} analyses/hour.`,
          429,
          'ANALYSIS_LIMIT_EXCEEDED',
          {
            retryAfter: 3600,
            currentTier: tier,
            hourlyLimit: limit,
            upgradeUrl: '/api/subscription/checkout',
            proLimit: hourlyLimits.pro
          }
        );
      }
      
      return ApiResponse.error(
        res,
        `Analysis rate limit exceeded. Please try again in an hour.`,
        429,
        'ANALYSIS_LIMIT_EXCEEDED',
        {
          retryAfter: 3600,
          hourlyLimit: limit
        }
      );
    },
    
    standardHeaders: true,
    legacyHeaders: false
  });
}

/**
 * Webhook rate limiter (by IP, more permissive)
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  keyGenerator: (req: Request) => req.ip || 'unknown',
  handler: (req: Request, res: Response) => {
    logger.warn('Webhook rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    
    return ApiResponse.tooManyRequests(res, 60);
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Auth rate limiter (strict)
 * Prevents brute force attacks
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req: Request) => req.ip || 'unknown',
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    
    return ApiResponse.error(
      res,
      'Too many authentication attempts. Please try again in 15 minutes.',
      429,
      'AUTH_RATE_LIMIT_EXCEEDED',
      { retryAfter: 900 }
    );
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Get rate limit info for a request (useful for headers)
 */
export function getRateLimitInfo(req: Request): {
  tier: string;
  limit: number;
  window: number;
} {
  const tier = getSubscriptionTier(req);
  const config = RateLimitTiers[tier];
  
  return {
    tier,
    limit: config.max,
    window: config.windowMs
  };
}

/**
 * Middleware to add rate limit info to response headers
 */
export function rateLimitHeaders(req: Request, res: Response, next: NextFunction): void {
  const info = getRateLimitInfo(req);
  
  res.setHeader('X-RateLimit-Tier', info.tier);
  res.setHeader('X-RateLimit-Limit', info.limit.toString());
  res.setHeader('X-RateLimit-Window', (info.window / 1000).toString());
  
  next();
}
