import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class PaginationMetadataDto {
  @Expose()
  @ApiProperty({
    description: 'Tổng số bản ghi có thể trả về',
    example: 120,
    minimum: 0,
  })
  total!: number;

  @Expose()
  @ApiProperty({
    description: 'Tổng số trang',
    example: 12,
    minimum: 0,
  })
  totalPages!: number;

  @Expose()
  @ApiProperty({
    description: 'Trang hiện tại',
    example: 1,
    minimum: 1,
  })
  page!: number;

  @Expose()
  @ApiProperty({
    description: 'Số lượng bản ghi trên mỗi trang',
    example: 10,
    minimum: 1,
  })
  limit!: number;
}

export class PaginatedResponseDto<T> {
  @Expose()
  @ApiProperty({
    description: 'Danh sách dữ liệu của trang hiện tại',
    isArray: true,
  })
  data!: T[];

  @Expose()
  @ApiProperty({
    description: 'Thông tin phân trang',
    type: () => PaginationMetadataDto,
  })
  @Type(() => PaginationMetadataDto)
  pagination!: PaginationMetadataDto;
}
