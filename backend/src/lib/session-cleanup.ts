/**
 * Session Cleanup Service
 * Runs periodically to clean up expired sessions
 */

import cron from 'node-cron';
import { cleanupExpiredSessions } from './user-auth';
import { logger } from './logger';

/**
 * Schedule session cleanup job
 * Runs every 6 hours
 */
export function scheduleSessionCleanup() {
  // Run every 6 hours at minute 0
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Running scheduled session cleanup');
    
    try {
      await cleanupExpiredSessions();
      logger.info('Session cleanup completed successfully');
    } catch (error) {
      logger.error('Session cleanup failed', {}, error as Error);
    }
  });

  logger.info('Session cleanup job scheduled (runs every 6 hours)');
}

/**
 * Run cleanup immediately (for testing or manual trigger)
 */
export async function runCleanupNow() {
  logger.info('Running manual session cleanup');
  await cleanupExpiredSessions();
}
