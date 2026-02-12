/**
 * Activity Log API Routes
 * View audit trail for location
 */

import { Router } from 'express';
import { requireAuth, requireGHLConnection } from '../middleware/auth';
import { ApiResponse } from '../lib/response';
import { asyncHandler } from '../middleware/error-handler';
import { logger } from '../lib/logger';
import { getActivityLogs, getActionDisplayName, ActivityAction } from '../lib/activity-log';

const activityRouter = Router();

/**
 * GET /api/activity
 * Get activity logs for the current location
 */
activityRouter.get('/',
  requireAuth,
  requireGHLConnection,
  asyncHandler(async (req, res) => {
    const locationId = req.locationId!;
    
    // Parse query params
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const action = req.query.action as string;
    const userId = req.query.userId as string;
    const entityType = req.query.entityType as string;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const { logs, total } = await getActivityLogs(locationId, {
      limit,
      offset,
      action,
      userId,
      startDate,
      endDate,
      entityType
    });

    // Enrich logs with display names
    const enrichedLogs = logs.map(log => ({
      ...log,
      actionDisplay: getActionDisplayName(log.action)
    }));

    return ApiResponse.success(res, {
      logs: enrichedLogs,
      total,
      limit,
      offset,
      hasMore: offset + logs.length < total
    });
  })
);

/**
 * GET /api/activity/actions
 * Get list of all available action types
 */
activityRouter.get('/actions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const actions = Object.values(ActivityAction).map(action => ({
      value: action,
      label: getActionDisplayName(action)
    }));

    return ApiResponse.success(res, { actions });
  })
);

export default activityRouter;
