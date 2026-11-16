import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class HealthResponseDto {
  @Expose()
  status!: 'ok';
}
