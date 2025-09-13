/**
 * Admin validation schemas using Joi
 */

import Joi from 'joi';

/**
 * Schema for running Binance-CoinGecko matcher
 */
export const runBinanceCoinGeckoMatcherSchema = Joi.object({
  forceRefresh: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Force refresh must be a boolean value'
    }),
  maxAge: Joi.number()
    .integer()
    .min(0)
    .max(24)
    .default(1)
    .messages({
      'number.base': 'Max age must be a number',
      'number.integer': 'Max age must be an integer',
      'number.min': 'Max age must be at least 0 hours',
      'number.max': 'Max age must be at most 24 hours'
    })
});

/**
 * Schema for getting user by ID
 */
export const getUserByIdSchema = Joi.object({
  userId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.base': 'User ID must be a string',
      'string.hex': 'User ID must be a valid MongoDB ObjectId',
      'string.length': 'User ID must be 24 characters long',
      'any.required': 'User ID is required'
    })
});

/**
 * Schema for updating user status
 */
export const updateUserStatusSchema = Joi.object({
  userId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.base': 'User ID must be a string',
      'string.hex': 'User ID must be a valid MongoDB ObjectId',
      'string.length': 'User ID must be 24 characters long',
      'any.required': 'User ID is required'
    }),
  isActive: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'isActive must be a boolean value',
      'any.required': 'isActive status is required'
    })
});

/**
 * Schema for deleting a user
 */
export const deleteUserSchema = Joi.object({
  userId: Joi.string()
    .hex()
    .length(24)
    .required()
    .messages({
      'string.base': 'User ID must be a string',
      'string.hex': 'User ID must be a valid MongoDB ObjectId',
      'string.length': 'User ID must be 24 characters long',
      'any.required': 'User ID is required'
    }),
  confirmDelete: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'boolean.base': 'Confirm delete must be a boolean value',
      'any.only': 'You must confirm the deletion by setting confirmDelete to true',
      'any.required': 'Delete confirmation is required'
    })
});

/**
 * Schema for system health check
 */
export const systemHealthSchema = Joi.object({
  detailed: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': 'Detailed flag must be a boolean value'
    })
});

/**
 * Schema for database operations
 */
export const databaseOperationSchema = Joi.object({
  operation: Joi.string()
    .valid('backup', 'restore', 'optimize', 'stats')
    .required()
    .messages({
      'string.base': 'Operation must be a string',
      'any.only': 'Operation must be one of: backup, restore, optimize, stats',
      'any.required': 'Operation is required'
    }),
  collection: Joi.string()
    .optional()
    .messages({
      'string.base': 'Collection name must be a string'
    }),
  backupPath: Joi.string()
    .when('operation', {
      is: Joi.valid('backup', 'restore'),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.base': 'Backup path must be a string',
      'any.required': 'Backup path is required for backup/restore operations'
    })
});

/**
 * Schema for article summarization
 */
export const summarizeArticleSchema = Joi.object({
  url: Joi.string()
    .uri({
      scheme: ['http', 'https']
    })
    .required()
    .messages({
      'string.base': 'URL must be a string',
      'string.uri': 'URL must be a valid HTTP or HTTPS URL',
      'any.required': 'Article URL is required'
    })
});