/**
 * Health Check Routes
 * Comprehensive health check endpoint for monitoring
 */

import { Router } from 'express';
import { pool } from '../lib/database';
import { logger } from '../lib/logger';
import { ApiResponse } from '../lib/response';
import { asyncHandler } from '../middleware/error-handler';
import axios from 'axios';

const healthRouter = Router();

interface HealthComponent {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message?: string;
  latencyMs?: number;
  lastSuccess?: string;
  details?: any;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  components: {
    database: HealthComponent;
    ghlApi: HealthComponent;
    responseSync: HealthComponent;
    webhooks: HealthComponent;
    cache: HealthComponent;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<HealthComponent> {
  const start = Date.now();
  try {
    const result = await pool.query('SELECT NOW() as time, pg_is_in_recovery() as is_replica');
    const latency = Date.now() - start;
    
    return {
      status: latency < 1000 ? 'healthy' : 'degraded',
      message: latency < 1000 ? 'Connected' : 'Slow response',
      latencyMs: latency,
      details: {
        serverTime: result.rows[0].time,
        isReplica: result.rows[0].is_replica
      }
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Connection failed: ${(error as Error).message}`,
      latencyMs: Date.now() - start
    };
  }
}

/**
 * Check GHL API reachability
 */
async function checkGHLApi(): Promise<HealthComponent> {
  const start = Date.now();
  try {
    // Try to reach GHL API (use a simple endpoint that doesn't require auth)
    const response = await axios.get('https://services.leadconnectorhq.com/health', {
      timeout: 5000,
      validateStatus: () => true // Accept any status code
    });
    const latency = Date.now() - start;
    
    if (response.status >= 200 && response.status < 500) {
      return {
        status: latency < 2000 ? 'healthy' : 'degraded',
        message: `Reachable (${response.status})`,
        latencyMs: latency
      };
    }
    
    return {
      status: 'degraded',
      message: `Service returned ${response.status}`,
      latencyMs: latency
    };
  } catch (error: any) {
    // If GHL health endpoint doesn't exist, try the main domain
    try {
      const response = await axios.get('https://app.gohighlevel.com/', {
        timeout: 5000,
        maxRedirects: 0,
        validateStatus: () => true
      });
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        message: 'Reachable (fallback check)',
        latencyMs: latency
      };
    } catch (fallbackError) {
      return {
        status: 'unhealthy',
        message: `Unreachable: ${error.message}`,
        latencyMs: Date.now() - start
      };
    }
  }
}

/**
 * Check response sync status
 */
async function checkResponseSync(): Promise<HealthComponent> {
  try {
    // Check the most recent sync activity
    const result = await pool.query(`
      SELECT 
        MAX(updated_at) as last_sync,
        COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '1 hour') as recent_updates
      FROM conversations
    `);
    
    const lastSync = result.rows[0]?.last_sync;
    const recentUpdates = parseInt(result.rows[0]?.recent_updates) || 0;
    
    if (!lastSync) {
      return {
        status: 'unknown',
        message: 'No sync data available'
      };
    }
    
    const lastSyncDate = new Date(lastSync);
    const hoursSince = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < 1) {
      return {
        status: 'healthy',
        message: `Last sync: ${lastSyncDate.toISOString()}`,
        lastSuccess: lastSyncDate.toISOString(),
        details: { recentUpdates }
      };
    } else if (hoursSince < 24) {
      return {
        status: 'degraded',
        message: `Last sync ${Math.round(hoursSince)} hours ago`,
        lastSuccess: lastSyncDate.toISOString(),
        details: { recentUpdates }
      };
    }
    
    return {
      status: 'unhealthy',
      message: `Last sync over 24 hours ago`,
      lastSuccess: lastSyncDate.toISOString(),
      details: { recentUpdates }
    };
  } catch (error) {
    return {
      status: 'unknown',
      message: `Failed to check: ${(error as Error).message}`
    };
  }
}

/**
 * Check webhook status
 */
async function checkWebhooks(): Promise<HealthComponent> {
  try {
    // Check recent webhook activity
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_24h,
        COUNT(*) FILTER (WHERE status = 'processed') as processed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        MAX(processed_at) as last_received
      FROM webhook_logs
      WHERE processed_at > NOW() - INTERVAL '24 hours'
    `);
    
    const stats = result.rows[0];
    const total = parseInt(stats.total_24h) || 0;
    const processed = parseInt(stats.processed) || 0;
    const failed = parseInt(stats.failed) || 0;
    const lastReceived = stats.last_received;
    
    if (total === 0) {
      // Check if table exists but has no recent data
      const tableCheck = await pool.query(`
        SELECT COUNT(*) as total FROM webhook_logs
      `);
      
      if (parseInt(tableCheck.rows[0].total) === 0) {
        return {
          status: 'unknown',
          message: 'No webhooks received yet',
          details: { total24h: 0 }
        };
      }
      
      return {
        status: 'degraded',
        message: 'No webhooks in last 24 hours',
        details: { total24h: 0 }
      };
    }
    
    const failureRate = total > 0 ? (failed / total) * 100 : 0;
    
    if (failureRate < 5) {
      return {
        status: 'healthy',
        message: `${processed}/${total} processed (${failureRate.toFixed(1)}% failure rate)`,
        lastSuccess: lastReceived?.toISOString(),
        details: { total24h: total, processed, failed, failureRate: failureRate.toFixed(1) }
      };
    } else if (failureRate < 20) {
      return {
        status: 'degraded',
        message: `High failure rate: ${failureRate.toFixed(1)}%`,
        lastSuccess: lastReceived?.toISOString(),
        details: { total24h: total, processed, failed, failureRate: failureRate.toFixed(1) }
      };
    }
    
    return {
      status: 'unhealthy',
      message: `Critical failure rate: ${failureRate.toFixed(1)}%`,
      lastSuccess: lastReceived?.toISOString(),
      details: { total24h: total, processed, failed, failureRate: failureRate.toFixed(1) }
    };
  } catch (error: any) {
    // Table might not exist yet
    if (error.message.includes('does not exist')) {
      return {
        status: 'unknown',
        message: 'Webhook logging not initialized'
      };
    }
    return {
      status: 'unknown',
      message: `Failed to check: ${error.message}`
    };
  }
}

/**
 * Check cache status
 */
async function checkCache(): Promise<HealthComponent> {
  try {
    const { cache } = await import('../lib/cache');
    const stats = cache.getStats();
    
    if (stats.type === 'redis') {
      if (stats.connected) {
        return {
          status: 'healthy',
          message: 'Redis connected',
          details: { type: 'redis', size: stats.size }
        };
      }
      return {
        status: 'degraded',
        message: 'Redis disconnected, using in-memory fallback',
        details: { type: 'redis', connected: false }
      };
    }
    
    return {
      status: 'healthy',
      message: 'In-memory cache active',
      details: { type: 'in-memory', size: stats.size }
    };
  } catch (error) {
    return {
      status: 'unknown',
      message: `Failed to check: ${(error as Error).message}`
    };
  }
}

/**
 * Determine overall system status
 */
function determineOverallStatus(components: HealthCheckResponse['components']): 'healthy' | 'degraded' | 'unhealthy' {
  const statuses = Object.values(components).map(c => c.status);
  
  if (statuses.includes('unhealthy')) {
    return 'unhealthy';
  }
  if (statuses.includes('degraded')) {
    return 'degraded';
  }
  if (statuses.every(s => s === 'healthy' || s === 'unknown')) {
    return 'healthy';
  }
  return 'degraded';
}

/**
 * GET /api/health
 * Comprehensive health check endpoint
 */
healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const [database, ghlApi, responseSync, webhooks, cacheStatus] = await Promise.all([
      checkDatabase(),
      checkGHLApi(),
      checkResponseSync(),
      checkWebhooks(),
      checkCache()
    ]);

    const components = {
      database,
      ghlApi,
      responseSync,
      webhooks,
      cache: cacheStatus
    };

    const memUsage = process.memoryUsage();
    
    const health: HealthCheckResponse = {
      status: determineOverallStatus(components),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.round(process.uptime()),
      components,
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
      }
    };

    // Return appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'degraded' ? 200 : 503;

    return ApiResponse.success(res, health, statusCode);
  })
);

/**
 * GET /api/health/simple
 * Simple health check (for load balancers)
 */
healthRouter.get('/simple', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.status(200).json({ status: 'ok' });
  } catch {
    return res.status(503).json({ status: 'error' });
  }
});

/**
 * GET /api/health/database
 * Database-specific health check
 */
healthRouter.get(
  '/database',
  asyncHandler(async (_req, res) => {
    const dbHealth = await checkDatabase();
    
    // Get additional database metrics
    const poolStats = {
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount
    };

    return ApiResponse.success(res, {
      ...dbHealth,
      pool: poolStats
    });
  })
);

/**
 * GET /api/health/sync
 * Response sync status
 */
healthRouter.get(
  '/sync',
  asyncHandler(async (_req, res) => {
    // Get detailed sync information
    const result = await pool.query(`
      SELECT 
        location_id,
        MAX(updated_at) as last_sync,
        COUNT(*) as conversation_count,
        COUNT(*) FILTER (WHERE response_time_seconds IS NOT NULL) as with_response_time
      FROM conversations
      WHERE updated_at > NOW() - INTERVAL '7 days'
      GROUP BY location_id
      ORDER BY last_sync DESC
      LIMIT 10
    `);

    return ApiResponse.success(res, {
      locations: result.rows.map(row => ({
        locationId: row.location_id,
        lastSync: row.last_sync,
        conversationCount: parseInt(row.conversation_count) || 0,
        withResponseTime: parseInt(row.with_response_time) || 0
      }))
    });
  })
);

/**
 * POST /api/health/update
 * Update a health component status (internal use)
 */
healthRouter.post(
  '/update',
  asyncHandler(async (req, res) => {
    const { component, status, details } = req.body;
    
    if (!component || !status) {
      return ApiResponse.badRequest(res, 'Component and status are required');
    }

    await pool.query(`
      INSERT INTO system_health (component, status, details, last_check_at, last_success_at)
      VALUES ($1, $2, $3, NOW(), CASE WHEN $2 = 'healthy' THEN NOW() ELSE NULL END)
      ON CONFLICT (component) DO UPDATE SET
        status = $2,
        details = $3,
        last_check_at = NOW(),
        last_success_at = CASE WHEN $2 = 'healthy' THEN NOW() ELSE system_health.last_success_at END
    `, [component, status, details ? JSON.stringify(details) : null]);

    return ApiResponse.success(res, { updated: true });
  })
);

export default healthRouter;
