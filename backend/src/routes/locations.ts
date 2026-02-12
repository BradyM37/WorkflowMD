import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { pool } from '../lib/database';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';

const router = Router();

interface Location {
  id: string;
  name: string;
  companyName?: string;
  address?: string;
  connectedAt: Date;
}

// GET /api/locations - List user's connected locations
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Get all GHL connections for this user from oauth_tokens
    const connectionsResult = await pool.query(
      `SELECT location_id, location_name, company_name, address, created_at
       FROM oauth_tokens 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );

    const locations: Location[] = connectionsResult.rows.map(row => ({
      id: row.location_id,
      name: row.location_name || row.location_id,
      companyName: row.company_name || undefined,
      address: row.address || undefined,
      connectedAt: row.created_at,
    }));

    // Get user's last active location
    const userResult = await pool.query(
      `SELECT last_active_location_id FROM users WHERE id = $1`,
      [userId]
    );

    const lastActiveLocationId = userResult.rows[0]?.last_active_location_id;
    const currentLocationId = lastActiveLocationId || (locations[0]?.id ?? null);

    ApiResponse.success(res, {
      locations,
      currentLocationId,
    });
  } catch (error) {
    logger.error('Error fetching locations', {}, error as Error);
    ApiResponse.error(res, 'Failed to fetch locations', 500);
  }
});

// POST /api/locations/switch - Change active location
router.post('/switch', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { locationId } = req.body;

    if (!locationId) {
      return ApiResponse.badRequest(res, 'locationId is required');
    }

    // Verify user has access to this location
    const connectionResult = await pool.query(
      `SELECT location_id, location_name, company_name 
       FROM oauth_tokens 
       WHERE user_id = $1 AND location_id = $2`,
      [userId, locationId]
    );

    if (connectionResult.rows.length === 0) {
      return ApiResponse.forbidden(res, 'You do not have access to this location');
    }

    const connection = connectionResult.rows[0];

    // Update user's last active location
    await pool.query(
      `UPDATE users SET last_active_location_id = $1 WHERE id = $2`,
      [locationId, userId]
    );

    logger.info('User switched location', { userId, locationId });

    ApiResponse.success(res, {
      currentLocationId: locationId,
      location: {
        id: connection.location_id,
        name: connection.location_name || connection.location_id,
        companyName: connection.company_name || undefined,
      },
    });
  } catch (error) {
    logger.error('Error switching location', {}, error as Error);
    ApiResponse.error(res, 'Failed to switch location', 500);
  }
});

// DELETE /api/locations/:locationId - Disconnect a location
router.delete('/:locationId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { locationId } = req.params;

    // Remove the connection
    const deleteResult = await pool.query(
      `DELETE FROM oauth_tokens WHERE user_id = $1 AND location_id = $2`,
      [userId, locationId]
    );

    if (deleteResult.rowCount === 0) {
      return ApiResponse.notFound(res, 'Location connection not found');
    }

    // If this was the active location, switch to another
    const userResult = await pool.query(
      `SELECT last_active_location_id FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows[0]?.last_active_location_id === locationId) {
      // Find another connection
      const nextConnection = await pool.query(
        `SELECT location_id FROM oauth_tokens WHERE user_id = $1 LIMIT 1`,
        [userId]
      );

      await pool.query(
        `UPDATE users SET last_active_location_id = $1 WHERE id = $2`,
        [nextConnection.rows[0]?.location_id || null, userId]
      );
    }

    logger.info('User disconnected location', { userId, locationId });

    ApiResponse.success(res, { message: 'Location disconnected successfully' });
  } catch (error) {
    logger.error('Error disconnecting location', {}, error as Error);
    ApiResponse.error(res, 'Failed to disconnect location', 500);
  }
});

export default router;
