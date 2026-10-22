import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  APP_URL: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().default('devpulse_super_secure_jwt_secret_key_2026_xyz!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  WEBHOOK_SECRET: z.string().default('devpulse_github_webhook_secret_key_7788'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('alerts@devpulse.io'),
  ALLOW_PRIVATE_IPS_FOR_MONITORING: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);
