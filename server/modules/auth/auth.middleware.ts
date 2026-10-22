import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { db } from '../../db/database';
import type { User, Membership, Role } from '../../db/types';

export interface AuthenticatedRequest extends Request {
  user?: Omit<User, 'passwordHash'>;
  membership?: Membership;
  organizationId?: string;
  rawBody?: Buffer;
}

export async function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication token missing or invalid.',
        },
      });
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string };
    const user = await db.findUserById(payload.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User account not found.',
        },
      });
    }

    const { passwordHash, ...safeUser } = user;
    req.user = safeUser;

    // Organization scope header (e.g. X-Organization-Id) or fallback to first membership
    const requestedOrgId = (req.headers['x-organization-id'] as string) || (req.query.orgId as string);
    const memberships = await db.listUserMemberships(user.id);

    if (memberships.length > 0) {
      let matched = memberships[0];
      if (requestedOrgId) {
        const found = memberships.find((m) => m.organizationId === requestedOrgId);
        if (found) {
          matched = found;
        } else {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Tenant isolation check failed: You do not belong to the requested organization.',
            },
          });
        }
      }
      req.membership = matched;
      req.organizationId = matched.organizationId;
    }

    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication session.',
      },
    });
  }
}

export function requireRole(allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.membership) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'NO_MEMBERSHIP',
          message: 'You must belong to an active organization to perform this action.',
        },
      });
    }

    if (!allowedRoles.includes(req.membership.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Action requires one of the following roles: ${allowedRoles.join(', ')}`,
        },
      });
    }

    next();
  };
}
