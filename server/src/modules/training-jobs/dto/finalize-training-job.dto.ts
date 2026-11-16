import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class FinalizeTrainingJobDto {
  @ApiProperty({ example: 'sha256:...' })
  @IsString()
  @MinLength(1)
  finalModelHash!: string;
}
