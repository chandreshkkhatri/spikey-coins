/**
 * Validation middleware using Joi
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../utils/logger.js';

/**
 * Type for validation target
 */
export type ValidationTarget = 'body' | 'query' | 'params';

/**
 * Create validation middleware for request data
 * @param schema - Joi validation schema
 * @param target - Part of request to validate (body, query, or params)
 * @returns Express middleware function
 */
export function validate(schema: Joi.ObjectSchema, target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const dataToValidate = req[target];

      // Validate the request data
      const { error, value } = schema.validate(dataToValidate, {
        abortEarly: false,  // Return all errors, not just the first one
        stripUnknown: true, // Remove unknown keys from validated data
        convert: true       // Attempt to convert values to correct types
      });

      if (error) {
        // Extract all error messages
        const errorMessages = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }));

        logger.warn(`Validation failed for ${req.method} ${req.path}:`, errorMessages);

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errorMessages
        });
        return;
      }

      // Replace request data with validated and sanitized data
      req[target] = value;

      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

/**
 * Create validation middleware for multiple targets
 * @param schemas - Object containing schemas for different targets
 * @returns Express middleware function
 */
export function validateMultiple(schemas: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const errors: Array<{ field: string; message: string }> = [];

      // Validate each target if schema is provided
      for (const [target, schema] of Object.entries(schemas)) {
        if (schema) {
          const dataToValidate = req[target as ValidationTarget];
          const { error, value } = schema.validate(dataToValidate, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
          });

          if (error) {
            errors.push(...error.details.map(detail => ({
              field: `${target}.${detail.path.join('.')}`,
              message: detail.message
            })));
          } else {
            // Replace request data with validated data
            req[target as ValidationTarget] = value;
          }
        }
      }

      if (errors.length > 0) {
        logger.warn(`Validation failed for ${req.method} ${req.path}:`, errors);
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
        return;
      }

      next();
    } catch (err) {
      logger.error('Validation middleware error:', err);
      res.status(500).json({
        success: false,
        error: 'Internal validation error'
      });
    }
  };
}

/**
 * Custom validation error handler
 */
export function handleValidationError(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof Joi.ValidationError) {
    const errorMessages = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    logger.warn(`Validation error for ${req.method} ${req.path}:`, errorMessages);

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errorMessages
    });
  }

  next(err);
}