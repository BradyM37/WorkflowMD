/**
 * Plan Gate Middleware
 * Controls access to premium features based on subscription plan
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../lib/database';
import { logger } from '../lib/logger';

export type PlanType = 'free' | 'pro' | 'agency';

// AuthenticatedRequest type is now globally extended via src/types/express.d.ts
export type AuthenticatedRequest = Request;

/**
 * Get plan type from database for a location
 */
async function getPlanType(locationId: string): Promise<PlanType> {
  try {
    const result = await pool.query(
      `SELECT plan_type, subscription_status, subscription_ends_at 
       FROM oauth_tokens 
       WHERE location_id = $1`,
      [locationId]
    );

    if (result.rows.length === 0) {
      return 'free';
    }

    const { plan_type, subscription_status, subscription_ends_at } = result.rows[0];

    // Check if subscription is still valid
    if (subscription_ends_at && new Date(subscription_ends_at) < new Date()) {
      return 'free';
    }

    // Legacy support: map 'pro' subscription_status to plan_type if plan_type not set
    if (!plan_type && subscription_status === 'pro') {
      return 'pro';
    }

    return plan_type || 'free';
  } catch (error) {
    logger.error('Failed to get plan type', { locationId }, error as Error);
    return 'free';
  }
}

/**
 * Middleware to attach plan info to request
 */
export async function attachPlanInfo(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (req.locationId) {
    req.planType = await getPlanType(req.locationId);
  } else {
    req.planType = 'free';
  }
  next();
}

/**
 * Middleware: Require Pro or Agency plan
 * Free users get 403 with upgrade message
 */
export function requirePro(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const planType = req.planType || 'free';

  if (planType === 'pro' || planType === 'agency') {
    return next();
  }

  logger.info('Pro feature blocked for free user', {
    locationId: req.locationId,
    planType,
    path: (req as any).path
  });

  res.status(403).json({
    success: false,
    error: {
      code: 'UPGRADE_REQUIRED',
      message: 'This feature requires a Pro subscription',
      upgrade: {
        currentPlan: planType,
        requiredPlan: 'pro',
        features: [
          'Full workflow history (unlimited)',
          'Export reports (CSV, PDF)',
          'Slack/email alerts',
          'Team analytics',
          'AI-powered insights'
        ],
        upgradeUrl: 'https://marketplace.gohighlevel.com/app/YOUR_APP_ID'
      }
    }
  });
}

/**
 * Middleware: Require Agency plan
 * Free and Pro users get 403 with upgrade message
 */
export function requireAgency(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const planType = req.planType || 'free';

  if (planType === 'agency') {
    return next();
  }

  logger.info('Agency feature blocked', {
    locationId: req.locationId,
    planType,
    path: (req as any).path
  });

  res.status(403).json({
    success: false,
    error: {
      code: 'UPGRADE_REQUIRED',
      message: 'This feature requires an Agency subscription',
      upgrade: {
        currentPlan: planType,
        requiredPlan: 'agency',
        features: [
          'Everything in Pro',
          'White-label branding',
          'Shareable client reports',
          'API access',
          'Multi-location management',
          'Priority support'
        ],
        upgradeUrl: 'https://marketplace.gohighlevel.com/app/YOUR_APP_ID'
      }
    }
  });
}

/**
 * Feature limits by plan
 */
export const PLAN_LIMITS = {
  free: {
    historyDays: 7,
    maxInsights: 3,
    exportEnabled: false,
    alertsEnabled: false,
    teamAnalytics: false,
    aiInsights: false,
    whiteLabelEnabled: false,
    shareableReports: false,
    apiAccess: false
  },
  pro: {
    historyDays: 365,
    maxInsights: 50,
    exportEnabled: true,
    alertsEnabled: true,
    teamAnalytics: true,
    aiInsights: true,
    whiteLabelEnabled: false,
    shareableReports: false,
    apiAccess: false
  },
  agency: {
    historyDays: -1, // Unlimited
    maxInsights: -1, // Unlimited
    exportEnabled: true,
    alertsEnabled: true,
    teamAnalytics: true,
    aiInsights: true,
    whiteLabelEnabled: true,
    shareableReports: true,
    apiAccess: true
  }
} as const;

/**
 * Get limits for a plan
 */
export function getPlanLimits(planType: PlanType) {
  return PLAN_LIMITS[planType] || PLAN_LIMITS.free;
}

/**
 * Check if a specific feature is available for a plan
 */
export function hasFeature(planType: PlanType, feature: keyof typeof PLAN_LIMITS.free): boolean {
  const limits = getPlanLimits(planType);
  const value = limits[feature];
  
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    // -1 means unlimited, positive values are limits
    return value === -1 || value > 0;
  }
  return false;
}
