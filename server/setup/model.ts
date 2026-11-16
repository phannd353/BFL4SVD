// Load environment variables BEFORE any imports
require('dotenv').config({ path: '.env' });

import { ConfigService } from '@nestjs/config';
import { configuration } from '@/config';
import { BlockchainService } from '@/modules/blockchain/blockchain.service';
import { PrismaService } from '@/infrastructure/database';
import { ContractService } from '@/common';
import { Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';

export async function setupModel() {
  const config = new ConfigService(configuration());
  const logger = new Logger();
  const prisma = new PrismaService(config, logger);

  const initialModelHash = process.env.INITIAL_MODEL_HASH;
  if (!initialModelHash) {
    return console.error(
      'INITIAL_MODEL_HASH must be set in environment variables.',
    );
  }

  const existingModel = await prisma.model.findUnique({
    where: { hash: initialModelHash },
  });

  if (!existingModel) {
    let model: Buffer | undefined;
    let modelFilePath: string | undefined;
    for (const extension of ['pkl', 'pt']) {
      const candidate = `../fl/data/model/${initialModelHash}.${extension}`;
      try {
        model = await readFile(candidate);
        modelFilePath = `data/model/${initialModelHash}.${extension}`;
        break;
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !('code' in error) ||
          error.code !== 'ENOENT'
        ) {
          throw error;
        }
      }
    }
    if (!model || !modelFilePath) {
      throw new Error(
        `Initial model file not found at data/model/${initialModelHash}.pkl or .pt`,
      );
    }

    await prisma.model.create({
      data: {
        hash: initialModelHash,
        filePath: modelFilePath,
        size: model.length,
      },
    });
  }

  const blockchain = new BlockchainService(new ContractService(config, logger));
  try {
    const txHash = await blockchain.registerModel(
      initialModelHash,
      async (submittedHash) => {
        await prisma.model.update({
          where: { hash: initialModelHash },
          data: {
            chainTxHash: submittedHash,
            chainSyncStatus: 'SUBMITTED',
          },
        });
      },
    );
    await prisma.model.update({
      where: { hash: initialModelHash },
      data: {
        ...(txHash !== null ? { chainTxHash: txHash } : {}),
        chainSyncStatus: 'CONFIRMED',
      },
    });
  } catch (error) {
    await prisma.model.update({
      where: { hash: initialModelHash },
      data: { chainSyncStatus: 'FAILED' },
    });
    throw error;
  }

  console.log(
    'Initial model is available in the database and on chain with hash: ',
    initialModelHash,
  );
}
