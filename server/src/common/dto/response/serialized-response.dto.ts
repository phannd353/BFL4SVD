import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { timestamp } from 'rxjs/internal/operators/timestamp';

@Exclude()
export class SerializedResponseDto<T> {
  @Expose()
  @ApiProperty({
    description: 'Dữ liệu trả về từ API',
  })
  data!: T;

  @Expose()
  @ApiProperty({
    description: 'Thông báo phản hồi của API',
    example: 'Thành công',
  })
  message!: string;

  @Exclude()
  @ApiProperty({
    description: 'Mã trạng thái HTTP của phản hồi',
    example: 200,
  })
  statusCode!: number;

  @Exclude()
  @ApiProperty({
    description: 'Thời gian phản hồi',
    example: '2023-01-01T00:00:00.000Z',
  })
  timestamp!: string;
}
