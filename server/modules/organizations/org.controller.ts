import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireRole, type AuthenticatedRequest } from '../auth/auth.middleware';
import { db } from '../../db/database';

export const orgRouter = Router();

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).default('MEMBER'),
});

orgRouter.get('/current', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const org = await db.findOrganizationById(req.organizationId!);
    if (!org) {
      return res.status(404).json({ success: false, error: { message: 'Organization not found' } });
    }
    const members = await db.listOrgMembers(org.id);
    return res.status(200).json({
      success: true,
      data: {
        organization: org,
        currentRole: req.membership?.role,
        members,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

orgRouter.get('/members', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const members = await db.listOrgMembers(req.organizationId!);
    return res.status(200).json({ success: true, data: members });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: { message: err.message } });
  }
});

orgRouter.post('/members', authenticate, requireRole(['OWNER', 'ADMIN']), async (req: AuthenticatedRequest, res) => {
  try {
    const data = inviteMemberSchema.parse(req.body);
    let targetUser = await db.findUserByEmail(data.email);

    if (!targetUser) {
      // Create user placeholder with invitation
      targetUser = await db.createUser({
        email: data.email,
        name: data.email.split('@')[0],
        passwordHash: 'INVITED_PENDING_ACTIVATION',
      });
    }

    const membership = await db.createMembership({
      userId: targetUser.id,
      organizationId: req.organizationId!,
      role: data.role,
    });

    await db.logAudit({
      organizationId: req.organizationId!,
      userId: req.user!.id,
      action: 'MEMBER_INVITED',
      targetType: 'User',
      targetId: targetUser.id,
      details: { email: data.email, role: data.role },
      ipAddress: req.ip,
    });

    return res.status(201).json({
      success: true,
      data: {
        membership,
        user: { id: targetUser.id, email: targetUser.email, name: targetUser.name },
      },
    });
  } catch (err: any) {
    return res.status(400).json({ success: false, error: { message: err.message } });
  }
});
