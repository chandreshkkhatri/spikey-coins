/**
 * Authentication validation schemas using Joi
 */

import Joi from 'joi';

/**
 * Schema for user login request
 */
export const loginSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.base': 'Username must be a string',
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must be at most 30 characters long',
      'any.required': 'Username is required'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    })
});

/**
 * Schema for creating initial admin user
 */
export const createInitialAdminSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.base': 'Username must be a string',
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must be at most 30 characters long',
      'any.required': 'Username is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  setupKey: Joi.string()
    .required()
    .messages({
      'string.base': 'Setup key must be a string',
      'any.required': 'Setup key is required'
    })
});

/**
 * Schema for creating a new user (by admin)
 */
export const createUserSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.base': 'Username must be a string',
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must be at most 30 characters long',
      'any.required': 'Username is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.base': 'Email must be a string',
      'string.email': 'Email must be a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .required()
    .messages({
      'string.base': 'Password must be a string',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  role: Joi.string()
    .valid('user', 'admin')
    .default('user')
    .messages({
      'string.base': 'Role must be a string',
      'any.only': 'Role must be either "user" or "admin"'
    }),
  adminKey: Joi.string()
    .when('role', {
      is: 'admin',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.base': 'Admin key must be a string',
      'any.required': 'Admin key is required when creating an admin user'
    })
});

/**
 * Schema for updating user profile
 */
export const updateUserSchema = Joi.object({
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.base': 'Email must be a string',
      'string.email': 'Email must be a valid email address'
    }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])'))
    .optional()
    .messages({
      'string.base': 'Password must be a string',
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    }),
  currentPassword: Joi.string()
    .when('password', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.base': 'Current password must be a string',
      'any.required': 'Current password is required when changing password'
    })
}).min(1);