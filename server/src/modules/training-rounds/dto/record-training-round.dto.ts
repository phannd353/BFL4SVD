import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class StartTrainingRoundDto {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  roundNumber!: number;

  @ApiProperty({ example: 'sha256:...' })
  @IsString()
  prevModelHash!: string;
}

export class RecordTrainingRoundDto {
  @ApiProperty({ minimum: 1, example: 1 })
  @IsInt()
  @Min(1)
  roundNumber!: number;

  @ApiPropertyOptional({
    example: 'sha256:...',
    description:
      'Hash of the aggregate model produced from this round. The aggregate only exists at the end of the round, so omit the three aggregatedModel* fields while it is still running; send all three together to complete it.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  aggregatedModelHash?: string;

  @ApiPropertyOptional({
    minimum: 1,
    example: 1048576,
    description: 'Required with aggregatedModelHash',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  aggregatedModelSize?: number;

  @ApiPropertyOptional({
    example: '/models/sha256-model.pkl',
    description: 'Required with aggregatedModelHash',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  aggregatedModelFilePath?: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description:
      'Round metrics. Without an aggregate they are stored on the still-running round (latest value wins).',
    example: { accuracy: 0.95, loss: 0.12 },
  })
  @IsOptional()
  @IsObject()
  metrics?: Record<string, unknown>;
}
