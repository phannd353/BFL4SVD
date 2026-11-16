import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/infrastructure/database';

@Injectable()
export class ModelService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllModels() {
    return this.prisma.model.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getModelById(hash: string) {
    const model = await this.prisma.model.findUnique({ where: { hash } });
    if (!model) {
      throw new NotFoundException('Model not found');
    }
    return model;
  }

  async getModelVersions(hash: string) {
    await this.getModelById(hash);
    const updates = await this.prisma.modelUpdate.findMany({
      where: {
        trainingRound: {
          is: { aggregatedModelHash: hash },
        },
      },
      include: {
        trainingRound: {
          select: { jobId: true, roundNumber: true },
        },
      },
      orderBy: [{ timestamp: 'asc' }, { id: 'asc' }],
    });

    return updates.map((update) => ({
      id: update.id,
      chainUpdateId: update.chainUpdateId,
      chainTxHash: update.chainTxHash,
      chainSyncStatus: update.chainSyncStatus,
      trainingJobId: update.trainingRound.jobId,
      roundNumber: String(update.trainingRound.roundNumber),
      clientAddress: update.clientAddress,
      score: update.score,
      modelHash: update.modelHash,
      epoch: update.epoch,
      learningRate: update.learningRate,
      batchSize: update.batchSize,
      prevModelHash: update.prevModelHash,
      accuracy: update.accuracy,
      timestamp: update.timestamp.toISOString(),
    }));
  }
}
