import { ApiProperty, PickType } from '@nestjs/swagger';
import { UserBaseDto } from './user-base.dto';

export class UserBriefResponseDto extends PickType(UserBaseDto, [
  'id',
  'name',
  'image',
]) {
  @ApiProperty({
    description: 'ID duy nhất của người dùng',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({
    description: 'Tên hiển thị của người dùng',
    example: 'Nguyễn Văn A',
  })
  name!: string;

  @ApiProperty({
    description: 'URL ảnh đại diện của người dùng',
    example: 'https://images.example.com/avatar.jpg',
    nullable: true,
    type: String,
  })
  image?: string | null;
}
