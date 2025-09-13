/**
 * User Model and Types
 * Defines user structure and roles for the authentication system
 */

import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UserLoginRequest {
  username: string;
  password: string;
}

export interface UserResponse {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface JWTPayload {
  userId: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface AuthResponse {
  success: boolean;
  user: UserResponse;
  token: string;
  expiresIn: string;
}