import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateModelUpdateDto } from './create-model-update.dto';

class MutableModelUpdateDto extends OmitType(CreateModelUpdateDto, [
  'trainingJobId',
  'roundNumber',
  'prevModelHash',
] as const) {}

export class UpdateModelUpdateDto extends PartialType(MutableModelUpdateDto) {}
