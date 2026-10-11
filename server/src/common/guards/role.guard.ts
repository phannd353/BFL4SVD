import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createAuthClient } from 'better-auth/client';
import { adminClient } from 'better-auth/client/plugins';

import { PERMISSIONS_KEY } from '../decorators/auth/permission.decorator';
import { ac, roles, statements } from '@/lib/permissions';

@Injectable()
export class RolesGuard implements CanActivate {
  // Only use admin.checkRolePermission function
  // Other functions are required to fetch data from server which is not possible here
  private readonly authClient = createAuthClient({
    plugins: [
      adminClient({
        ac,
        roles,
      }),
    ],
  });

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      typeof statements
    >(PERMISSIONS_KEY, [context.getClass(), context.getHandler()]);

    if (!requiredPermissions) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Please sign in before continue.');
    }

    const isAllowed = this.authClient.admin.checkRolePermission({
      role: user.role,
      permissions: requiredPermissions,
    });

    if (!isAllowed) {
      throw new ForbiddenException(
        'You do not have right to perform the action',
      );
    }

    return true;
  }
}
