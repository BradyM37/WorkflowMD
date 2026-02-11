/**
 * User Authentication Service
 * Handles email/password authentication, JWT management, and user operations
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pool } from './database';
import { logger } from './logger';
import crypto from 'crypto';

// Security constants
const BCRYPT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';
const PASSWORD_RESET_EXPIRES_HOURS = 24;
const EMAIL_VERIFICATION_EXPIRES_HOURS = 48;

// JWT secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production';

// Validate JWT secret is set in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'your-secret-key-change-in-production') {
  throw new Error('JWT_SECRET must be set in production environment');
}

/**
 * User interface
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  company_name?: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
}

/**
 * JWT Payload interface
 */
export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
}

/**
 * Register a new user
 */
export async function register(
  email: string,
  password: string,
  name?: string,
  companyName?: string
): Promise<{ user: User; token: string; refreshToken: string; verificationToken: string }> {
  try {
    // Validate email format
    if (!isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    validatePasswordStrength(password);

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate user ID and verification token
    const userId = uuidv4();
    const verificationToken = generateSecureToken();

    // Insert user into database
    const result = await pool.query(
      `INSERT INTO users (id, email, password_hash, name, company_name, email_verification_token)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, company_name, email_verified, created_at, updated_at`,
      [userId, email.toLowerCase(), passwordHash, name || null, companyName || null, verificationToken]
    );

    const user = result.rows[0];

    logger.info('New user registered', {
      userId: user.id,
      email: user.email
    });

    // Generate JWT tokens
    const token = generateJWT(user);
    const refreshToken = generateRefreshToken(user);

    // Store session
    await createSession(userId, token);

    return { user, token, refreshToken, verificationToken };
  } catch (error) {
    logger.error('User registration failed', { email }, error as Error);
    throw error;
  }
}

/**
 * Login with email and password
 */
export async function login(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string
): Promise<{ user: User; token: string; refreshToken: string }> {
  try {
    // Get user from database
    const result = await pool.query(
      `SELECT id, email, password_hash, name, company_name, email_verified, created_at, updated_at, last_login_at
       FROM users 
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      logger.warn('Failed login attempt', { email, ipAddress });
      throw new Error('Invalid email or password');
    }

    // Update last login timestamp
    await pool.query(
      'UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Also update last_login_at in oauth_tokens if user has connected GHL
    await pool.query(
      'UPDATE oauth_tokens SET last_login_at = NOW() WHERE user_id = $1',
      [user.id]
    );

    logger.info('User logged in', {
      userId: user.id,
      email: user.email,
      ipAddress
    });

    // Remove password_hash from user object
    delete user.password_hash;

    // Generate JWT tokens
    const token = generateJWT(user);
    const refreshToken = generateRefreshToken(user);

    // Store session
    await createSession(user.id, token, ipAddress, userAgent);

    return { user, token, refreshToken };
  } catch (error) {
    logger.error('Login failed', { email }, error as Error);
    throw error;
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE email_verification_token = $1 AND email_verified = false',
      [token]
    );

    if (result.rows.length === 0) {
      return false;
    }

    const userId = result.rows[0].id;

    await pool.query(
      `UPDATE users 
       SET email_verified = true, email_verification_token = NULL, updated_at = NOW() 
       WHERE id = $1`,
      [userId]
    );

    logger.info('Email verified', { userId });

    return true;
  } catch (error) {
    logger.error('Email verification failed', { token }, error as Error);
    return false;
  }
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string): Promise<string | null> {
  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      logger.warn('Password reset requested for non-existent email', { email });
      return null;
    }

    const userId = result.rows[0].id;
    const resetToken = generateSecureToken();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_HOURS * 60 * 60 * 1000);

    await pool.query(
      `UPDATE users 
       SET password_reset_token = $1, password_reset_expires = $2, updated_at = NOW() 
       WHERE id = $3`,
      [resetToken, expiresAt, userId]
    );

    logger.info('Password reset token generated', { userId, email });

    return resetToken;
  } catch (error) {
    logger.error('Forgot password failed', { email }, error as Error);
    throw error;
  }
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  try {
    // Validate password strength
    validatePasswordStrength(newPassword);

    const result = await pool.query(
      'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    const userId = result.rows[0].id;
    const passwordHash = await hashPassword(newPassword);

    await pool.query(
      `UPDATE users 
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = NOW() 
       WHERE id = $2`,
      [passwordHash, userId]
    );

    // Invalidate all existing sessions
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);

    logger.info('Password reset successful', { userId });

    return true;
  } catch (error) {
    logger.error('Password reset failed', { token }, error as Error);
    throw error;
  }
}

/**
 * Change password (requires old password)
 */
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  try {
    // Validate new password strength
    validatePasswordStrength(newPassword);

    // Get current password hash
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    // Verify old password
    const isValidPassword = await verifyPassword(oldPassword, result.rows[0].password_hash);
    
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, userId]
    );

    logger.info('Password changed', { userId });

    return true;
  } catch (error) {
    logger.error('Password change failed', { userId }, error as Error);
    throw error;
  }
}

/**
 * Update user profile
 */
export async function updateProfile(
  userId: string,
  data: { name?: string; company_name?: string }
): Promise<User> {
  try {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.company_name !== undefined) {
      updates.push(`company_name = $${paramIndex++}`);
      values.push(data.company_name);
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE users 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING id, email, name, company_name, email_verified, created_at, updated_at, last_login_at`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    logger.info('Profile updated', { userId });

    return result.rows[0];
  } catch (error) {
    logger.error('Profile update failed', { userId }, error as Error);
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUser(userId: string): Promise<User | null> {
  try {
    const result = await pool.query(
      `SELECT id, email, name, company_name, email_verified, created_at, updated_at, last_login_at
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    logger.error('Get user failed', { userId }, error as Error);
    throw error;
  }
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT access token
 */
export function generateJWT(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    type: 'access'
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'ghl-debugger',
    subject: user.id
  });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    type: 'refresh'
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'ghl-debugger',
    subject: user.id
  });
}

/**
 * Verify JWT token
 */
export function verifyJWT(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload;
    
    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Create session record
 */
export async function createSession(
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
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, userId, tokenHash, ipAddress || null, userAgent || null, expiresAt]
    );
  } catch (error) {
    logger.error('Session creation failed', { userId }, error as Error);
    // Don't throw - session creation failure shouldn't prevent login
  }
}

/**
 * Validate session exists
 */
export async function validateSession(userId: string, token: string): Promise<boolean> {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await pool.query(
      'SELECT id FROM sessions WHERE user_id = $1 AND token_hash = $2 AND expires_at > NOW()',
      [userId, tokenHash]
    );

    return result.rows.length > 0;
  } catch (error) {
    logger.error('Session validation failed', { userId }, error as Error);
    return false;
  }
}

/**
 * Delete session (logout)
 */
export async function deleteSession(userId: string, token: string): Promise<void> {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await pool.query(
      'DELETE FROM sessions WHERE user_id = $1 AND token_hash = $2',
      [userId, tokenHash]
    );
  } catch (error) {
    logger.error('Session deletion failed', { userId }, error as Error);
  }
}

/**
 * Cleanup expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const result = await pool.query('DELETE FROM sessions WHERE expires_at < NOW()');
    
    if (result.rowCount && result.rowCount > 0) {
      logger.info('Expired sessions cleaned up', { count: result.rowCount });
    }
  } catch (error) {
    logger.error('Session cleanup failed', {}, error as Error);
  }
}

/**
 * Helper: Generate secure random token
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Helper: Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper: Validate password strength
 */
function validatePasswordStrength(password: string): void {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }

  if (!/[0-9]/.test(password)) {
    throw new Error('Password must contain at least one number');
  }

  // Optional: Check for special characters
  // if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
  //   throw new Error('Password must contain at least one special character');
  // }
}
