import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { ClassConstructor, plainToInstance } from 'class-transformer';

/**
 *
 * @param dto DTO class
 * @description transform returned object/array into instance of DTO class
 */
export function Serialize<T>(dto: ClassConstructor<T>) {
  class SerializeInterceptor implements NestInterceptor {
    intercept(_ctx: ExecutionContext, next: CallHandler): Observable<any> {
      return next.handle().pipe(
        map((data) => {
          if (data?.pagination || data?.data) {
            return {
              ...data,
              data: serializeResponseData(data.data, dto),
            };
          }

          return serializeResponseData(data, dto);
        }),
      );
    }
  }
  return UseInterceptors(SerializeInterceptor);
}

const serializeResponseData = (data: any, dto: ClassConstructor<any>) =>
  Array.isArray(data)
    ? data.map((d) =>
        plainToInstance(dto, d, { excludeExtraneousValues: true }),
      )
    : plainToInstance(dto, data, { excludeExtraneousValues: true });
