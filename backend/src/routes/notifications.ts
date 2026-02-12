/**
 * Notifications API Routes
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { ApiResponse } from '../lib/response';
import { 
  getNotifications, 
  getUnreadCount, 
  markAsRead, 
  markAllAsRead 
} from '../lib/notifications';

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

/**
 * GET /api/notifications
 * Get notifications for the authenticated location
 */
notificationsRouter.get('/', asyncHandler(async (req, res) => {
  const locationId = req.locationId;
  
  if (!locationId) {
    return ApiResponse.error(res, 'Location not found', 400);
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const unreadOnly = req.query.unreadOnly === 'true';

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(locationId, { limit, unreadOnly }),
    getUnreadCount(locationId)
  ]);

  return ApiResponse.success(res, {
    notifications,
    unreadCount
  });
}));

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read
 */
notificationsRouter.put('/:id/read', asyncHandler(async (req, res) => {
  const locationId = req.locationId;
  const notificationId = req.params.id;
  
  if (!locationId) {
    return ApiResponse.error(res, 'Location not found', 400);
  }

  const success = await markAsRead(locationId, notificationId);
  
  if (!success) {
    return ApiResponse.error(res, 'Notification not found', 404);
  }

  return ApiResponse.success(res, { success: true });
}));

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
notificationsRouter.put('/read-all', asyncHandler(async (req, res) => {
  const locationId = req.locationId;
  
  if (!locationId) {
    return ApiResponse.error(res, 'Location not found', 400);
  }

  const count = await markAllAsRead(locationId);

  return ApiResponse.success(res, { 
    success: true,
    markedCount: count 
  });
}));
