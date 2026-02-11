/**
 * Response Sync Scheduler
 * Periodically syncs conversations for all active locations
 */

import { pool } from './database';
import { logger } from './logger';
import { syncConversations } from './response-analyzer';

const SYNC_INTERVAL_MS = 60 * 1000; // 1 minute
const MAX_CONCURRENT_SYNCS = 5;

let isRunning = false;
let syncInterval: NodeJS.Timer | null = null;

/**
 * Get locations that need syncing
 * Prioritize locations that haven't synced recently
 */
async function getLocationsToSync(): Promise<string[]> {
  try {
    const result = await pool.query(`
      SELECT ot.location_id 
      FROM oauth_tokens ot
      LEFT JOIN sync_state ss ON ot.location_id = ss.location_id
      WHERE ot.access_token IS NOT NULL
        AND (ss.sync_status IS NULL OR ss.sync_status != 'syncing')
        AND (ss.last_sync_at IS NULL OR ss.last_sync_at < NOW() - INTERVAL '1 minute')
      ORDER BY ss.last_sync_at ASC NULLS FIRST
      LIMIT $1
    `, [MAX_CONCURRENT_SYNCS]);
    
    return result.rows.map(row => row.location_id);
  } catch (error) {
    logger.error('Failed to get locations for sync', {}, error as Error);
    return [];
  }
}

/**
 * Run sync cycle for all pending locations
 */
async function runSyncCycle(): Promise<void> {
  if (isRunning) {
    logger.debug('Sync cycle already running, skipping');
    return;
  }
  
  isRunning = true;
  
  try {
    const locations = await getLocationsToSync();
    
    if (locations.length === 0) {
      logger.debug('No locations need syncing');
      return;
    }
    
    logger.info('Starting scheduled sync cycle', { locationCount: locations.length });
    
    // Sync locations in parallel (up to MAX_CONCURRENT_SYNCS)
    const syncPromises = locations.map(async (locationId) => {
      try {
        await syncConversations(locationId);
        logger.info('Scheduled sync completed', { locationId });
      } catch (error) {
        logger.error('Scheduled sync failed', { locationId }, error as Error);
      }
    });
    
    await Promise.allSettled(syncPromises);
    
    logger.info('Sync cycle completed', { locationCount: locations.length });
  } catch (error) {
    logger.error('Sync cycle error', {}, error as Error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the sync scheduler
 */
export function startSyncScheduler(): void {
  if (syncInterval) {
    logger.warn('Sync scheduler already running');
    return;
  }
  
  logger.info('Starting response sync scheduler', { 
    intervalMinutes: SYNC_INTERVAL_MS / 60000 
  });
  
  // Run first sync after 30 seconds (let server warm up)
  setTimeout(() => {
    runSyncCycle();
  }, 30 * 1000);
  
  // Then run every SYNC_INTERVAL_MS
  syncInterval = setInterval(runSyncCycle, SYNC_INTERVAL_MS);
}

/**
 * Stop the sync scheduler
 */
export function stopSyncScheduler(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    logger.info('Sync scheduler stopped');
  }
}

/**
 * Manually trigger a sync for a specific location
 */
export async function triggerSync(locationId: string): Promise<void> {
  logger.info('Manual sync triggered', { locationId });
  await syncConversations(locationId);
}
