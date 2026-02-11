/**
 * Enhanced Security Middleware
 * Additional security headers and protections beyond helmet
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';

/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self' https://*.gohighlevel.com https://*.leadconnectorhq.com https://*.highlevel.com"
  );
  
  // Additional security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // X-Frame-Options removed - using CSP frame-ancestors instead for GHL iframe support
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
}

/**
 * Request size limiter - prevent payload attacks
 */
export function requestSizeLimiter(req: Request, res: Response, next: NextFunction): void {
  const MAX_REQUEST_SIZE = 10 * 1024 * 1024; // 10MB
  
  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > MAX_REQUEST_SIZE) {
    logger.warn('Request payload too large', {
      contentLength: req.headers['content-length'],
      path: req.path,
      ip: req.ip
    });
    
    return ApiResponse.error(res, 'Request payload too large', 413, 'PAYLOAD_TOO_LARGE');
  }
  
  next();
}

/**
 * IP-based rate limiter for sensitive endpoints
 */
export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });
    
    ApiResponse.tooManyRequests(res, 900); // Retry after 15 minutes
  }
});

/**
 * Auth endpoint rate limiter (stricter)
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
  message: 'Too many authentication attempts, please try again later',
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    
    ApiResponse.tooManyRequests(res, 900);
  }
});

/**
 * API rate limiter (moderate)
 */
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: 'API rate limit exceeded',
  handler: (req, res) => {
    logger.warn('API rate limit exceeded', {
      ip: req.ip,
      locationId: req.cookies?.location_id,
      path: req.path
    });
    
    ApiResponse.tooManyRequests(res, 60);
  }
});

/**
 * Validate Content-Type for POST/PUT/PATCH
 */
export function validateContentType(req: Request, res: Response, next: NextFunction): void {
  const methods = ['POST', 'PUT', 'PATCH'];
  
  if (methods.includes(req.method)) {
    const contentType = req.headers['content-type'];
    
    if (!contentType || !contentType.includes('application/json')) {
      logger.warn('Invalid Content-Type', {
        contentType,
        method: req.method,
        path: req.path
      });
      
      return ApiResponse.error(
        res,
        'Content-Type must be application/json',
        415,
        'UNSUPPORTED_MEDIA_TYPE'
      );
    }
  }
  
  next();
}

/**
 * Block common attack patterns in query/body
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction): void {
  const dangerousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /eval\(/gi,
    /expression\(/gi
  ];
  
  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(value));
    }
    return false;
  };
  
  const scanObject = (obj: any): boolean => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === 'object' && value !== null) {
          if (scanObject(value)) return true;
        } else if (checkValue(value)) {
          return true;
        }
      }
    }
    return false;
  };
  
  // Check body and query
  if (scanObject(req.body) || scanObject(req.query)) {
    logger.warn('Malicious input detected', {
      path: req.path,
      ip: req.ip
    });
    
    return ApiResponse.error(res, 'Invalid input detected', 400, 'INVALID_INPUT');
  }
  
  next();
}
