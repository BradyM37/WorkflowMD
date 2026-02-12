/**
 * Gamification Badges System
 * Check and award badges after each sync
 */

import { pool } from './database';
import { logger } from './logger';
import { notifyBadgeEarned } from './notifications';

export const BADGE_TYPES = {
  SPEED_DEMON: 'speed_demon',      // Response in <1 minute
  PERFECT_DAY: 'perfect_day',      // 100% response rate for a day
  EARLY_BIRD: 'early_bird',        // First response before 8am
  NIGHT_OWL: 'night_owl',          // Responded after 9pm
  STREAK_3: 'streak_3',            // 3 consecutive perfect days
  STREAK_7: 'streak_7',            // 7 consecutive perfect days
} as const;

export type BadgeType = typeof BADGE_TYPES[keyof typeof BADGE_TYPES];

export interface Badge {
  id: string;
  userId: string;
  userName: string;
  badgeType: BadgeType;
  earnedAt: Date;
  metadata?: Record<string, any>;
}

export const BADGE_INFO: Record<BadgeType, { icon: string; label: string; description: string }> = {
  speed_demon: { icon: '⚡', label: 'Speed Demon', description: 'Responded in under 1 minute' },
  perfect_day: { icon: '💯', label: 'Perfect Day', description: '100% response rate for the day' },
  early_bird: { icon: '🌅', label: 'Early Bird', description: 'First response before 8am' },
  night_owl: { icon: '🦉', label: 'Night Owl', description: 'Responded after 9pm' },
  streak_3: { icon: '🔥', label: '3-Day Streak', description: '3 consecutive perfect days' },
  streak_7: { icon: '🏆', label: '7-Day Streak', description: '7 consecutive perfect days' },
};

/**
 * Check and award all badges after a sync
 */
export async function checkAndAwardBadges(locationId: string): Promise<Badge[]> {
  const awarded: Badge[] = [];
  const today = new Date().toISOString().split('T')[0];

  try {
    // Get today's conversations with response data
    const convResult = await pool.query(`
      SELECT 
        assigned_user_id as user_id,
        assigned_user_name as user_name,
        response_time_seconds,
        first_response_at,
        is_missed
      FROM conversations
      WHERE location_id = $1 
        AND first_inbound_at::DATE = $2::DATE
        AND assigned_user_id IS NOT NULL
    `, [locationId, today]);

    const conversations = convResult.rows;
    if (conversations.length === 0) return awarded;

    // Group by user
    const userConvs = new Map<string, typeof conversations>();
    for (const conv of conversations) {
      if (!userConvs.has(conv.user_id)) {
        userConvs.set(conv.user_id, []);
      }
      userConvs.get(conv.user_id)!.push(conv);
    }

    // Check badges for each user
    for (const [userId, convs] of userConvs) {
      const userName = convs[0]?.user_name || 'Unknown';

      // Speed Demon: any response < 60 seconds
      const speedDemons = convs.filter(c => c.response_time_seconds && c.response_time_seconds < 60);
      for (const conv of speedDemons) {
        const badge = await awardBadge(locationId, userId, userName, BADGE_TYPES.SPEED_DEMON, {
          responseTime: conv.response_time_seconds
        });
        if (badge) awarded.push(badge);
      }

      // Early Bird: response before 8am
      const earlyBirds = convs.filter(c => {
        if (!c.first_response_at) return false;
        const hour = new Date(c.first_response_at).getHours();
        return hour < 8;
      });
      if (earlyBirds.length > 0) {
        const badge = await awardBadge(locationId, userId, userName, BADGE_TYPES.EARLY_BIRD);
        if (badge) awarded.push(badge);
      }

      // Night Owl: response after 9pm
      const nightOwls = convs.filter(c => {
        if (!c.first_response_at) return false;
        const hour = new Date(c.first_response_at).getHours();
        return hour >= 21;
      });
      if (nightOwls.length > 0) {
        const badge = await awardBadge(locationId, userId, userName, BADGE_TYPES.NIGHT_OWL);
        if (badge) awarded.push(badge);
      }

      // Perfect Day: 100% response rate (no missed)
      const missedCount = convs.filter(c => c.is_missed).length;
      const respondedCount = convs.filter(c => c.response_time_seconds != null).length;
      if (missedCount === 0 && respondedCount === convs.length && convs.length > 0) {
        const badge = await awardBadge(locationId, userId, userName, BADGE_TYPES.PERFECT_DAY, {
          conversationsHandled: convs.length
        });
        if (badge) {
          awarded.push(badge);
          // Update streak
          await updateStreak(locationId, userId, true);
        }
      } else {
        // Reset streak on non-perfect day
        await updateStreak(locationId, userId, false);
      }
    }

    // Check streaks for all users
    const streakBadges = await checkStreakBadges(locationId);
    awarded.push(...streakBadges);

    if (awarded.length > 0) {
      logger.info('Badges awarded', { locationId, count: awarded.length, types: awarded.map(b => b.badgeType) });
    }

    return awarded;
  } catch (error) {
    logger.error('Error checking badges', { locationId }, error as Error);
    return awarded;
  }
}

/**
 * Award a badge (prevents duplicates on same day)
 */
async function awardBadge(
  locationId: string,
  userId: string,
  userName: string,
  badgeType: BadgeType,
  metadata: Record<string, any> = {}
): Promise<Badge | null> {
  try {
    const result = await pool.query(`
      INSERT INTO badges (location_id, user_id, user_name, badge_type, metadata)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (location_id, user_id, badge_type, (earned_at::DATE)) DO NOTHING
      RETURNING id, user_id, user_name, badge_type, earned_at, metadata
    `, [locationId, userId, userName, badgeType, JSON.stringify(metadata)]);

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    
    // Create in-app notification for badge earned
    const badgeInfo = BADGE_INFO[badgeType];
    if (badgeInfo) {
      await notifyBadgeEarned(
        locationId,
        userId,
        userName,
        badgeType,
        badgeInfo.label,
        badgeInfo.icon
      );
    }
    
    return {
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      badgeType: row.badge_type,
      earnedAt: row.earned_at,
      metadata: row.metadata
    };
  } catch (error) {
    // Ignore duplicate errors
    return null;
  }
}

/**
 * Update user streak tracking
 */
async function updateStreak(locationId: string, userId: string, isPerfect: boolean): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  await pool.query(`
    INSERT INTO user_streaks (location_id, user_id, current_streak, longest_streak, last_perfect_date)
    VALUES ($1, $2, $3, $3, $4)
    ON CONFLICT (location_id, user_id) DO UPDATE SET
      current_streak = CASE
        WHEN $5 = false THEN 0
        WHEN user_streaks.last_perfect_date = $6::DATE THEN user_streaks.current_streak + 1
        WHEN user_streaks.last_perfect_date = $4::DATE THEN user_streaks.current_streak
        ELSE 1
      END,
      longest_streak = GREATEST(
        user_streaks.longest_streak,
        CASE WHEN $5 THEN user_streaks.current_streak + 1 ELSE user_streaks.current_streak END
      ),
      last_perfect_date = CASE WHEN $5 THEN $4::DATE ELSE user_streaks.last_perfect_date END,
      updated_at = NOW()
  `, [locationId, userId, isPerfect ? 1 : 0, today, isPerfect, yesterday]);
}

/**
 * Check and award streak badges
 */
async function checkStreakBadges(locationId: string): Promise<Badge[]> {
  const awarded: Badge[] = [];

  const result = await pool.query(`
    SELECT user_id, current_streak
    FROM user_streaks
    WHERE location_id = $1 AND current_streak >= 3
  `, [locationId]);

  for (const row of result.rows) {
    // 3-day streak
    if (row.current_streak >= 3) {
      const badge = await awardBadge(locationId, row.user_id, '', BADGE_TYPES.STREAK_3, {
        streak: row.current_streak
      });
      if (badge) awarded.push(badge);
    }

    // 7-day streak
    if (row.current_streak >= 7) {
      const badge = await awardBadge(locationId, row.user_id, '', BADGE_TYPES.STREAK_7, {
        streak: row.current_streak
      });
      if (badge) awarded.push(badge);
    }
  }

  return awarded;
}

/**
 * Get badges for a user
 */
export async function getUserBadges(locationId: string, userId: string): Promise<Badge[]> {
  const result = await pool.query(`
    SELECT id, user_id, user_name, badge_type, earned_at, metadata
    FROM badges
    WHERE location_id = $1 AND user_id = $2
    ORDER BY earned_at DESC
  `, [locationId, userId]);

  return result.rows.map(row => ({
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    badgeType: row.badge_type,
    earnedAt: row.earned_at,
    metadata: row.metadata
  }));
}

/**
 * Get recent badges for all users (for leaderboard display)
 */
export async function getRecentBadgesByUser(locationId: string, days: number = 30): Promise<Map<string, Badge[]>> {
  const result = await pool.query(`
    SELECT DISTINCT ON (user_id, badge_type) 
      id, user_id, user_name, badge_type, earned_at, metadata
    FROM badges
    WHERE location_id = $1 AND earned_at >= NOW() - $2::INTEGER * INTERVAL '1 day'
    ORDER BY user_id, badge_type, earned_at DESC
  `, [locationId, days]);

  const badgesByUser = new Map<string, Badge[]>();
  for (const row of result.rows) {
    const badges = badgesByUser.get(row.user_id) || [];
    badges.push({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name,
      badgeType: row.badge_type,
      earnedAt: row.earned_at,
      metadata: row.metadata
    });
    badgesByUser.set(row.user_id, badges);
  }

  return badgesByUser;
}

/**
 * Get badge counts for leaderboard
 */
export async function getBadgeCounts(locationId: string, userIds: string[]): Promise<Map<string, { type: BadgeType; count: number }[]>> {
  if (userIds.length === 0) return new Map();

  const result = await pool.query(`
    SELECT user_id, badge_type, COUNT(*) as count
    FROM badges
    WHERE location_id = $1 AND user_id = ANY($2)
    GROUP BY user_id, badge_type
  `, [locationId, userIds]);

  const counts = new Map<string, { type: BadgeType; count: number }[]>();
  for (const row of result.rows) {
    const userCounts = counts.get(row.user_id) || [];
    userCounts.push({ type: row.badge_type, count: parseInt(row.count) });
    counts.set(row.user_id, userCounts);
  }

  return counts;
}
