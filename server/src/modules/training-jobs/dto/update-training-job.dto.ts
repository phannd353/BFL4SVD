import { PartialType } from '@nestjs/swagger';
import { CreateTrainingJobDto } from './create-training-job.dto';

export class UpdateTrainingJobDto extends PartialType(CreateTrainingJobDto) {}
