import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class OperationMetadataDto {
  @Expose()
  @ApiProperty({
    description: 'ID duy nhất của entity',
    example: 'op_550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @Expose()
  @ApiProperty({
    description: 'Kết quả thành công của thao tác',
    example: true,
  })
  success!: boolean;
}
