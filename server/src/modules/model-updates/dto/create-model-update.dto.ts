import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

const UINT256_PATTERN = /^(0|[1-9]\d*)$/;

export class CreateModelUpdateDto {
  @ApiProperty({ example: '95' })
  @IsString()
  @Matches(UINT256_PATTERN)
  score!: string;

  @ApiProperty({ example: 'sha256:...' })
  @IsString()
  @MinLength(1)
  modelHash!: string;

  @ApiProperty({ example: '5' })
  @IsString()
  @Matches(UINT256_PATTERN)
  epoch!: string;

  @ApiProperty({ example: '1000' })
  @IsString()
  @Matches(UINT256_PATTERN)
  learningRate!: string;

  @ApiProperty({ example: '32' })
  @IsString()
  @Matches(UINT256_PATTERN)
  batchSize!: string;

  @ApiPropertyOptional({
    example: 'sha256:...',
    description:
      'Optional client hint; the API records the previous model from the training round lineage.',
  })
  @IsOptional()
  @IsString()
  prevModelHash?: string;

  @ApiProperty({ example: '97' })
  @IsString()
  @Matches(UINT256_PATTERN)
  accuracy!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description:
      'Client model metrics in their reported units, recorded for this update.',
    example: { train_logloss: 0.12, train_accuracy: 0.95 },
  })
  @IsOptional()
  @IsObject()
  metrics?: Record<string, unknown>;

  @ApiProperty({ example: 'clx123...' })
  @IsString()
  @MinLength(1)
  trainingJobId!: string;

  @ApiProperty({ minimum: 1, example: 1 })
  @IsString()
  @Matches(/^[1-9]\d*$/)
  roundNumber!: string;

  @ApiPropertyOptional({ example: '2026-11-03T08:30:00.000Z' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;
}
