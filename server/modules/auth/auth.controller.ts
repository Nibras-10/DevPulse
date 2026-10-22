import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { authenticate, type AuthenticatedRequest } from './auth.middleware';
import { db } from '../../db/database';

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organizationName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

authRouter.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const result = await AuthService.register(data);

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await db.logAudit({
      organizationId: result.organization.id,
      userId: result.user.id,
      action: 'USER_REGISTERED',
      targetType: 'User',
      targetId: result.user.id,
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message || 'Registration failed',
        details: err.errors || undefined,
      },
    });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const result = await AuthService.login(data);

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    if (result.memberships.length > 0) {
      await db.logAudit({
        organizationId: result.memberships[0].organizationId,
        userId: result.user.id,
        action: 'USER_LOGGED_IN',
        targetType: 'User',
        targetId: result.user.id,
        ipAddress: req.ip,
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_FAILED',
        message: err.message || 'Invalid credentials',
      },
    });
  }
});

authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const memberships = await db.listUserMemberships(req.user!.id);
    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
        activeMembership: req.membership,
        memberships,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message,
      },
    });
  }
});

authRouter.post('/logout', (req, res) => {
  res.clearCookie('token');
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});
