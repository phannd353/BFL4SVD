import {
  BadRequestException,
  type CallHandler,
  type ExecutionContext,
} from '@nestjs/common';
import { firstValueFrom, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { SerializeResponseInterceptor } from './serialize-response.interceptor';

describe('SerializeResponseInterceptor', () => {
  it('preserves the HTTP status when serializing an exception', async () => {
    const response = { status: vi.fn() };
    const context = {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ExecutionContext;
    const next = {
      handle: () => throwError(() => new BadRequestException('Invalid input')),
    } as CallHandler;

    const result = await firstValueFrom(
      new SerializeResponseInterceptor().intercept(context, next),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(result).toMatchObject({
      statusCode: 400,
      message: 'Invalid input',
    });
  });
});
