/**
 * Global Error Handler Middleware
 * Catches all unhandled errors and returns consistent responses
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Async route handler wrapper - catches async errors
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handler
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Don't send response if already sent
  if (res.headersSent) {
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }));
    
    logger.warn('Validation error in error handler', {
      path: req.path,
      method: req.method,
      errors
    });
    
    return ApiResponse.validationError(res, errors);
  }

  // Handle known AppErrors
  if (error instanceof AppError) {
    logger.warn('Application error', {
      path: req.path,
      method: req.method,
      statusCode: error.statusCode,
      code: error.code,
      message: error.message
    });
    
    return ApiResponse.error(
      res,
      error.message,
      error.statusCode,
      error.code
    );
  }

  // Handle database errors
  if (error.name === 'PostgresError' || error.message.includes('database')) {
    logger.error('Database error', {
      path: req.path,
      method: req.method
    }, error);
    
    return ApiResponse.error(
      res,
      'Database operation failed',
      500,
      'DATABASE_ERROR'
    );
  }

  // Handle unexpected errors
  logger.error('Unexpected error', {
    path: req.path,
    method: req.method,
    locationId: req.cookies?.location_id
  }, error);

  // Send generic error response in production
  return ApiResponse.serverError(
    res,
    process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
  );
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn('Route not found', {
    path: req.path,
    method: req.method
  });
  
  ApiResponse.notFound(res, 'Route');
}

/**
 * Unhandled rejection handler (process-level)
 */
export function setupProcessErrorHandlers(): void {
  process.on('unhandledRejection', (reason: Error) => {
    logger.error('Unhandled promise rejection', {}, reason);
    
    // Graceful shutdown on critical errors
    if (!reason.message?.includes('operational')) {
      logger.error('Non-operational error detected, shutting down');
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught exception', {}, error);
    
    // Always exit on uncaught exceptions
    logger.error('Critical error, shutting down immediately');
    process.exit(1);
  });

  // Graceful shutdown on SIGTERM
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, closing server gracefully');
    // Server close logic would go here
    process.exit(0);
  });
}
