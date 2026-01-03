import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../lib/errors';
import { sanitizeText, sanitizeComment } from '../lib/sanitize';

/**
 * Validate request body with Zod schema and sanitize inputs
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Sanitize string fields in body before validation
      if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
          if (typeof req.body[key] === 'string') {
            // Use sanitizeComment for text fields (comments, messages, etc.)
            // Use sanitizeText for other string fields
            if (key === 'text' || key === 'message' || key === 'content' || key === 'description' || key === 'bio') {
              req.body[key] = sanitizeComment(req.body[key]);
            } else {
              req.body[key] = sanitizeText(req.body[key]);
            }
          }
        }
      }
      
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Validation failed', error.errors);
      }
      next(error);
    }
  };
}

/**
 * Validate request query with Zod schema
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Parse and transform query values (coerce numbers, set defaults, etc.)
      const parsedQuery = schema.parse(req.query);
      // Store transformed values in req.validatedQuery for use in route handlers
      (req as any).validatedQuery = parsedQuery;
      // Also update req.query with transformed values (works in Express)
      Object.assign(req.query, parsedQuery);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Query validation failed', error.errors);
      }
      next(error);
    }
  };
}

/**
 * Validate request params with Zod schema
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Just validate, don't try to reassign (req.params is read-only)
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Parameter validation failed', error.errors);
      }
      next(error);
    }
  };
}

