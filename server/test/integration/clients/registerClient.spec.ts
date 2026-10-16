import { ConflictException, INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { ROLES } from '@/lib/permissions';
import { PrismaService } from '@/infrastructure/database';
import { ClientService } from '@/modules/clients/client.service';
import { AuthHelper } from '../helper/auth.helper';
import { createTestingAppModule } from '../helper/app.helper';
import { InfrastructureHelper } from '../helper/infrastructure.helper';

describe(
  'ClientService integration',
  { tags: ['integration', 'clients'] },
  () => {
    let app: INestApplication;
    let infraHelper: InfrastructureHelper;
    let clientService: ClientService;
    let prisma: PrismaService;
    let userIds: string[];

    beforeAll(async () => {
      infraHelper = new InfrastructureHelper();
      await infraHelper.startInfrastructure();

      app = await createTestingAppModule(infraHelper);
      clientService = app.get(ClientService);
      prisma = app.get(PrismaService);

      const authHelper = app.get(AuthHelper);
      const users = await Promise.all(
        [
          'wallet',
          'duplicate',
          'owner',
          'other',
          'optional',
          'list',
          'race-user',
          'race-wallet-a',
          'race-wallet-b',
          'delete',
        ].map((suffix) =>
          authHelper.registerUser({
            email: `client-${suffix}@example.com`,
            password: 'password123',
            role: ROLES.USER,
          }),
        ),
      );
      userIds = users.map(({ user }) => user.id);
    }, 30000);

    afterAll(async () => {
      await app?.close();
      await infraHelper?.stopInfrastructure();
    });

    it('registers a client with a wallet and persists the associated user', async () => {
      const walletAddress = '0x1234567890abcdef1234567890abcdef12345678';

      const client = await clientService.registerClient(userIds[0], {
        walletAddress,
      });

      expect(client).toMatchObject({
        userId: userIds[0],
        walletAddress,
        user: { id: userIds[0], name: 'Test User' },
      });
      expect(client.id).toBeTruthy();
      expect(client.createdAt).toBeInstanceOf(Date);
      expect(client.updatedAt).toBeInstanceOf(Date);
    });

    it('allows a user to register only once', async () => {
      await clientService.registerClient(userIds[1], {});

      await expect(
        clientService.registerClient(userIds[1], {}),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a wallet address already used by another client', async () => {
      const walletAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      await clientService.registerClient(userIds[2], { walletAddress });

      await expect(
        clientService.registerClient(userIds[3], { walletAddress }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows registration without a wallet address', async () => {
      const client = await clientService.registerClient(userIds[4], {});

      expect(client.walletAddress).toBeNull();
      expect(client.userId).toBe(userIds[4]);
    });

    it('lists clients and retrieves a client by ID', async () => {
      const client = await clientService.registerClient(userIds[5], {});

      await expect(
        clientService.getClientById(client.id),
      ).resolves.toMatchObject({
        id: client.id,
        userId: userIds[5],
      });
      await expect(clientService.getAllClients()).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: client.id })]),
      );
    });

    it('returns not found for an unknown client ID', async () => {
      await expect(
        clientService.getClientById('missing-client'),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('enforces one client registration when the same user registers concurrently', async () => {
      const results = await Promise.allSettled([
        clientService.registerClient(userIds[6], {}),
        clientService.registerClient(userIds[6], {}),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const rejected = results.find((result) => result.status === 'rejected');
      expect(rejected?.status).toBe('rejected');
      if (rejected?.status === 'rejected') {
        expect(rejected.reason).toBeInstanceOf(ConflictException);
      }
    });

    it('enforces wallet uniqueness when different users register concurrently', async () => {
      const walletAddress = '0x9876543210abcdef9876543210abcdef98765432';
      const results = await Promise.allSettled([
        clientService.registerClient(userIds[7], { walletAddress }),
        clientService.registerClient(userIds[8], { walletAddress }),
      ]);

      expect(
        results.filter((result) => result.status === 'fulfilled'),
      ).toHaveLength(1);
      const rejected = results.find((result) => result.status === 'rejected');
      expect(rejected?.status).toBe('rejected');
      if (rejected?.status === 'rejected') {
        expect(rejected.reason).toBeInstanceOf(ConflictException);
      }
    });

    it('deletes the client record when its user is deleted', async () => {
      const client = await clientService.registerClient(userIds[9], {});

      await prisma.user.delete({ where: { id: userIds[9] } });

      await expect(
        clientService.getClientById(client.id),
      ).rejects.toMatchObject({
        status: 404,
      });
    });
  },
);
