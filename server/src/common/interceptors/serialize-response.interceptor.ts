import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { PaginationMetadataDto, SerializedResponseDto } from '@/common/dto';
import { Observable, of, pipe } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable()
export class SerializeResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const res = context.switchToHttp().getResponse();

    return next
      .handle()
      .pipe(
        map((data) => {
          function commonizedResponse(
            data: Record<string, any>,
          ): SerializedResponseDto<any> & {
            pagination: PaginationMetadataDto;
          } {
            return {
              data: data.data,
              pagination: data.pagination,
              message: data.message,
              statusCode: res.statusCode,
              timestamp: new Date().toISOString(),
            };
          }

          if (!data) return commonizedResponse({ data: null });

          // if data has data and pagination properties, it's a paginated response
          if (data && (data.data || data.pagination)) {
            return commonizedResponse(data);
          }

          return commonizedResponse({ data });
        }),
      )
      .pipe(
        catchError((err) => {
          console.log('Error occurred: ', err);
          let errMessage = '';

          if (Array.isArray(err?.response?.message)) {
            // class validator error
            errMessage = err?.response?.message?.[0];
          } else if (typeof err?.response?.message === 'string') {
            errMessage = err?.response?.message;
          } else {
            errMessage = err?.message || 'Internal Server Error';
          }

          const errStatus = err?.status || 500;

          return of<SerializedResponseDto<any>>({
            data: null,
            statusCode: errStatus,
            message: errMessage,
            timestamp: new Date().toISOString(),
          });
        }),
      );
  }
}
