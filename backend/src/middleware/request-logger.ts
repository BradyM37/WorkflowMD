/**
 * Request Logging Middleware
 * Logs all incoming requests with timing and context
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Add request ID to every request for tracing
 */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

/**
 * Log all incoming requests with timing
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  const { method, path, ip } = req;
  const locationId = req.cookies?.location_id;
  
  // Log request start
  logger.debug(`→ ${method} ${path}`, {
    requestId: req.id,
    method,
    path,
    ip,
    locationId,
    userAgent: req.headers['user-agent']
  });

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;
    
    // Determine log level based on status code
    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    const logMessage = `← ${method} ${path} ${statusCode} (${duration}ms)`;
    
    const context = {
      requestId: req.id,
      method,
      path,
      statusCode,
      durationMs: duration,
      locationId,
      ip
    };
    
    if (logLevel === 'error') {
      logger.error(logMessage, context);
    } else if (logLevel === 'warn') {
      logger.warn(logMessage, context);
    } else {
      logger.info(logMessage, context);
    }
  });

  next();
}

/**
 * Declare custom properties on Express Request
 */
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}
