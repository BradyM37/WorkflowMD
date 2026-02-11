/**
 * Missed Leads Checker
 * Periodically checks for conversations that haven't been responded to
 * and marks them as missed. Also triggers Slack alerts for waiting leads.
 */

import { pool } from './database';
import { logger } from './logger';
import { checkAndAlertWaitingLeads } from './slack-alerts';

const MISSED_THRESHOLD_SECONDS = 3600; // 1 hour
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

let checkInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Get all active locations that have conversations
 */
async function getActiveLocations(): Promise<string[]> {
  try {
    const result = await pool.query(`
      SELECT DISTINCT location_id 
      FROM oauth_tokens 
      WHERE subscription_status IN ('active', 'trialing', 'free')
    `);
    return result.rows.map(r => r.location_id);
  } catch (error) {
    logger.error('Failed to get active locations', {}, error as Error);
    return [];
  }
}

/**
 * Mark conversations as missed if no response after threshold
 */
async function checkForMissedLeads(): Promise<void> {
  try {
    // First, mark conversations as missed
    const result = await pool.query(`
      UPDATE conversations
      SET is_missed = true, updated_at = NOW()
      WHERE first_inbound_at IS NOT NULL
        AND first_response_at IS NULL
        AND is_missed = false
        AND first_inbound_at < NOW() - INTERVAL '${MISSED_THRESHOLD_SECONDS} seconds'
      RETURNING id, location_id, contact_name
    `);
    
    if (result.rowCount && result.rowCount > 0) {
      logger.info('Marked conversations as missed', { 
        count: result.rowCount,
        conversations: result.rows.slice(0, 5).map(r => ({
          id: r.id,
          locationId: r.location_id,
          contactName: r.contact_name
        }))
      });
    }

    // Then check for Slack alerts across all active locations
    const locations = await getActiveLocations();
    let totalAlertsSent = 0;

    for (const locationId of locations) {
      try {
        const alertsSent = await checkAndAlertWaitingLeads(locationId);
        totalAlertsSent += alertsSent;
      } catch (error) {
        logger.error('Failed to check Slack alerts for location', { locationId }, error as Error);
      }
    }

    if (totalAlertsSent > 0) {
      logger.info('Total Slack alerts sent', { count: totalAlertsSent });
    }

  } catch (error) {
    logger.error('Failed to check for missed leads', {}, error as Error);
  }
}

/**
 * Start the missed leads checker
 */
export function startMissedLeadsChecker(): void {
  if (checkInterval) {
    logger.warn('Missed leads checker already running');
    return;
  }
  
  logger.info('Starting missed leads checker', {
    thresholdMinutes: MISSED_THRESHOLD_SECONDS / 60,
    checkIntervalMinutes: CHECK_INTERVAL_MS / 60000
  });
  
  // Run first check after 1 minute
  setTimeout(checkForMissedLeads, 60 * 1000);
  
  // Then run periodically
  checkInterval = setInterval(checkForMissedLeads, CHECK_INTERVAL_MS);
}

/**
 * Stop the missed leads checker
 */
export function stopMissedLeadsChecker(): void {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
    logger.info('Missed leads checker stopped');
  }
}

/**
 * Get count of currently missed leads for a location
 */
export async function getMissedLeadsCount(locationId: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM conversations WHERE location_id = $1 AND is_missed = true',
    [locationId]
  );
  return parseInt(result.rows[0].count) || 0;
}

/**
 * Manual trigger to check and alert for a specific location
 * Useful for testing or on-demand checks
 */
export async function triggerAlertsForLocation(locationId: string): Promise<{
  missedMarked: number;
  alertsSent: number;
}> {
  // Mark missed leads for this location
  const missedResult = await pool.query(`
    UPDATE conversations
    SET is_missed = true, updated_at = NOW()
    WHERE location_id = $1
      AND first_inbound_at IS NOT NULL
      AND first_response_at IS NULL
      AND is_missed = false
      AND first_inbound_at < NOW() - INTERVAL '${MISSED_THRESHOLD_SECONDS} seconds'
    RETURNING id
  `, [locationId]);

  // Send Slack alerts
  const alertsSent = await checkAndAlertWaitingLeads(locationId);

  return {
    missedMarked: missedResult.rowCount || 0,
    alertsSent
  };
}
