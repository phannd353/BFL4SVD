// Load environment variables BEFORE any imports
require('dotenv').config({ path: '.env' });

import { ConfigService } from '@nestjs/config';
import { createBetterAuthInstance } from '../src/lib/auth';
import { configuration } from '@/config';
import { PrismaService } from '@/infrastructure/database';
import { Logger } from '@nestjs/common';

export async function setupAdmin() {
  const config = new ConfigService(configuration());
  const logger = new Logger();
  const prisma = new PrismaService(config, logger);

  const auth = createBetterAuthInstance(config, prisma);
  // Dynamic import after env is loaded
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminName = process.env.ADMIN_NAME || 'Admin User';
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    return console.error(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment variables.',
    );
  }

  const admin = await auth.api.createUser({
    body: {
      email: adminEmail,
      name: adminName,
      role: 'admin',
      password: adminPassword,
    },
  });

  console.log('Admin user created:', admin.user);
}
