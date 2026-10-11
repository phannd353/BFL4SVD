import { SetMetadata } from '@nestjs/common';
import { statements } from '@/lib/permissions';

export const PERMISSIONS_KEY = 'permissions';

export function Permissions(permissions: Partial<typeof statements>) {
  return SetMetadata(PERMISSIONS_KEY, permissions);
}
