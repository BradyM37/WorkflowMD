/**
 * GHL Custom Menu Link SSO Handler
 * When users click our app in the GHL sidebar, they're sent here with an ssoKey
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { pool } from '../lib/database';
import { logger } from '../lib/logger';
import { generateJWT, generateRefreshToken } from '../lib/user-auth';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = Router();

// GHL SSO endpoint
const GHL_SSO_ENDPOINT = 'https://services.leadconnectorhq.com/oauth/sso/session';

// Environment variables
const GHL_CLIENT_ID = process.env.GHL_CLIENT_ID;
const GHL_CLIENT_SECRET = process.env.GHL_CLIENT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

/**
 * GHL SSO Interface
 */
interface GHLSSOResponse {
  locationId: string;
  companyId: string;
  userId: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * GET /sso
 * Handle GHL custom menu link click
 * 
 * Flow:
 * 1. Receive ssoKey from GHL
 * 2. Exchange ssoKey for user info via GHL API
 * 3. Get/create user in our database
 * 4. Generate JWT session
 * 5. Redirect to dashboard with session cookie
 */
router.get('/sso', async (req: Request, res: Response) => {
  try {
    const { ssoKey } = req.query;

    // Validate ssoKey exists
    if (!ssoKey || typeof ssoKey !== 'string') {
      logger.warn('GHL SSO: Missing ssoKey parameter');
      return res.redirect(`${FRONTEND_URL}/error?message=Invalid SSO request`);
    }

    // Validate GHL credentials are configured
    if (!GHL_CLIENT_ID || !GHL_CLIENT_SECRET) {
      logger.error('GHL SSO: Client credentials not configured');
      return res.redirect(`${FRONTEND_URL}/error?message=SSO not configured`);
    }

    logger.info('GHL SSO: Received ssoKey', { ssoKey: ssoKey.substring(0, 10) + '...' });

    // Step 1: Exchange ssoKey for user info via GHL API
    let ghlUserInfo: GHLSSOResponse;
    
    try {
      const response = await axios.post(
        GHL_SSO_ENDPOINT,
        { ssoKey },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          auth: {
            username: GHL_CLIENT_ID,
            password: GHL_CLIENT_SECRET
          },
          timeout: 10000 // 10 second timeout
        }
      );

      ghlUserInfo = response.data;
      
      logger.info('GHL SSO: Successfully exchanged ssoKey', {
        locationId: ghlUserInfo.locationId,
        userId: ghlUserInfo.userId,
        email: ghlUserInfo.email
      });
    } catch (error: any) {
      logger.error('GHL SSO: Failed to exchange ssoKey', {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      return res.redirect(`${FRONTEND_URL}/error?message=Authentication failed`);
    }

    // Step 2: Get or create user in our database
    const user = await getOrCreateUserFromGHL(ghlUserInfo);

    // Step 3: Update/store GHL location mapping
    await updateGHLLocationMapping(user.id, ghlUserInfo);

    // Step 4: Generate JWT session tokens
    const accessToken = generateJWT(user);
    const refreshToken = generateRefreshToken(user);

    // Step 5: Store session
    await createSession(user.id, accessToken, req.ip, req.get('user-agent'));

    // Step 6: Set cookies and redirect to dashboard
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    res.cookie('token', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    logger.info('GHL SSO: User logged in successfully', {
      userId: user.id,
      email: user.email,
      locationId: ghlUserInfo.locationId
    });

    // Redirect to dashboard
    res.redirect(`${FRONTEND_URL}/dashboard?sso=success`);

  } catch (error: any) {
    logger.error('GHL SSO: Unexpected error', error);
    res.redirect(`${FRONTEND_URL}/error?message=Something went wrong`);
  }
});

/**
 * Get or create user from GHL SSO info
 */
async function getOrCreateUserFromGHL(ghlUserInfo: GHLSSOResponse): Promise<any> {
  try {
    // Try to find existing user by GHL user ID
    let result = await pool.query(
      `SELECT u.* FROM users u
       LEFT JOIN oauth_tokens ot ON ot.user_id = u.id
       WHERE ot.ghl_user_id = $1
       LIMIT 1`,
      [ghlUserInfo.userId]
    );

    if (result.rows.length > 0) {
      // User exists, update last login
      await pool.query(
        'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
        [result.rows[0].id]
      );

      logger.info('GHL SSO: Existing user found', {
        userId: result.rows[0].id,
        email: result.rows[0].email
      });

      return result.rows[0];
    }

    // Try to find by email
    result = await pool.query(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [ghlUserInfo.email.toLowerCase()]
    );

    if (result.rows.length > 0) {
      // User exists with same email, update and link GHL account
      const userId = result.rows[0].id;
      
      await pool.query(
        'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
        [userId]
      );

      // Link GHL user ID if we have oauth_tokens
      await pool.query(
        `INSERT INTO oauth_tokens (user_id, ghl_user_id, location_id, company_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
         SET ghl_user_id = $2, location_id = $3, company_id = $4, updated_at = NOW()`,
        [userId, ghlUserInfo.userId, ghlUserInfo.locationId, ghlUserInfo.companyId]
      );

      logger.info('GHL SSO: Linked GHL account to existing user', {
        userId,
        email: ghlUserInfo.email
      });

      return result.rows[0];
    }

    // Create new user
    const userId = uuidv4();
    const userName = ghlUserInfo.name || 
                     (ghlUserInfo.firstName && ghlUserInfo.lastName 
                       ? `${ghlUserInfo.firstName} ${ghlUserInfo.lastName}` 
                       : null);

    result = await pool.query(
      `INSERT INTO users (id, email, name, email_verified, last_login_at)
       VALUES ($1, $2, $3, true, NOW())
       RETURNING *`,
      [userId, ghlUserInfo.email.toLowerCase(), userName]
    );

    const newUser = result.rows[0];

    // Store GHL account info in oauth_tokens
    await pool.query(
      `INSERT INTO oauth_tokens (user_id, ghl_user_id, location_id, company_id)
       VALUES ($1, $2, $3, $4)`,
      [userId, ghlUserInfo.userId, ghlUserInfo.locationId, ghlUserInfo.companyId]
    );

    logger.info('GHL SSO: Created new user from GHL', {
      userId,
      email: ghlUserInfo.email,
      locationId: ghlUserInfo.locationId
    });

    return newUser;

  } catch (error) {
    logger.error('GHL SSO: Failed to get/create user', error as Error);
    throw error;
  }
}

/**
 * Update GHL location mapping
 */
async function updateGHLLocationMapping(
  userId: string,
  ghlUserInfo: GHLSSOResponse
): Promise<void> {
  try {
    // Update oauth_tokens with latest GHL info
    await pool.query(
      `UPDATE oauth_tokens 
       SET location_id = $1, 
           company_id = $2, 
           ghl_user_id = $3,
           last_login_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $4`,
      [ghlUserInfo.locationId, ghlUserInfo.companyId, ghlUserInfo.userId, userId]
    );

    logger.info('GHL SSO: Updated location mapping', {
      userId,
      locationId: ghlUserInfo.locationId,
      companyId: ghlUserInfo.companyId
    });
  } catch (error) {
    logger.error('GHL SSO: Failed to update location mapping', error as Error);
    // Don't throw - this is not critical for SSO flow
  }
}

/**
 * Create session record
 */
async function createSession(
  userId: string,
  token: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const sessionId = uuidv4();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(
      `INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (token_hash) DO UPDATE
       SET last_used_at = NOW()`,
      [sessionId, userId, tokenHash, ipAddress || null, userAgent || null, expiresAt]
    );

    logger.info('GHL SSO: Session created', { userId, sessionId });
  } catch (error) {
    logger.error('GHL SSO: Session creation failed', { userId }, error as Error);
    // Don't throw - session creation failure shouldn't prevent SSO
  }
}

export default router;
