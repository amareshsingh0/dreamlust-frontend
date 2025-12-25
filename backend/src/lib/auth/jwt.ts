import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import { TokenType } from '../../config/constants';
import { UnauthorizedError } from '../errors';

// Re-export TokenType for convenience
export { TokenType };

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  type: TokenType;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate JWT access token (15 minutes)
 */
export function generateAccessToken(payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign(
    {
      ...payload,
      type: TokenType.ACCESS,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as SignOptions
  );
}

/**
 * Generate JWT refresh token (7 days)
 */
export function generateRefreshToken(payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): string {
  return jwt.sign(
    {
      ...payload,
      type: TokenType.REFRESH,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions
  );
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>): TokenPair {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string, expectedType?: TokenType): JWTPayload {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.log('[JWT] Verifying token (first 30 chars):', token.substring(0, 30) + '...');
      console.log('[JWT] Using JWT_SECRET (first 10 chars):', env.JWT_SECRET.substring(0, 10) + '...');
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    if (process.env.NODE_ENV === 'development') {
      console.log('[JWT] Token decoded successfully. Type:', decoded.type, 'Expected:', expectedType);
      console.log('[JWT] Token payload:', { userId: decoded.userId, email: decoded.email, exp: decoded.exp });
    }

    if (expectedType && decoded.type !== expectedType) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[JWT] ✗ Token type mismatch! Got:', decoded.type, 'Expected:', expectedType);
      }
      throw new UnauthorizedError('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[JWT] ✗ Token verification failed:', error);
    }

    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | undefined): string {
  if (!authHeader) {
    throw new UnauthorizedError('Authentication required. Please log in to continue.');
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new UnauthorizedError('Invalid authentication token. Please log in again.');
  }

  return parts[1];
}

