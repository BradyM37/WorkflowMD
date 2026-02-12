import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';

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

    // Get all GHL connections for this user
    const connections = await prisma.ghlConnection.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const locations: Location[] = connections.map(conn => ({
      id: conn.locationId,
      name: conn.locationName || conn.locationId,
      companyName: conn.companyName || undefined,
      address: conn.address || undefined,
      connectedAt: conn.createdAt,
    }));

    // Get user's last active location
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastActiveLocationId: true },
    });

    res.json({
      success: true,
      data: {
        locations,
        currentLocationId: user?.lastActiveLocationId || (locations[0]?.id ?? null),
      },
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch locations' },
    });
  }
});

// POST /api/locations/switch - Change active location
router.post('/switch', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { locationId } = req.body;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        error: { message: 'locationId is required' },
      });
    }

    // Verify user has access to this location
    const connection = await prisma.ghlConnection.findFirst({
      where: {
        userId,
        locationId,
      },
    });

    if (!connection) {
      return res.status(403).json({
        success: false,
        error: { message: 'You do not have access to this location' },
      });
    }

    // Update user's last active location
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveLocationId: locationId },
    });

    res.json({
      success: true,
      data: {
        currentLocationId: locationId,
        location: {
          id: connection.locationId,
          name: connection.locationName || connection.locationId,
          companyName: connection.companyName || undefined,
        },
      },
    });
  } catch (error) {
    console.error('Error switching location:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to switch location' },
    });
  }
});

// DELETE /api/locations/:locationId - Disconnect a location
router.delete('/:locationId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { locationId } = req.params;

    // Remove the connection
    const deleted = await prisma.ghlConnection.deleteMany({
      where: {
        userId,
        locationId,
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({
        success: false,
        error: { message: 'Location connection not found' },
      });
    }

    // If this was the active location, switch to another
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastActiveLocationId: true },
    });

    if (user?.lastActiveLocationId === locationId) {
      const nextConnection = await prisma.ghlConnection.findFirst({
        where: { userId },
      });

      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveLocationId: nextConnection?.locationId || null },
      });
    }

    res.json({
      success: true,
      data: { message: 'Location disconnected successfully' },
    });
  } catch (error) {
    console.error('Error disconnecting location:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to disconnect location' },
    });
  }
});

export default router;
