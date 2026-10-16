import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma-generated';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PrismaService } from '@/infrastructure/database';
import { ClientService } from './client.service';

describe('ClientService', { tags: ['unit', 'clients'] }, () => {
  const prisma = {
    client: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  } as unknown as PrismaService;
  let service: ClientService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new ClientService(prisma);
  });

  describe('registerClient', () => {
    it('registers a user with a wallet address', async () => {
      const createdClient = {
        id: 'client-1',
        userId: 'user-1',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      };
      prisma.client.findUnique = vi.fn().mockResolvedValue(null);
      prisma.client.create = vi.fn().mockResolvedValue(createdClient);

      await expect(
        service.registerClient('user-1', {
          walletAddress: createdClient.walletAddress,
        }),
      ).resolves.toBe(createdClient);

      expect(prisma.client.findUnique).toHaveBeenNthCalledWith(1, {
        where: { userId: 'user-1' },
        select: { id: true },
      });
      expect(prisma.client.findUnique).toHaveBeenNthCalledWith(2, {
        where: { walletAddress: createdClient.walletAddress },
        select: { id: true },
      });
      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            userId: 'user-1',
            walletAddress: createdClient.walletAddress,
          },
        }),
      );
    });

    it('registers a user without a wallet address', async () => {
      const createdClient = { id: 'client-2', userId: 'user-2' };
      prisma.client.findUnique = vi.fn().mockResolvedValue(null);
      prisma.client.create = vi.fn().mockResolvedValue(createdClient);

      await expect(service.registerClient('user-2', {})).resolves.toBe(
        createdClient,
      );
      expect(prisma.client.findUnique).toHaveBeenCalledTimes(1);
      expect(prisma.client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: 'user-2', walletAddress: undefined },
        }),
      );
    });

    it('rejects a user already registered as a client', async () => {
      prisma.client.findUnique = vi.fn().mockResolvedValue({ id: 'existing' });

      await expect(service.registerClient('user-1', {})).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('rejects a wallet address already registered by another user', async () => {
      prisma.client.findUnique = vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'existing' });

      await expect(
        service.registerClient('user-2', {
          walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.client.create).not.toHaveBeenCalled();
    });

    it('maps a concurrent unique-constraint violation to a conflict', async () => {
      const uniqueViolation = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '7.10.0' },
      );
      prisma.client.findUnique = vi.fn().mockResolvedValue(null);
      prisma.client.create = vi.fn().mockRejectedValue(uniqueViolation);

      await expect(service.registerClient('user-1', {})).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('rethrows unexpected database errors', async () => {
      const databaseError = new Error('Database unavailable');
      prisma.client.findUnique = vi.fn().mockResolvedValue(null);
      prisma.client.create = vi.fn().mockRejectedValue(databaseError);

      await expect(service.registerClient('user-1', {})).rejects.toBe(
        databaseError,
      );
    });
  });

  it('lists clients newest first', async () => {
    const clients = [{ id: 'client-1' }];
    prisma.client.findMany = vi.fn().mockResolvedValue(clients);

    await expect(service.getAllClients()).resolves.toBe(clients);
    expect(prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('returns a client by ID', async () => {
    const client = { id: 'client-1' };
    prisma.client.findUnique = vi.fn().mockResolvedValue(client);

    await expect(service.getClientById('client-1')).resolves.toBe(client);
    expect(prisma.client.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'client-1' } }),
    );
  });

  it('throws not found when the client ID does not exist', async () => {
    prisma.client.findUnique = vi.fn().mockResolvedValue(null);

    await expect(service.getClientById('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
