/**
 * Authentication Middleware
 * JWT token validation and role-based authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/auth.js';
import { UserRole, JWTPayload } from '../models/User.js';
import logger from '../utils/logger.js';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware - validates JWT token
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
        message: 'Please provide a valid authorization token'
      });
      return;
    }

    const decoded = verifyToken(token);
    req.user = decoded;

    logger.info(`Auth: User ${decoded.username} (${decoded.role}) authenticated`);
    next();

  } catch (error) {
    logger.warn('Auth: Token validation failed:', error);

    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Your session has expired. Please log in again.'
        });
        return;
      }

      if (error.name === 'JsonWebTokenError') {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'The provided token is invalid.'
        });
        return;
      }
    }

    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: 'Unable to authenticate the request.'
    });
  }
}

/**
 * Admin authorization middleware - requires admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please authenticate first'
    });
    return;
  }

  if (req.user.role !== UserRole.ADMIN) {
    logger.warn(`Auth: User ${req.user.username} (${req.user.role}) attempted admin access`);
    res.status(403).json({
      success: false,
      error: 'Insufficient permissions',
      message: 'Admin access required for this operation'
    });
    return;
  }

  logger.info(`Auth: Admin ${req.user.username} authorized for admin operation`);
  next();
}

/**
 * Combined middleware for admin authentication and authorization
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  authenticateToken(req, res, (error?: any) => {
    if (error) {
      next(error);
      return;
    }

    requireAdmin(req, res, next);
  });
}