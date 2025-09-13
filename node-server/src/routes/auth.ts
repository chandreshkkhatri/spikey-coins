/**
 * Authentication Routes
 * Login, registration, and user management endpoints
 */

import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import DatabaseConnection from '../services/DatabaseConnection.js';
import { User, UserRole, UserCreateRequest, UserLoginRequest, AuthResponse } from '../models/User.js';
import { hashPassword, comparePassword, generateToken, sanitizeUser } from '../utils/auth.js';
import logger from '../utils/logger.js';

/**
 * User login endpoint
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password }: UserLoginRequest = req.body;

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: 'Username and password are required'
      });
      return;
    }

    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();
    const usersCollection = db.collection<User>('users');

    // Find user by username
    const user = await usersCollection.findOne({
      username: username.toLowerCase(),
      isActive: true
    });

    if (!user) {
      logger.warn(`Auth: Login attempt with invalid username: ${username}`);
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      logger.warn(`Auth: Invalid password for user: ${username}`);
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Update last login time
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          updatedAt: new Date()
        }
      }
    );

    // Generate JWT token
    const token = generateToken({
      userId: user._id!.toString(),
      username: user.username,
      role: user.role
    });

    const authResponse: AuthResponse = {
      success: true,
      user: sanitizeUser({ ...user, lastLogin: new Date() }),
      token,
      expiresIn: '24h'
    };

    logger.info(`Auth: User ${username} (${user.role}) logged in successfully`);
    res.json(authResponse);

  } catch (error) {
    logger.error('Auth: Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Create initial admin user endpoint (only works when database is empty)
 * Requires setup key from environment variable for security
 */
export async function createInitialAdmin(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password, setupKey }: UserCreateRequest & { setupKey?: string } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
      return;
    }

    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();
    const usersCollection = db.collection<User>('users');

    // Check if ANY users exist (database must be empty)
    const userCount = await usersCollection.countDocuments();
    if (userCount > 0) {
      res.status(403).json({
        success: false,
        error: 'Initial setup already completed. Use admin authentication to create new users.'
      });
      return;
    }

    // Verify setup key for initial admin creation
    const SETUP_KEY = process.env.ADMIN_SETUP_KEY || 'default-setup-key-change-in-production';
    if (!setupKey || setupKey !== SETUP_KEY) {
      logger.warn(`Auth: Invalid setup key provided for initial admin creation`);
      res.status(403).json({
        success: false,
        error: 'Invalid or missing setup key'
      });
      return;
    }

    // Check if username already exists (shouldn't happen if DB is empty, but being safe)
    const existingUser = await usersCollection.findOne({
      username: username.toLowerCase()
    });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create initial admin user
    const newUser: User = {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    const createdUser = await usersCollection.findOne({ _id: result.insertedId });

    if (!createdUser) {
      res.status(500).json({
        success: false,
        error: 'Failed to create initial admin user'
      });
      return;
    }

    logger.info(`Auth: Initial admin user created: ${username}`);
    res.status(201).json({
      success: true,
      message: 'Initial admin user created successfully',
      user: sanitizeUser(createdUser)
    });

  } catch (error) {
    logger.error('Auth: Create initial admin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create initial admin user'
    });
  }
}

/**
 * Create new user endpoint (admin only)
 * Allows admins to create both regular users and additional admins
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const { username, email, password, role = UserRole.USER }: UserCreateRequest = req.body;

    if (!username || !email || !password) {
      res.status(400).json({
        success: false,
        error: 'Username, email, and password are required'
      });
      return;
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      res.status(400).json({
        success: false,
        error: `Invalid role. Must be one of: ${Object.values(UserRole).join(', ')}`
      });
      return;
    }

    // If creating another admin, require additional confirmation
    if (role === UserRole.ADMIN) {
      const adminConfirmKey = req.body.adminConfirmKey;
      const ADMIN_CREATE_KEY = process.env.ADMIN_CREATE_KEY || process.env.ADMIN_SETUP_KEY || 'default-setup-key-change-in-production';

      if (!adminConfirmKey || adminConfirmKey !== ADMIN_CREATE_KEY) {
        logger.warn(`Auth: Admin ${req.user?.username} attempted to create admin without valid confirmation key`);
        res.status(403).json({
          success: false,
          error: 'Creating admin users requires additional confirmation key'
        });
        return;
      }
    }

    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();
    const usersCollection = db.collection<User>('users');

    // Check if username already exists
    const existingUser = await usersCollection.findOne({
      username: username.toLowerCase()
    });
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'Username already exists'
      });
      return;
    }

    // Check if email already exists
    const existingEmail = await usersCollection.findOne({
      email: email.toLowerCase()
    });
    if (existingEmail) {
      res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser: User = {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await usersCollection.insertOne(newUser);
    const createdUser = await usersCollection.findOne({ _id: result.insertedId });

    if (!createdUser) {
      res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
      return;
    }

    logger.info(`Auth: User created by ${req.user?.username}: ${username} (${role})`);
    res.status(201).json({
      success: true,
      message: `${role === UserRole.ADMIN ? 'Admin' : 'User'} created successfully`,
      user: sanitizeUser(createdUser),
      createdBy: req.user?.username
    });

  } catch (error) {
    logger.error('Auth: Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
}

/**
 * Verify token endpoint
 */
export async function verifyToken(req: Request, res: Response): Promise<void> {
  // If we reach here, the token was validated by the auth middleware
  res.json({
    success: true,
    user: req.user,
    message: 'Token is valid'
  });
}

/**
 * Get current user profile
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const db = DatabaseConnection.getDatabase();
    const usersCollection = db.collection<User>('users');

    const user = await usersCollection.findOne({
      _id: new ObjectId(req.user.userId),
      isActive: true
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      user: sanitizeUser(user)
    });

  } catch (error) {
    logger.error('Auth: Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
}