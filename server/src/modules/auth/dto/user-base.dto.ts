import { Exclude, Expose, Transform } from 'class-transformer';
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Base DTO for user creation
@Exclude()
export class UserBaseDto {
  @Expose()
  @ApiProperty({
    description: 'ID duy nhất của người dùng',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @IsString({ message: 'ID không hợp lệ' })
  id!: string;

  @Expose()
  @ApiProperty({
    description: 'Địa chỉ email của người dùng',
    example: 'user@example.com',
    format: 'email',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @Transform(({ value }) => value?.trim())
  email!: string;

  @Expose()
  @ApiProperty({
    description: 'Tên hiển thị của người dùng',
    example: 'Nguyễn Văn A',
    minLength: 1,
  })
  @IsString({ message: 'Tên phải là chuỗi' })
  @MinLength(1, { message: 'Tên là bắt buộc' })
  @Transform(({ value }) => value?.trim())
  name!: string;

  @Expose()
  @ApiPropertyOptional({
    description: 'URL ảnh đại diện của người dùng',
    example: 'https://images.example.com/avatar.jpg',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Avatar không hợp lệ' })
  image?: string | null;

  @Expose()
  @ApiProperty({
    description: 'Vai trò của người dùng trong hệ thống',
    example: 'user',
  })
  @IsString({
    message: 'Vai trò phải là chuỗi',
  })
  role!: string;
}
