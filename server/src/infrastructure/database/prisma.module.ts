import { DynamicModule, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

// @Global() // Make PrismaService globally available
@Module({})
export class PrismaModule {
  static forRoot(): DynamicModule {
    return {
      global: true,
      module: PrismaModule,
      providers: [PrismaService],
      exports: [PrismaService],
    };
  }
}
