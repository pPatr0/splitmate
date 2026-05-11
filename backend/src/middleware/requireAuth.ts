import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../utils/jwt.js';

/**
 * Extends Express Request to include authenticated user info.
 * Available on protected routes via req.user.
 */
declare module 'express-serve-static-core' {
  interface Request {
    user?: JWTPayload;
  }
}

/**
 * Middleware to protect routes. Requires valid JWT in Authorization header.
 * Format: "Authorization: Bearer <token>"
 *
 * On success: attaches decoded payload to req.user and calls next().
 * On failure: returns 401 Unauthorized.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  // 1. Check header exists
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  // 2. Check format
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header must be Bearer token' });
  }

  // 3. Extract token
  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return res.status(401).json({ error: 'Token missing in Authorization header' });
  }

  // 4. Verify token
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token',
      details: (error as Error).message,
    });
  }
}