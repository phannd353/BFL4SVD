import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { Cookie } from 'cookiejar';

import { ConfigService } from '../providers';
import { IS_PUBLIC_KEY } from '../decorators/auth/public.decorator';
import { UserBaseDto } from '@/modules/auth/dto';
import { Config } from '@/config';

interface JWTPayload extends jwt.JwtPayload {
  user: UserBaseDto;
  session: any;
  version: string;
  updatedAt: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserBaseDto;
      session?: any;
    }
  }
}

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService<Config>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getClass(),
      context.getHandler(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    try {
      // Extract JWT token from Authorization header or cookie
      const cookies = this.parseCookies(request.headers.cookie || '');
      const sessionDataCookieName =
        (this.configService.get('env') === 'production' ? '__Secure-' : '') +
        `${this.configService.get('betterAuth.cookiePrefix')}.session_data`;
      let token = cookies.get(sessionDataCookieName);

      if (!token) {
        // try to get splitted token from cookie
        // Check if the token is split into multiple parts in cookies
        const tokenParts: string[] = [];
        let index = 0;
        while (true) {
          const part = cookies.get(`${sessionDataCookieName}.${index}`);
          if (!part) {
            break;
          }
          tokenParts.push(part);
          index++;
        }

        if (tokenParts.length > 0) {
          token = tokenParts.join('');
        } else {
          throw new UnauthorizedException('No authentication token found');
        }
      }

      const secret = this.configService.get('betterAuth.secret');
      if (!secret) {
        throw new Error('JWT secret not configured');
      }

      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
      }) as JWTPayload;

      // Attach user info to request
      request['user'] = decoded.user;
      request['session'] = decoded.session;

      return true;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      throw new UnauthorizedException(
        (error as Error)?.message || 'Authentication failed',
      );
    }
  }

  private parseCookies(cookieHeader: string): Map<string, string> {
    const cookies = new Map<string, string>();
    const pairs = cookieHeader.split(';');
    for (const pair of pairs) {
      const cookie = new Cookie(pair.trim());
      cookies.set(cookie.name, cookie.value);
    }
    return cookies;
  }
}
