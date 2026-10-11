import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

@Exclude()
export class UserDeleteDto {
  @Expose()
  @ApiProperty({
    description: 'ID của người dùng cần xóa',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsString({ message: 'ID không hợp lệ' })
  userId!: string;
}

// DTO for bulk deleting users
@Exclude()
export class UserBulkDeleteDto {
  @Expose()
  @ApiProperty({
    description: 'Danh sách ID người dùng cần xóa',
    type: [String],
    example: [
      '550e8400-e29b-41d4-a716-446655440000',
      '550e8400-e29b-41d4-a716-446655440001',
    ],
  })
  @IsArray({ message: 'Danh sách ID phải là mảng' })
  @ArrayMinSize(1, { message: 'Cần ít nhất một ID người dùng' })
  @IsString({ each: true, message: 'ID người dùng không hợp lệ' })
  userIds!: string[];
}
