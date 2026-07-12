import type { PermissionsService } from '../../src/modules/permissions/permissions.service';
import type { RolesService } from '../../src/modules/roles/roles.service';

/**
 * Creates (or reuses) a role granting the given permissions and assigns it to
 * a user. Self-contained — doesn't depend on the seed script's default roles
 * or permissions having been run against the target database, so e2e specs
 * stay isolated from seed state.
 */
export async function grantPermissions(
  rolesService: RolesService,
  permissionsService: PermissionsService,
  userId: string,
  roleName: string,
  permissionNames: string[],
): Promise<void> {
  let role = await rolesService.findByName(roleName);
  if (!role) {
    role = await rolesService.createRole({ name: roleName });
  }

  for (const permissionName of permissionNames) {
    let permission = await permissionsService.findByName(permissionName);
    if (!permission) {
      permission = await permissionsService.createSystemPermission(
        permissionName,
        `e2e test permission: ${permissionName}`,
      );
    }
    const hasPermission = await rolesService.hasRolePermission(
      role.id,
      permission.id,
    );
    if (!hasPermission) {
      await rolesService.assignPermission(role.id, permission.id);
    }
  }

  const hasRole = await rolesService.hasUserRole(userId, role.id);
  if (!hasRole) {
    await rolesService.assignUser(role.id, userId);
  }
}
