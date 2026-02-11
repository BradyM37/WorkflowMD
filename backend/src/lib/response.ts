/**
 * Standardized API Response Format
 * Ensures consistent responses across all endpoints
 */

import { Response } from 'express';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string; // For validation errors
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

export class ApiResponse {
  /**
   * Send success response
   */
  static success<T>(res: Response, data: T, statusCode: number = 200, meta?: any): void {
    const response: ApiSuccessResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta
      }
    };
    res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    details?: any
  ): void {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details: process.env.NODE_ENV === 'development' ? details : undefined
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
    res.status(statusCode).json(response);
  }

  /**
   * Common error responses
   */
  static badRequest(res: Response, message: string = 'Bad request', details?: any): void {
    this.error(res, message, 400, 'BAD_REQUEST', details);
  }

  static unauthorized(res: Response, message: string = 'Authentication required'): void {
    this.error(res, message, 401, 'UNAUTHORIZED');
  }

  static forbidden(res: Response, message: string = 'Access forbidden'): void {
    this.error(res, message, 403, 'FORBIDDEN');
  }

  static notFound(res: Response, resource: string = 'Resource'): void {
    this.error(res, `${resource} not found`, 404, 'NOT_FOUND');
  }

  static conflict(res: Response, message: string = 'Conflict'): void {
    this.error(res, message, 409, 'CONFLICT');
  }

  static tooManyRequests(res: Response, retryAfter?: number): void {
    const response = this.error(
      res,
      'Too many requests, please try again later',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
    if (retryAfter) {
      res.setHeader('Retry-After', retryAfter.toString());
    }
  }

  static validationError(res: Response, errors: any[]): void {
    this.error(
      res,
      'Validation failed',
      422,
      'VALIDATION_ERROR',
      { errors }
    );
  }

  static serverError(res: Response, message: string = 'Internal server error'): void {
    this.error(res, message, 500, 'INTERNAL_ERROR');
  }

  static serviceUnavailable(res: Response, message: string = 'Service temporarily unavailable'): void {
    this.error(res, message, 503, 'SERVICE_UNAVAILABLE');
  }
}

/**
 * Helper to check if response is already sent
 */
export function isResponseSent(res: Response): boolean {
  return res.headersSent;
}
