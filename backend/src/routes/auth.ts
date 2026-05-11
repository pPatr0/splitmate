import { Router, Request, Response } from 'express';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { signToken } from '../utils/jwt.js';
import { registerSchema, loginSchema } from '../types/schemas.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

/**
 * POST /api/auth/register
 * Creates a new user and returns a JWT token.
 */
router.post('/register', async (req: Request, res: Response) => {
  // 1. Validate request body
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.issues,
    });
  }

  const { name, email, password } = parseResult.data;

  try {
    // 2. Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Create user
    const user = await User.create({ name, email, passwordHash });

    // 5. Sign JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
    });

    // 6. Return user (toJSON strips passwordHash) + token
    return res.status(201).json({
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * POST /api/auth/login
 * Authenticates user and returns a JWT token.
 */
router.post('/login', async (req: Request, res: Response) => {
  // 1. Validate request body
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: parseResult.error.issues,
    });
  }

  const { email, password } = parseResult.data;

  try {
    // 2. Find user
    const user = await User.findOne({ email });
    if (!user) {
      // Note: same response as wrong password (prevents email enumeration)
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 4. Sign JWT
    const token = signToken({
      userId: user.id,
      email: user.email,
    });

    // 5. Return user + token
    return res.json({
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * GET /api/auth/me
 * Returns the currently authenticated user.
 * Requires valid JWT in Authorization header.
 */
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    // req.user is set by requireAuth middleware
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user) {
      // Token valid but user deleted from DB - rare edge case
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user: user.toJSON() });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;