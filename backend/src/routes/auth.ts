/**
 * Authentication Routes - Complete User Account System
 * Includes: Registration, Login, Email Verification, Password Reset, GHL OAuth
 */

import { Router } from 'express';
import axios from 'axios';
import { pool } from '../lib/database';
import { encrypt, decrypt } from '../lib/encryption';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';
import { asyncHandler } from '../middleware/error-handler';
import { authRateLimiter } from '../middleware/security';
import { retryQuery } from '../middleware/database-health';
import { requireAuth, optionalAuth, legacyLocationAuth } from '../middleware/auth';
import {
  register,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  getUser,
  generateJWT,
  generateRefreshToken,
  verifyRefreshToken,
  deleteSession
} from '../lib/user-auth';
import {
  sendPasswordResetEmail,
  sendEmailVerification,
  sendWelcomeEmail
} from '../lib/email-service';

export const authRouter = Router();

// Apply strict rate limiting to auth endpoints
authRouter.use(authRateLimiter);

// ============================================================================
// USER ACCOUNT ROUTES
// ============================================================================

/**
 * POST /auth/register
 * Register a new user account
 */
authRouter.post('/register', asyncHandler(async (req: any, res: any) => {
  const { email, password, name, companyName } = req.body;
  
  // Validate required fields
  if (!email || !password) {
    return ApiResponse.error(res, 'Email and password are required', 400, 'MISSING_FIELDS');
  }

  try {
    const { user, token, refreshToken, verificationToken } = await register(email, password, name, companyName);

    // Set secure HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    };
    
    res.cookie('auth_token', token, cookieOptions);
    res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

    // Send verification email
    try {
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/verify-email/${verificationToken}`;
      await sendEmailVerification(email, verifyUrl);
      logger.info('Verification email sent', { userId: user.id });
    } catch (emailError: any) {
      logger.error('Failed to send verification email', { error: emailError.message, userId: user.id });
      // Don't fail registration if email fails
    }

    // Send welcome email (optional - could be sent after verification)
    try {
      await sendWelcomeEmail(email, name || '');
      logger.info('Welcome email sent', { userId: user.id });
    } catch (emailError: any) {
      logger.error('Failed to send welcome email', { error: emailError.message, userId: user.id });
    }

    logger.info('User registered successfully', {
      userId: user.id,
      email: user.email,
      requestId: req.id
    });

    return ApiResponse.success(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.company_name,
        emailVerified: user.email_verified,
        createdAt: user.created_at
      },
      token,
      refreshToken,
      message: 'Account created successfully. Please check your email to verify your account.'
    });
  } catch (error: any) {
    logger.error('Registration failed', {
      email,
      error: error.message,
      requestId: req.id
    });

    return ApiResponse.error(
      res,
      error.message || 'Registration failed',
      400,
      'REGISTRATION_FAILED'
    );
  }
}));

/**
 * POST /auth/login
 * Login with email and password
 */
authRouter.post('/login', asyncHandler(async (req: any, res: any) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return ApiResponse.error(res, 'Email and password are required', 400, 'MISSING_FIELDS');
  }

  try {
    const { user, token, refreshToken } = await login(
      email,
      password,
      req.ip,
      req.get('user-agent')
    );

    // Set secure HTTP-only cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    };
    
    res.cookie('auth_token', token, cookieOptions);
    res.cookie('refresh_token', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

    logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      requestId: req.id
    });

    return ApiResponse.success(res, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        companyName: user.company_name,
        emailVerified: user.email_verified,
        lastLoginAt: user.last_login_at
      },
      token,
      refreshToken,
      message: 'Login successful'
    });
  } catch (error: any) {
    logger.warn('Login failed', {
      email,
      error: error.message,
      requestId: req.id
    });

    return ApiResponse.error(
      res,
      'Invalid email or password',
      401,
      'LOGIN_FAILED'
    );
  }
}));

/**
 * POST /auth/logout
 * Logout and clear session
 */
authRouter.post('/logout', requireAuth, asyncHandler(async (req: any, res: any) => {
  const token = req.cookies.auth_token || req.headers.authorization?.substring(7);
  
  if (token && req.userId) {
    await deleteSession(req.userId, token);
  }

  // Clear all auth cookies
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    path: '/'
  };
  
  res.clearCookie('auth_token', clearOptions);
  res.clearCookie('refresh_token', clearOptions);
  res.clearCookie('location_id', clearOptions); // Legacy cookie

  logger.info('User logged out', {
    userId: req.userId,
    requestId: req.id
  });

  return ApiResponse.success(res, {
    loggedOut: true,
    message: 'Successfully logged out'
  });
}));

/**
 * GET /auth/me
 * Get current user information
 */
authRouter.get('/me', requireAuth, asyncHandler(async (req: any, res: any) => {
  const user = await getUser(req.userId);
  
  if (!user) {
    return ApiResponse.error(res, 'User not found', 404, 'USER_NOT_FOUND');
  }

  // Check if user has GHL connection
  const ghlResult = await pool.query(
    `SELECT location_id, subscription_status, plan_type, subscription_started_at, subscription_ends_at, trial_ends_at
     FROM oauth_tokens 
     WHERE user_id = $1`,
    [req.userId]
  );

  const ghlConnection = ghlResult.rows.length > 0 ? {
    connected: true,
    locationId: ghlResult.rows[0].location_id,
    subscriptionStatus: ghlResult.rows[0].subscription_status,
    planType: ghlResult.rows[0].plan_type,
    subscriptionStartedAt: ghlResult.rows[0].subscription_started_at,
    subscriptionEndsAt: ghlResult.rows[0].subscription_ends_at,
    trialEndsAt: ghlResult.rows[0].trial_ends_at
  } : {
    connected: false
  };

  return ApiResponse.success(res, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      companyName: user.company_name,
      emailVerified: user.email_verified,
      createdAt: user.created_at,
      lastLoginAt: user.last_login_at
    },
    ghl: ghlConnection
  });
}));

/**
 * POST /auth/verify-email
 * Verify email with token
 */
authRouter.post('/verify-email', asyncHandler(async (req: any, res: any) => {
  const { token } = req.body;
  
  if (!token) {
    return ApiResponse.error(res, 'Verification token is required', 400, 'MISSING_TOKEN');
  }

  const success = await verifyEmail(token);
  
  if (success) {
    logger.info('Email verified', { token, requestId: req.id });
    return ApiResponse.success(res, {
      verified: true,
      message: 'Email verified successfully'
    });
  } else {
    return ApiResponse.error(
      res,
      'Invalid or expired verification token',
      400,
      'VERIFICATION_FAILED'
    );
  }
}));

/**
 * POST /auth/forgot-password
 * Request password reset
 */
authRouter.post('/forgot-password', asyncHandler(async (req: any, res: any) => {
  const { email } = req.body;
  
  if (!email) {
    return ApiResponse.error(res, 'Email is required', 400, 'MISSING_EMAIL');
  }

  // Generate reset token
  const resetToken = await forgotPassword(email);

  // Send password reset email if token was generated
  if (resetToken) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password/${resetToken}`;
      await sendPasswordResetEmail(email, resetUrl);
      logger.info('Password reset email sent', { email, requestId: req.id });
    } catch (emailError: any) {
      logger.error('Failed to send password reset email', { error: emailError.message, email });
      // Still return success to prevent enumeration
    }
  }

  logger.info('Password reset requested', { email, requestId: req.id });

  // Always return success to prevent email enumeration
  return ApiResponse.success(res, {
    message: 'If an account exists with that email, a password reset link has been sent.'
  });
}));

/**
 * POST /auth/reset-password
 * Reset password with token
 */
authRouter.post('/reset-password', asyncHandler(async (req: any, res: any) => {
  const { token, newPassword } = req.body;
  
  if (!token || !newPassword) {
    return ApiResponse.error(res, 'Token and new password are required', 400, 'MISSING_FIELDS');
  }

  try {
    const success = await resetPassword(token, newPassword);
    
    if (success) {
      logger.info('Password reset successful', { requestId: req.id });
      return ApiResponse.success(res, {
        reset: true,
        message: 'Password reset successfully. Please login with your new password.'
      });
    }
  } catch (error: any) {
    return ApiResponse.error(
      res,
      error.message || 'Password reset failed',
      400,
      'RESET_FAILED'
    );
  }
}));

/**
 * PUT /auth/password
 * Change password (requires current password)
 */
authRouter.put('/password', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return ApiResponse.error(res, 'Current and new passwords are required', 400, 'MISSING_FIELDS');
  }

  try {
    await changePassword(req.userId, currentPassword, newPassword);
    
    logger.info('Password changed', { userId: req.userId, requestId: req.id });

    return ApiResponse.success(res, {
      changed: true,
      message: 'Password changed successfully'
    });
  } catch (error: any) {
    return ApiResponse.error(
      res,
      error.message || 'Password change failed',
      400,
      'PASSWORD_CHANGE_FAILED'
    );
  }
}));

/**
 * PUT /auth/profile
 * Update user profile
 */
authRouter.put('/profile', requireAuth, asyncHandler(async (req: any, res: any) => {
  const { name, companyName } = req.body;
  
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (companyName !== undefined) updates.company_name = companyName;

  if (Object.keys(updates).length === 0) {
    return ApiResponse.error(res, 'No fields to update', 400, 'NO_UPDATES');
  }

  try {
    const updatedUser = await updateProfile(req.userId, updates);
    
    logger.info('Profile updated', { userId: req.userId, requestId: req.id });

    return ApiResponse.success(res, {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        companyName: updatedUser.company_name
      },
      message: 'Profile updated successfully'
    });
  } catch (error: any) {
    return ApiResponse.error(
      res,
      error.message || 'Profile update failed',
      400,
      'UPDATE_FAILED'
    );
  }
}));

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
authRouter.post('/refresh', asyncHandler(async (req: any, res: any) => {
  const refreshToken = req.cookies.refresh_token || req.body.refreshToken;
  
  if (!refreshToken) {
    return ApiResponse.error(res, 'Refresh token required', 401, 'MISSING_TOKEN');
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    
    // Get user
    const user = await getUser(payload.userId);
    if (!user) {
      return ApiResponse.error(res, 'User not found', 404, 'USER_NOT_FOUND');
    }

    // Generate new tokens
    const newAccessToken = generateJWT(user);
    const newRefreshToken = generateRefreshToken(user);

    // Set new cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    };
    
    res.cookie('auth_token', newAccessToken, cookieOptions);
    res.cookie('refresh_token', newRefreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

    logger.info('Token refreshed', { userId: user.id, requestId: req.id });

    return ApiResponse.success(res, {
      token: newAccessToken,
      refreshToken: newRefreshToken,
      message: 'Token refreshed successfully'
    });
  } catch (error: any) {
    return ApiResponse.error(
      res,
      'Invalid or expired refresh token',
      401,
      'REFRESH_FAILED'
    );
  }
}));

// ============================================================================
// OAUTH ROUTES (for connecting to GoHighLevel)
// ============================================================================

/**
 * GET /auth/oauth/login
 * Redirect to OAuth - no auth required, user created during callback
 */
authRouter.get('/oauth/login', (_req, res) => {
  const clientId = process.env.GHL_CLIENT_ID;
  const redirectUri = process.env.REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    return ApiResponse.serverError(res, 'OAuth not configured');
  }

  const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?` +
    `response_type=code&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `client_id=${clientId}&` +
    `scope=workflows.readonly locations.readonly`;

  res.redirect(authUrl);
});

/**
 * GET /auth/oauth/callback
 * OAuth callback handler - links account to user
 */
authRouter.get('/oauth/callback', asyncHandler(async (req: any, res: any) => {
  const { code, state } = req.query;
  
  if (!code || typeof code !== 'string') {
    logger.warn('OAuth callback missing code', {
      hasCode: !!code,
      ip: req.ip
    });
    
    const errorUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/error?message=missing_code`
      : '/error?message=missing_code';
    
    return res.redirect(errorUrl);
  }

  logger.info('GHL OAuth callback received', {
    hasCode: true,
    hasState: !!state,
    ip: req.ip,
    requestId: req.id
  });

  try {
    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://services.leadconnectorhq.com/oauth/token',
      {
        client_id: process.env.GHL_CLIENT_ID,
        client_secret: process.env.GHL_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        user_type: 'Location',
        redirect_uri: process.env.REDIRECT_URI
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    const tokens = tokenResponse.data;

    if (!tokens.access_token || !tokens.refresh_token || !tokens.locationId) {
      logger.error('Invalid token response from GHL', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        hasLocationId: !!tokens.locationId
      });
      throw new Error('Invalid token response');
    }

    // Encrypt tokens
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Get userId from auth cookie if present, or create new user
    let userId: string | null = null;
    const authToken = req.cookies.auth_token;
    if (authToken) {
      try {
        const { verifyJWT } = await import('../lib/user-auth');
        const payload = verifyJWT(authToken);
        userId = payload.userId;
      } catch (error) {
        // Token invalid, will create new user
      }
    }

    // If no user session, create a new user from OAuth data
    if (!userId) {
      const { v4: uuidv4 } = await import('uuid');
      userId = uuidv4();
      
      // Create user with locationId as identifier
      await pool.query(
        `INSERT INTO users (id, email, name, email_verified, last_login_at)
         VALUES ($1, $2, $3, true, NOW())
         ON CONFLICT (email) DO UPDATE SET last_login_at = NOW()
         RETURNING id`,
        [userId, `${tokens.locationId}@ghl.local`, `GHL User (${tokens.locationId.substring(0, 8)})`]
      ).then(result => {
        if (result.rows[0]) {
          userId = result.rows[0].id;
        }
      });

      // Generate session tokens
      const { generateJWT, generateRefreshToken } = await import('../lib/user-auth');
      const user = { 
        id: userId!, 
        email: `${tokens.locationId}@ghl.local`,
        email_verified: true,
        created_at: new Date(),
        updated_at: new Date()
      };
      const jwtToken = generateJWT(user);
      const refreshToken = generateRefreshToken(user);

      // Set session cookies
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      };
      res.cookie('token', jwtToken, cookieOptions);
      res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

      logger.info('Created new user via OAuth', { userId, locationId: tokens.locationId });
    }

    // Store tokens linked to user
    await retryQuery(
      () => pool.query(
        `INSERT INTO oauth_tokens 
         (location_id, company_id, access_token, refresh_token, expires_at, user_id, subscription_status, plan_type) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (location_id) 
         DO UPDATE SET 
           access_token = $3, 
           refresh_token = $4,
           expires_at = $5,
           company_id = $2,
           user_id = $6,
           updated_at = NOW()`,
        [
          tokens.locationId,
          tokens.companyId || null,
          encryptedAccessToken,
          encryptedRefreshToken,
          expiresAt,
          userId || null,
          'free',
          'free'
        ]
      ),
      3,
      1000
    );

    logger.info('GHL account connected', {
      locationId: tokens.locationId,
      userId: userId || undefined,
      requestId: req.id
    });

    // Redirect to dashboard
    const dashboardUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/dashboard?ghl_connected=true`
      : '/dashboard?ghl_connected=true';
    
    res.redirect(dashboardUrl);

  } catch (error: any) {
    logger.error('GHL OAuth callback error', {
      errorMessage: error.message,
      errorResponse: error.response?.data,
      requestId: req.id
    }, error);

    const errorUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/error?message=ghl_connection_failed`
      : `/error?message=ghl_connection_failed`;
    
    res.redirect(errorUrl);
  }
}));

/**
 * GET /auth/status
 * Check authentication status (legacy + new)
 */
authRouter.get('/status', optionalAuth, asyncHandler(async (req: any, res: any) => {
  if (req.userId) {
    // New auth system
    const user = await getUser(req.userId);
    
    // Check GHL connection
    const ghlResult = await pool.query(
      'SELECT location_id, subscription_status, plan_type FROM oauth_tokens WHERE user_id = $1',
      [req.userId]
    );

    return ApiResponse.success(res, {
      authenticated: true,
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.email_verified
      } : null,
      ghlConnected: ghlResult.rows.length > 0,
      locationId: ghlResult.rows[0]?.location_id,
      subscription: ghlResult.rows[0]?.subscription_status || 'free',
      planType: ghlResult.rows[0]?.plan_type || 'free'
    });
  } else {
    // Check legacy location_id cookie
    const locationId = req.cookies.location_id;
    if (locationId) {
      const result = await pool.query(
        'SELECT subscription_status FROM oauth_tokens WHERE location_id = $1',
        [locationId]
      );
      
      if (result.rows.length > 0) {
        return ApiResponse.success(res, {
          authenticated: true,
          legacy: true,
          locationId,
          subscription: result.rows[0].subscription_status || 'free',
          message: 'Please create an account to access new features'
        });
      }
    }
  }

  return ApiResponse.success(res, {
    authenticated: false
  });
}));

export default authRouter;
