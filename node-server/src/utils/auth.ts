/**
 * Authentication Utilities
 * JWT token generation, validation, and password hashing utilities
 */

import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { JWTPayload, User, UserResponse } from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'spikey-coins-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const SALT_ROUNDS = 12;

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate JWT token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: 'spikey-coins-api'
  } as SignOptions);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
}

/**
 * Convert User to UserResponse (remove password)
 */
export function sanitizeUser(user: User): UserResponse {
  const { password, ...sanitizedUser } = user;
  return {
    ...sanitizedUser,
    _id: user._id ? user._id.toString() : '',
  } as UserResponse;
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}