import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTrainingJobDto {
  @ApiProperty({ example: 'Federated image classification' })
  @IsString()
  @MinLength(1)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @ApiPropertyOptional({ example: 'Train a shared image classifier' })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({ minimum: 1, example: 10 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  plannedRounds?: number;

  @ApiPropertyOptional({ minimum: 1, example: 5 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  epochs?: number;

  @ApiPropertyOptional({ minimum: 1, example: 32 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  batchSize?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 1, example: 0.001 })
  @IsOptional()
  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsNumber()
  @Min(0)
  @Max(1)
  learningRate?: number;

  @ApiPropertyOptional({ example: 'ipfs://Qm...' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  modelHash?: string;
}
