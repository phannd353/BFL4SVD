import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma-generated';
import { PrismaService } from '@/infrastructure/database';
import { CreateTrainingJobDto } from './dto';

@Injectable()
export class TrainingJobsService {
  constructor(private readonly prisma: PrismaService) {}

  createTrainingJob(userId: string, input: CreateTrainingJobDto) {
    return this.prisma.trainingJob.create({
      data: {
        ...input,
        createdById: userId,
        logs: {
          create: { message: 'Training job created' },
        },
      },
    });
  }

  getAllTrainingJobs() {
    return this.prisma.trainingJob.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTrainingJobById(id: string) {
    const job = await this.prisma.trainingJob.findUnique({
      where: { id },
    });
    if (!job) {
      throw new NotFoundException('Training job not found');
    }
    return job;
  }

  async getTrainingJobStatus(id: string) {
    const job = await this.getTrainingJobById(id);
    return {
      id: job.id,
      status: job.status,
      currentRound: job.currentRound,
      plannedRounds: job.plannedRounds,
      updatedAt: job.updatedAt,
    };
  }

  async getTrainingJobRounds(id: string) {
    await this.assertJobExists(id);
    return this.prisma.trainingJobRound.findMany({
      where: { jobId: id },
      orderBy: { roundNumber: 'asc' },
    });
  }

  async getTrainingJobMetrics(id: string) {
    await this.assertJobExists(id);
    const rounds = await this.prisma.trainingJobRound.findMany({
      where: { jobId: id },
      select: {
        roundNumber: true,
        metrics: true,
        modelHash: true,
        blockchainUpdateId: true,
        createdAt: true,
      },
      orderBy: { roundNumber: 'asc' },
    });
    return rounds.filter((round) => round.metrics !== null);
  }

  async getTrainingJobLogs(id: string) {
    await this.assertJobExists(id);
    return this.prisma.trainingJobLog.findMany({
      where: { jobId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async startTrainingJob(id: string, userId: string) {
    return this.changeStatus(id, userId, ['DRAFT', 'STOPPED'], 'RUNNING');
  }

  async stopTrainingJob(id: string, userId: string) {
    return this.changeStatus(id, userId, ['RUNNING'], 'STOPPED');
  }

  async getClientsByTrainingJobId(id: string) {
    await this.assertJobExists(id);
    const participants = await this.prisma.trainingJobParticipant.findMany({
      where: { jobId: id, status: 'JOINED' },
      orderBy: { joinedAt: 'asc' },
      select: {
        joinedAt: true,
        client: {
          select: {
            id: true,
            walletAddress: true,
            user: { select: { id: true, name: true, image: true } },
          },
        },
      },
    });
    return participants.map(({ joinedAt, client }) => ({
      ...client,
      joinedAt,
    }));
  }

  async joinTrainingJob(id: string, userId: string) {
    return this.prisma.$transaction(async (transaction) => {
      const job = await transaction.trainingJob.findUnique({
        where: { id },
        select: { id: true, status: true },
      });
      if (!job) {
        throw new NotFoundException('Training job not found');
      }
      if (job.status === 'COMPLETED') {
        throw new ConflictException('Completed training jobs cannot be joined');
      }

      const client = await transaction.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) {
        throw new BadRequestException(
          'Register as a client before joining a training job',
        );
      }

      const membership = await transaction.trainingJobParticipant.findUnique({
        where: { jobId_clientId: { jobId: id, clientId: client.id } },
        select: { status: true },
      });
      if (membership?.status === 'JOINED') {
        throw new ConflictException('Client has already joined this job');
      }

      await transaction.trainingJobParticipant.upsert({
        where: { jobId_clientId: { jobId: id, clientId: client.id } },
        create: { jobId: id, clientId: client.id },
        update: { status: 'JOINED', joinedAt: new Date(), leftAt: null },
      });
      await transaction.trainingJobLog.create({
        data: { jobId: id, message: `Client ${client.id} joined the job` },
      });

      return { jobId: id, clientId: client.id, status: 'JOINED' as const };
    });
  }

  async leaveTrainingJob(id: string, userId: string) {
    return this.prisma.$transaction(async (transaction) => {
      await this.assertJobExists(id, transaction);
      const client = await transaction.client.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!client) {
        throw new BadRequestException(
          'Register as a client before leaving a training job',
        );
      }

      const result = await transaction.trainingJobParticipant.updateMany({
        where: { jobId: id, clientId: client.id, status: 'JOINED' },
        data: { status: 'LEFT', leftAt: new Date() },
      });
      if (result.count === 0) {
        throw new ConflictException('Client is not participating in this job');
      }

      await transaction.trainingJobLog.create({
        data: { jobId: id, message: `Client ${client.id} left the job` },
      });
      return { jobId: id, clientId: client.id, status: 'LEFT' as const };
    });
  }

  private async changeStatus(
    id: string,
    userId: string,
    from: ('DRAFT' | 'RUNNING' | 'STOPPED')[],
    to: 'RUNNING' | 'STOPPED',
  ) {
    return this.prisma.$transaction(async (transaction) => {
      const job = await transaction.trainingJob.findUnique({
        where: { id },
        select: { id: true, status: true, createdById: true },
      });
      if (!job) {
        throw new NotFoundException('Training job not found');
      }
      if (job.createdById !== userId) {
        throw new ForbiddenException(
          'Only the job creator can change its status',
        );
      }
      if (!new Set<string>(from).has(job.status)) {
        throw new ConflictException(
          `Cannot change training job from ${job.status} to ${to}`,
        );
      }

      const updated = await transaction.trainingJob.updateMany({
        where: { id, status: { in: from } },
        data: { status: to },
      });
      if (updated.count !== 1) {
        throw new ConflictException('Training job status changed concurrently');
      }

      await transaction.trainingJobLog.create({
        data: { jobId: id, message: `Training job ${to.toLowerCase()}` },
      });
      return transaction.trainingJob.findUniqueOrThrow({ where: { id } });
    });
  }

  private async assertJobExists(
    id: string,
    transaction: Prisma.TransactionClient = this.prisma,
  ) {
    const job = await transaction.trainingJob.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!job) {
      throw new NotFoundException('Training job not found');
    }
  }
}
