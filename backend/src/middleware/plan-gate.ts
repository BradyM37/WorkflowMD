/**
 * Plan Gate Middleware
 * Controls access to premium features based on subscription plan
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../lib/database';
import { logger } from '../lib/logger';

export type PlanType = 'free' | 'starter' | 'pro' | 'agency';

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
export function requireStarter(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const planType = req.planType || 'free';

  if (planType === 'starter' || planType === 'pro' || planType === 'agency') {
    return next();
  }

  logger.info('Starter feature blocked for free user', {
    locationId: req.locationId,
    planType,
    path: (req as any).path
  });

  res.status(403).json({
    success: false,
    error: {
      code: 'UPGRADE_REQUIRED',
      message: 'This feature requires a Starter subscription',
      upgrade: {
        currentPlan: planType,
        requiredPlan: 'starter',
        features: [
          '30 days history',
          '3 locations',
          '10 team members',
          'Unlimited alerts',
          'CSV export'
        ],
        upgradeUrl: 'https://marketplace.gohighlevel.com/app/YOUR_APP_ID'
      }
    }
  });
}

export function requirePro(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const planType = req.planType || 'free';

  if (planType === 'pro' || planType === 'agency') {
    return next();
  }

  logger.info('Pro feature blocked', {
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
          '90 days history',
          '10 locations',
          '25 team members',
          'AI insights',
          'Slack integration',
          'Revenue attribution'
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
          '1 year history',
          '50 locations',
          'Unlimited team members',
          'White-label branding',
          'Full API access'
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
    maxLocations: 1,
    maxTeamMembers: 3,
    alertsPerWeek: 5,
    exportEnabled: false,
    aiInsights: false,
    slackEnabled: false,
    revenueAttribution: false,
    whiteLabelEnabled: false,
    apiAccess: false
  },
  starter: {
    historyDays: 30,
    maxLocations: 3,
    maxTeamMembers: 10,
    alertsPerWeek: -1, // Unlimited
    exportEnabled: true,
    aiInsights: false,
    slackEnabled: false,
    revenueAttribution: false,
    whiteLabelEnabled: false,
    apiAccess: false
  },
  pro: {
    historyDays: 90,
    maxLocations: 10,
    maxTeamMembers: 25,
    alertsPerWeek: -1, // Unlimited
    exportEnabled: true,
    aiInsights: true,
    slackEnabled: true,
    revenueAttribution: true,
    whiteLabelEnabled: false,
    apiAccess: false
  },
  agency: {
    historyDays: 365,
    maxLocations: 50,
    maxTeamMembers: -1, // Unlimited
    alertsPerWeek: -1, // Unlimited
    exportEnabled: true,
    aiInsights: true,
    slackEnabled: true,
    revenueAttribution: true,
    whiteLabelEnabled: true,
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
