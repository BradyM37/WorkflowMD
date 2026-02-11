/**
 * Database Health Monitoring
 * Checks database connectivity and adds retry logic
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../lib/database';
import { logger } from '../lib/logger';
import { ApiResponse } from '../lib/response';

let isDbHealthy = true;
let lastHealthCheck = Date.now();
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Check database connectivity
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    isDbHealthy = true;
    return true;
  } catch (error) {
    logger.error('Database health check failed', {}, error as Error);
    isDbHealthy = false;
    return false;
  }
}

/**
 * Middleware to check database health before processing
 */
export async function ensureDatabaseHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Only check periodically to avoid overhead
  const now = Date.now();
  if (now - lastHealthCheck > HEALTH_CHECK_INTERVAL) {
    lastHealthCheck = now;
    const healthy = await checkDatabaseHealth();
    
    if (!healthy) {
      logger.error('Database is unhealthy, rejecting request', {
        path: req.path,
        method: req.method
      });
      
      return ApiResponse.serviceUnavailable(res, 'Database is temporarily unavailable');
    }
  }
  
  // If we recently checked and it was unhealthy, reject
  if (!isDbHealthy) {
    return ApiResponse.serviceUnavailable(res, 'Database is temporarily unavailable');
  }
  
  next();
}

/**
 * Retry wrapper for database queries
 */
export async function retryQuery<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (error?.message?.includes('syntax error') || error?.message?.includes('does not exist')) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        logger.warn(`Database query failed, retrying (${attempt}/${maxRetries})`, {
          attempt,
          error: error?.message
        });
        
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  
  if (lastError) {
    logger.error('Database query failed after retries', {
      maxRetries
    }, lastError);
    
    throw lastError;
  }
  
  throw new Error('Query failed without error');
}

/**
 * Initialize database health monitoring
 */
export function initDatabaseHealthMonitoring(): void {
  // Initial health check
  checkDatabaseHealth().then(healthy => {
    if (healthy) {
      logger.info('Database connection healthy');
    } else {
      logger.error('Database connection failed on startup');
    }
  });
  
  // Periodic health checks
  setInterval(async () => {
    const healthy = await checkDatabaseHealth();
    if (!healthy) {
      logger.error('Periodic database health check failed');
    }
  }, HEALTH_CHECK_INTERVAL);
  
  // Monitor pool errors
  pool.on('error', (err) => {
    logger.error('Unexpected database pool error', {}, err);
    isDbHealthy = false;
  });
  
  // Monitor pool connections
  pool.on('connect', () => {
    logger.debug('New database connection established');
  });
  
  pool.on('remove', () => {
    logger.debug('Database connection removed from pool');
  });
}
