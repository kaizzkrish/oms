import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Marks a route as requiring the given permission name(s) (e.g. `Users.Create`).
 * Checked by `PermissionsGuard`, which is registered globally — routes
 * without this decorator remain accessible to any authenticated user.
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
