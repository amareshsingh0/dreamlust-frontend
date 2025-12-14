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
      req.query = schema.parse(req.query) as any;
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
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError('Parameter validation failed', error.errors);
      }
      next(error);
    }
  };
}

