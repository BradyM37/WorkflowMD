/**
 * Request Validation Middleware
 * Validates request body, params, and query using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '../lib/response';
import { logger } from '../lib/logger';

export type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Generic validation middleware factory
 */
export function validate(schema: ZodSchema, target: ValidationTarget = 'body') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validated = await schema.parseAsync(data);
      
      // Replace request data with validated & sanitized version
      req[target] = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        logger.warn('Validation error', {
          target,
          errors,
          path: req.path
        });
        
        ApiResponse.validationError(res, errors);
      } else {
        logger.error('Validation middleware error', {}, error as Error);
        ApiResponse.serverError(res, 'Validation failed');
      }
    }
  };
}

/**
 * Validate multiple targets at once
 */
export function validateAll(schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      
      // Validate params
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      
      // Validate query
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        logger.warn('Validation error', {
          errors,
          path: req.path
        });
        
        ApiResponse.validationError(res, errors);
      } else {
        logger.error('Validation middleware error', {}, error as Error);
        ApiResponse.serverError(res, 'Validation failed');
      }
    }
  };
}

/**
 * Custom validators
 */

// Validate pagination query params
export const paginationValidator = validate(
  z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20)
  }),
  'query'
);

// Validate ID param
export const idParamValidator = validate(
  z.object({
    id: z.string().min(1).max(255)
  }),
  'params'
);

// Validate numeric ID param
export const numericIdParamValidator = validate(
  z.object({
    id: z.coerce.number().int().positive()
  }),
  'params'
);
