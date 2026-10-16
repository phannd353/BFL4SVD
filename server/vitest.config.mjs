import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@/artifacts': path.resolve(process.cwd(), 'artifacts'),
      '@': path.resolve(process.cwd(), 'src'),
      '@prisma-generated': path.resolve(process.cwd(), 'prisma/generated'),
    },
  },
  test: {
    reporters: ['tree'],
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    tags: [
      { name: 'unit', description: 'Unit tests with mocked dependencies' },
      {
        name: 'integration',
        description: 'Integration tests using external infrastructure',
      },
      {
        name: 'clients',
        description: 'Tests for the clients module',
      },
      {
        name: 'blockchain',
        description: 'Tests for the blockchain module',
      },
      {
        name: 'training-jobs',
        description: 'Tests for training jobs',
      },
      {
        name: 'models',
        description: 'Tests for the models module',
      },
    ],
  },
});
