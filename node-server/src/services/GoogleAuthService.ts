/**
 * Google Authentication Service
 * Handles Google OAuth token verification and user management
 */

import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { UserModel, User, UserRole, AuthProvider } from '../models/User.js';
import { generateToken, sanitizeUser } from '../utils/auth.js';
import DatabaseConnection from './DatabaseConnection.js';
import logger from '../utils/logger.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!GOOGLE_CLIENT_ID) {
  logger.warn('GoogleAuthService: GOOGLE_CLIENT_ID not set - Google OAuth will not work');
}

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

export interface GoogleAuthResult {
  success: boolean;
  user?: any;
  token?: string;
  expiresIn?: string;
  error?: string;
  isNewUser?: boolean;
}

/**
 * Verify Google ID token and return user payload
 */
export async function verifyGoogleToken(idToken: string): Promise<TokenPayload | null> {
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    
    if (!payload) {
      logger.warn('GoogleAuthService: No payload in Google token');
      return null;
    }

    // Verify email is verified
    if (!payload.email_verified) {
      logger.warn('GoogleAuthService: Email not verified for Google user');
      return null;
    }

    return payload;
  } catch (error) {
    logger.error('GoogleAuthService: Error verifying Google token:', error);
    return null;
  }
}

/**
 * Find or create user from Google profile
 */
export async function findOrCreateGoogleUser(payload: TokenPayload): Promise<GoogleAuthResult> {
  try {
    if (!DatabaseConnection.isConnectionReady()) {
      await DatabaseConnection.initialize();
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email || !googleId) {
      return {
        success: false,
        error: 'Invalid Google profile data'
      };
    }

    // First, try to find user by Google ID
    let user = await UserModel.findOne({ googleId });
    let isNewUser = false;

    if (!user) {
      // Try to find user by email (might be an existing local user)
      user = await UserModel.findOne({ email: email.toLowerCase() });

      if (user) {
        // Link existing account with Google
        user.googleId = googleId;
        user.provider = user.provider === AuthProvider.LOCAL ? AuthProvider.LOCAL : AuthProvider.GOOGLE;
        if (picture && !user.profilePicture) {
          user.profilePicture = picture;
        }
        await user.save();
        logger.info(`GoogleAuthService: Linked Google account to existing user: ${email}`);
      } else {
        // Create new user from Google profile
        // Generate a unique username from email or name
        const baseUsername = (name?.replace(/\s+/g, '').toLowerCase() || email.split('@')[0]).substring(0, 20);
        let username = baseUsername;
        let counter = 1;

        // Ensure username is unique
        while (await UserModel.findOne({ username })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        const newUser: User = {
          username,
          email: email.toLowerCase(),
          googleId,
          provider: AuthProvider.GOOGLE,
          profilePicture: picture,
          role: UserRole.USER, // New Google users are regular users by default
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        user = await UserModel.create(newUser);
        isNewUser = true;
        logger.info(`GoogleAuthService: Created new user from Google: ${email} (${username})`);
      }
    }

    if (!user) {
      return {
        success: false,
        error: 'Failed to find or create user'
      };
    }

    // Check if user is active
    if (!user.isActive) {
      return {
        success: false,
        error: 'Account is deactivated'
      };
    }

    // Update last login
    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          updatedAt: new Date(),
          // Update profile picture if changed
          ...(picture && { profilePicture: picture })
        }
      }
    );

    // Generate JWT token
    const token = generateToken({
      userId: user._id!.toString(),
      username: user.username,
      role: user.role
    });

    // Update user object for response
    const updatedUser = user.toObject();
    updatedUser.lastLogin = new Date();
    if (picture) {
      updatedUser.profilePicture = picture;
    }

    return {
      success: true,
      user: sanitizeUser(updatedUser),
      token,
      expiresIn: '24h',
      isNewUser
    };

  } catch (error) {
    logger.error('GoogleAuthService: Error in findOrCreateGoogleUser:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Main handler for Google OAuth login
 */
export async function handleGoogleLogin(idToken: string): Promise<GoogleAuthResult> {
  // Verify the Google token
  const payload = await verifyGoogleToken(idToken);
  
  if (!payload) {
    return {
      success: false,
      error: 'Invalid Google token'
    };
  }

  // Find or create user
  return findOrCreateGoogleUser(payload);
}

export default {
  verifyGoogleToken,
  findOrCreateGoogleUser,
  handleGoogleLogin
};
