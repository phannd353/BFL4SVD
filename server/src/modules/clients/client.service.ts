import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma-generated';
import { PrismaService } from '@/infrastructure/database';
import { RegisterClientDto } from './dto';

@Injectable()
export class ClientService {
  constructor(private readonly prisma: PrismaService) {}

  async registerClient(userId: string, clientData: RegisterClientDto) {
    const existingClient = await this.prisma.client.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existingClient) {
      throw new ConflictException('User is already registered as a client');
    }

    if (clientData.walletAddress) {
      const existingWallet = await this.prisma.client.findUnique({
        where: { walletAddress: clientData.walletAddress },
        select: { id: true },
      });
      if (existingWallet) {
        throw new ConflictException('Wallet address is already registered');
      }
    }

    try {
      return await this.prisma.client.create({
        data: {
          userId,
          walletAddress: clientData.walletAddress,
        },
        select: this.clientSelection,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'User or wallet address is already registered as a client',
        );
      }
      throw error;
    }
  }

  getAllClients() {
    return this.prisma.client.findMany({
      orderBy: { createdAt: 'desc' },
      select: this.clientSelection,
    });
  }

  async getClientById(id: string) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      select: this.clientSelection,
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  private readonly clientSelection = {
    id: true,
    userId: true,
    walletAddress: true,
    createdAt: true,
    updatedAt: true,
    user: {
      select: {
        id: true,
        name: true,
        image: true,
      },
    },
  } satisfies Prisma.ClientSelect;
}
