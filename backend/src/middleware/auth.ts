/**
 * Authentication Middleware - Enhanced with JWT Support
 * Supports both JWT-based user auth and legacy GHL OAuth cookie auth
 */

import { Request, Response, NextFunction } from 'express';
import { pool } from '../lib/database';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';
import { retryQuery } from './database-health';
import { verifyJWT, validateSession } from '../lib/user-auth';

/**
 * Extract JWT token from Authorization header or cookie
 */
function extractToken(req: Request): string | null {
  // Check Authorization header first (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie as fallback
  return req.cookies.auth_token || null;
}

/**
 * Require JWT authentication middleware
 * User must be logged in with email/password
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);
    
    if (!token) {
      logger.warn('Authentication required - no token provided', {
        path: req.path,
        ip: req.ip
      });
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    // Verify JWT token
    let payload;
    try {
      payload = verifyJWT(token);
    } catch (error) {
      logger.warn('Invalid JWT token', {
        path: req.path,
        error: (error as Error).message
      });
      return ApiResponse.unauthorized(res, 'Invalid or expired token');
    }

    // Validate session exists in database
    const sessionValid = await validateSession(payload.userId, token);
    if (!sessionValid) {
      logger.warn('Session not found or expired', {
        userId: payload.userId,
        path: req.path
      });
      return ApiResponse.unauthorized(res, 'Session expired. Please login again.');
    }

    // Get user details from database
    const result = await retryQuery(
      () => pool.query(
        'SELECT id, email, name, company_name, email_verified FROM users WHERE id = $1',
        [payload.userId]
      ),
      2,
      500
    );

    if (result.rows.length === 0) {
      logger.error('User not found for valid token', {
        userId: payload.userId,
        path: req.path
      });
      return ApiResponse.unauthorized(res, 'User not found');
    }

    // Attach user context to request
    req.userId = payload.userId;
    req.userEmail = payload.email;
    req.user = result.rows[0];
    
    next();
  } catch (error) {
    logger.error('Authentication error', {
      path: req.path
    }, error as Error);
    
    return ApiResponse.serverError(res, 'Authentication check failed');
  }
}

/**
 * Require GHL connection - User must have linked their GHL account
 */
export async function requireGHLConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // First check if user is authenticated
    if (!req.userId) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    // Check if user has connected their GHL account
    const result = await retryQuery(
      () => pool.query(
        'SELECT location_id, subscription_status FROM oauth_tokens WHERE user_id = $1',
        [req.userId]
      ),
      2,
      500
    );

    if (result.rows.length === 0) {
      logger.warn('GHL connection required', {
        userId: req.userId,
        path: req.path
      });
      
      return ApiResponse.error(
        res,
        'Please connect your GoHighLevel account first',
        403,
        'GHL_CONNECTION_REQUIRED',
        { connectUrl: '/api/ghl/connect' }
      );
    }

    // Attach GHL context to request
    req.locationId = result.rows[0].location_id;
    req.subscriptionStatus = result.rows[0].subscription_status || 'free';
    
    next();
  } catch (error) {
    logger.error('GHL connection check error', {
      path: req.path
    }, error as Error);
    
    return ApiResponse.serverError(res, 'Connection check failed');
  }
}

/**
 * Require Pro subscription middleware
 */
export async function requirePro(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // First ensure user is authenticated and has GHL connected
    if (!req.userId || !req.locationId) {
      return ApiResponse.unauthorized(res);
    }

    const result = await retryQuery(
      () => pool.query(
        'SELECT subscription_status, plan_type FROM oauth_tokens WHERE user_id = $1 AND location_id = $2',
        [req.userId, req.locationId]
      ),
      2,
      500
    );

    if (result.rows.length === 0) {
      return ApiResponse.unauthorized(res, 'Invalid session');
    }

    const { subscription_status, plan_type } = result.rows[0];
    const isPro = subscription_status === 'pro' || plan_type === 'pro' || plan_type === 'enterprise';
    
    if (!isPro) {
      logger.warn('Pro subscription required', {
        userId: req.userId,
        locationId: req.locationId,
        currentStatus: subscription_status,
        currentPlan: plan_type,
        path: req.path
      });
      
      return ApiResponse.error(
        res,
        'Pro subscription required to access this feature',
        403,
        'SUBSCRIPTION_REQUIRED',
        { upgradeUrl: '/api/subscription/checkout' }
      );
    }

    req.subscriptionStatus = subscription_status;
    req.planType = plan_type;
    
    next();
  } catch (error) {
    logger.error('Subscription check error', {
      path: req.path
    }, error as Error);
    
    return ApiResponse.serverError(res, 'Subscription verification failed');
  }
}

/**
 * Optional auth - attach user if token is present but don't require it
 */
export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = extractToken(req);
  
  if (token) {
    try {
      const payload = verifyJWT(token);
      
      // Validate session
      const sessionValid = await validateSession(payload.userId, token);
      if (sessionValid) {
        const result = await pool.query(
          'SELECT id, email, name, company_name, email_verified FROM users WHERE id = $1',
          [payload.userId]
        );
        
        if (result.rows.length > 0) {
          req.userId = payload.userId;
          req.userEmail = payload.email;
          req.user = result.rows[0];
          
          // Try to get GHL connection if exists
          const ghlResult = await pool.query(
            'SELECT location_id, subscription_status, plan_type FROM oauth_tokens WHERE user_id = $1',
            [payload.userId]
          );
          
          if (ghlResult.rows.length > 0) {
            req.locationId = ghlResult.rows[0].location_id;
            req.subscriptionStatus = ghlResult.rows[0].subscription_status || 'free';
            req.planType = ghlResult.rows[0].plan_type || 'free';
          }
        }
      }
    } catch (error) {
      logger.debug('Optional auth check failed (non-critical)', {
        error: (error as Error).message
      });
      // Continue anyway since auth is optional
    }
  }
  
  next();
}

/**
 * Legacy: Location ID cookie auth (for backwards compatibility)
 * This supports the old auth flow before user accounts
 */
export async function legacyLocationAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const locationId = req.cookies.location_id;
    
    if (!locationId) {
      logger.warn('Legacy auth - no location_id cookie', {
        path: req.path,
        ip: req.ip
      });
      return ApiResponse.unauthorized(res);
    }

    // Verify location exists in database
    const result = await retryQuery(
      () => pool.query(
        'SELECT location_id, subscription_status, user_id FROM oauth_tokens WHERE location_id = $1',
        [locationId]
      ),
      2,
      500
    );

    if (result.rows.length === 0) {
      logger.warn('Invalid session - location not found', {
        locationId,
        path: req.path
      });
      
      res.clearCookie('location_id');
      return ApiResponse.unauthorized(res, 'Invalid or expired session');
    }

    // Attach context to request
    req.locationId = locationId;
    req.subscriptionStatus = result.rows[0].subscription_status || 'free';
    
    // If user_id exists, attach user info
    if (result.rows[0].user_id) {
      req.userId = result.rows[0].user_id;
    }
    
    next();
  } catch (error) {
    logger.error('Legacy authentication error', {
      path: req.path
    }, error as Error);
    
    return ApiResponse.serverError(res, 'Authentication check failed');
  }
}

/**
 * Email verification required middleware
 */
export async function requireEmailVerified(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user || !req.user.email_verified) {
    return ApiResponse.error(
      res,
      'Email verification required. Please check your email.',
      403,
      'EMAIL_VERIFICATION_REQUIRED'
    );
  }
  
  next();
}

/**
 * Extend Express Request type with auth context
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
      user?: any;
      locationId?: string;
      subscriptionStatus?: string;
      planType?: string;
    }
  }
}
