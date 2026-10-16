import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaService } from '@/infrastructure/database';
import { ROLES } from '@/lib/permissions';
import { ClientService } from '@/modules/clients/client.service';
import { AuthHelper } from '../helper/auth.helper';
import { createTestingAppModule } from '../helper/app.helper';
import { InfrastructureHelper } from '../helper/infrastructure.helper';

describe(
  'ClientService retrieval integration',
  { tags: ['integration', 'clients'] },
  () => {
    let app: INestApplication;
    let infraHelper: InfrastructureHelper;
    let clientService: ClientService;
    let prisma: PrismaService;
    let clientIds: string[];
    let userIds: string[];

    beforeAll(async () => {
      infraHelper = new InfrastructureHelper();
      await infraHelper.startInfrastructure();

      app = await createTestingAppModule(infraHelper);
      clientService = app.get(ClientService);
      prisma = app.get(PrismaService);

      const authHelper = app.get(AuthHelper);
      const users = await Promise.all(
        ['older', 'newer'].map((suffix) =>
          authHelper.registerUser({
            email: `client-retrieval-${suffix}@example.com`,
            password: 'password123',
            role: ROLES.USER,
          }),
        ),
      );
      userIds = users.map(({ user }) => user.id);

      const older = await clientService.registerClient(userIds[0], {});
      const newer = await clientService.registerClient(userIds[1], {
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      });
      clientIds = [older.id, newer.id];

      await prisma.client.update({
        where: { id: older.id },
        data: { createdAt: new Date('2026-01-01T00:00:00.000Z') },
      });
      await prisma.client.update({
        where: { id: newer.id },
        data: { createdAt: new Date('2026-01-02T00:00:00.000Z') },
      });
    }, 30000);

    afterAll(async () => {
      await app?.close();
      await infraHelper?.stopInfrastructure();
    });

    it('returns all clients newest first with their public user fields', async () => {
      const clients = await clientService.getAllClients();

      expect(clients.slice(0, 2).map(({ id }) => id)).toEqual([
        clientIds[1],
        clientIds[0],
      ]);
      expect(clients.slice(0, 2)).toEqual([
        expect.objectContaining({
          id: clientIds[1],
          userId: userIds[1],
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
          user: { id: userIds[1], name: 'Test User', image: null },
        }),
        expect.objectContaining({
          id: clientIds[0],
          userId: userIds[0],
          walletAddress: null,
          user: { id: userIds[0], name: 'Test User', image: null },
        }),
      ]);
      expect(clients[0].user).not.toHaveProperty('email');
    });

    it('retrieves a client by ID with its associated public user fields', async () => {
      await expect(
        clientService.getClientById(clientIds[1]),
      ).resolves.toMatchObject({
        id: clientIds[1],
        userId: userIds[1],
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        user: { id: userIds[1], name: 'Test User', image: null },
      });
    });
  },
);
