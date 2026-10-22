import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { db } from '../../db/database';
import type { User, Organization, Membership } from '../../db/types';

export class AuthService {
  public static async register(data: {
    email: string;
    password: string;
    name: string;
    organizationName?: string;
  }): Promise<{ user: Omit<User, 'passwordHash'>; organization: Organization; token: string }> {
    const existing = await db.findUserByEmail(data.email);
    if (existing) {
      throw new Error('A user with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await db.createUser({
      email: data.email,
      name: data.name,
      passwordHash,
    });

    // Create default organization
    const orgName = data.organizationName || `${data.name}'s Team`;
    const slug = orgName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + `-${Math.floor(1000 + Math.random() * 9000)}`;

    const org = await db.createOrganization({
      name: orgName,
      slug,
    });

    await db.createMembership({
      userId: user.id,
      organizationId: org.id,
      role: 'OWNER',
    });

    // Default notification channel
    await db.createNotificationChannel({
      organizationId: org.id,
      name: 'Default Email Alerts',
      type: 'EMAIL',
      destination: data.email,
      isEnabled: true,
    });

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, organization: org, token };
  }

  public static async login(data: {
    email: string;
    password: string;
  }): Promise<{ user: Omit<User, 'passwordHash'>; memberships: (Membership & { organization: Organization })[]; token: string }> {
    const user = await db.findUserByEmail(data.email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    const memberships = await db.listUserMemberships(user.id);
    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser, memberships, token };
  }
}
