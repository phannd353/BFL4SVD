import {
  SetMetadata,
  UseGuards,
  applyDecorators,
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  FL_CALLBACK_KEY,
  FlAuthContext,
  FlCallbackGuard,
  FlCallbackKind,
} from '@/common/guards/fl-callback.guard';
import { Public } from './public.decorator';

/**
 * Marks a route as a Flower callback. It replaces the browser-session check
 * with Flower credential authentication for the given principal:
 *  - `participant`: a Flower ClientApp's token, scoped to one job and user.
 *  - `server`: the Flower ServerApp's deployment token.
 *
 * Use this instead of a bare `@Public()` on any route Flower calls.
 */
export function FlCallback(kind: FlCallbackKind) {
  return applyDecorators(
    Public(),
    SetMetadata(FL_CALLBACK_KEY, kind),
    UseGuards(FlCallbackGuard),
  );
}

/** Injects the authenticated Flower principal set by `FlCallbackGuard`. */
export const FlAuth = createParamDecorator(
  (_: unknown, context: ExecutionContext): FlAuthContext => {
    const flAuth = context.switchToHttp().getRequest<Request>().flAuth;
    if (!flAuth) throw new UnauthorizedException('Authentication required');
    return flAuth;
  },
);
