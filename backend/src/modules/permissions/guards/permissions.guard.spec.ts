import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { PermissionsService } from '../permissions.service';
import { PermissionsGuard } from './permissions.guard';

function createContext(user: unknown): ExecutionContext {
  return {
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let reflector: jest.Mocked<Reflector>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    permissionsService = {
      getEffectivePermissionNames: jest.fn(),
    } as unknown as jest.Mocked<PermissionsService>;

    guard = new PermissionsGuard(reflector, permissionsService);
  });

  it('allows the request when no permissions are required', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    await expect(
      guard.canActivate(createContext({ sub: 'user-1' })),
    ).resolves.toBe(true);
    expect(
      permissionsService.getEffectivePermissionNames,
    ).not.toHaveBeenCalled();
  });

  it('allows the request when the user has all required permissions', async () => {
    reflector.getAllAndOverride.mockReturnValue(['Users.View']);
    permissionsService.getEffectivePermissionNames.mockResolvedValue(
      new Set(['Users.View', 'Roles.View']),
    );

    await expect(
      guard.canActivate(createContext({ sub: 'user-1' })),
    ).resolves.toBe(true);
  });

  it('throws ForbiddenException when the user is missing a required permission', async () => {
    reflector.getAllAndOverride.mockReturnValue(['Users.Delete']);
    permissionsService.getEffectivePermissionNames.mockResolvedValue(
      new Set(['Users.View']),
    );

    await expect(
      guard.canActivate(createContext({ sub: 'user-1' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('denies the request when there is no authenticated user', async () => {
    reflector.getAllAndOverride.mockReturnValue(['Users.View']);

    await expect(guard.canActivate(createContext(undefined))).resolves.toBe(
      false,
    );
    expect(
      permissionsService.getEffectivePermissionNames,
    ).not.toHaveBeenCalled();
  });
});
